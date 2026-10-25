"""
Database connection and session management for Didactic AI.
Supports PostgreSQL (Neon) with fallback to SQLite for local development.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.core.config import settings

# Configure database URL and engine connection args
raw_url = settings.database_url
# Automatically adapt standard postgresql:// from Neon/Supabase to psycopg2 driver
if raw_url.startswith("postgresql://"):
    db_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    db_url = raw_url

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
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
