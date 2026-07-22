from httpx import ASGITransport, AsyncClient

from cyber_chronicle.database import get_session
from cyber_chronicle.main import app


async def test_liveness_endpoint() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


async def test_source_registry_requires_https_and_separate_enablement(session) -> None:  # type: ignore[no-untyped-def]
    def override_session():
        yield session

    app.dependency_overrides[get_session] = override_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            insecure = await client.post(
                "/api/v1/sources",
                json={"slug": "unsafe-http", "name": "Unsafe", "feed_url": "http://example.com/feed.xml"},
            )
            enabled = await client.post(
                "/api/v1/sources",
                json={
                    "slug": "needs-review",
                    "name": "Needs review",
                    "feed_url": "https://example.com/feed.xml",
                    "enabled": True,
                },
            )
    finally:
        app.dependency_overrides.clear()
    assert insecure.status_code == 422
    assert enabled.status_code == 422
