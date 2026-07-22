# Cyber Chronicle implementation plan

The work is divided into independently verifiable sections. A section advances only after its acceptance gate passes.

## Section 1 — Product foundation

Status: complete.

- Establish the laptop-first application shell, design tokens, navigation, responsive rules, empty/error states, and deterministic demo data.
- Keep the first viewport decision-oriented: highest-priority threat, confidence, evidence count, affected surface, and freshness.

Acceptance gate: the application builds; the user can identify the lead threat, its severity, confidence, and affected product without navigating away.

## Section 2 — Intelligence experience

Status: complete for prototype data.

- Newsroom, live feed, critical alerts, CVE dashboard, evidence drawer, search, filters, saved stories, and preferences.
- Distinguish verified, developing, corrected, disputed, and archived states.
- Preserve context by opening incident analysis in a drawer.

Acceptance gate: a laptop user can filter current events, inspect evidence and mitigation, understand exploitation status, and save a story.

## Section 3 — Trusted ingestion foundation

Status: offline laptop gate complete.

- Add FastAPI, PostgreSQL, migrations, a source registry, raw-artifact preservation, rate-limited RSS/API collectors, normalization, exact deduplication, job health, and audit events.
- Begin with 10–20 authoritative government, vulnerability-authority, and vendor feeds.

Acceptance gate: repeated scheduled runs ingest the approved source set without duplicate artifacts, and every normalized document points to an immutable raw artifact.

Checkpoint result: deterministic repeated-run fixtures now produce separate run/fetch history, exact artifact reuse, immutable changed responses, document revisions, and provenance edges. PostgreSQL 16 migrations, constraints, immutability triggers, downgrade/upgrade cycling, and binary/JSON/timezone round-trips pass against a disposable real server. Parsing runs through a strict bounded subprocess. The local API starts with all reviewed source candidates disabled. Windows Job Object/container enforcement, OS-level egress denial, multi-worker concurrency leases, and terms/robots snapshot monitoring remain required before unattended live collection is considered production-ready.

## Section 4 — Correlation and deterministic intelligence

Status: planned.

- Parse CVE/CWE/CVSS, IP/domain/URL/hash, vendor/product/version, dates, and named entities.
- Build exact and near-duplicate detection, event/story clustering, source-dependency graphs, and reversible merge decisions.

Acceptance gate: known duplicates cluster correctly, distinct incidents remain separate, and every extracted observable traces to an evidence passage.

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
