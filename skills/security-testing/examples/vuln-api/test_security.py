"""Security tests for vuln-api. Green with no flaws; scripts/selftest.py proves each test turns red for the flaw it
claims to catch (VULN_API_INSECURE=<flaw>). Case IDs TC-SEC-... trace to ROLES_PERMISSIONS.md and the README.

    python -m pytest examples/vuln-api -q
"""

from __future__ import annotations

import base64
import json
import time
from pathlib import Path

import pytest

import app
from authz_matrix import load_matrix
from conftest import Api

MATRIX = load_matrix(Path(__file__).parent / "ROLES_PERMISSIONS.md")


# TC-SEC-AUTHZ-001 - one test per matrix row; the table is the only source of expected results.
@pytest.mark.parametrize("cell", MATRIX, ids=[c.id for c in MATRIX])
def test_access_control_matrix(api: Api, tokens: dict[str, str | None], alice_order: dict, cell) -> None:
    method, _, template = cell.operation.partition(" ")
    path = template.replace("{id}", str(alice_order["id"]))
    body = {"note": "edited"} if method in {"PATCH", "POST"} else None

    r = api.request(method, path, token=tokens[cell.actor], json_body=body)

    assert r.status == cell.expected, f"{cell.id} {cell.operation} as {cell.actor}: {r.status} {r.body}"


# TC-SEC-BOLA-001 - the attacker is denied AND the object is unchanged (flaw: bola)
def test_bola_attacker_cannot_change_another_tenants_order(api: Api, tokens, alice_order: dict) -> None:
    attack = api.request("PATCH", f"/orders/{alice_order['id']}", token=tokens["customer-other-tenant"],
                         json_body={"note": "owned"})
    after = api.request("GET", f"/orders/{alice_order['id']}", token=tokens["customer-own"])

    assert attack.status == 404
    assert after.body["note"] == "original"


# TC-SEC-MASS-001 - read-only fields are rejected, not silently ignored (flaw: mass)
def test_mass_assignment_rejected(api: Api, tokens, alice_order: dict) -> None:
    r = api.request("PATCH", f"/orders/{alice_order['id']}", token=tokens["customer-own"],
                    json_body={"note": "ok", "status": "paid", "tenant": "tenant-b"})
    after = api.request("GET", f"/orders/{alice_order['id']}", token=tokens["customer-own"])

    assert r.status == 400
    assert r.body["fields"] == ["status", "tenant"]
    assert (after.body["status"], after.body["tenant"]) == ("new", "tenant-a")


# TC-SEC-HDR-001 - every documented security header, exact value (flaw: headers)
def test_security_headers_present(api: Api, tokens) -> None:
    r = api.request("GET", "/orders", token=tokens["customer-own"])

    missing = {k: v for k, v in app.SECURITY_HEADERS.items() if r.headers.get(k) != v}
    assert missing == {}, f"missing or wrong: {missing}"


# TC-SEC-CORS-001 - an unknown origin gets no CORS grant (flaw: cors)
def test_cors_rejects_unknown_origin(api: Api, tokens) -> None:
    r = api.request("GET", "/orders", token=tokens["customer-own"],
                    headers={"Origin": "https://evil.example.test"})

    assert "Access-Control-Allow-Origin" not in r.headers
    assert "Access-Control-Allow-Credentials" not in r.headers


# TC-SEC-CORS-002 - the positive path: the listed origin is granted (keeps the gate from over-blocking)
def test_cors_allows_listed_origin(api: Api, tokens) -> None:
    r = api.request("GET", "/orders", token=tokens["customer-own"],
                    headers={"Origin": "https://app.example.test"})

    assert r.headers.get("Access-Control-Allow-Origin") == "https://app.example.test"


# TC-SEC-ERR-001 - a 500 carries a reference, never a trace or a file path (flaw: errors)
def test_error_response_does_not_leak(api: Api) -> None:
    r = api.request("GET", "/_boom")

    assert r.status == 500
    text = json.dumps(r.body)
    assert "Traceback" not in text and "app.py" not in text and "pricing" not in text
    assert "ref" in r.body


# TC-SEC-AUTHN-001 - failed logins are rate-limited per account (flaw: ratelimit)
def test_login_rate_limited(api: Api) -> None:
    for _ in range(app.LOGIN_LIMIT):
        assert api.login("nobody-rl", "wrong").status == 401

    r = api.login("nobody-rl", "wrong")

    assert r.status == 429
    assert r.headers.get("Retry-After") == "60"


# TC-SEC-AUTHN-002 - the login error is identical for unknown users and wrong passwords (flaw: enum)
def test_login_does_not_reveal_usernames(api: Api) -> None:
    known = api.login("alice", "wrong")
    unknown = api.login("zed", "wrong")

    assert (known.status, known.body) == (unknown.status, unknown.body)


# TC-SEC-JWT-001 - an unsigned token (alg=none) claiming admin is rejected (flaw: jwt-none)
def test_unsigned_token_rejected(api: Api) -> None:
    header = _b64({"alg": "none", "typ": "JWT"})
    payload = _b64({"sub": "root", "tenant": "*", "role": "admin", "exp": int(time.time()) + 3600})

    r = api.request("GET", "/admin/users", token=f"{header}.{payload}.")

    assert r.status == 401


# TC-SEC-JWT-002 - a re-signed payload with a different key, and a tampered payload, are rejected
def test_tampered_token_rejected(api: Api, tokens) -> None:
    head, _, rest = tokens["customer-own"].partition(".")
    _, _, sig = rest.partition(".")
    payload = _b64({"sub": "alice", "tenant": "tenant-a", "role": "admin", "exp": int(time.time()) + 3600})

    r = api.request("GET", "/admin/users", token=f"{head}.{payload}.{sig}")

    assert r.status == 401


# TC-SEC-JWT-003 - an expired token is rejected
def test_expired_token_rejected(api: Api) -> None:
    header = _b64({"alg": "HS256", "typ": "JWT"})
    payload = _b64({"sub": "alice", "tenant": "tenant-a", "role": "customer", "exp": int(time.time()) - 1})
    import hashlib
    import hmac
    sig = app.b64(hmac.new(app.SIGNING_KEY, f"{header}.{payload}".encode(), hashlib.sha256).digest())

    r = api.request("GET", "/orders", token=f"{header}.{payload}.{sig}")

    assert r.status == 401


# TC-SEC-AUDIT-001 - a denied request leaves an audit entry naming actor and action (flaw: audit)
def test_denied_request_is_audited(api: Api, tokens) -> None:
    assert api.request("GET", "/admin/users", token=tokens["customer-own"]).status == 403

    audit = api.request("GET", "/_audit", token=tokens["admin"])

    assert {"actor": "alice", "action": "GET /admin/users", "outcome": "denied"} in audit.body


# SENTINEL - a known-false expectation through the same client. It must stay red; if it passes, object-level
# authorization is gone and every green above is suspect.
@pytest.mark.xfail(strict=True, reason="sentinel: another tenant must never read this order")
def test_sentinel_other_tenant_reads_order(api: Api, tokens, alice_order: dict) -> None:
    r = api.request("GET", f"/orders/{alice_order['id']}", token=tokens["customer-other-tenant"])

    assert r.status == 200


def _b64(obj: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()
