from datetime import datetime, timezone
import json
import os
from typing import Dict, Optional, List
from urllib import error, request

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

# Standardposisjon: Oslo sentrum. Kan overstyres via env for andre lokasjoner.
DEFAULT_LAT = os.getenv("WEATHER_LAT", "67.2804")  # Bodø
DEFAULT_LON = os.getenv("WEATHER_LON", "14.4049")  # Bodø

YR_URL = (
    "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}"
)

# Fra https://api.met.no/weatherapi/weathericon/2.0/documentation
SYMBOL_MAP: Dict[str, str] = {
    "clearsky": "Klarvær",
    "fair": "Pent",
    "partlycloudy": "Delvis skyet",
    "cloudy": "Skyet",
    "lightrain": "Lett regn",
    "rain": "Regn",
    "heavyrain": "Kraftig regn",
    "lightrainshowers": "Lette regnbyger",
    "rainshowers": "Regnbyger",
    "heavyrainshowers": "Kraftige regnbyger",
    "lightsnow": "Lett snø",
    "snow": "Snø",
    "heavysnow": "Kraftig snø",
    "lightsnowshowers": "Lette snøbyger",
    "snowshowers": "Snøbyger",
    "heavysnowshowers": "Kraftige snøbyger",
    "fog": "Tåke",
    "sleet": "Sludd",
    "sleetshowers": "Sluddbyger",
    "lightrainandthunder": "Lett regn og torden",
    "rainandthunder": "Regn og torden",
    "heavyrainandthunder": "Kraftig regn og torden",
    "snowandthunder": "Snø og torden",
    "snowshowersandthunder": "Snøbyger og torden",
}


def symbol_to_text(symbol: Optional[str]) -> str:
    if not symbol:
        return "Ukjent vær"
    base = symbol.split("_")[0]
    return SYMBOL_MAP.get(base, base.replace("_", " ").title())


def fetch_yr(lat: str, lon: str) -> dict:
    url = YR_URL.format(lat=lat, lon=lon)
    headers = {
        # YR krever identifiserbar User-Agent
        "User-Agent": "Infoscreen/1.0 (kontakt: infoscreen)",
    }
    req = request.Request(url, headers=headers)
    try:
        with request.urlopen(req, timeout=8) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload)
    except error.URLError as exc:
        raise HTTPException(
            status_code=502, detail=f"Feil ved henting av værdata: {exc}"
        ) from exc


def summarize_today(timeseries: list) -> Dict[str, Optional[float]]:
    """Finn min/max temp og estimert nedbør for de neste ~24 timene."""
    temps = []
    precip = []
    now = datetime.now(timezone.utc)
    cutoff = now.replace(hour=23, minute=59, second=59, microsecond=0)

    for entry in timeseries:
        try:
            ts = datetime.fromisoformat(entry["time"].replace("Z", "+00:00"))
        except Exception:
            continue
        if ts > cutoff:
            break
        details = entry.get("data", {}).get("instant", {}).get("details", {}) or {}
        t = details.get("air_temperature")
        if isinstance(t, (int, float)):
            temps.append(t)
        next_hour = entry.get("data", {}).get("next_1_hours", {})
        precip_amt = (next_hour.get("details") or {}).get("precipitation_amount")
        if isinstance(precip_amt, (int, float)):
            precip.append(precip_amt)

    return {
        "temp_min": min(temps) if temps else None,
        "temp_max": max(temps) if temps else None,
        # Vi har ikke probability i denne APIen, så vi summerer mm siste døgnish
        "precip_prob": None if not precip else min(sum(precip), 100),
    }


