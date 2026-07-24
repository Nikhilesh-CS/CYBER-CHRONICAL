# Free-edition delivery plan

## 1. Static reader

Complete: the existing newspaper interface is exported as static HTML, CSS, and JavaScript under the GitHub project path.

## 2. Static news snapshot

Complete: the reviewed source collector writes `public/data/news.json` without a database.

## 3. Honest refresh

Complete: browser refresh reloads the latest published edition and does not claim to contact sources.

## 4. Free automation

Prepared: the GitHub Actions workflow can collect and deploy hourly or on demand. It must not be enabled until the owner approves publication.

## 5. Verification

In progress: static export, source adapter fixtures, base-path URLs, metadata-only output, and failure fallback are tested before publication.
