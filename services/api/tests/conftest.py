from collections import deque

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from cyber_chronicle.collector import FetchResponse
from cyber_chronicle.config import Settings
from cyber_chronicle.database import Base


class ScriptedTransport:
    def __init__(self) -> None:
        self.responses: deque[FetchResponse | Exception] = deque()
        self.calls: list[tuple[str, dict[str, str]]] = []

    def enqueue(self, response: FetchResponse | Exception) -> None:
        self.responses.append(response)

    async def get(self, url: str, headers: dict[str, str], timeout_seconds: float, max_bytes: int) -> FetchResponse:
        self.calls.append((url, dict(headers)))
        if not self.responses:
            raise AssertionError("No scripted response available")
        item = self.responses.popleft()
        if isinstance(item, Exception):
            raise item
        if len(item.body) > max_bytes:
            from cyber_chronicle.collector import CollectionError

            raise CollectionError("response_too_large")
        return item


@pytest.fixture
def session(tmp_path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as value:
        yield value


@pytest.fixture
def settings() -> Settings:
    return Settings(
        database_url="sqlite://",
        collector_user_agent="CyberChronicleTest/0.1",
        collector_version="fixture/1",
        normalizer_version="rss-test/1",
    )


@pytest.fixture
def transport() -> ScriptedTransport:
    return ScriptedTransport()
