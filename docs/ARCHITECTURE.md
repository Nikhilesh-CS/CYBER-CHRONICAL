# Free static architecture

```text
Fixed reviewed source registry
  -> scheduled GitHub Actions collector
  -> bounded metadata parsing
  -> conservative duplicate comparison
  -> deterministic beginner explanations
  -> public/data/news.json
  -> static Next.js export
  -> GitHub Pages
```

The public site contains no API route, database, server process, paid AI call, or user account system. It serves static files only.

The browser refresh button reloads the latest published JSON snapshot. Collection happens only in the scheduled or manually started GitHub workflow. If collection fails, the checked-in snapshot remains available.

## Trust boundaries

- Source URLs are fixed in code and cannot be supplied by website visitors.
- Only HTTPS source links from reviewed hostnames are accepted.
- Responses have time and size limits.
- Article bodies are not copied; the snapshot stores attribution metadata and original explanations.
- Confidence and severity remain separate.
- A single source cannot be presented as independent corroboration.
