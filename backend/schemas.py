from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class HvaSkjerBase(BaseModel):
    title: str
    description: Optional[str] = None
    source: Optional[str] = "Internt"
    time: Optional[str] = None          # visningstekst
    priority: int = 0
    active: bool = True


class HvaSkjerCreate(HvaSkjerBase):
    pass


class HvaSkjerUpdate(HvaSkjerBase):
    pass


class HvaSkjerOut(HvaSkjerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # gjør det lett å returnere SQLAlchemy-objekter
