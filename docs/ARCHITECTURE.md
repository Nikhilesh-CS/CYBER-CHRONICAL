# Architecture and trust boundaries

## Target flow

```text
Approved source registry
  -> scheduled collectors
  -> immutable raw artifact store
  -> normalization and exact deduplication
  -> event and story clustering
  -> deterministic intelligence extraction
  -> claim corroboration and conflict detection
  -> confidence and severity policy
  -> editorial safety gate
  -> immutable article version
  -> newspaper sections, article editions, daily briefs, and alerts
```

The first production architecture should be a modular monolith that runs comfortably on a laptop. Split services only when measured load justifies it.

## Intended stack

- Interface: React, TypeScript, vinext/Next-compatible App Router, responsive editorial CSS
- API: Python 3.12+, FastAPI, Pydantic, SQLAlchemy, Alembic
- Storage: PostgreSQL with full-text search; `pgvector` when semantic clustering is introduced
- Jobs: APScheduler in the first single-process prototype; Redis and durable workers when retries and backpressure require them
- Updates: Server-Sent Events until bidirectional real-time behavior is necessary
- Observability: structured logs, pipeline-run records, health endpoints, and append-only audit events

## Core domain distinction

- `SourceArtifact`: one retrieved response or feed item
- `Claim`: an atomic assertion with exact supporting evidence
- `Event`: a real-world occurrence
- `Story`: evolving coverage of one or more related events
- `ArticleVersion`: an immutable published snapshot

Keeping these distinct prevents multiple copies of one press release from looking like independent verification and prevents unrelated campaigns involving one CVE from being merged.

## Security model

All collected content is hostile input.

- Deny localhost, private networks, metadata endpoints, unsafe protocols, unbounded redirects, oversized responses, and archive bombs.
- Never execute fetched scripts or render unsanitized source HTML.
- Separate collection, AI, publication, and alert credentials.
- AI workers have no shell access and no direct publication credentials.
- Fixed structured prompts treat source text as data, not instructions.
- Validate IOCs with strict parsers; defang URLs and domains in reader-facing views.
- Keep model, prompt, parser, and policy versions on every generated or assessed record.
- Preserve corrections, retractions, score changes, and article diffs in the audit trail.

## Confidence is not severity

Confidence describes how strongly evidence supports a claim. Severity describes potential impact. A catastrophic but weakly supported report can be critical severity and developing confidence at the same time; the interface and data model must preserve both dimensions.

## Implemented ingestion boundary

The Section 3 backend now lives in `services/api` and implements:

- approved source records with explicit enablement;
- one pipeline run and fetch record per attempted retrieval;
- content-addressed raw artifacts keyed by source, canonical URL, and exact SHA-256 bytes;
- source-owned normalized document revisions;
- many-to-many provenance edges between documents and the raw feed artifacts that contained them;
- bounded RSS/Atom collection, manual redirects, exact host aliases, public-IP-only DNS resolution, no environment proxy use, no compression, content limits, type sniffing, and hardened XML parsing;
- conditional ETag/Last-Modified requests, parser quarantine, audit events, health/status APIs, and an optional bounded scheduler;
- versioned migrations, including PostgreSQL immutability triggers for raw artifacts and audit events;
- a versioned parser protocol and isolated subprocess with no inherited application secrets, an empty working directory, closed extra handles, wall-time enforcement, and bounded output;
- source failure classification with clamped `Retry-After`, scheduled backoff, parser quarantine, permanent-failure pause, and repeated-transient-failure pause.

The scheduler is disabled by default. Enabling it does not bypass source review: each source is created disabled and must pass the explicit DNS/IP validation endpoint first.

The parser subprocess is a crash, timeout, handle, and environment boundary—not a complete Windows security sandbox. It can still access resources granted to the service account. Unattended hostile-input operation therefore requires a Job Object or network-disabled container plus OS egress rules.
