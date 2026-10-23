"""
Application configuration for Didactic AI.
Loads settings from environment variables with fallback defaults.
"""

import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global configuration settings for Didactic AI backend."""

    # Server & API
    project_name: str = "Didactic AI"
    version: str = "1.0.0"
    environment: str = Field(default="development", description="Environment mode")
    debug: bool = True

    # CORS Configuration
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",
    ]

    # File Upload limits (in megabytes)
    max_upload_mb: int = Field(default=15, description="Maximum upload size in MB")

    # Database configuration (Neon Postgres or fallback to local SQLite)
    database_url: str = Field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./didactic.db")
    )

    # AI Model Keys & Options
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    use_aws_bedrock: bool = Field(default_factory=lambda: os.getenv("USE_AWS_BEDROCK", "false").lower() == "true")
    aws_region: str = Field(default_factory=lambda: os.getenv("AWS_REGION", "us-east-1"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def assemble_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
