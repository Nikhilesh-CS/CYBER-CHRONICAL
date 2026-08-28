# Free-edition delivery plan

## 1. Static reader

Complete: the existing newspaper interface is exported as static HTML, CSS, and JavaScript under the GitHub project path.

## 2. Static news snapshot

Complete: the reviewed source collector writes `public/data/news.json` without a database.

## 3. Honest refresh

Complete: browser refresh reloads the latest published edition and does not claim to contact sources.

## 4. Free automation

Complete: GitHub Actions collects and deploys hourly or on demand to GitHub Pages.

## 5. Verification

Complete: static export, source adapter fixtures, base-path URLs, metadata-only output, failure fallback, image extraction, notification payloads, and the no-Firebase local-notification path are covered by the automated build and test suite.

## 6. On-device notifications

Complete locally: notification preferences and seen-story identifiers stay on the device, refreshed snapshots are evaluated by the service worker, and existing stories are baselined before new alerts are shown. Periodic background checks are enabled where the installed browser supports them, but their timing remains best effort. Device receipt must still be verified after deployment.

## 7. Connected intelligence and motion

Complete locally: the publication workflow creates MiniLM embeddings, reuses unchanged vectors, writes a static intelligence sidecar, and links each story to its nearest related coverage. Reader opens and saves build a device-only interest profile used in a guarded ranking blend. Breaking stories use a two-hour decaying score and receive a distinct red treatment. Motion is reserved for breaking updates, card/state transitions, article entry, related coverage, images, tabs, and toasts, with reduced-motion preferences respected. Deployment and visual-device review remain separate gates.
