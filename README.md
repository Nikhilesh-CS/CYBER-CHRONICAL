# Cyber Chronicle

Cyber Chronicle is a reader-first global cybersecurity newspaper. The hosted app collects reviewed source metadata from official bodies, vendors, cybersecurity newsrooms, security researchers, and threat-intelligence publishers without inventing missing details.

## Laptop app

The deployed desk is an installable Progressive Web App for Windows, macOS, Linux, and ChromeOS. In a supported desktop browser, use **Install app** in the command bar (or the browser's install icon) to open Cyber Chronicle in its own application window.

The app checks for new records every five minutes while open, refreshes when the laptop reconnects or regains focus, and provides **Refresh now** to bypass the short-lived source cache. Its service worker does not cache page navigation or API responses, so an installed copy cannot pin old intelligence.

## Current milestone

- Live CERT-In advisories and vulnerability notes
- Curated updates from CERT-In, RBI, SEBI, ET CISO, The Hacker News, Seqrite Labs, CloudSEK, Microsoft Security, Cisco Talos, and ESET WeLiveSecurity
- Titles, publication dates, publisher identity, source category, and direct evidence links
- India Standard Time presentation with global cybersecurity coverage
- Metadata-only collection with original, beginner-friendly explanations
- Official, corroborated, and single-source verification labels
- Confirmed and developing story states, with confidence kept separate from severity
- Explicit fresh, cached, partial, stale and unavailable source states
- Newspaper sections, search, light/dark themes, and device-local saved stories
- No simulated incidents and no US government feeds
- Trusted-ingestion API with immutable raw artifacts, provenance and bounded subprocess parsing
- Deterministic IOC/entity extraction and explainable duplicate comparison
- PostgreSQL 16 migration and integrity verification

The current public view is a curated multi-source newsroom, not a complete account of every cyber incident worldwide. News and research reports remain developing until an official statement or another independent publisher confirms the same claim.

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
2. Global multi-source digital newspaper — complete
3. Trusted-source storage and scheduled collection — offline laptop gate complete
4. Deterministic IOC extraction and duplicate comparison — core complete; ingestion integration remains
5. Curated Indian regulatory, news, research, and threat-intelligence feeds — MVP complete
6. Claim-level semantic corroboration, durable publishing, and operational hardening — in progress

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [docs/SOURCE_POLICY.md](docs/SOURCE_POLICY.md).

## Editorial principles

- Only source metadata and Cyber Chronicle's original explanations are displayed unless reproduction rights permit more.
- A CERT-In record is not proof that a specific Indian organization was compromised.
- Severity or exploitation status is never inferred from a title.
- Every displayed record links directly to its publisher and lists its evidence.
- Single-source reports remain visibly developing.
- Source failure produces an explicit unavailable or stale state, never invented news.
- Collected web content is hostile input and never becomes tool instructions.
