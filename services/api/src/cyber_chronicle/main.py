from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from .collector import AioHttpTransport, SafeHttpCollector
from .config import get_settings
from .database import get_session, upgrade_database
from .ingestion import IngestionService, SourceDisabledError
from .models import NormalizedDocument, PipelineRun, RawArtifact, Source, SourceFetch
from .schemas import DocumentRead, RunRead, SourceCreate, SourceRead
from .scheduler import build_scheduler
from .security import CollectorPolicyError, resolve_public_addresses


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    upgrade_database(settings.database_url)
    scheduler = build_scheduler(settings) if settings.scheduler_enabled else None
    if scheduler:
        scheduler.start()
    try:
        yield
    finally:
        if scheduler:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="Cyber Chronicle Ingestion API",
    version="0.1.0",
    description="Trusted source registry, immutable artifacts, normalization, and provenance.",
    lifespan=lifespan,
)


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "alive"}


@app.get("/health/ready")
def ready(session: Session = Depends(get_session)) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/api/v1/sources", response_model=list[SourceRead])
def list_sources(session: Session = Depends(get_session)) -> list[Source]:
    return list(session.scalars(select(Source).order_by(Source.name)))


@app.post("/api/v1/sources", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(payload: SourceCreate, session: Session = Depends(get_session)) -> Source:
    if session.scalar(select(Source).where(Source.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="source_slug_exists")
    if payload.enabled:
        raise HTTPException(status_code=422, detail="source_must_be_validated_before_enable")
    source = Source(
        slug=payload.slug,
        name=payload.name,
        feed_url=str(payload.feed_url),
        source_type=payload.source_type,
        trust_tier=payload.trust_tier,
        enabled=payload.enabled,
        poll_interval_seconds=payload.poll_interval_seconds,
        max_response_bytes=payload.max_response_bytes,
        allowed_redirect_hosts=payload.allowed_redirect_hosts,
        robots_mode=payload.robots_mode,
        permitted_use=payload.permitted_use,
        terms_url=str(payload.terms_url) if payload.terms_url else None,
        attribution_text=payload.attribution_text,
    )
    session.add(source)
    session.commit()
    return source


@app.post("/api/v1/sources/{source_id}/validate-and-enable", response_model=SourceRead)
async def validate_and_enable_source(source_id: str, session: Session = Depends(get_session)) -> Source:
    source = session.get(Source, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="source_not_found")
    from urllib.parse import urlsplit

    parsed = urlsplit(source.feed_url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(status_code=422, detail="source_https_required")
    try:
        await resolve_public_addresses(parsed.hostname, parsed.port or 443)
        for alias in source.allowed_redirect_hosts:
            await resolve_public_addresses(alias, 443)
    except CollectorPolicyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    source.enabled = True
    source.status = "active"
    session.commit()
    return source


@app.post("/api/v1/sources/{source_id}/disable", response_model=SourceRead)
def disable_source(source_id: str, session: Session = Depends(get_session)) -> Source:
    source = session.get(Source, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="source_not_found")
    source.enabled = False
    source.status = "disabled"
    source.next_attempt_at = None
    session.commit()
    return source


@app.post("/api/v1/sources/{source_id}/run", response_model=RunRead)
async def run_source(source_id: str, session: Session = Depends(get_session)) -> PipelineRun:
    settings = get_settings()
    collector = SafeHttpCollector(AioHttpTransport(settings.collector_user_agent), settings.max_redirects)
    service = IngestionService(session, collector, settings)
    try:
        return await service.run_source(source_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SourceDisabledError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/api/v1/pipeline-runs", response_model=list[RunRead])
def list_runs(session: Session = Depends(get_session)) -> list[PipelineRun]:
    return list(session.scalars(select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(100)))


@app.get("/api/v1/documents", response_model=list[DocumentRead])
def list_documents(session: Session = Depends(get_session)) -> list[NormalizedDocument]:
    return list(
        session.scalars(
            select(NormalizedDocument)
            .where(NormalizedDocument.superseded_at.is_(None))
            .order_by(NormalizedDocument.published_at.desc())
            .limit(200)
        )
    )


@app.get("/api/v1/pipeline/status")
def pipeline_status(session: Session = Depends(get_session)) -> dict:
    return {
        "sources": session.scalar(select(func.count()).select_from(Source)) or 0,
        "enabled_sources": session.scalar(select(func.count()).select_from(Source).where(Source.enabled.is_(True))) or 0,
        "paused_sources": session.scalar(select(func.count()).select_from(Source).where(Source.status.like("paused_%"))) or 0,
        "quarantined_sources": session.scalar(select(func.count()).select_from(Source).where(Source.status == "parser_quarantine")) or 0,
        "pipeline_runs": session.scalar(select(func.count()).select_from(PipelineRun)) or 0,
        "fetch_attempts": session.scalar(select(func.count()).select_from(SourceFetch)) or 0,
        "raw_artifacts": session.scalar(select(func.count()).select_from(RawArtifact)) or 0,
        "normalized_documents": session.scalar(select(func.count()).select_from(NormalizedDocument)) or 0,
    }
