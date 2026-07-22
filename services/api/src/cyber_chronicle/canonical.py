import hashlib
import json
import posixpath
import re
import string
from urllib.parse import urlsplit, urlunsplit


UNRESERVED_ESCAPE = re.compile(r"%([0-9A-Fa-f]{2})")


def _normalize_percent_encoding(value: str) -> str:
    def replace(match: re.Match[str]) -> str:
        character = bytes.fromhex(match.group(1)).decode("latin-1")
        allowed = string.ascii_letters + string.digits + "-._~"
        return character if character in allowed else match.group(0).upper()

    return UNRESERVED_ESCAPE.sub(replace, value)


def canonicalize_url(url: str) -> str:
    parsed = urlsplit(url.strip())
    scheme = parsed.scheme.lower()
    host = (parsed.hostname or "").encode("idna").decode("ascii").lower().rstrip(".")
    if not scheme or not host:
        raise ValueError("URL must contain a scheme and hostname")
    default_port = (scheme == "https" and parsed.port == 443) or (scheme == "http" and parsed.port == 80)
    netloc = host if parsed.port is None or default_port else f"{host}:{parsed.port}"
    path = _normalize_percent_encoding(parsed.path or "/")
    normalized_path = posixpath.normpath(path)
    if path.endswith("/") and not normalized_path.endswith("/"):
        normalized_path += "/"
    if not normalized_path.startswith("/"):
        normalized_path = "/" + normalized_path
    query = _normalize_percent_encoding(parsed.query)
    return urlunsplit((scheme, netloc, normalized_path, query, ""))


def sha256_bytes(value: bytes) -> bytes:
    if not isinstance(value, bytes):
        raise TypeError("raw content hashing requires bytes")
    return hashlib.sha256(value).digest()


def sha256_text(value: str) -> bytes:
    return sha256_bytes(value.encode("utf-8"))


def stable_content_hash(value: dict) -> bytes:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(encoded)
