from cyber_chronicle.collector import FetchResponse


FEED_A = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Fixture advisories</title>
<item><guid>x</guid><title>Advisory X</title><link>https://feed.example.test/x</link><description>First advisory</description><pubDate>Wed, 22 Jul 2026 09:00:00 GMT</pubDate></item>
<item><guid>y</guid><title>Advisory Y</title><link>https://feed.example.test/y</link><description>Second advisory</description><pubDate>Wed, 22 Jul 2026 09:05:00 GMT</pubDate></item>
</channel></rss>"""

FEED_B = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Fixture advisories updated</title>
<item><guid>y</guid><title>Advisory Y</title><link>https://feed.example.test/y</link><description>Second advisory</description><pubDate>Wed, 22 Jul 2026 09:05:00 GMT</pubDate></item>
<item><guid>z</guid><title>Advisory Z</title><link>https://feed.example.test/z</link><description>Third advisory</description><pubDate>Wed, 22 Jul 2026 10:00:00 GMT</pubDate></item>
</channel></rss>"""

FEED_Y_REVISED = FEED_A.replace(b"Second advisory", b"Second advisory with revised mitigation")


def response(body: bytes, status: int = 200, **headers: str) -> FetchResponse:
    values = {"content-type": "application/rss+xml", **headers}
    return FetchResponse(status=status, url="http://feed.example.test/advisories.xml", headers=values, body=body)
