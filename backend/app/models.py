"""
SQLAlchemy 2.0 ORM models for SIH26188 (AI-Based Fake Identity & Document Screening System).
Defines users, screening_logs, extracted_metadata, and forensic_regions tables per docs/schema.md.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), default="officer", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    screening_logs: Mapped[List["ScreeningLog"]] = relationship(
        "ScreeningLog", back_populates="officer", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(username='{self.username}', role='{self.role}')>"


class ScreeningLog(Base):
    __tablename__ = "screening_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    officer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    document_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    verdict: Mapped[str] = mapped_column(String(20), nullable=False)  # 'Genuine', 'Suspicious', 'Fake'
    trust_score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-100
    ocr_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    ela_tamper_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    compression_warning: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    face_match_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    raw_image_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    officer: Mapped[Optional["User"]] = relationship("User", back_populates="screening_logs")
    extracted_metadata: Mapped[List["ExtractedMetadata"]] = relationship(
        "ExtractedMetadata", back_populates="screening", cascade="all, delete-orphan"
    )
    forensic_regions: Mapped[List["ForensicRegion"]] = relationship(
        "ForensicRegion", back_populates="screening", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ScreeningLog(id='{self.id}', verdict='{self.verdict}', trust_score={self.trust_score})>"


class ExtractedMetadata(Base):
    __tablename__ = "extracted_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    screening_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("screening_logs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_name: Mapped[str] = mapped_column(String(50), nullable=False)
    # Strictly masked numeric identifiers (e.g. '[Aadhaar Redacted]' or 'XXXX-XXXX-XXXX')
    field_value_redacted: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    screening: Mapped["ScreeningLog"] = relationship("ScreeningLog", back_populates="extracted_metadata")

    def __repr__(self) -> str:
        return f"<ExtractedMetadata(field='{self.field_name}', confidence={self.confidence:.2f})>"


class ForensicRegion(Base):
    __tablename__ = "forensic_regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    screening_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("screening_logs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    x_min: Mapped[int] = mapped_column(Integer, nullable=False)
    y_min: Mapped[int] = mapped_column(Integer, nullable=False)
    x_max: Mapped[int] = mapped_column(Integer, nullable=False)
    y_max: Mapped[int] = mapped_column(Integer, nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    screening: Mapped["ScreeningLog"] = relationship("ScreeningLog", back_populates="forensic_regions")

    def __repr__(self) -> str:
        return f"<ForensicRegion(x_min={self.x_min}, y_min={self.y_min}, score={self.anomaly_score:.2f})>"
