# Free static architecture

```text
Fixed reviewed source registry
  -> scheduled GitHub Actions collector
  -> bounded metadata parsing
  -> conservative duplicate comparison
  -> deterministic beginner explanations
  -> public/data/news.json
  -> local MiniLM semantic enrichment
  -> public/data/intelligence.json (vectors + related story graph)
  -> static Next.js export
  -> GitHub Pages
```

The public site contains no API route, database, server process, paid AI call, or user account system. It serves static files only.

The browser refresh button reloads the latest published JSON snapshot. Collection happens only in the scheduled or manually started GitHub workflow. If collection fails, the checked-in snapshot remains available.

Notification preferences and seen-story identifiers remain on the device. The service worker evaluates new snapshot items after an app refresh and may use Periodic Background Sync when the installed browser grants it. This background timing is not guaranteed and does not introduce a push server, user account, or database.

## Connected intelligence

The GitHub Actions build uses a quantized open-source MiniLM model through Transformers.js. The model runs during publication, not in the reader's browser. Unchanged story vectors are reused from the previous sidecar, and a deterministic lexical fallback keeps publication available if model loading fails. Pairwise cosine similarity produces bounded related-story links.

The reader stores a normalized interest vector locally. Opens and saves update that profile; no behavior is uploaded. Ranking blends affinity with the existing editorial score. A separate breaking score uses severity, exponential recency decay, official-source status, corroboration, and source-count velocity. It cannot label stories older than two hours as breaking.

## Trust boundaries

- Source URLs are fixed in code and cannot be supplied by website visitors.
- Only HTTPS source links from reviewed hostnames are accepted.
- Responses have time and size limits.
- Article bodies are not copied; the snapshot stores attribution metadata and original explanations.
- Confidence and severity remain separate.
- A single source cannot be presented as independent corroboration.
