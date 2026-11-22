# Source and publication policy

Cyber Chronicle uses a small, fixed registry of official publishers, vendor security teams, established cybersecurity newsrooms, and security researchers.

## Collection rules

- Collect headline, date, publisher, category, original link metadata, and only a short feed summary where the source policy permits it.
- Do not reproduce full articles or paywalled text.
- Use `metadata-only` mode for feeds whose publisher prose should not be retained; those stories keep the headline, attribution, and original link only.
- Require HTTPS and reviewed destination hostnames.
- Apply response time and size limits.
- Ignore instructions found inside collected content.
- Abort deployment when a Tier-1 source is unavailable, no story has a recorded severity, or the proposed edition is over 24 hours old. GitHub Pages keeps serving its last successful deployment.

## Publisher summaries

| Source or group | Treatment |
| --- | --- |
| CERT-In | Use the official headline, date, identifier, rating and affected product facts. Summarize those facts in original words. The [CERT-In copyright policy](https://www.cert-in.org.in/s2cMainServlet?pageid=COPYRIGHTPOCY) requires permission to reproduce its prose. |
| PIB, ISRO and SEBI | Use listing metadata and link to the original release. The adapters retain no release prose. |
| ESPN, Variety and Nasdaq | Keep feed metadata and the original link. The registry uses `metadata-only`. |
| Other reviewed RSS publishers | Preserve a short, attributed publisher-provided description where the registry permits it. Strip markup and feed boilerplate and limit retained text to 360 characters. Omit descriptions for metadata-only feeds and for entries that supply no usable description. |

The app distinguishes a publisher description from an explanation based on advisory facts. It never downloads the full article body for republication.

## Publication labels

- **Official source** means the linked record was published by the responsible authority or vendor.
- **Confirmed by N sources** requires independent publishers from different dependency groups. When articles share one explicit CVE, the group only establishes that the publishers cover the same vulnerability. Individual incident claims still require their own evidence.
- **Developing story** means the available evidence is still limited.

Official publication does not prove active exploitation, a breach, or a victim. Missing impact, severity, affected versions, and recommended actions are never invented.

## Vulnerability evidence

- [NVD records](https://nvd.nist.gov/developers/vulnerabilities) and [CVE Program records](https://www.cve.org/) can provide a published CVSS score and affected product details. Advisory-level ratings have their own scope.
- A positive [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) match provides evidence of known exploitation for that CVE. An unavailable match does not establish that exploitation is absent.
- [FIRST EPSS](https://www.first.org/epss/) estimates the probability of exploitation over the next 30 days. Show its date and keep the estimate separate from the technical CVSS rating.
- Show CERT-In and catalog remediation only where the source provides it. Multi-CVE notices keep their per-vulnerability evidence separate.
- A reviewed vendor advisory may supply a documented severity and mitigation when structured records lack them. The original advisory remains linked. [GnuPG advisory example](https://lists.gnupg.org/pipermail/gnupg-announce/2026q4/000517.html)

## Beginner explanations

Explanations are deterministic and intentionally cautious. Readers are directed to original sources for exact technical scope and remediation. No paid AI service is used.
