from functools import lru_cache

from src.ai.engine import get_engine


@lru_cache
def ai_engine():
    return get_engine()