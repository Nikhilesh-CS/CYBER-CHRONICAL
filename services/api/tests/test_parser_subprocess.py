import pytest

from cyber_chronicle.parser import FeedParseError
from cyber_chronicle.parser_protocol import ParserProtocolError, decode_request, encode_request
from cyber_chronicle.parser_subprocess import SubprocessFeedParser

from .fixtures import FEED_A


async def test_real_isolated_worker_parses_fixture() -> None:
    parser = SubprocessFeedParser(timeout_seconds=5, max_output_bytes=8 * 1024 * 1024, max_stderr_bytes=64 * 1024)
    documents = await parser.parse(FEED_A, "https://feed.example.test/advisories.xml", max_entries=10)
    assert [document.external_id for document in documents] == ["x", "y"]
    assert all(document.published_at and document.published_at.tzinfo for document in documents)


async def test_real_worker_returns_stable_parse_failure() -> None:
    parser = SubprocessFeedParser(timeout_seconds=5, max_output_bytes=1024 * 1024, max_stderr_bytes=64 * 1024)
    with pytest.raises(FeedParseError, match="malformed_or_unsafe_xml"):
        await parser.parse(b"<?xml version='1.0'?><rss><broken>", "https://feed.example.test/feed.xml", 10)


def test_protocol_rejects_hash_mismatch_and_unknown_keys() -> None:
    request = encode_request(FEED_A, "https://feed.example.test/feed.xml", 10)
    changed = request.replace(b'"payload_sha256":"', b'"extra":1,"payload_sha256":"', 1)
    with pytest.raises(ParserProtocolError, match="invalid_request_shape"):
        decode_request(changed)
