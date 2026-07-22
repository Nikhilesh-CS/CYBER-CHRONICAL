from __future__ import annotations

import json
from pathlib import Path

from pydantic import TypeAdapter
from sqlalchemy import select

from .database import SessionLocal, upgrade_database
from .config import get_settings
from .models import Source
from .schemas import SourceCreate


def seed_candidates(path: Path) -> tuple[int, int]:
    settings = get_settings()
    upgrade_database(settings.database_url)
    payloads = TypeAdapter(list[SourceCreate]).validate_python(json.loads(path.read_text(encoding="utf-8")))
    created = 0
    skipped = 0
    with SessionLocal() as session:
        for payload in payloads:
            if session.scalar(select(Source).where(Source.slug == payload.slug)):
                skipped += 1
                continue
            session.add(
                Source(
                    slug=payload.slug,
                    name=payload.name,
                    source_type=payload.source_type,
                    feed_url=str(payload.feed_url),
                    trust_tier=payload.trust_tier,
                    enabled=False,
                    poll_interval_seconds=payload.poll_interval_seconds,
                    max_response_bytes=payload.max_response_bytes,
                    allowed_redirect_hosts=payload.allowed_redirect_hosts,
                    robots_mode=payload.robots_mode,
                    permitted_use=payload.permitted_use,
                    attribution_text=payload.attribution_text,
                )
            )
            created += 1
        session.commit()
    return created, skipped


if __name__ == "__main__":
    default_path = Path(__file__).resolve().parents[2] / "data" / "source-registry.candidates.json"
    created_count, skipped_count = seed_candidates(default_path)
    print(f"Created {created_count} disabled source candidate(s); skipped {skipped_count} existing.")
