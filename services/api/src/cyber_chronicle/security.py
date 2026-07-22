from __future__ import annotations

import asyncio
import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlsplit

from aiohttp.abc import AbstractResolver

from .canonical import canonicalize_url


class CollectorPolicyError(ValueError):
    """A fetch target violates the registered collector policy."""


@dataclass(frozen=True)
class SourceNetworkPolicy:
    primary_host: str
    redirect_hosts: tuple[str, ...] = ()
    allow_http: bool = False
    allowed_ports: tuple[int, ...] = (443,)

    @property
    def allowed_hosts(self) -> set[str]:
        return {self.primary_host.lower().rstrip("."), *(host.lower().rstrip(".") for host in self.redirect_hosts)}


class URLPolicy:
    def validate(self, url: str, policy: SourceNetworkPolicy) -> str:
        if any(character in url for character in ("\\", "\r", "\n", "\x00")):
            raise CollectorPolicyError("url_contains_forbidden_characters")
        parsed = urlsplit(url)
        if parsed.username or parsed.password:
            raise CollectorPolicyError("url_credentials_forbidden")
        if parsed.scheme not in ({"https", "http"} if policy.allow_http else {"https"}):
            raise CollectorPolicyError("url_scheme_forbidden")
        host = (parsed.hostname or "").encode("idna").decode("ascii").lower().rstrip(".")
        if host not in policy.allowed_hosts:
            raise CollectorPolicyError("host_not_registered")
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        allowed_ports = set(policy.allowed_ports) | ({80} if policy.allow_http else set())
        if port not in allowed_ports:
            raise CollectorPolicyError("port_not_registered")
        return canonicalize_url(url)


def validate_public_ip(address: str) -> str:
    try:
        value = ipaddress.ip_address(address.split("%")[0])
    except ValueError as exc:
        raise CollectorPolicyError("dns_returned_invalid_address") from exc
    if isinstance(value, ipaddress.IPv6Address) and value.ipv4_mapped:
        value = value.ipv4_mapped
    if not value.is_global:
        raise CollectorPolicyError("non_public_destination")
    return str(value)


async def resolve_public_addresses(host: str, port: int) -> list[tuple[int, str]]:
    loop = asyncio.get_running_loop()
    try:
        answers = await asyncio.wait_for(
            loop.getaddrinfo(host, port, type=socket.SOCK_STREAM),
            timeout=3,
        )
    except (OSError, TimeoutError) as exc:
        raise CollectorPolicyError("dns_resolution_failed") from exc

    vetted: list[tuple[int, str]] = []
    for family, _type, _proto, _canonname, sockaddr in answers:
        address = validate_public_ip(sockaddr[0])
        pair = (family, address)
        if pair not in vetted:
            vetted.append(pair)
    if not vetted:
        raise CollectorPolicyError("dns_resolution_empty")
    return vetted


class PinnedPublicResolver(AbstractResolver):
    """Resolve and return only policy-vetted public IPs to aiohttp's connector."""

    async def resolve(self, host: str, port: int = 0, family: int = socket.AF_UNSPEC):  # type: ignore[override]
        answers = await resolve_public_addresses(host, port)
        return [
            {
                "hostname": host,
                "host": address,
                "port": port,
                "family": answer_family,
                "proto": 0,
                "flags": 0,
            }
            for answer_family, address in answers
            if family in (socket.AF_UNSPEC, answer_family)
        ]

    async def close(self) -> None:
        return None
