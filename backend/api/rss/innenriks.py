from fastapi import APIRouter
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import feedparser

print("Innenriks-router lastet ✅")

router = APIRouter()

# Her kan du evt. legge til flere innenriks-feeder senere
NRK_INNENRIKS_FEEDS = [
    "https://www.nrk.no/norge/toppsaker.rss",
]


def parse_time(entry):
    """
    Prøver å hente publiseringstid/oppdateringstid fra RSS-entry.
    Returnerer ISO8601-streng (UTC) eller None.
    """
    t = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if not t:
        return None
    # t er en time.struct_time
    return datetime(*t[:6], tzinfo=timezone.utc).isoformat()


@router.get("/innenriks")
def get_innenriks():
    items = []

    for url in NRK_INNENRIKS_FEEDS:
        feed = feedparser.parse(url)

        for entry in feed.entries:
            item = {
                "title": (entry.get("title") or "").strip(),
                "link": entry.get("link"),
                "source": "NRK",
                "time": parse_time(entry),
                "description": (entry.get("summary") or "").strip(),
            }
            items.append(item)

    # Sorter nyeste først (der vi har tid)
    items.sort(key=lambda x: x["time"] or "", reverse=True)

    return JSONResponse(
        {
            "source": "NRK Innenriks",
            "items": items[:25],  # begrens antall saker vi sender til frontend
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )
