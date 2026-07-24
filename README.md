# Cyber Chronicle

**Trusted Cybersecurity News. Simplified.**

Cyber Chronicle is a student-friendly cybersecurity newspaper. It presents source-linked news from reviewed official, vendor, research, and cybersecurity-news publishers, then explains each record in clear language.

## Free edition

This branch is designed to run for **₹0** on GitHub Pages:

- no database;
- no public backend server;
- no paid AI or API;
- no ChatGPT subscription dependency;
- no purchased domain;
- no laptop exposed to the internet.

GitHub Actions retrieves source metadata on a schedule, creates a static JSON edition, and publishes static HTML, CSS, JavaScript, images, and JSON. When the scheduled updater is not running, the last successfully built edition remains readable.

## How updates work

1. The scheduled workflow checks the fixed reviewed source list.
2. Only metadata required for attribution is collected: headline, publisher, publication time, category, and original link.
3. Exact duplicates and closely related titles are compared conservatively.
4. Beginner explanations are generated using deterministic rules, not a paid AI service.
5. The workflow builds and publishes a new static edition.

The reader-facing **Refresh** button reloads the newest published snapshot. It does not contact publishers directly and does not claim that a new collection run happened.

## Trusted-source rules

- Every story links to its original publisher.
- Single-source reports remain labelled as developing.
- Official publication does not automatically mean active exploitation or a confirmed attack.
- Missing severity, affected versions, or impact is never invented.
- Source failures are shown honestly; a valid previous edition is kept instead of publishing an empty page.
- Collected source content is treated as untrusted data.

## Local use

Requirements: Node.js 22.13 or newer.

```powershell
npm install
npm run news:update
npm run dev
```

Static production verification:

```powershell
npm test
```

The exported GitHub Pages site is written to `out`.

## Free hosting

The workflow in `.github/workflows/free-pages.yml` supports:

- an hourly scheduled refresh;
- manual refresh from the GitHub Actions page;
- static GitHub Pages deployment from the `main` branch.

Publishing is intentionally separate from local development and should only be enabled after the owner reviews the static edition.
