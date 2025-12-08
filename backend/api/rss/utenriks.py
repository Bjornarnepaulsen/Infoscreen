from fastapi import APIRouter
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import feedparser

print("Utenriks-router lastet ✅")

router = APIRouter()

# Vi prøver disse i rekkefølge og bruker den første som faktisk gir saker
UTENRIKS_SOURCES = [
    {
        "name": "Sky News World",
        "url": "http://feeds.skynews.com/feeds/rss/world.xml",  # merk: http, ikke https
    },
    {
        "name": "BBC World",
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
    },
    {
        "name": "CNN World",
        "url": "http://rss.cnn.com/rss/edition_world.rss",
    },
]


def parse_time(entry):
    t = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if not t:
        return None
    return datetime(*t[:6], tzinfo=timezone.utc).isoformat()


@router.get("/utenriks")
def get_utenriks():
    all_items = []
    active_source = None

    for source in UTENRIKS_SOURCES:
        try:
            feed = feedparser.parse(source["url"])
        except Exception as exc:  # noqa: BLE001
            print(f"[utenriks] Klarte ikke hente {source['url']}: {exc}")
            continue

        status = getattr(feed, "status", None)

        # Hvis vi ikke får OK-status eller ingen entries, prøv neste
        if status not in (200, None) or not getattr(feed, "entries", []):
            continue

        items = []
        for entry in feed.entries:
            items.append({
                "title": (entry.get("title") or "").strip(),
                "link": entry.get("link"),
                "source": source["name"],
                "time": parse_time(entry),
                "description": (entry.get("summary") or "").strip(),
            })

        if items:
            all_items = items
            active_source = source["name"]
            break

    # Hvis alt feilet, gi tom liste med litt info
    if not all_items:
        return JSONResponse({
            "source": "Utenriks (ingen feed tilgjengelig)",
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    all_items.sort(key=lambda x: x["time"] or "", reverse=True)

    return JSONResponse({
        "source": active_source,
        "items": all_items[:25],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
