# How I run Cyber Chronicle for free

I wanted a cybersecurity newspaper that a student could open and use without an account. I also wanted readers to see where a security claim came from before deciding whether it applied to them.

An hourly GitHub Actions run collects metadata from reviewed publishers and official advisories. It links repeated coverage of a vulnerability using its CVE where possible. NVD, CVE records, CISA KEV and FIRST EPSS add different kinds of evidence. CVSS describes technical severity, EPSS estimates likelihood, and a KEV match means CISA has evidence of exploitation. The page keeps those fields separate because they answer different questions.

The run builds a set of static pages and JSON files. GitHub Pages serves those files directly. Search data is generated at build time, and a small local language model builds related-story links during the same run. The browser handles search, bookmarks, product matches and learning progress. The watchlist and the Academy need only local storage.

I can keep the publishing process predictable because a check runs before deployment. If a critical source is unavailable or a snapshot is stale, the previous deployment stays available and the failed workflow identifies the problem. Readers can see when the edition was built and which sources contributed to it.

The project combines common infrastructure with a narrow publishing job. GitHub Actions prepares the edition, Pages delivers it, and the browser remembers what the reader chooses to save.

[Read Cyber Chronicle](https://nikhilesh-cs.github.io/CYBER-CHRONICAL/) · [Source code](https://github.com/Nikhilesh-CS/CYBER-CHRONICAL)
