from __future__ import annotations

import sys

from .parser import FeedParseError, parse_feed
from .parser_protocol import ParserProtocolError, decode_request, encode_failure, encode_success


MAX_REQUEST_BYTES = 30 * 1024 * 1024


def main() -> int:
    raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
    if len(raw) > MAX_REQUEST_BYTES:
        sys.stdout.buffer.write(encode_failure("parser_internal_error"))
        return 2
    try:
        payload, source_url, max_entries = decode_request(raw)
        documents = parse_feed(payload, source_url, max_entries=max_entries)
        sys.stdout.buffer.write(encode_success(documents))
        return 0
    except FeedParseError as exc:
        sys.stdout.buffer.write(encode_failure(str(exc)))
        return 0
    except (ParserProtocolError, Exception):
        sys.stdout.buffer.write(encode_failure("parser_internal_error"))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
