"""Deterministic evidence extraction and duplicate-comparison primitives.

This module deliberately does not assign meaning that is absent from a document.  It
extracts syntactically verifiable observables and returns their source spans, then
compares text using reproducible fingerprints and token/shingle overlap.
"""

from __future__ import annotations

import hashlib
import ipaddress
import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable, Mapping
from urllib.parse import urlsplit, urlunsplit


_URL_RE = re.compile(
    r"(?i)\b(?:https?|hxxps?)(?::|\[:\])//"
    r"(?:[a-z0-9_-]+(?:\.|\[\.\]))+[a-z]{2,63}(?::\d{1,5})?"
    r"(?:/[^\s<>\"']*)?"
)
_EMAIL_RE = re.compile(
    r"(?i)(?<![\w.+-])[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"(?:[a-z0-9-]+\.)+[a-z]{2,63}(?![\w.-])"
)
_DOMAIN_RE = re.compile(
    r"(?i)(?<![\w@-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.|\[\.\]))+"
    r"[a-z]{2,63}(?![\w-])"
)
_IPV4_RE = re.compile(r"(?<![\w:])(?:\d{1,3}(?:\.|\[\.\])){3}\d{1,3}(?![\w:])")
_IPV6_CANDIDATE_RE = re.compile(r"(?<![\w:])(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?![\w:])")
_CVE_RE = re.compile(r"(?i)(?<![\w-])CVE-\d{4}-\d{4,7}(?![\w-])")
_CWE_RE = re.compile(r"(?i)(?<![\w-])CWE-\d{1,5}(?![\w-])")
_HASH_PATTERNS = (
    ("sha256", re.compile(r"(?i)(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])")),
    ("sha1", re.compile(r"(?i)(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])")),
    ("md5", re.compile(r"(?i)(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])")),
)
_TOKEN_RE = re.compile(r"[a-z0-9]+")
_TRAILING_URL_PUNCTUATION = ".,;:!?)]}"


@dataclass(frozen=True, slots=True)
class EvidenceSpan:
    """One exact source location supporting an extracted value."""

    field: str
    start: int
    end: int
    raw: str
    method: str = "direct"


@dataclass(frozen=True, slots=True)
class ExtractedEntity:
    """A normalized, syntactically verified entity with all observed evidence."""

    kind: str
    value: str
    evidence: tuple[EvidenceSpan, ...]


@dataclass(frozen=True, slots=True)
class DocumentFingerprint:
    exact_sha256: str
    title_tokens: frozenset[str]
    body_shingles: frozenset[str]


@dataclass(frozen=True, slots=True)
class DuplicateComparison:
    """Explainable similarity result; ``is_near_duplicate`` is policy, not a fact."""

    exact_duplicate: bool
    is_near_duplicate: bool
    score: float
    threshold: float
    title_jaccard: float
    body_jaccard: float
    shared_title_tokens: tuple[str, ...]
    shared_body_shingle_count: int
    left_body_shingle_count: int
    right_body_shingle_count: int


def _deobfuscate(value: str) -> str:
    candidate = value.replace("[.]", ".").replace("[:]", ":")
    return re.sub(r"(?i)^hxxp(s?)://", lambda match: f"http{match.group(1).lower()}://", candidate)


def _normal_domain(value: str) -> str | None:
    candidate = _deobfuscate(value).rstrip(".").lower()
    try:
        labels = candidate.encode("idna").decode("ascii").split(".")
    except UnicodeError:
        return None
    if len(labels) < 2 or any(not label or len(label) > 63 for label in labels):
        return None
    if any(label.startswith("-") or label.endswith("-") for label in labels):
        return None
    return ".".join(labels)


def _normal_url(value: str) -> str | None:
    candidate = _deobfuscate(value).rstrip(_TRAILING_URL_PUNCTUATION)
    try:
        parsed = urlsplit(candidate)
        port = parsed.port
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None
    hostname = _normal_domain(parsed.hostname)
    if hostname is None or (port is not None and not 1 <= port <= 65535):
        return None
    host = hostname if port is None else f"{hostname}:{port}"
    return urlunsplit((parsed.scheme.lower(), host, parsed.path or "", parsed.query, ""))


