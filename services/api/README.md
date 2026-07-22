# Trusted ingestion API

This service is the Section 3 backend for Cyber Chronicle. It keeps source policy, retrieval attempts, immutable raw artifacts, normalized document revisions, provenance edges, pipeline runs, and audit events separate.

## Local development

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -e ".\services\api[dev]"
.\.venv\Scripts\python -m uvicorn cyber_chronicle.main:app --reload --port 8000
```

The default local database is SQLite so the offline acceptance suite runs on any laptop. PostgreSQL is the production target and is configured through `CYBER_CHRONICLE_DATABASE_URL`.

## Security boundary

- Only enabled, registered sources can run.
- Registry creation requires HTTPS, and enabling is a separate DNS/IP validation step.
- URLs must match the source hostname or an explicit redirect alias.
- HTTPS is required unless the registered source itself is an HTTP-only test fixture.
- aiohttp connects through a resolver that returns only globally routable IP addresses.
- Redirects are manual, revalidated, loop-limited, and cannot downgrade HTTPS.
- Environment proxies, cookies, compression, unsafe media types, oversized bodies, DTDs, and entities are rejected.
- Fetched bodies are stored as immutable bytes before parsing; parser failures quarantine the source and cannot create publishable documents.
- Fetch and error logs store bounded metadata, never response bodies or credentials.

Production rollout additionally requires PostgreSQL migrations, database immutability triggers, OS/container egress restrictions, and a subprocess parser sandbox before unattended internet collection is enabled.

## Candidate sources

`data/source-registry.candidates.json` contains reviewed candidates, always disabled by default. Seed them with:

```powershell
.\.venv\Scripts\python -m cyber_chronicle.seed
```

Each candidate still requires the explicit `validate-and-enable` API operation. The initial registry intentionally contains only Google Project Zero's official Atom feed; more sources should be added only after their current feed URL, attribution, terms, and permitted use are reviewed.
