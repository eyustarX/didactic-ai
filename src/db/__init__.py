"""
Database module for Didactic AI.
"""

from src.db.session import engine, get_session
from src.db.models import Base, Submission

__all__ = ["engine", "get_session", "Base", "Submission"]
