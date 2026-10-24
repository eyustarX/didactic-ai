"""
Database connection and session management for Didactic AI.
Supports PostgreSQL (Neon) with fallback to SQLite for local development.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.core.config import settings

# Configure engine connection args (SQLite requires check_same_thread=False)
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session():
    """FastAPI dependency that yields an active database session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