def summarize_week(timeseries: list) -> List[dict]:
    """
    Summerer 5-7 dager frem i tid med min/max temp og et representativt symbol.
    """
    per_day: Dict[str, dict] = {}
    for entry in timeseries:
        time_str = entry.get("time")
        if not time_str:
            continue
        try:
            ts = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        except Exception:
            continue

        day = ts.date().isoformat()
        details = entry.get("data", {}).get("instant", {}).get("details", {}) or {}
        temp = details.get("air_temperature")

        next_6 = entry.get("data", {}).get("next_6_hours", {}) or {}
        symbol_code = (next_6.get("summary") or {}).get("symbol_code") or (
            (entry.get("data", {}).get("next_1_hours") or {}).get("summary") or {}
        ).get("symbol_code")
        precip_amt = (next_6.get("details") or {}).get("precipitation_amount")

        day_stats = per_day.setdefault(
            day,
            {
                "temp_min": None,
                "temp_max": None,
                "precip_mm": 0.0,
                "symbol_code": None,
            },
        )

        if isinstance(temp, (int, float)):
            day_stats["temp_min"] = (
                temp
                if day_stats["temp_min"] is None
                else min(day_stats["temp_min"], temp)
            )
            day_stats["temp_max"] = (
                temp
                if day_stats["temp_max"] is None
                else max(day_stats["temp_max"], temp)
            )

        if isinstance(precip_amt, (int, float)):
            day_stats["precip_mm"] = (day_stats["precip_mm"] or 0) + precip_amt

        if symbol_code and not day_stats["symbol_code"]:
            day_stats["symbol_code"] = symbol_code

    days = []
    for day, stats in sorted(per_day.items()):
        days.append(
            {
                "date": day,
                "temp_min": stats["temp_min"],
                "temp_max": stats["temp_max"],
                "precip_mm": stats["precip_mm"],
                "weathercode": stats["symbol_code"],
                "description": symbol_to_text(stats["symbol_code"]),
            }
        )

    return days[:7]


@router.get("/weather")
def get_weather():
    lat = DEFAULT_LAT
    lon = DEFAULT_LON

    try:
        print(f"[weather] fetch start lat={lat} lon={lon}")
        data = fetch_yr(lat, lon)
        timeseries = data.get("properties", {}).get("timeseries", []) or []
        if not timeseries:
            raise HTTPException(status_code=502, detail="Ingen tidsserier fra YR")

        current_entry = timeseries[0]
        details = current_entry.get("data", {}).get("instant", {}).get("details", {}) or {}

        next_hour = current_entry.get("data", {}).get("next_1_hours", {}) or {}
        symbol_code = (next_hour.get("summary") or {}).get("symbol_code")
        precip_amount = (next_hour.get("details") or {}).get("precipitation_amount")

        today = summarize_today(timeseries)
        week = summarize_week(timeseries)

        result = {
            "location": {
                "lat": lat,
                "lon": lon,
                "timezone": data.get("properties", {}).get("meta", {}).get("units", {}),
            },
            "current": {
                "temperature": details.get("air_temperature"),
                "windspeed": details.get("wind_speed"),
                "weathercode": symbol_code,
                "description": symbol_to_text(symbol_code),
                "precip_mm": precip_amount,
                "time": current_entry.get("time"),
            },
            "today": today,
            "days": week,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        print(
            "[weather] OK | "
            f"temp={result['current']['temperature']}C "
            f"desc={result['current']['description']} "
            f"precip_mm={result['current']['precip_mm']} "
            f"min={today['temp_min']} max={today['temp_max']}"
        )

        return JSONResponse(result)

    except Exception as exc:  # noqa: BLE001 - vi vil vise fallback
        error_msg = f"{exc}"
        print(f"[weather] Klarte ikke hente fra YR: {error_msg}")
        return JSONResponse(
            {
                "location": {"lat": lat, "lon": lon, "timezone": None},
                "current": {
                    "temperature": None,
                    "windspeed": None,
                    "weathercode": None,
                    "description": "Ingen værdata (nettverksfeil)",
                    "time": datetime.now(timezone.utc).isoformat(),
                },
                "today": {"temp_min": None, "temp_max": None, "precip_prob": None},
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "error": error_msg,
            }
        )
