from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Protocol
from urllib.parse import urljoin, urlsplit

import aiohttp

from .security import PinnedPublicResolver, SourceNetworkPolicy, URLPolicy


class CollectionError(RuntimeError):
    def __init__(
        self,
        code: str,
        message: str | None = None,
        response: FetchResponse | None = None,
        redirect_chain: list[str] | None = None,
    ) -> None:
        super().__init__(message or code)
        self.code = code
        self.response = response
        self.redirect_chain = redirect_chain or []


@dataclass(frozen=True)
class FetchResponse:
    status: int
    url: str
    headers: dict[str, str]
    body: bytes


@dataclass(frozen=True)
class CollectionResult:
    response: FetchResponse
    redirect_chain: list[str] = field(default_factory=list)


class FetchTransport(Protocol):
    async def get(self, url: str, headers: dict[str, str], timeout_seconds: float, max_bytes: int) -> FetchResponse: ...


SAFE_RESPONSE_HEADERS = {"content-type", "content-length", "etag", "last-modified", "location", "retry-after"}
ALLOWED_MEDIA_TYPES = {
    "application/rss+xml",
    "application/atom+xml",
    "application/xml",
    "text/xml",
}


class AioHttpTransport:
    def __init__(self, user_agent: str) -> None:
        self.user_agent = user_agent

    async def get(self, url: str, headers: dict[str, str], timeout_seconds: float, max_bytes: int) -> FetchResponse:
        resolver = PinnedPublicResolver()
        connector = aiohttp.TCPConnector(resolver=resolver, use_dns_cache=False, limit_per_host=1, ssl=True)
        timeout = aiohttp.ClientTimeout(total=timeout_seconds, connect=min(5, timeout_seconds), sock_read=min(10, timeout_seconds))
        request_headers = {
            "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
            "Accept-Encoding": "identity",
            "User-Agent": self.user_agent,
            **headers,
        }
        try:
            async with aiohttp.ClientSession(connector=connector, timeout=timeout, trust_env=False) as session:
                async with session.get(url, headers=request_headers, allow_redirects=False) as response:
                    content_encoding = response.headers.get("content-encoding", "identity").lower()
                    if content_encoding not in ("", "identity"):
                        raise CollectionError("content_encoding_forbidden")
                    length = response.headers.get("content-length")
                    if length and length.isdigit() and int(length) > max_bytes:
                        raise CollectionError("response_too_large")
                    chunks: list[bytes] = []
                    received = 0
                    async for chunk in response.content.iter_chunked(64 * 1024):
                        received += len(chunk)
                        if received > max_bytes:
                            raise CollectionError("response_too_large")
                        chunks.append(chunk)
                    safe_headers = {key.lower(): value[:1000] for key, value in response.headers.items() if key.lower() in SAFE_RESPONSE_HEADERS}
                    return FetchResponse(response.status, str(response.url), safe_headers, b"".join(chunks))
        except asyncio.TimeoutError as exc:
            raise CollectionError("fetch_timeout") from exc
        except aiohttp.ClientError as exc:
            raise CollectionError("network_error", type(exc).__name__) from exc


class SafeHttpCollector:
    def __init__(self, transport: FetchTransport, max_redirects: int = 3, url_policy: URLPolicy | None = None) -> None:
        self.transport = transport
        self.max_redirects = max_redirects
        self.url_policy = url_policy or URLPolicy()

    async def collect(
        self,
        url: str,
        network_policy: SourceNetworkPolicy,
        timeout_seconds: float,
        max_bytes: int,
        conditional_headers: dict[str, str] | None = None,
    ) -> CollectionResult:
        current = self.url_policy.validate(url, network_policy)
        redirect_chain: list[str] = []
        visited = {current}
        for redirect_count in range(self.max_redirects + 1):
            response = await self.transport.get(current, conditional_headers or {}, timeout_seconds, max_bytes)
            if response.status not in {301, 302, 303, 307, 308}:
                self._validate_response(response, redirect_chain)
                return CollectionResult(response=response, redirect_chain=redirect_chain)
            if redirect_count >= self.max_redirects:
                raise CollectionError("too_many_redirects")
            location = response.headers.get("location")
            if not location:
                raise CollectionError("redirect_without_location")
            next_url = self.url_policy.validate(urljoin(current, location), network_policy)
            if next_url in visited:
                raise CollectionError("redirect_loop")
            if urlsplit(current).scheme == "https" and urlsplit(next_url).scheme != "https":
                raise CollectionError("https_downgrade_forbidden")
            visited.add(next_url)
            redirect_chain.append(next_url)
            current = next_url
        raise CollectionError("too_many_redirects")

    def _validate_response(self, response: FetchResponse, redirect_chain: list[str] | None = None) -> None:
        if response.status == 304:
            return
        content_encoding = response.headers.get("content-encoding", "identity").lower()
        if content_encoding not in {"", "identity"}:
            raise CollectionError("content_encoding_forbidden", response=response, redirect_chain=redirect_chain)
        if response.status != 200:
            raise CollectionError(f"http_{response.status}", response=response, redirect_chain=redirect_chain)
        media_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if media_type not in ALLOWED_MEDIA_TYPES:
            raise CollectionError("content_type_forbidden", response=response, redirect_chain=redirect_chain)
        prefix = response.body.lstrip()[:64].lower()
        if not prefix.startswith(b"<?xml") and not prefix.startswith(b"<rss") and not prefix.startswith(b"<feed"):
            raise CollectionError("content_sniff_failed", response=response, redirect_chain=redirect_chain)
