import pytest

from cyber_chronicle.canonical import canonicalize_url, sha256_bytes


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("HTTPS://Example.COM:443/a/../b#fragment", "https://example.com/b"),
        ("https://example.com", "https://example.com/"),
        ("https://example.com/%7euser?a=&a=2", "https://example.com/~user?a=&a=2"),
        ("https://example.com/a%2fb", "https://example.com/a%2Fb"),
    ],
)
def test_canonicalize_url(raw: str, expected: str) -> None:
    assert canonicalize_url(raw) == expected
    assert canonicalize_url(expected) == expected


def test_raw_hash_requires_bytes() -> None:
    with pytest.raises(TypeError):
        sha256_bytes("not bytes")  # type: ignore[arg-type]
