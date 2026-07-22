import pytest

from cyber_chronicle.security import CollectorPolicyError, SourceNetworkPolicy, URLPolicy, validate_public_ip


def test_registered_host_and_scheme_are_required() -> None:
    policy = SourceNetworkPolicy(primary_host="feeds.example.com")
    assert URLPolicy().validate("https://feeds.example.com/advisories", policy) == "https://feeds.example.com/advisories"
    with pytest.raises(CollectorPolicyError, match="host_not_registered"):
        URLPolicy().validate("https://attacker.example/advisories", policy)
    with pytest.raises(CollectorPolicyError, match="url_scheme_forbidden"):
        URLPolicy().validate("http://feeds.example.com/advisories", policy)
    with pytest.raises(CollectorPolicyError, match="url_credentials_forbidden"):
        URLPolicy().validate("https://user:pass@feeds.example.com/advisories", policy)


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "192.0.2.20", "100.64.0.1"])
def test_private_reserved_and_metadata_ips_are_rejected(address: str) -> None:
    with pytest.raises(CollectorPolicyError, match="non_public_destination"):
        validate_public_ip(address)


def test_public_ip_is_allowed() -> None:
    assert validate_public_ip("1.1.1.1") == "1.1.1.1"
