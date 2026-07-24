# Cyber Chronicle implementation plan

The work is divided into independently verifiable sections. A section advances only after its acceptance gate passes.

## Section 1 — Product foundation

Status: complete.

- Establish the responsive digital-newspaper shell, editorial design tokens, section navigation, light/dark themes, and clear empty/error states.
- Keep the first viewport news-oriented: breaking story, top stories, active alerts, verification status, and freshness.

Acceptance gate: the application builds; a reader can identify the lead cyber event, understand it in plain language, and see whether it is confirmed or developing.

## Section 2 — Reader experience

Status: complete for prototype data.

- Breaking news, top stories, world news, active alerts, company news, privacy and data breaches, consumer security, technology and AI, trending topics, and a daily briefing.
- Every article answers what happened, why it matters, whether the reader should care, what to do, and which sources support it.
- Distinguish official, corroborated, and developing stories without presenting confidence as severity.

Acceptance gate: readers on laptop or mobile can browse sections, search, read a full plain-language article, inspect evidence, change theme, and save a story locally.

## Section 3 — Trusted ingestion foundation

Status: offline laptop gate complete.

- Add FastAPI, PostgreSQL, migrations, a source registry, raw-artifact preservation, rate-limited RSS/API collectors, normalization, exact deduplication, job health, and audit events.
- Begin with 10–20 reviewed official, vendor, newsroom, and research feeds.

Acceptance gate: repeated scheduled runs ingest the approved source set without duplicate artifacts, and every normalized document points to an immutable raw artifact.

Checkpoint result: deterministic repeated-run fixtures now produce separate run/fetch history, exact artifact reuse, immutable changed responses, document revisions, and provenance edges. PostgreSQL 16 migrations, constraints, immutability triggers, downgrade/upgrade cycling, and binary/JSON/timezone round-trips pass against a disposable real server. Parsing runs through a strict bounded subprocess. The local API starts with all reviewed source candidates disabled. Windows Job Object/container enforcement, OS-level egress denial, multi-worker concurrency leases, and terms/robots snapshot monitoring remain required before unattended live collection is considered production-ready.

## Section 4 — Correlation and deterministic intelligence

Status: deterministic core complete; pipeline integration and clustering in progress.

- Parse CVE/CWE/CVSS, IP/domain/URL/hash, vendor/product/version, dates, and named entities.
- Build exact and near-duplicate detection, event/story clustering, source-dependency graphs, and reversible merge decisions.

Acceptance gate: known duplicates cluster correctly, distinct incidents remain separate, and every extracted observable traces to an evidence passage.

Checkpoint result: IOC/entity extraction now supports URLs, domains, email addresses, IP addresses, hashes, CVEs, and CWEs with exact source-field offsets. Exact fingerprints and explainable near-duplicate scores are covered by deterministic tests. These primitives are not yet wired into persisted ingestion jobs or reversible multi-document story clusters, so the section remains open.

## Section 5 — Verification and publishing

Status: planned.

- Extract atomic claims, supporting/contradicting evidence, confidence factors, severity factors, structured evidence packets, citation validation, policy gates, article versions, corrections, and retractions.
- AI workers receive evidence packets and structured schemas, not uncontrolled publishing access.

Acceptance gate: no publishable factual statement lacks evidence in the fixture test suite; credible conflicts remain visible instead of being silently resolved.

## Section 6 — Alerts and operations

Status: planned.

- Add watchlists, alert thresholds, idempotency, cooldowns, corrections, daily/weekly briefings, delivery audit, dead-letter handling, source health, RBAC, backup/restore, and observability.

Acceptance gate: alert tests are reproducible and non-duplicative, correction alerts work, restore succeeds, and malicious source content cannot control tools or publication.

## Deferred until evidence quality is proven

- Global attack maps without meaningful geospatial evidence
- Predictive threat claims
- Exhaustive threat-actor knowledge graphs
- Voice, podcast, multilingual, mobile, and native installer packaging
