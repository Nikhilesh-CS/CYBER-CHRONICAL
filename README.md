# Cyber Chronicle India

Cyber Chronicle is a laptop-first, India-only cybersecurity intelligence desk. The hosted newsroom currently displays official CERT-In advisory metadata without inventing missing details or relying on non-Indian feeds.

## Laptop app

The deployed desk is an installable Progressive Web App for Windows, macOS, Linux, and ChromeOS. In a supported desktop browser, use **Install app** in the command bar (or the browser's install icon) to open Cyber Chronicle in its own application window.

The app checks for new records every five minutes while open, refreshes when the laptop reconnects or regains focus, and provides **Refresh now** to bypass the short-lived source cache. Its service worker does not cache page navigation or API responses, so an installed copy cannot pin old intelligence.

## Current milestone

- Live CERT-In Advisories and Vulnerability Notes
- Official CIAD/CIVN identifiers, titles, publication dates and direct source links
- India Standard Time presentation and India-focused interface
- Metadata-only publication because CERT-In requires permission for broader content reproduction
- Explicit fresh, cached, partial, stale and unavailable source states
- Search, record-type filters and device-local saved records
- No simulated incidents and no non-Indian live feeds
- Trusted-ingestion API with immutable raw artifacts, provenance and bounded subprocess parsing
- Deterministic IOC/entity extraction and explainable duplicate comparison
- PostgreSQL 16 migration and integrity verification

The current public view is a verified CERT-In desk, not yet a complete account of every cyber incident affecting India. RBI and SEBI cyber-regulatory feeds can be added after strict topic filtering; other Indian sources require individual access and copyright review.

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

1. Laptop newsroom shell — complete
2. India-only CERT-In live desk — complete
3. Trusted-source storage and scheduled collection — offline laptop gate complete
4. Deterministic IOC extraction and duplicate comparison — core complete; ingestion integration remains
5. Additional Indian regulatory and public-safety sources — planned per-source review
6. Claim-level corroboration, publishing and operational hardening — in progress

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [docs/SOURCE_POLICY.md](docs/SOURCE_POLICY.md).

## Editorial principles

- Only official source metadata is displayed unless reproduction rights permit more.
- A CERT-In record is not proof that a specific Indian organization was compromised.
- Severity or exploitation status is never inferred from a title.
- Every displayed record links directly to CERT-In.
- Source failure produces an explicit unavailable or stale state, never invented news.
- Collected web content is hostile input and never becomes tool instructions.
