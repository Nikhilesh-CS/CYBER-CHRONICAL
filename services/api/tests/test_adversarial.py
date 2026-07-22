import pytest
from datetime import UTC, datetime
from sqlalchemy import func, select

from cyber_chronicle.collector import CollectionError, FetchResponse, SafeHttpCollector
from cyber_chronicle.ingestion import IngestionService
from cyber_chronicle.models import AuditEvent, NormalizedDocument, RawArtifact, Source, SourceFetch
from cyber_chronicle.parser_subprocess import InlineFeedParser
from cyber_chronicle.security import CollectorPolicyError, SourceNetworkPolicy, URLPolicy

from .fixtures import FEED_A, response


def add_source(session) -> Source:  # type: ignore[no-untyped-def]
    source = Source(
        slug="adversarial-feed",
        name="Adversarial Feed",
        feed_url="http://feed.example.test/advisories.xml",
        enabled=True,
        trust_tier=1,
    )
    session.add(source)
    session.commit()
    return source


async def test_redirect_to_unregistered_private_host_is_blocked(transport) -> None:  # type: ignore[no-untyped-def]
    transport.enqueue(
        FetchResponse(
            status=302,
            url="https://feed.example.test/feed.xml",
            headers={"location": "https://127.0.0.1/internal"},
            body=b"",
        )
    )
    collector = SafeHttpCollector(transport)
    with pytest.raises(CollectorPolicyError, match="host_not_registered"):
        await collector.collect(
            "https://feed.example.test/feed.xml",
            SourceNetworkPolicy(primary_host="feed.example.test"),
            5,
            1024,
        )


@pytest.mark.parametrize(
    "url",
    ["https://feed.example.test:bad/feed", "https://[not-ipv6]/feed", "https://feed.example.test/feed?token=secret"],
)
def test_malformed_or_sensitive_urls_fail_with_stable_policy_error(url: str) -> None:
    with pytest.raises(CollectorPolicyError):
        URLPolicy().validate(url, SourceNetworkPolicy(primary_host="feed.example.test"))


async def test_redirect_loop_and_compressed_alternate_transport_are_rejected(transport) -> None:  # type: ignore[no-untyped-def]
    transport.enqueue(
        FetchResponse(
            status=302,
            url="https://feed.example.test/a",
            headers={"location": "/a"},
            body=b"",
        )
    )
    collector = SafeHttpCollector(transport)
    with pytest.raises(CollectionError, match="redirect_loop"):
        await collector.collect(
            "https://feed.example.test/a",
            SourceNetworkPolicy(primary_host="feed.example.test"),
            5,
            1024,
        )

    transport.enqueue(
        FetchResponse(
            status=200,
            url="https://feed.example.test/feed.xml",
            headers={"content-type": "application/rss+xml", "content-encoding": "gzip"},
            body=FEED_A,
        )
    )
    with pytest.raises(CollectionError, match="content_encoding_forbidden"):
        await collector.collect(
            "https://feed.example.test/feed.xml",
            SourceNetworkPolicy(primary_host="feed.example.test"),
            5,
            len(FEED_A) + 1,
        )


async def test_http_failure_metadata_is_preserved_without_body_leak(session, settings, transport) -> None:  # type: ignore[no-untyped-def]
    source = add_source(session)
    secret_body = b"SECRET-BODY-MUST-NOT-BE-LOGGED"
    transport.enqueue(
        FetchResponse(
            status=429,
            url="http://feed.example.test/advisories.xml?cursor=abc",
            headers={"content-type": "application/rss+xml", "retry-after": "120"},
            body=secret_body,
        )
    )
    run = await IngestionService(
        session,
        SafeHttpCollector(transport),
        settings,
        parser=InlineFeedParser(),
    ).run_source(source.id)
    fetch = session.scalar(select(SourceFetch).where(SourceFetch.pipeline_run_id == run.id))
    audit = session.scalar(select(AuditEvent).where(AuditEvent.pipeline_run_id == run.id))
    assert run.status == "failed" and run.error_code == "http_429"
    assert fetch is not None and fetch.http_status == 429 and fetch.response_headers["retry-after"] == "120"
    assert fetch.final_url.endswith("?cursor=%5Bredacted%5D")
    assert secret_body.decode() not in f"{run.error_detail}{fetch.error_detail}{audit.details if audit else ''}"
    assert session.scalar(select(func.count()).select_from(RawArtifact)) == 0
    session.refresh(source)
    assert source.status == "active" and source.next_attempt_at is not None
    next_attempt = source.next_attempt_at if source.next_attempt_at.tzinfo else source.next_attempt_at.replace(tzinfo=UTC)
    assert 60 <= (next_attempt - datetime.now(UTC)).total_seconds() <= 125


async def test_permanent_http_failure_pauses_source(session, settings, transport) -> None:  # type: ignore[no-untyped-def]
    source = add_source(session)
    transport.enqueue(
        FetchResponse(
            status=404,
            url="http://feed.example.test/advisories.xml",
            headers={"content-type": "application/rss+xml"},
            body=b"not found",
        )
    )
    run = await IngestionService(
        session,
        SafeHttpCollector(transport),
        settings,
        parser=InlineFeedParser(),
    ).run_source(source.id)
    session.refresh(source)
    assert run.error_code == "http_404"
    assert source.status == "paused_permanent"
    assert source.next_attempt_at is None


@pytest.mark.parametrize(
    "unsafe_payload",
    [
        b"<?xml version='1.0'?><html><body>not a feed</body></html>",
        b"<?xml version='1.0'?><!DOCTYPE rss [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><rss><channel/></rss>",
        b"<?xml version='1.0'?><rss><channel><item><guid>x</guid><title>X</title><link>javascript:alert(1)</link></item></channel></rss>",
    ],
)
async def test_unsafe_xml_is_quarantined_after_artifact_preservation(session, settings, transport, unsafe_payload) -> None:  # type: ignore[no-untyped-def]
    source = add_source(session)
    transport.enqueue(response(unsafe_payload))
    run = await IngestionService(
        session,
        SafeHttpCollector(transport),
        settings,
        parser=InlineFeedParser(),
    ).run_source(source.id)
    session.refresh(source)
    assert run.status == "failed"
    assert source.status == "parser_quarantine"
    assert session.scalar(select(func.count()).select_from(RawArtifact)) == 1
    assert session.scalar(select(func.count()).select_from(NormalizedDocument)) == 0


class ExplodingParser:
    async def parse(self, payload: bytes, source_url: str, max_entries: int):  # type: ignore[no-untyped-def]
        raise RuntimeError("unexpected parser defect with secret body text")


async def test_unexpected_parser_error_still_finalizes_run(session, settings, transport) -> None:  # type: ignore[no-untyped-def]
    source = add_source(session)
    transport.enqueue(response(FEED_A))
    run = await IngestionService(session, SafeHttpCollector(transport), settings, parser=ExplodingParser()).run_source(source.id)
    fetch = session.scalar(select(SourceFetch).where(SourceFetch.pipeline_run_id == run.id))
    assert run.status == "failed" and run.error_code == "internal_ingestion_error"
    assert run.error_detail == "RuntimeError"
    assert fetch is not None and fetch.finished_at is not None
