from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CYBER_CHRONICLE_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./cyber_chronicle_v1.db"
    collector_user_agent: str = "CyberChronicle/0.1 (+security-contact@example.invalid)"
    collector_version: str = "safe-aiohttp/0.1"
    normalizer_version: str = "rss-atom/0.1"
    default_timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    default_max_response_bytes: int = Field(default=5 * 1024 * 1024, gt=0, le=20 * 1024 * 1024)
    max_redirects: int = Field(default=3, ge=0, le=5)
    scheduler_enabled: bool = False
    scheduler_scan_seconds: int = Field(default=60, ge=15, le=3600)
    parser_timeout_seconds: float = Field(default=5.0, gt=0, le=30)
    parser_max_entries: int = Field(default=2000, ge=1, le=2000)
    parser_max_output_bytes: int = Field(default=32 * 1024 * 1024, gt=0, le=128 * 1024 * 1024)
    parser_max_stderr_bytes: int = Field(default=64 * 1024, gt=0, le=1024 * 1024)


@lru_cache
def get_settings() -> Settings:
    return Settings()
