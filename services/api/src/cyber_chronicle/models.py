from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def new_id() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class Source(Base):
    __tablename__ = "sources"
    __table_args__ = (
        CheckConstraint("trust_tier BETWEEN 1 AND 4", name="trust_tier_range"),
        CheckConstraint("poll_interval_seconds >= 300", name="poll_interval_minimum"),
        CheckConstraint("max_response_bytes > 0", name="positive_response_limit"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    source_type: Mapped[str] = mapped_column(String(24), default="rss")
    feed_url: Mapped[str] = mapped_column(Text)
    allowed_redirect_hosts: Mapped[list[str]] = mapped_column(JSON, default=list)
    trust_tier: Mapped[int] = mapped_column(Integer, default=3)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    poll_interval_seconds: Mapped[int] = mapped_column(Integer, default=900)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=20)
    max_response_bytes: Mapped[int] = mapped_column(Integer, default=5 * 1024 * 1024)
    requests_per_minute: Mapped[int] = mapped_column(Integer, default=6)
    robots_mode: Mapped[str] = mapped_column(String(24), default="record_only")
    terms_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    permitted_use: Mapped[str] = mapped_column(String(32), default="metadata_only")
    attribution_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="active")
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    etag: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_modified: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    fetches: Mapped[list[SourceFetch]] = relationship(back_populates="source")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id", ondelete="RESTRICT"), nullable=True)
    run_type: Mapped[str] = mapped_column(String(24), default="source_collection")
    trigger_type: Mapped[str] = mapped_column(String(24), default="manual")
    status: Mapped[str] = mapped_column(String(16), default="running", index=True)
    collector_version: Mapped[str | None] = mapped_column(String(100))
    normalizer_version: Mapped[str | None] = mapped_column(String(100))
    counters: Mapped[dict] = mapped_column(JSON, default=dict)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heartbeat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class RawArtifact(Base):
    __tablename__ = "raw_artifacts"
    __table_args__ = (
        UniqueConstraint("source_id", "canonical_url_hash", "sha256", name="artifact_identity"),
        CheckConstraint("byte_length >= 0", name="nonnegative_byte_length"),
        CheckConstraint("byte_length = length(payload)", name="payload_length_matches"),
        CheckConstraint("length(sha256) = 32", name="sha256_length"),
        CheckConstraint("length(canonical_url_hash) = 32", name="canonical_url_hash_length"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id", ondelete="RESTRICT"), index=True)
    canonical_url: Mapped[str] = mapped_column(Text)
    canonical_url_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    sha256: Mapped[bytes] = mapped_column(LargeBinary(32), index=True)
    payload: Mapped[bytes] = mapped_column(LargeBinary)
    byte_length: Mapped[int] = mapped_column(Integer)
    media_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SourceFetch(Base):
    __tablename__ = "source_fetches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    pipeline_run_id: Mapped[str] = mapped_column(ForeignKey("pipeline_runs.id", ondelete="RESTRICT"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id", ondelete="RESTRICT"), index=True)
    artifact_id: Mapped[str | None] = mapped_column(ForeignKey("raw_artifacts.id", ondelete="RESTRICT"), nullable=True)
    requested_url: Mapped[str] = mapped_column(Text)
    final_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str] = mapped_column(String(24), default="running")
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_headers: Mapped[dict] = mapped_column(JSON, default=dict)
    redirect_chain: Mapped[list] = mapped_column(JSON, default=list)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    source: Mapped[Source] = relationship(back_populates="fetches")


class NormalizedDocument(Base):
    __tablename__ = "normalized_documents"
    __table_args__ = (
        UniqueConstraint("source_id", "identity_hash", "content_hash", name="document_replay_identity"),
        UniqueConstraint("source_id", "identity_hash", "revision", name="document_revision_identity"),
        Index(
            "uq_current_document_revision",
            "source_id",
            "identity_hash",
            unique=True,
            sqlite_where=text("superseded_at IS NULL"),
            postgresql_where=text("superseded_at IS NULL"),
        ),
        CheckConstraint("revision >= 1", name="positive_revision"),
        CheckConstraint("length(identity_hash) = 32", name="identity_hash_length"),
        CheckConstraint("length(content_hash) = 32", name="content_hash_length"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id", ondelete="RESTRICT"), index=True)
    identity_hash: Mapped[bytes] = mapped_column(LargeBinary(32), index=True)
    content_hash: Mapped[bytes] = mapped_column(LargeBinary(32), index=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    external_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    canonical_url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_text: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    normalizer_version: Mapped[str] = mapped_column(String(100))
    superseded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DocumentProvenance(Base):
    __tablename__ = "document_provenance"
    __table_args__ = (UniqueConstraint("document_id", "artifact_id", name="document_artifact_edge"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("normalized_documents.id", ondelete="RESTRICT"), index=True)
    artifact_id: Mapped[str] = mapped_column(ForeignKey("raw_artifacts.id", ondelete="RESTRICT"), index=True)
    raw_locator: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    actor_type: Mapped[str] = mapped_column(String(24), default="system")
    pipeline_run_id: Mapped[str | None] = mapped_column(ForeignKey("pipeline_runs.id", ondelete="RESTRICT"), nullable=True)
    target_type: Mapped[str] = mapped_column(String(50))
    target_id: Mapped[str] = mapped_column(String(100))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
