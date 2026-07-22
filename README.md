# Cyber Chronicle

Cyber Chronicle is a laptop-first autonomous cybersecurity newsroom. It is designed to collect, corroborate, analyze, and publish actionable cyber intelligence while keeping severity, confidence, source evidence, and AI inference visibly separate.

## Current milestone

The repository currently contains the first runnable product increment: a polished, data-driven newsroom prototype with deterministic simulated intelligence.

- Decision-first newsroom with breaking intelligence and critical watchlist
- Live cyber event feed
- Critical-alert triage table
- Vulnerability dashboard with exploitation-evidence policy
- Incident evidence drawer with mitigation, sources, discrepancies, IOCs, and update history
- Search, severity filters, notifications, keyboard shortcut, and device-local saved stories
- Responsive laptop layouts for 1366×768 and larger displays
- Clear labeling that prototype incidents are simulated

The interface deliberately does not claim that fixture intelligence is live or that AI-generated conclusions are verified facts.

## Run locally

Requirements: Node.js 22.13 or newer.

```powershell
npm install
npm run dev
```

Production verification:

```powershell
npm test
```

## Delivery sections

1. Product foundation and laptop newsroom shell — complete
2. Primary intelligence views and evidence reader — complete
3. Trusted-source registry, storage, and scheduled collection — planned
4. Deduplication, entity/IOC extraction, and story clustering — planned
5. Claim-level corroboration, confidence, and evidence-grounded drafting — planned
6. Alerts, briefings, operations, and security hardening — planned

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the staged acceptance gates and technical boundaries.

## Editorial principles

- Confidence and severity are separate assessments.
- Repeated reporting from one original source is one evidence chain, not independent corroboration.
- Every published factual claim must be traceable to source evidence.
- Conflicts and corrections stay visible; article history is immutable.
- Collected web content is hostile input and never becomes tool instructions.
- Indicators are defanged by default and operational exploit detail is restricted.
