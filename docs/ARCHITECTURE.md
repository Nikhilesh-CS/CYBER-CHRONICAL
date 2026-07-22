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
  -> search, dashboard, briefs, and alerts
```

The first production architecture should be a modular monolith that runs comfortably on a laptop. Split services only when measured load justifies it.

## Intended stack

- Interface: React, TypeScript, vinext/Next-compatible App Router, Tailwind CSS
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
