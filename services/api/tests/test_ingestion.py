from sqlalchemy import func, select

from cyber_chronicle.collector import SafeHttpCollector
from cyber_chronicle.ingestion import IngestionService
from cyber_chronicle.models import DocumentProvenance, NormalizedDocument, PipelineRun, RawArtifact, Source, SourceFetch
from cyber_chronicle.parser_subprocess import InlineFeedParser

from .fixtures import FEED_A, FEED_B, FEED_Y_REVISED, response


def add_source(session) -> Source:  # type: ignore[no-untyped-def]
    source = Source(
        slug="fixture-feed",
        name="Fixture Feed",
        feed_url="http://feed.example.test/advisories.xml",
        enabled=True,
        trust_tier=1,
    )
    session.add(source)
    session.commit()
    return source


async def test_approved_source_repeated_schedule_is_idempotent(session, settings, transport) -> None:  # type: ignore[no-untyped-def]
    source = add_source(session)
    transport.enqueue(response(FEED_A, etag='"a"'))
    transport.enqueue(response(FEED_A, etag='"a"'))
    transport.enqueue(response(b"", status=304, etag='"a"'))
    transport.enqueue(response(FEED_B, etag='"b"'))
    service = IngestionService(session, SafeHttpCollector(transport), settings, parser=InlineFeedParser())

    for _ in range(4):
        run = await service.run_source(source.id, trigger_type="scheduled")
        assert run.status == "succeeded"

    assert session.scalar(select(func.count()).select_from(PipelineRun)) == 4
    assert session.scalar(select(func.count()).select_from(SourceFetch)) == 4
    assert session.scalar(select(func.count()).select_from(RawArtifact)) == 2
    assert session.scalar(select(func.count()).select_from(NormalizedDocument)) == 3
    assert session.scalar(select(func.count()).select_from(DocumentProvenance)) == 4
    outcomes = list(session.scalars(select(SourceFetch.outcome).order_by(SourceFetch.started_at)))
    assert outcomes.count("not_modified") == 1
    assert transport.calls[1][1]["If-None-Match"] == '"a"'


async def test_changed_item_creates_revision_and_preserves_history(session, settings, transport) -> None:  # type: ignore[no-untyped-def]
    source = add_source(session)
    transport.enqueue(response(FEED_A))
    transport.enqueue(response(FEED_Y_REVISED))
    service = IngestionService(session, SafeHttpCollector(transport), settings, parser=InlineFeedParser())

    await service.run_source(source.id)
    await service.run_source(source.id)

    revisions = list(
        session.scalars(
            select(NormalizedDocument)
            .where(NormalizedDocument.external_id == "y")
            .order_by(NormalizedDocument.revision)
        )
    )
    assert [item.revision for item in revisions] == [1, 2]
    assert revisions[0].superseded_at is not None
    assert revisions[1].superseded_at is None


async def test_parser_failure_preserves_artifact_and_quarantines_source(session, settings, transport) -> None:  # type: ignore[no-untyped-def]
    source = add_source(session)
    transport.enqueue(response(b"<?xml version='1.0'?><rss><broken>"))
    service = IngestionService(session, SafeHttpCollector(transport), settings, parser=InlineFeedParser())

    run = await service.run_source(source.id)
    session.refresh(source)

    assert run.status == "failed"
    assert source.status == "parser_quarantine"
    assert session.scalar(select(func.count()).select_from(RawArtifact)) == 1
    assert session.scalar(select(func.count()).select_from(NormalizedDocument)) == 0
