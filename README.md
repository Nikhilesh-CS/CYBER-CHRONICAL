# Cyber Chronicle

Cyber Chronicle is a laptop-first cybersecurity intelligence newsroom. It keeps source evidence, CVSS severity, exploitation evidence, and Cyber Chronicle processing visibly separate.

## Current milestone

The public newsroom now displays live, validated government-source vulnerability intelligence instead of demonstration incidents.

- CISA Known Exploited Vulnerabilities records, including required action and due dates
- Recently modified NIST National Vulnerability Database records and source-supplied CVSS severity
- Visible source health, retrieval timestamps, direct references, partial/stale/unavailable states, and no fabricated fallback news
- Search, evidence filters, notifications, keyboard navigation, and device-local saved records
- Responsive laptop layouts for 1366×768 and larger displays
- Trusted-ingestion API with immutable raw artifacts, provenance, retry controls, and bounded subprocess parsing
- Deterministic IOC/entity extraction with evidence spans and explainable exact/near-duplicate comparison
- PostgreSQL 16 migration, integrity, immutability, and rollback verification

The hosted view currently covers CISA KEV and recent NVD changes. It is not yet a complete representation of every cybersecurity incident worldwide, and it does not claim that every NVD record is actively exploited.

## Run locally

Requirements: Node.js 22.13 or newer, Python 3.12+, and Docker Desktop for the PostgreSQL gate.

```powershell
npm install
npm run dev
```

Complete verification:

```powershell
.\scripts\verify-all.ps1
```

## Delivery sections

1. Product foundation and laptop newsroom shell — complete
2. Real-source vulnerability newsroom and evidence reader — complete
3. Trusted-source registry, storage, and scheduled collection — offline laptop gate complete
4. Deterministic IOC extraction and duplicate comparison — core complete; ingestion integration and story clustering remain
5. Claim-level corroboration and evidence-grounded drafting — planned
6. Alerts, briefings, production sandboxing, and operations — in progress

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [docs/SOURCE_POLICY.md](docs/SOURCE_POLICY.md).

## Editorial principles

- Confidence and severity are separate assessments.
- CISA KEV membership is exploitation evidence; it is not a Cyber Chronicle severity score.
- NVD severity is displayed only when supplied by NVD CVSS data.
- Repeated reporting from one original source is one evidence chain, not independent corroboration.
- Every displayed claim remains traceable to a source record.
- Source failure produces an explicit unavailable or stale state, never invented news.
- Collected web content is hostile input and never becomes tool instructions.
