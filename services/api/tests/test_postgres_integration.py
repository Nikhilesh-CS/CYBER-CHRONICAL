from __future__ import annotations

import os
from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine, delete, text, update
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from cyber_chronicle.models import AuditEvent, NormalizedDocument, PipelineRun, RawArtifact, Source


pytestmark = pytest.mark.integration


@pytest.fixture
def postgres_engine():
    database_url = os.getenv("CYBER_CHRONICLE_TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("CYBER_CHRONICLE_TEST_DATABASE_URL is not configured")
    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def seeded_records(postgres_engine):  # type: ignore[no-untyped-def]
    now = datetime.now(UTC)
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE source_fetches, document_provenance, audit_events, raw_artifacts, "
                "normalized_documents, pipeline_runs, sources RESTART IDENTITY CASCADE"
            )
        )
    with Session(postgres_engine, expire_on_commit=False) as session:
        source = Source(
            slug="postgres-gate",
            name="PostgreSQL Gate",
            feed_url="https://feed.example.test/rss.xml",
            enabled=False,
            trust_tier=1,
            poll_interval_seconds=900,
        )
        session.add(source)
        session.flush()
        run = PipelineRun(source_id=source.id, status="succeeded", finished_at=now, counters={"documents_created": 1})
        session.add(run)
        session.flush()
        artifact = RawArtifact(
            source_id=source.id,
            canonical_url="https://feed.example.test/rss.xml",
            canonical_url_hash=b"u" * 32,
            sha256=b"h" * 32,
            payload=b"immutable raw bytes",
            byte_length=len(b"immutable raw bytes"),
            media_type="application/rss+xml",
        )
        session.add(artifact)
        session.flush()
        audit = AuditEvent(
            event_type="postgres.gate",
            pipeline_run_id=run.id,
            target_type="raw_artifact",
            target_id=artifact.id,
            details={"verified": True},
        )
        document = NormalizedDocument(
            source_id=source.id,
            identity_hash=b"i" * 32,
            content_hash=b"c" * 32,
            revision=1,
            external_id="PG-1",
            canonical_url="https://feed.example.test/advisory/1",
            title="PostgreSQL constraint gate",
            summary="Round-trip verification",
            body_text="Evidence",
            published_at=now,
            normalizer_version="postgres-test/1",
        )
        session.add_all([audit, document])
        session.commit()
        return {"source": source, "run": run, "artifact": artifact, "audit": audit, "document": document}


def _assert_immutable(postgres_engine, statement) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(DBAPIError) as caught:
        with postgres_engine.begin() as connection:
            connection.execute(statement)
    assert getattr(caught.value.orig, "sqlstate", None) == "P0001"


def test_raw_artifact_and_audit_rows_are_immutable(postgres_engine, seeded_records) -> None:  # type: ignore[no-untyped-def]
    artifact_id = seeded_records["artifact"].id
    audit_id = seeded_records["audit"].id
    _assert_immutable(postgres_engine, update(RawArtifact).where(RawArtifact.id == artifact_id).values(media_type="text/plain"))
    _assert_immutable(postgres_engine, delete(RawArtifact).where(RawArtifact.id == artifact_id))
    _assert_immutable(postgres_engine, update(AuditEvent).where(AuditEvent.id == audit_id).values(event_type="tampered"))
    _assert_immutable(postgres_engine, delete(AuditEvent).where(AuditEvent.id == audit_id))


def test_binary_json_and_timezone_round_trip(postgres_engine, seeded_records) -> None:  # type: ignore[no-untyped-def]
    with Session(postgres_engine) as session:
        artifact = session.get(RawArtifact, seeded_records["artifact"].id)
        run = session.get(PipelineRun, seeded_records["run"].id)
        document = session.get(NormalizedDocument, seeded_records["document"].id)
        assert artifact is not None and artifact.payload == b"immutable raw bytes" and len(artifact.sha256) == 32
        assert run is not None and run.counters == {"documents_created": 1}
        assert document is not None and document.published_at is not None and document.published_at.utcoffset() is not None


def test_unique_partial_and_check_constraints(postgres_engine, seeded_records) -> None:  # type: ignore[no-untyped-def]
    source = seeded_records["source"]
    with pytest.raises(IntegrityError):
        with Session(postgres_engine) as session:
            session.add(
                RawArtifact(
                    source_id=source.id,
                    canonical_url="https://feed.example.test/rss.xml",
                    canonical_url_hash=b"u" * 32,
                    sha256=b"h" * 32,
                    payload=b"immutable raw bytes",
                    byte_length=len(b"immutable raw bytes"),
                )
            )
            session.commit()

    with pytest.raises(IntegrityError):
        with Session(postgres_engine) as session:
            session.add(
                NormalizedDocument(
                    source_id=source.id,
                    identity_hash=b"i" * 32,
                    content_hash=b"n" * 32,
                    revision=2,
                    canonical_url="https://feed.example.test/advisory/1",
                    title="Competing current revision",
                    body_text="Evidence",
                    normalizer_version="postgres-test/1",
                )
            )
            session.commit()

    with pytest.raises(IntegrityError):
        with Session(postgres_engine) as session:
            session.add(
                RawArtifact(
                    source_id=source.id,
                    canonical_url="https://feed.example.test/bad.xml",
                    canonical_url_hash=b"b" * 31,
                    sha256=b"s" * 32,
                    payload=b"three",
                    byte_length=999,
                )
            )
            session.commit()


def test_source_delete_is_restricted(postgres_engine, seeded_records) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(IntegrityError):
        with Session(postgres_engine) as session:
            source = session.get(Source, seeded_records["source"].id)
            assert source is not None
            session.delete(source)
            session.commit()
