from __future__ import annotations

import base64
import hashlib
import json
from datetime import datetime
from .parser import ParsedDocument


PROTOCOL = "cyber-chronicle.feed-parser.v1"
REQUEST_KEYS = {"protocol", "operation", "source_url", "max_entries", "payload_sha256", "payload_b64"}
RESPONSE_KEYS = {"protocol", "ok", "documents"}
ERROR_RESPONSE_KEYS = {"protocol", "ok", "error"}
DOCUMENT_KEYS = {
    "external_id",
    "canonical_url",
    "title",
    "summary",
    "body_text",
    "published_at",
    "identity_hash",
    "content_hash",
    "raw_locator",
}
ALLOWED_ERRORS = {
    "invalid_feed_entry",
    "malformed_or_unsafe_xml",
    "parser_internal_error",
    "too_many_feed_entries",
    "unsupported_feed_root",
    "xml_declaration_forbidden",
}


class ParserProtocolError(ValueError):
    pass


def encode_request(payload: bytes, source_url: str, max_entries: int) -> bytes:
    value = {
        "protocol": PROTOCOL,
        "operation": "parse_feed",
        "source_url": source_url,
        "max_entries": max_entries,
        "payload_sha256": hashlib.sha256(payload).hexdigest(),
        "payload_b64": base64.b64encode(payload).decode("ascii"),
    }
    return json.dumps(value, ensure_ascii=True, separators=(",", ":")).encode("utf-8")


def decode_request(raw: bytes, max_payload_bytes: int = 20 * 1024 * 1024) -> tuple[bytes, str, int]:
    try:
        value = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ParserProtocolError("invalid_json") from exc
    if not isinstance(value, dict) or set(value) != REQUEST_KEYS:
        raise ParserProtocolError("invalid_request_shape")
    if value["protocol"] != PROTOCOL or value["operation"] != "parse_feed":
        raise ParserProtocolError("invalid_protocol")
    source_url = value["source_url"]
    max_entries = value["max_entries"]
    expected_hash = value["payload_sha256"]
    encoded = value["payload_b64"]
    if not isinstance(source_url, str) or not 1 <= len(source_url) <= 8192:
        raise ParserProtocolError("invalid_source_url")
    if not isinstance(max_entries, int) or not 1 <= max_entries <= 2000:
        raise ParserProtocolError("invalid_max_entries")
    if not isinstance(expected_hash, str) or len(expected_hash) != 64 or any(c not in "0123456789abcdef" for c in expected_hash):
        raise ParserProtocolError("invalid_payload_hash")
    if not isinstance(encoded, str):
        raise ParserProtocolError("invalid_payload_encoding")
    try:
        payload = base64.b64decode(encoded, validate=True)
    except ValueError as exc:
        raise ParserProtocolError("invalid_payload_encoding") from exc
    if len(payload) > max_payload_bytes or base64.b64encode(payload).decode("ascii") != encoded:
        raise ParserProtocolError("invalid_payload_encoding")
    if hashlib.sha256(payload).hexdigest() != expected_hash:
        raise ParserProtocolError("payload_hash_mismatch")
    return payload, source_url, max_entries


def encode_success(documents: list[ParsedDocument]) -> bytes:
    values = []
    for document in documents:
        values.append(
            {
                "external_id": document.external_id,
                "canonical_url": document.canonical_url,
                "title": document.title,
                "summary": document.summary,
                "body_text": document.body_text,
                "published_at": document.published_at.isoformat() if document.published_at else None,
                "identity_hash": document.identity_hash.hex(),
                "content_hash": document.content_hash.hex(),
                "raw_locator": document.raw_locator,
            }
        )
    return json.dumps({"protocol": PROTOCOL, "ok": True, "documents": values}, ensure_ascii=True, separators=(",", ":")).encode("utf-8")


def encode_failure(code: str) -> bytes:
    safe_code = code if code in ALLOWED_ERRORS else "parser_internal_error"
    return json.dumps({"protocol": PROTOCOL, "ok": False, "error": {"code": safe_code}}, separators=(",", ":")).encode("utf-8")


def decode_response(raw: bytes, max_documents: int) -> list[ParsedDocument]:
    try:
        value = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ParserProtocolError("invalid_response_json") from exc
    if not isinstance(value, dict) or value.get("protocol") != PROTOCOL or not isinstance(value.get("ok"), bool):
        raise ParserProtocolError("invalid_response_shape")
    if value["ok"] is False:
        if set(value) != ERROR_RESPONSE_KEYS or not isinstance(value.get("error"), dict) or set(value["error"]) != {"code"}:
            raise ParserProtocolError("invalid_error_response")
        code = value["error"]["code"]
        if code not in ALLOWED_ERRORS:
            raise ParserProtocolError("invalid_error_code")
        from .parser import FeedParseError

        raise FeedParseError(code)
    if set(value) != RESPONSE_KEYS or not isinstance(value["documents"], list) or len(value["documents"]) > max_documents:
        raise ParserProtocolError("invalid_documents_response")

    parsed: list[ParsedDocument] = []
    for item in value["documents"]:
        if not isinstance(item, dict) or set(item) != DOCUMENT_KEYS:
            raise ParserProtocolError("invalid_document_shape")
        if not isinstance(item["canonical_url"], str) or len(item["canonical_url"]) > 8192:
            raise ParserProtocolError("invalid_document_url")
        if not isinstance(item["title"], str) or len(item["title"]) > 1000:
            raise ParserProtocolError("invalid_document_title")
        if not isinstance(item["summary"], str) or len(item["summary"]) > 100_000:
            raise ParserProtocolError("invalid_document_summary")
        if not isinstance(item["body_text"], str) or len(item["body_text"]) > 2_000_000:
            raise ParserProtocolError("invalid_document_body")
        if item["external_id"] is not None and not isinstance(item["external_id"], str):
            raise ParserProtocolError("invalid_external_id")
        if not isinstance(item["raw_locator"], dict) or set(item["raw_locator"]) != {"entry_index"} or not isinstance(item["raw_locator"]["entry_index"], int):
            raise ParserProtocolError("invalid_raw_locator")
        hashes: list[bytes] = []
        for key in ("identity_hash", "content_hash"):
            text_hash = item[key]
            if not isinstance(text_hash, str) or len(text_hash) != 64 or any(c not in "0123456789abcdef" for c in text_hash):
                raise ParserProtocolError("invalid_document_hash")
            hashes.append(bytes.fromhex(text_hash))
        published = None
        if item["published_at"] is not None:
            if not isinstance(item["published_at"], str):
                raise ParserProtocolError("invalid_published_at")
            try:
                published = datetime.fromisoformat(item["published_at"])
            except ValueError as exc:
                raise ParserProtocolError("invalid_published_at") from exc
            if published.tzinfo is None:
                raise ParserProtocolError("naive_published_at")
        parsed.append(
            ParsedDocument(
                external_id=item["external_id"],
                canonical_url=item["canonical_url"],
                title=item["title"],
                summary=item["summary"],
                body_text=item["body_text"],
                published_at=published,
                identity_hash=hashes[0],
                content_hash=hashes[1],
                raw_locator=item["raw_locator"],
            )
        )
    return parsed
