from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, func
from .db import Base


class HvaSkjer(Base):
    __tablename__ = "hva_skjer"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(100), nullable=False, default="Internt")
    time = Column(String(100), nullable=True)
    priority = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

print("Modeller lastet ✅")