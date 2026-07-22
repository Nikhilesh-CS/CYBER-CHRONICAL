from __future__ import annotations

from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from .collector import AioHttpTransport, SafeHttpCollector
from .config import Settings
from .database import SessionLocal
from .ingestion import IngestionService
from .models import Source


async def run_due_sources(settings: Settings) -> None:
    """Collect due sources serially to keep laptop resource usage bounded."""
    now = datetime.now(UTC)
    with SessionLocal() as discovery_session:
        candidates = list(
            discovery_session.scalars(
                select(Source).where(Source.enabled.is_(True), Source.status == "active")
            )
        )
        due_ids = [
            source.id
            for source in candidates
            if source.last_attempt_at is None
            or source.last_attempt_at <= now - timedelta(seconds=source.poll_interval_seconds)
        ]

    for source_id in due_ids:
        with SessionLocal() as session:
            collector = SafeHttpCollector(
                AioHttpTransport(settings.collector_user_agent),
                max_redirects=settings.max_redirects,
            )
            await IngestionService(session, collector, settings).run_source(source_id, trigger_type="scheduled")


def build_scheduler(settings: Settings) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        run_due_sources,
        "interval",
        seconds=settings.scheduler_scan_seconds,
        args=[settings],
        id="trusted-source-scan",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=settings.scheduler_scan_seconds,
    )
    return scheduler
