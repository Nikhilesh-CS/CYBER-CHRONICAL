# Cyber Chronicle security remediation

Reviewed on November 25, 2026 against ARTEX findings A–F and the deployed release at `8f5c29bc169199bb539223c7892bdae5111549ee`. The reported test target was a development server. GitHub Pages serves the static `out/` export.

## Findings

| ARTEX finding | Reported severity | Verification and impact | Files and remediation | Regression coverage | Status |
| --- | --- | --- | --- | --- | --- |
| A. Open redirect from query parameters | Critical | The router reads app state and story IDs. `url, ref, redirect, next, returnUrl` never supply a navigation destination. History writes start from the current page URL. | `lib/navigation.ts` bounds story identifiers. The query router keeps its existing behavior. | Query destination and deep-link round-trip test | FALSE POSITIVE |
| B. Missing CSP | High in finding B, Medium in the executive summary | The live page returned HTTP 200 with HSTS and an enforcing CSP meta tag. The policy precedes scripts, hashes inline bootstrap scripts, blocks inline script attributes, disables base URLs and limits worker and resource loading. The CSP response header was absent. | `scripts/add-csp.mjs` already runs after static page generation. The existing policy and hosting configuration were retained. | Every exported HTML page now has its CSP position and exact inline script hashes tested. | FALSE POSITIVE |
| C. npm advisories | 1 Critical, 9 High, 8 Moderate, 1 Low | The baseline lockfile matched all 19 package records. The static export has no live Next.js server, image optimizer, Server Actions or dynamic image response routes. The affected packages were in the dependency graph used by developers and CI. | `package.json and package-lock.json` update Next.js, its ESLint config, Transformers.js and affected transitive packages. Transformers.js runs in the newsroom job and is declared as build tooling. | Clean install, both audits, full build and tests, native MiniLM inference on Node 22 | CONFIRMED — FIXED |
| C. Next.js RCE on the Pages site | Critical | The installed Next.js version fell in affected server-feature ranges. The Pages workflow uploads static files and runs none of those server features on user requests. | Updated Next.js regardless of hosting exposure. | Static export build and route checks | NOT APPLICABLE |
| D. Notification title and body XSS | Medium | The browser notification API displays title and body strings as text. The worker uses no HTML or DOM sink for these fields. | Notification display continues to use text. Worker fields are normalized and bounded. | Worker test with literal markup in the notification body | FALSE POSITIVE |
| D. Worker messages, notification navigation and cache | Medium | The worker accepted caller-supplied items, coercible preferences and broad same-origin destinations. Some malformed types could interrupt alert processing. The edition cache stored a query-dependent fetch response under a queryless key. | `public/service-worker.js` verifies the source window and message shape, reads the published edition itself, scopes clicks to the application, validates persisted notification state, and caches canonical feed URLs. The app accepts story messages from its controlling worker. | Worker message, notification, click and offline cache tests | CONFIRMED — FIXED |
| E. Unsafe URL handling via query parameters | High | This repeats A. Publisher links are opened deliberately by the reader. Some feed and display paths lacked a common URL policy. | `lib/urls.ts` provides parsed HTTPS validation. Feed ingestion checks reviewed hosts and their default HTTPS port. Article, image, advisory and static export links check HTTPS and reject credentials. | Valid and malformed URL cases, malformed RSS entries, safe publisher navigation | FALSE POSITIVE for query navigation |
| F. LocalStorage XSS and CSRF | Informational/Low | The tested data stores local reading and preference state. The report found no stored XSS, and these values do not authorize a server-side action. | Stored text continues through React rendering and escaped static HTML. | Browser and storage regressions | FALSE POSITIVE |
| F. LocalStorage integrity and data recovery | Informational/Low | Malformed read-alert data or nested archive fields could cause render or reader errors. Untyped preferences and vectors could change filtering and ranking. | `lib/storage.ts`, `lib/preferences.ts`, `lib/reader.ts`, `lib/intelligence/client.ts` and `lib/courses/progress.ts` validate values on read. Valid saved IDs, archived articles, notification settings, watchlists and lesson progress continue to load. Backup import retains its existing size and shape checks. | Corrupted JSON, valid archive retention, preference migration, profile and Academy progress tests | CONFIRMED — FIXED |

