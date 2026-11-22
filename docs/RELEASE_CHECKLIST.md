# Release checks

- Run `npm run news:update` and `npm run news:check`. Record the number of current Tier-1 sources, the share of CVE stories with severity, and an independently corroborated story if available.
- Run `npm run lint`, `npm test`, and `npm run check:links`. Confirm the mobile Lighthouse accessibility score meets 95.
- Have a teacher or experienced student review the Academy questions and key points before announcing the new curriculum.
- On two real devices, verify the install prompt, offline reopening, saved stories, and a local notification for a newly published matching story. Record the device, browser, permission state and outcome.
- Confirm the repository description and topics, secret scanning settings, and private security reporting in the GitHub repository.
- Ask five first-time readers to find a relevant advisory, check affected versions, and save the story. Record where they hesitate and act on the three most common problems.

## 30-second demo outline

- 0–5 seconds. Open the Cyber edition and show the build timestamp and source health.
- 5–12 seconds. Filter to Critical and open a story with a CVE.
- 12–20 seconds. Show affected products, the official action and the CVE evidence page.
- 20–26 seconds. Open My stack and select a product. Show the match on a story.
- 26–30 seconds. Open Cyber Academy and end on the live site link.

Publish the demo only after the deployment and device checks. Use the [architecture article](HOW_IT_RUNS.md) as optional background for the announcement.
