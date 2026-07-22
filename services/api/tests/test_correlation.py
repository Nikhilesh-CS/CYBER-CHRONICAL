from __future__ import annotations

import pytest

from cyber_chronicle.correlation import compare_fingerprints, extract_entities, fingerprint_document


def _entities_by_key(fields: dict[str, str]):
    return {(item.kind, item.value): item for item in extract_entities(fields)}


def test_extracts_normalized_entities_with_exact_provenance() -> None:
    sha256 = "A" * 64
    text = (
        "CVE-2026-12345 (CWE-79) used hxxps[:]//C2[.]Example/path?q=1, "
        "from 203[.]0[.]113[.]7 and 2001:0db8::1. "
        f"Contact SOC@Example.COM; SHA256 {sha256}."
    )

    entities = _entities_by_key({"body": text})

    assert ("cve", "CVE-2026-12345") in entities
    assert ("cwe", "CWE-79") in entities
    assert ("url", "https://c2.example/path?q=1") in entities
    assert ("domain", "c2.example") in entities
    assert ("ipv4", "203.0.113.7") in entities
    assert ("ipv6", "2001:db8::1") in entities
    assert ("email", "soc@example.com") in entities
    assert ("sha256", sha256.lower()) in entities

    url_span = entities[("url", "https://c2.example/path?q=1")].evidence[0]
    assert url_span.field == "body"
    assert text[url_span.start : url_span.end] == "hxxps[:]//C2[.]Example/path?q=1"


def test_aggregates_repeated_evidence_in_stable_field_and_offset_order() -> None:
    entities = _entities_by_key({"summary": "evil.example", "body": "evil.example then evil.example"})

    evidence = entities[("domain", "evil.example")].evidence

    assert [(item.field, item.start) for item in evidence] == [("body", 0), ("body", 18), ("summary", 0)]


def test_rejects_invalid_or_ambiguous_observables() -> None:
    entities = _entities_by_key(
        {"body": "999.999.999.999 example invalid hxxp[:]//bad[.]example:99999 and CVE-20-1234"}
    )

    assert ("ipv4", "999.999.999.999") not in entities
    assert not any(kind == "url" for kind, _ in entities)
    assert not any(kind == "cve" for kind, _ in entities)


def test_url_fragments_are_removed_but_query_is_retained() -> None:
    entities = _entities_by_key({"body": "https://Example.COM:443/a?x=1#untrusted-fragment"})

    assert ("url", "https://example.com:443/a?x=1") in entities


def test_exact_fingerprint_ignores_case_unicode_width_and_punctuation() -> None:
    left = fingerprint_document("Critical ALERT!", "ＣＶＥ update—available now.")
    right = fingerprint_document("critical alert", "cve update available now")

    result = compare_fingerprints(left, right)

    assert result.exact_duplicate is True
    assert result.is_near_duplicate is True
    assert result.score == 1.0


def test_near_duplicate_result_exposes_reproducible_overlap() -> None:
    shared = "attackers exploited the gateway vulnerability to execute commands and deploy malware"
    left = fingerprint_document("Gateway flaw exploited", f"Researchers report that {shared} in active attacks today")
    right = fingerprint_document("Gateway vulnerability exploited", f"Vendor confirms {shared} in active attacks worldwide")

    result = compare_fingerprints(left, right, threshold=0.55)

    assert result.exact_duplicate is False
    assert result.is_near_duplicate is True
    assert result.score >= 0.55
    assert result.shared_body_shingle_count > 0
    assert result.shared_title_tokens == ("exploited", "gateway")
    assert result.left_body_shingle_count > 0
    assert result.right_body_shingle_count > 0


def test_unrelated_documents_do_not_cluster() -> None:
    left = fingerprint_document("Ransomware disrupts hospital", "Files were encrypted across clinical systems")
    right = fingerprint_document("Browser update released", "The vendor added new developer tooling")

    result = compare_fingerprints(left, right)

    assert result.exact_duplicate is False
    assert result.is_near_duplicate is False
    assert result.score == 0


@pytest.mark.parametrize("threshold", [-0.1, 1.1])
def test_rejects_invalid_threshold(threshold: float) -> None:
    fingerprint = fingerprint_document("title", "body")
    with pytest.raises(ValueError, match="threshold"):
        compare_fingerprints(fingerprint, fingerprint, threshold=threshold)


def test_rejects_invalid_shingle_size() -> None:
    with pytest.raises(ValueError, match="shingle_size"):
        fingerprint_document("title", "body", shingle_size=0)
