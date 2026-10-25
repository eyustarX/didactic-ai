"""
Pytest configuration and global fixtures for Didactic AI.
Ensures the test suite runs blazing fast, completely offline, and without consuming live API tokens.
"""

import os
import pytest
from src.services.engine_adapter import ai_engine


@pytest.fixture(autouse=True)
def offline_test_environment(monkeypatch):
    """
    Forces offline testing by neutralizing external network API keys during automated test runs.
    Ensures CI/CD and developer tests run in ~3 seconds with zero external network dependencies.
    """
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("USE_AWS_BEDROCK", "false")
    ai_engine.cache_clear()
    yield
    ai_engine.cache_clear()
