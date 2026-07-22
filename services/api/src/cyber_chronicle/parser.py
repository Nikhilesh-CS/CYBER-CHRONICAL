from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin

from defusedxml import ElementTree

from .canonical import canonicalize_url, sha256_text, stable_content_hash


class FeedParseError(ValueError):
    pass


@dataclass(frozen=True)
class ParsedDocument:
    external_id: str | None
    canonical_url: str
    title: str
    summary: str
    body_text: str
    published_at: datetime | None
    identity_hash: bytes
    content_hash: bytes
    raw_locator: dict


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _child_text(element, *names: str) -> str:  # type: ignore[no-untyped-def]
    wanted = set(names)
    for child in element:
        if _local_name(child.tag) in wanted and child.text:
            return child.text.strip()
    return ""


def _entry_link(element) -> str:  # type: ignore[no-untyped-def]
    for child in element:
        if _local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href")
        relation = child.attrib.get("rel", "alternate")
        if href and relation == "alternate":
            return href.strip()
        if child.text:
            return child.text.strip()
    return ""


def _parse_time(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except ValueError:
        try:
            return parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None


def parse_feed(payload: bytes, source_url: str, max_entries: int = 2000) -> list[ParsedDocument]:
    if b"<!DOCTYPE" in payload[:4096].upper() or b"<!ENTITY" in payload[:4096].upper():
        raise FeedParseError("xml_declaration_forbidden")
    try:
        root = ElementTree.fromstring(payload)
    except Exception as exc:  # defusedxml raises several security-specific subclasses
        raise FeedParseError("malformed_or_unsafe_xml") from exc

    if _local_name(root.tag) not in {"rss", "feed", "rdf"}:
        raise FeedParseError("unsupported_feed_root")

    entries = [node for node in root.iter() if _local_name(node.tag) in {"item", "entry"}]
    if len(entries) > max_entries:
        raise FeedParseError("too_many_feed_entries")

    documents: list[ParsedDocument] = []
    for index, entry in enumerate(entries):
        title = _child_text(entry, "title")[:1000]
        external_id = _child_text(entry, "guid", "id") or None
        link = _entry_link(entry)
        if not title or not link:
            continue
        try:
            canonical_url = canonicalize_url(urljoin(source_url, link))
        except (UnicodeError, ValueError) as exc:
            raise FeedParseError("invalid_feed_entry") from exc
        if canonical_url.split(":", 1)[0] not in {"http", "https"}:
            raise FeedParseError("invalid_feed_entry")
        summary = _child_text(entry, "summary", "description")[:100_000]
        body = _child_text(entry, "content", "encoded")[:2_000_000] or summary
        published = _parse_time(_child_text(entry, "published", "pubdate", "updated"))
        identity_value = external_id or canonical_url
        canonical_content = {
            "external_id": external_id,
            "canonical_url": canonical_url,
            "title": title,
            "summary": summary,
            "body_text": body,
            "published_at": published.isoformat() if published else None,
        }
        documents.append(
            ParsedDocument(
                external_id=external_id,
                canonical_url=canonical_url,
                title=title,
                summary=summary,
                body_text=body,
                published_at=published,
                identity_hash=sha256_text(identity_value),
                content_hash=stable_content_hash(canonical_content),
                raw_locator={"entry_index": index},
            )
        )
    return documents