The same-page link behavior creates no applicable CVSS vector for A or E. ARTEX's printed CVSS 3.1 vector for A calculates to 6.1 if all of its hypothetical impacts are assumed. [FIRST CVSS 3.1 calculator](https://www.first.org/cvss/calculator/3.1#CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)

The static deployment assessment relies on the Pages workflow and the exported artifact. Notification text and framing behavior were checked against the platform specifications. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [Next.js static export](https://nextjs.org/docs/app/guides/static-exports) · [WHATWG Notifications API](https://notifications.spec.whatwg.org/) · [CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)

## Dependency review

The full baseline audit counted 19 package entries associated with 42 unique advisory records. The production-dependency audit counted 7 package entries. npm's production classification includes Next.js and its tooling dependencies even on a static site. The reviewed advisory conditions require a server feature, a build/tooling input or a vulnerable dependency call. Compiler configuration, stylesheets, glob patterns and source maps in this project come from the repository or installed packages. Feed data enters as article metadata or model text. The newsroom creates text embeddings and leaves image decoding to the browser.

| Package and chain | Baseline → resolved | Patched threshold for the observed range | Reach in Cyber Chronicle |
| --- | --- | --- | --- |
| Next.js (direct) | 16.2.11 → 16.4.6 | 16.4.5 | Build and development. No Pages server runtime. |
| Transformers.js (direct) → sharp, also used by Next.js | 3.8.1 → 4.3.2, sharp 0.34.5 → 0.35.5 | sharp 0.35.5. Transformers.js 4.3.2 is npm's supported update path for its pinned vulnerable dependency. | CI and local index generation. The model path is text-only and statically exported images are unoptimized. |
| Next.js and Tailwind → PostCSS → nanoid and source-map-js | PostCSS 8.4.31 and 8.5.14 → 8.5.23, nanoid 3.3.12 → 3.3.20, source-map-js 1.2.1 → 1.2.4 | PostCSS 8.5.23, nanoid 3.3.18 on the 3.x line, source-map-js 1.2.2 | Build tooling processes trusted CSS and source maps. |
| Next.js and Browserslist → baseline-browser-mapping | 2.10.30 → 2.11.39 | 2.11.0 | Browser target mapping receives build configuration. |
| Next ESLint config → react-hooks plugin → Babel, Browserslist and Zod | Babel 7.29.0 → 7.29.13, Browserslist 4.28.2 → 4.29.6, Zod 4.4.3 → 4.6.7 | Above 7.29.0 and 4.28.6 respectively, Zod 4.6.6 | ESLint tooling. The app does not expose these parsers. |
| ESLint configuration → js-yaml | 4.1.1 → 4.3.2 | 4.3.2 | Configuration tooling. Feed content is RSS or HTML. |
| Next ESLint config → typescript-eslint plugin, parser, type-utils, typescript-estree and utils → minimatch and brace-expansion | TypeScript ESLint family 8.59.3 → 8.74.0, affected minimatch 10.2.5 → 11.0.9, brace-expansion 1.1.14 and 5.0.6 → 1.1.22 and 5.1.0 | minimatch 11.0.1, brace-expansion 1.1.21 and 5.0.12 on the affected lines | Lint paths and glob patterns are repository tooling inputs. |

React and React DOM remain at 19.2.6. Neither was an affected package in the baseline npm audit. The installer applied compatible lockfile updates without forcing dependency upgrades. The Transformers.js major upgrade was checked by loading the existing cached Xenova MiniLM model and computing a 384-dimensional vector with finite values.

### Advisory references

- Next.js server, image optimization, cache, development, metadata routes and actions. [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) · [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) · [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) · [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) · [GHSA-39w2-rjm5-chcv](https://github.com/advisories/GHSA-39w2-rjm5-chcv) · [GHSA-f87g-xv8r-7p7x](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) · [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) · [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) · [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) · [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) · [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) · [GHSA-vc7v-qv4w-wrv8](https://github.com/advisories/GHSA-vc7v-qv4w-wrv8) · [GHSA-7qx7-33qx-rqx2](https://github.com/advisories/GHSA-7qx7-33qx-rqx2) · [GHSA-f3mh-rxg3-f5g2](https://github.com/advisories/GHSA-f3mh-rxg3-f5g2) · [GHSA-pc58-hwjq-p385](https://github.com/advisories/GHSA-pc58-hwjq-p385) · [GHSA-rhh4-g77r-r9qj](https://github.com/advisories/GHSA-rhh4-g77r-r9qj)
- sharp and its native dependencies. [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) · [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) · [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
- PostCSS and its dependencies. [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) · [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) · [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) · [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) · [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) · [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) · [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
- Browser target mapping and ESLint tooling. [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) · [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) · [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) · [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) · [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
- YAML and glob tooling. [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) · [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) · [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) · [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) · [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) · [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) · [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) · [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) · [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) · [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) · [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p)

## LocalStorage inventory

| Key | Stored value |
| --- | --- |
| `cyber-chronicle-preferences-v1` | Domains, severity floor, state name, notification settings, display density, learning mode and product watchlist |
| `cyber-chronicle-notification-preferences` | Legacy notification-only settings, migrated on a successful preferences write |
| `cyber-chronicle-saved`, `cyber-chronicle-read-alerts` | Saved and read-alert story IDs |
| `cyber-chronicle-saved-archive` | Up to 200 saved article snapshots |
| `cyber-chronicle-interest-profile-v1` | Local ranking vector, engagement count and last update |
| `cyber-academy-progress-v1` | Completed lesson scores, current lesson and learning streak |
| `cyber-chronicle-theme and cyber-chronicle-font-size` | Theme and reading size |
| `cyber-chronicle-notifications-enabled` | Local notification opt-in |

The worker keeps notification settings and seen IDs in Cache Storage. No authentication tokens, raw location coordinates or server credentials are written to these stores.

## Verification

| Check | Baseline | Remediated |
| --- | --- | --- |
| `npm ci` with optional ONNX CUDA download skipped | Passed | Passed |
| `npm audit --json / npm audit` | 19 package entries, including 1 critical and 9 high | 0 known vulnerabilities |
| `npm audit --omit=dev` | 7 package entries, including 1 critical and 5 high | 0 known vulnerabilities |
| `npm outdated --json` | Recorded available updates and checked the affected dependency paths | Next.js and its lint config stayed on v16. React and React DOM stayed on their existing v19 versions. |
| `npm run lint` | Passed | Passed |
| `npm test` | 69 tests passed | 78 tests passed on Node 22.23.5 |
| `npm run build` | Passed as part of the test command | Exported 680 story and CVE pages, 685 HTML documents total. All 685 policies were tested. |
| `npm run check:links` | 1,374 paths checked after the baseline build | 1,374 paths checked |
| Edge against the local static export | — | Verified hydration without CSP violations, Cyber and General editions, Alerts with malformed stored data, archived story display, publisher tab isolation, Academy progress, service worker scope and offline loading. |
| Edge notification API and worker tests | — | Browser verified enablement, initialization, test notification delivery to the browser API and disablement. Worker tests verified click routing and dismissal. |
| Newsroom update and freshness check in a temporary data directory | — | 468 reviewed records from 28 sources, 13 of 13 Tier-1 sources current. Native MiniLM generated 384-dimensional embeddings. 24 of 34 CVE stories carried a recorded severity. |

## Remaining risks and deployment readiness

- GitHub Pages cannot set application-controlled response headers through the static export. An enforcing CSP meta tag blocks unwanted scripts, but clickjacking protection via `frame-ancestors` and CSP report-only mode require HTTP headers. The live host already sends HSTS. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- The existing inline-style policy supports React style attributes and animation. HTTPS images from publisher CDNs remain permitted. A valid publisher URL can still lead to third-party content outside Cyber Chronicle's control.
- Browser storage remains local and origin-scoped. The worker checks the app window URL and message shape, but another script already trusted by the same browser origin can still access that origin's storage. Worker upgrades invalidate old page and edition cache entries. The next online load repopulates them and retains notification opt-in state.
- The browser smoke test used Edge. Native notification interaction and background scheduling on physical devices, Safari and Firefox remain unverified. Automated click and dismissal tests exercise the worker event logic.
- The static release passed the local deployment checks, including the newsroom freshness gate. The live hosting observations recorded in this report describe the audit baseline.
