from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class SourceCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z][a-z0-9-]{2,99}$")
    name: str = Field(min_length=2, max_length=200)
    feed_url: HttpUrl
    source_type: str = Field(default="rss", pattern=r"^(rss|atom)$")
    trust_tier: int = Field(default=2, ge=1, le=4)
    enabled: bool = False
    poll_interval_seconds: int = Field(default=900, ge=300)
    max_response_bytes: int = Field(default=5 * 1024 * 1024, ge=1024, le=20 * 1024 * 1024)
    allowed_redirect_hosts: list[str] = Field(default_factory=list)
    robots_mode: str = Field(default="record_only", pattern=r"^(enforce|record_only|reviewed_exemption)$")
    permitted_use: str = Field(default="metadata_only", pattern=r"^(internal_analysis|metadata_only|short_quote|republish)$")
    terms_url: HttpUrl | None = None
    attribution_text: str | None = Field(default=None, max_length=500)

    @field_validator("feed_url")
    @classmethod
    def require_https(cls, value: HttpUrl) -> HttpUrl:
        if value.scheme != "https":
            raise ValueError("registered production sources must use HTTPS")
        return value

    @field_validator("allowed_redirect_hosts")
    @classmethod
    def normalize_redirect_hosts(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        for value in values:
            if "://" in value or "/" in value or "@" in value:
                raise ValueError("redirect aliases must be hostnames only")
            host = value.encode("idna").decode("ascii").lower().rstrip(".")
            if not host:
                raise ValueError("redirect alias cannot be empty")
            if host not in normalized:
                normalized.append(host)
        return normalized


class SourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    name: str
    source_type: str
    feed_url: str
    trust_tier: int
    enabled: bool
    status: str
    consecutive_failures: int
    last_attempt_at: datetime | None
    last_success_at: datetime | None
    next_attempt_at: datetime | None


class RunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_id: str | None
    status: str
    trigger_type: str
    counters: dict
    error_code: str | None
    started_at: datetime
    finished_at: datetime | None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_id: str
    revision: int
    external_id: str | None
    canonical_url: str
    title: str
    summary: str | None
    published_at: datetime | None
    normalizer_version: str
