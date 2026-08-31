"""
Database connection and session management using SQLAlchemy 2.0.
Supports PostgreSQL (Supabase/Docker) with graceful fallback and connection pooling.
"""
from __future__ import annotations

import logging
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy 2.0 Base model
Base = declarative_base()

# Configure engine with connection pool settings
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    logger.warning("Could not initialize database engine with DATABASE_URL '%s': %s", settings.DATABASE_URL, e)
    # Fallback SQLite engine with StaticPool for standalone/offline runs
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Creates database tables if they do not already exist."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.warning("Failed to automatically create database tables: %s", e)
