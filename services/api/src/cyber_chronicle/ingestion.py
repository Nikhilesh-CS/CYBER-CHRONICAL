from __future__ import annotations

from datetime import UTC, datetime
from urllib.parse import urlsplit

from sqlalchemy import select
from sqlalchemy.orm import Session

from .canonical import canonicalize_url, sha256_bytes, sha256_text
from .collector import CollectionError, SafeHttpCollector
from .config import Settings
from .models import (
    AuditEvent,
    DocumentProvenance,
    NormalizedDocument,
    PipelineRun,
    RawArtifact,
    Source,
    SourceFetch,
    new_id,
)
from .parser import FeedParseError, ParsedDocument, parse_feed
from .security import CollectorPolicyError, SourceNetworkPolicy


def now_utc() -> datetime:
    return datetime.now(UTC)


class SourceDisabledError(ValueError):
    pass


class IngestionService:
    def __init__(self, session: Session, collector: SafeHttpCollector, settings: Settings) -> None:
        self.session = session
        self.collector = collector
        self.settings = settings

    async def run_source(self, source_id: str, trigger_type: str = "manual") -> PipelineRun:
        source = self.session.get(Source, source_id)
        if not source:
            raise LookupError("source_not_found")
        if not source.enabled:
            raise SourceDisabledError("source_disabled")

        run = PipelineRun(
            id=new_id(),
            source_id=source.id,
            trigger_type=trigger_type,
            collector_version=self.settings.collector_version,
            normalizer_version=self.settings.normalizer_version,
            counters={"artifacts_created": 0, "artifacts_reused": 0, "documents_created": 0, "documents_reused": 0},
        )
        fetch = SourceFetch(id=new_id(), pipeline_run_id=run.id, source_id=source.id, requested_url=source.feed_url)
        source.last_attempt_at = now_utc()
        self.session.add_all([run, fetch])
        self.session.commit()

        host = (urlsplit(source.feed_url).hostname or "").lower().rstrip(".")
        network_policy = SourceNetworkPolicy(
            primary_host=host,
            redirect_hosts=tuple(source.allowed_redirect_hosts),
            allow_http=urlsplit(source.feed_url).scheme == "http",
            allowed_ports=(443, 80) if urlsplit(source.feed_url).scheme == "http" else (443,),
        )

        try:
            conditional_headers: dict[str, str] = {}
            if source.etag:
                conditional_headers["If-None-Match"] = source.etag
            if source.last_modified:
                conditional_headers["If-Modified-Since"] = source.last_modified
            result = await self.collector.collect(
                source.feed_url,
                network_policy,
                timeout_seconds=source.timeout_seconds,
                max_bytes=source.max_response_bytes,
                conditional_headers=conditional_headers,
            )
            response = result.response
            fetch.final_url = canonicalize_url(response.url)
            fetch.http_status = response.status
            fetch.response_headers = response.headers
            fetch.redirect_chain = result.redirect_chain
            fetch.response_bytes = len(response.body)

            if response.status == 304:
                fetch.outcome = "not_modified"
                fetch.finished_at = now_utc()
                run.status = "succeeded"
                run.finished_at = now_utc()
                source.last_success_at = now_utc()
                source.consecutive_failures = 0
                source.etag = response.headers.get("etag") or source.etag
                source.last_modified = response.headers.get("last-modified") or source.last_modified
                self._audit(run, "fetch.not_modified", "source", source.id, {"status": 304})
                self.session.commit()
                return run

            canonical_url = canonicalize_url(response.url)
            raw_hash = sha256_bytes(response.body)
            url_hash = sha256_text(canonical_url)
            artifact = self.session.scalar(
                select(RawArtifact).where(
                    RawArtifact.source_id == source.id,
                    RawArtifact.canonical_url_hash == url_hash,
                    RawArtifact.sha256 == raw_hash,
                )
            )
            if artifact is None:
                artifact = RawArtifact(
                    source_id=source.id,
                    canonical_url=canonical_url,
                    canonical_url_hash=url_hash,
                    sha256=raw_hash,
                    payload=response.body,
                    byte_length=len(response.body),
                    media_type=response.headers.get("content-type", "").split(";", 1)[0],
                )
                self.session.add(artifact)
                self.session.flush()
                self._increment(run, "artifacts_created")
                self._audit(run, "artifact.created", "raw_artifact", artifact.id, {"sha256": raw_hash.hex(), "bytes": len(response.body)})
            else:
                self._increment(run, "artifacts_reused")

            fetch.artifact_id = artifact.id
            fetch.outcome = "succeeded"
            fetch.finished_at = now_utc()
            self.session.commit()  # Preserve the immutable response even if parsing is quarantined.

            parsed = parse_feed(response.body, response.url)
            for document in parsed:
                self._upsert_document(source, artifact, document, run)

            run.status = "succeeded"
            run.finished_at = now_utc()
            run.heartbeat_at = now_utc()
            source.last_success_at = now_utc()
            source.consecutive_failures = 0
            source.etag = response.headers.get("etag") or source.etag
            source.last_modified = response.headers.get("last-modified") or source.last_modified
            self._audit(run, "ingestion.succeeded", "source", source.id, dict(run.counters))
            self.session.commit()
            return run
        except (CollectionError, CollectorPolicyError, FeedParseError) as exc:
            self.session.rollback()
            run = self.session.get(PipelineRun, run.id)
            fetch = self.session.get(SourceFetch, fetch.id)
            source = self.session.get(Source, source.id)
            assert run is not None and fetch is not None and source is not None
            code = getattr(exc, "code", str(exc))
            fetch.outcome = "rejected" if isinstance(exc, CollectorPolicyError) else "failed"
            fetch.error_code = code[:100]
            fetch.error_detail = type(exc).__name__
            fetch.finished_at = now_utc()
            run.status = "failed"
            run.error_code = code[:100]
            run.error_detail = type(exc).__name__
            run.finished_at = now_utc()
            source.consecutive_failures += 1
            if isinstance(exc, FeedParseError):
                source.status = "parser_quarantine"
            self._audit(run, "ingestion.failed", "source", source.id, {"error_code": code[:100]})
            self.session.commit()
            return run

    def _upsert_document(self, source: Source, artifact: RawArtifact, parsed: ParsedDocument, run: PipelineRun) -> None:
        existing = self.session.scalar(
            select(NormalizedDocument).where(
                NormalizedDocument.source_id == source.id,
                NormalizedDocument.identity_hash == parsed.identity_hash,
                NormalizedDocument.content_hash == parsed.content_hash,
            )
        )
        if existing is not None:
            document = existing
            self._increment(run, "documents_reused")
        else:
            current = self.session.scalar(
                select(NormalizedDocument)
                .where(
                    NormalizedDocument.source_id == source.id,
                    NormalizedDocument.identity_hash == parsed.identity_hash,
                    NormalizedDocument.superseded_at.is_(None),
                )
                .order_by(NormalizedDocument.revision.desc())
            )
            revision = 1
            if current is not None:
                current.superseded_at = now_utc()
                revision = current.revision + 1
            document = NormalizedDocument(
                source_id=source.id,
                identity_hash=parsed.identity_hash,
                content_hash=parsed.content_hash,
                revision=revision,
                external_id=parsed.external_id,
                canonical_url=parsed.canonical_url,
                title=parsed.title,
                summary=parsed.summary,
                body_text=parsed.body_text,
                published_at=parsed.published_at,
                normalizer_version=self.settings.normalizer_version,
            )
            self.session.add(document)
            self.session.flush()
            self._increment(run, "documents_created")

        provenance = self.session.scalar(
            select(DocumentProvenance).where(
                DocumentProvenance.document_id == document.id,
                DocumentProvenance.artifact_id == artifact.id,
            )
        )
        if provenance is None:
            self.session.add(
                DocumentProvenance(document_id=document.id, artifact_id=artifact.id, raw_locator=parsed.raw_locator)
            )

    def _audit(self, run: PipelineRun, event_type: str, target_type: str, target_id: str, details: dict) -> None:
        self.session.add(
            AuditEvent(
                event_type=event_type,
                pipeline_run_id=run.id,
                target_type=target_type,
                target_id=target_id,
                details=details,
            )
        )

    @staticmethod
    def _increment(run: PipelineRun, key: str) -> None:
        counters = dict(run.counters)
        counters[key] = counters.get(key, 0) + 1
        run.counters = counters
