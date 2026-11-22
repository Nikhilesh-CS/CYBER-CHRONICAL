# Cyber Chronicle

A free, source-linked cybersecurity newspaper for students and working defenders.

[![Publish workflow](https://github.com/Nikhilesh-CS/CYBER-CHRONICAL/actions/workflows/free-pages.yml/badge.svg)](https://github.com/Nikhilesh-CS/CYBER-CHRONICAL/actions/workflows/free-pages.yml)
[Read the live edition](https://nikhilesh-cs.github.io/CYBER-CHRONICAL/)

![Cyber Chronicle masthead on cream newsprint](public/og.png)

## What you can do

- Browse the Cyber edition by default or switch to General for science, business, sport and other reporting.
- Search with filters for severity, source, category, publication date and India coverage.
- Inspect source links, public CVE evidence, affected products and published guidance.
- Save stories, follow products in My stack, and export or restore your local reading data.
- Catch up with [the daily and weekly digest](https://nikhilesh-cs.github.io/CYBER-CHRONICAL/digest/) or subscribe via [RSS](https://nikhilesh-cs.github.io/CYBER-CHRONICAL/feed.xml).
- Work through Cyber Academy lessons with guided examples, quizzes, related stories and local progress.

## How it runs

GitHub Actions checks reviewed public feeds and official listings hourly. It uses CERT-In, NVD, the CVE Program, CISA KEV and FIRST EPSS for scoped evidence. It then builds the static Next.js export, search data, share pages, RSS feeds and the MiniLM related-story index. GitHub Pages serves the output.

The publish workflow checks critical source health, edition age and severity coverage before deployment. A failed check leaves the last successful deployment in place. The source screen shows the latest published check and any upstream errors included in that edition. The checked-in snapshot is an intentional local fallback for offline builds and tests.

Preferences, watchlist entries, saved IDs and Academy progress stay in the browser. Optional notifications are handled by the service worker on supported devices. No account, backend, database or paid API is required.

## Local setup

Use Node.js 22.13 or newer.

```powershell
npm ci
npm run dev
```

Run the production checks.

```powershell
npm run lint
npm test
npm run check:links
npm run preview
```

The preview is served at `http://127.0.0.1:4173/CYBER-CHRONICAL/`. Run `npm run news:update` followed by `npm run news:check` for a current edition from upstream sources. Set `NEWS_DATA_DIR` to a temporary output directory if you want to keep the checked-in fallback files intact.

## Sources and contributions

Read the [editorial policy](docs/SOURCE_POLICY.md), [publisher registry](docs/SOURCES.md), and [contribution guide](CONTRIBUTING.md). Use [GitHub Issues](https://github.com/Nikhilesh-CS/CYBER-CHRONICAL/issues/new/choose) for ordinary reports and the [security policy](SECURITY.md) for sensitive reports.

Cyber Chronicle code is licensed under [MIT](LICENSE). Original stories, headlines, images, publisher excerpts and linked content retain their publishers’ rights.