def extract_entities(fields: Mapping[str, str | None]) -> tuple[ExtractedEntity, ...]:
    """Extract supported entities from named text fields with offset provenance.

    Supported kinds are ``url``, ``domain``, ``email``, ``ipv4``, ``ipv6``,
    ``md5``, ``sha1``, ``sha256``, ``cve`` and ``cwe``. Common ``hxxp`` and
    ``[.]`` defanging is normalized while the original source span is retained.
    """

    found: dict[tuple[str, str], list[EvidenceSpan]] = {}

    def add(kind: str, value: str | None, field: str, match: re.Match[str], method: str = "direct") -> None:
        if value is None:
            return
        end = match.end()
        raw = match.group(0)
        if kind == "url":
            trimmed = len(raw) - len(raw.rstrip(_TRAILING_URL_PUNCTUATION))
            end -= trimmed
            raw = raw[: len(raw) - trimmed] if trimmed else raw
        span = EvidenceSpan(field=field, start=match.start(), end=end, raw=raw, method=method)
        found.setdefault((kind, value), []).append(span)

    for field in sorted(fields):
        text = fields[field] or ""
        for match in _URL_RE.finditer(text):
            add("url", _normal_url(match.group(0)), field, match)
        for match in _EMAIL_RE.finditer(text):
            add("email", match.group(0).lower(), field, match)
        for match in _IPV4_RE.finditer(text):
            candidate = _deobfuscate(match.group(0))
            try:
                value = str(ipaddress.IPv4Address(candidate))
            except ipaddress.AddressValueError:
                value = None
            add("ipv4", value, field, match)
        for match in _IPV6_CANDIDATE_RE.finditer(text):
            try:
                value = ipaddress.IPv6Address(match.group(0)).compressed
            except ipaddress.AddressValueError:
                value = None
            add("ipv6", value, field, match)
        for match in _DOMAIN_RE.finditer(text):
            add("domain", _normal_domain(match.group(0)), field, match)
        for match in _CVE_RE.finditer(text):
            add("cve", match.group(0).upper(), field, match)
        for match in _CWE_RE.finditer(text):
            add("cwe", match.group(0).upper(), field, match)
        for kind, pattern in _HASH_PATTERNS:
            for match in pattern.finditer(text):
                add(kind, match.group(0).lower(), field, match)

    return tuple(
        ExtractedEntity(kind=kind, value=value, evidence=tuple(sorted(spans, key=_span_sort_key)))
        for (kind, value), spans in sorted(found.items())
    )


def _span_sort_key(span: EvidenceSpan) -> tuple[str, int, int, str]:
    return span.field, span.start, span.end, span.raw


def _normalized_text(text: str) -> str:
    folded = unicodedata.normalize("NFKC", text).casefold()
    return " ".join(_TOKEN_RE.findall(folded))


def _tokens(text: str) -> tuple[str, ...]:
    return tuple(_normalized_text(text).split())


def _shingles(tokens: tuple[str, ...], size: int) -> frozenset[str]:
    if not tokens:
        return frozenset()
    if len(tokens) < size:
        return frozenset({" ".join(tokens)})
    return frozenset(" ".join(tokens[index : index + size]) for index in range(len(tokens) - size + 1))


def fingerprint_document(title: str, body: str, *, shingle_size: int = 5) -> DocumentFingerprint:
    """Build a stable exact hash and explainable token/shingle feature sets."""

    if shingle_size < 1:
        raise ValueError("shingle_size must be at least 1")
    normalized_title = _normalized_text(title)
    normalized_body = _normalized_text(body)
    exact_material = f"{normalized_title}\n{normalized_body}".encode()
    return DocumentFingerprint(
        exact_sha256=hashlib.sha256(exact_material).hexdigest(),
        title_tokens=frozenset(normalized_title.split()),
        body_shingles=_shingles(tuple(normalized_body.split()), shingle_size),
    )


def _jaccard(left: Iterable[str], right: Iterable[str]) -> float:
    left_set, right_set = set(left), set(right)
    union = left_set | right_set
    return len(left_set & right_set) / len(union) if union else 1.0


def compare_fingerprints(
    left: DocumentFingerprint,
    right: DocumentFingerprint,
    *,
    threshold: float = 0.82,
) -> DuplicateComparison:
    """Compare fingerprints using 35% title and 65% body Jaccard overlap."""

    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")
    exact = left.exact_sha256 == right.exact_sha256
    title_score = _jaccard(left.title_tokens, right.title_tokens)
    body_score = _jaccard(left.body_shingles, right.body_shingles)
    score = 1.0 if exact else (0.35 * title_score) + (0.65 * body_score)
    shared_title = tuple(sorted(left.title_tokens & right.title_tokens))
    shared_body_count = len(left.body_shingles & right.body_shingles)
    return DuplicateComparison(
        exact_duplicate=exact,
        is_near_duplicate=exact or score >= threshold,
        score=round(score, 6),
        threshold=threshold,
        title_jaccard=round(title_score, 6),
        body_jaccard=round(body_score, 6),
        shared_title_tokens=shared_title,
        shared_body_shingle_count=shared_body_count,
        left_body_shingle_count=len(left.body_shingles),
        right_body_shingle_count=len(right.body_shingles),
    )
