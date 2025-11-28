from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.db import get_db
from backend import models, schemas
from backend.auth import get_current_admin

router = APIRouter()

# ---------------------------------------------------------
# Public (brukes av infoskjermen)
# ---------------------------------------------------------

@router.get("/hva-skjer", response_model=dict)
def get_public_hva_skjer(db: Session = Depends(get_db)):
    items = (
        db.query(models.HvaSkjer)
        .filter(models.HvaSkjer.active.is_(True))
        .order_by(models.HvaSkjer.priority.desc(), models.HvaSkjer.id.desc())
        .all()
    )

    return {
        "source": "Lokale saker",
        "items": [
            schemas.HvaSkjerOut.model_validate(i).model_dump()
            for i in items
        ],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

# ---------------------------------------------------------
# Admin API
# ---------------------------------------------------------

@router.get(
    "/admin/hva-skjer",
    response_model=List[schemas.HvaSkjerOut],
    dependencies=[Depends(get_current_admin)]
)
def admin_list_hva_skjer(db: Session = Depends(get_db)):
    items = (
        db.query(models.HvaSkjer)
        .order_by(models.HvaSkjer.priority.desc(), models.HvaSkjer.id.desc())
        .all()
    )
    return items


@router.post(
    "/admin/hva-skjer",
    response_model=schemas.HvaSkjerOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)]
)
def admin_create_hva_skjer(
    payload: schemas.HvaSkjerCreate,
    db: Session = Depends(get_db)
):
    item = models.HvaSkjer(
        title=payload.title,
        description=payload.description,
        source=payload.source,
        time=payload.time,          # 👈 matcher modellen
        priority=payload.priority,
        active=payload.active,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.put(
    "/admin/hva-skjer/{item_id}",
    response_model=schemas.HvaSkjerOut,
    dependencies=[Depends(get_current_admin)]
)
def admin_update_hva_skjer(
    item_id: int,
    payload: schemas.HvaSkjerUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(models.HvaSkjer).filter(models.HvaSkjer.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    item.title = payload.title
    item.description = payload.description
    item.source = payload.source
    item.time = payload.time          # 👈 her også
    item.priority = payload.priority
    item.active = payload.active

    db.commit()
    db.refresh(item)

    return item


@router.delete(
    "/admin/hva-skjer/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)]
)
def admin_delete_hva_skjer(
    item_id: int,
    hard: bool = False,
    db: Session = Depends(get_db),
):
    item = db.query(models.HvaSkjer).filter(models.HvaSkjer.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    if hard:
        db.delete(item)
    else:
        item.active = False

    db.commit()
    return