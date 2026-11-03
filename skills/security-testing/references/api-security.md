# API Security

The OWASP API Security Top 10 (2023) and the API-specific attack surfaces around it (tokens, OAuth flows, SSRF,
GraphQL, webhooks, races, limits), each mapped to a test with a deterministic oracle. Where the `examples/vuln-api`
suite already has the test, the row names it (`test_security.py`, 35 passed + 1 xfailed sentinel on 2026-11-03;
`scripts/selftest.py` proves each test turns red for its flaw). Where it does not, the row is marked as a gap so
nobody reads an example as coverage. The general patterns (fixtures, matrix, BOLA, headers) are in
[`automated-security-tests.md`](automated-security-tests.md); this file does not repeat them.

Contents:

- [How to read a row](#how-to-read-a-row)
- [OWASP API Security Top 10 (2023)](#owasp-api-security-top-10-2023)
- [JWT](#jwt)
- [OAuth2 and OIDC flows](#oauth2-and-oidc-flows)
- [SSRF](#ssrf)
- [GraphQL](#graphql)
- [Webhooks](#webhooks)
- [Idempotency keys and races](#idempotency-keys-and-races)
- [Rate limits and lockout](#rate-limits-and-lockout)
- [Rules](#rules)

---

## How to read a row

| Column | Meaning |
|---|---|
| Technique | The attack or check, named so a finding can be filed against it |
| Case shape | What the test does, in one line; two legitimate users where isolation is involved |
| Expected (oracle) | The observable a deterministic assertion reads: a status, a header, a re-read of the object, an audit entry, a request that never arrived at a sink you own. Never "the API behaves safely" |
| ID | The `SEC-API-NN` rule; cases that verify it are `TC-SEC-<AREA>-NNN` in the standard format ([`test-case-format.md`](../../test-case-design/references/test-case-format.md#template)) |

Example values only throughout: `example.test` hosts, `tenant-a`/`tenant-b`, the vuln-api users.

---

## OWASP API Security Top 10 (2023)

| Item | Test | Expected (oracle) | vuln-api test | ID |
|---|---|---|---|---|
| API1 Broken object level authorization | attacker (same role, other tenant) reads/edits/deletes the owner's object by id, in path, query filter, nested route and export | 404 (BR-SEC-001: do not confirm existence) and the owner's re-read is unchanged | `test_bola_attacker_cannot_change_another_tenants_order`, matrix rows AZ-003/004/006/009/010/013 | SEC-API-01 |
| API2 Broken authentication | no/malformed/expired/tampered/unsigned token; login enumeration; lockout | 401; identical body for unknown user and wrong password; 429 with `Retry-After` | `test_unsigned_token_rejected`, `test_tampered_token_rejected`, `test_expired_token_rejected`, `test_login_does_not_reveal_usernames`, `test_login_rate_limited` | SEC-API-02 |
| API3 Broken object property level authorization | write a `readOnly`/privileged field; read a response as each role | 400 naming the fields, object unchanged; response has no field outside the role's schema | `test_mass_assignment_rejected`; excessive exposure: **gap** (see [`schema-driven-negative-tests.md`](schema-driven-negative-tests.md#response-schema-as-a-leak-detector)) | SEC-API-03 |
| API4 Unrestricted resource consumption | N+1 requests in the window; `?limit=100000`; oversize body; deep nesting | 429 with `Retry-After`; capped page; 413/400 | `test_login_rate_limited` (login only); body/page limits: **gap** | SEC-API-04 |
| API5 Broken function level authorization | every operation x actor from `ROLES_PERMISSIONS.md`, default deny | status per cell; `authz_matrix.py verify` proves every cell ran and passed | `test_access_control_matrix` (23 rows) | SEC-API-05 |
| API6 Unrestricted access to sensitive business flows | script the flow (checkout, signup, voucher) at machine speed; skip a step | the flow's documented control fires (captcha/step token/limit) or the step is refused | **gap** (an example API with no business flow) | SEC-API-06 |
| API7 Server side request forgery | see [SSRF](#ssrf) | no request reaches the canary sink; 400 for internal targets | **gap** | SEC-API-07 |
| API8 Security misconfiguration | headers, CORS, error bodies, verbose 500s, debug endpoints | exact header values; unknown origin gets no grant; 500 carries a reference, no trace | `test_security_headers_present`, `test_cors_rejects_unknown_origin`, `test_cors_allows_listed_origin`, `test_error_response_does_not_leak` | SEC-API-08 |
| API9 Improper inventory management | spec operations vs deployed routes; old versions (`/v1`) still answering; test hooks reachable | `openapi-tool coverage` 0 missing / 0 extra; retired versions 404/410; `/_reset`, `/_boom` absent outside test | **gap**; vuln-api's test hooks are documented as findings in its README | SEC-API-09 |
| API10 Unsafe consumption of APIs | feed a stubbed upstream a hostile response (oversize, wrong type, redirect to internal host, injection-shaped string) | the consumer validates against its own schema, rejects, and does not follow the redirect | **gap** | SEC-API-10 |

Gap rows are the backlog for a real product; the coverage map in
[`threat-modeling-and-scope.md`](threat-modeling-and-scope.md#coverage-map) is where they are tracked.

---

## JWT

The vuln-api tests for the first three rows are copied from `examples/vuln-api/test_security.py`; the rest are
case shapes with no runnable source here.

| Technique | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| `alg=none` | header `{"alg":"none"}`, payload claims admin, empty signature | 401 | SEC-API-11 |
| Tampered payload | keep header and signature, change `role` | 401 | SEC-API-12 |
| Re-signed with another key | same payload, signature from a key you generated | 401 | SEC-API-12 |
| Expired | valid signature, `exp` in the past | 401 | SEC-API-13 |
| Wrong `aud` / `iss` | valid signature from a second issuer you control, or a token minted for another audience | 401 | SEC-API-14 |
| `kid` / `jku` injection | `kid` pointing at a path or SQL-shaped string; `jku`/`x5u` pointing at a host you own | 401; the sink you own logs no fetch | SEC-API-15 |
| Key confusion RS256 -> HS256 | token signed with HMAC using the public key as the secret, header says HS256 | 401 (the verifier pins the algorithm per key) | SEC-API-16 |
| Positive path | the real token on the same endpoint | 200 (keeps the gate from over-blocking) | SEC-API-11 |

```python
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
```

Each has its flaw switch (`jwt-none`, `jwt-nosig`, `jwt-noexp`) and the selftest shows each red for exactly its
flaw. The signing key in the example is a documented example value, not a secret.

---

## OAuth2 and OIDC flows

The identity provider is usually a third party and out of scope ([rules of engagement](threat-modeling-and-scope.md#rules-of-engagement));
these cases target **your** client and resource server, with a stub provider you run.

| Technique | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| PKCE required | authorization request without `code_challenge`; token request with a wrong `code_verifier` | provider stub rejects (`invalid_request` / `invalid_grant`); your client never sends a request without a challenge (stub log) | SEC-API-20 |
| `redirect_uri` exact match | registered `https://app.example.test/cb`, request `https://app.example.test/cb/../evil`, `https://app.example.test.evil.example.test/cb`, a different port | provider stub rejects; the code is never delivered to the sink you own | SEC-API-21 |
| `state` / `nonce` | callback with a missing, reused or foreign `state`; ID token with a `nonce` that was not issued | your client refuses the callback (4xx, no session created); re-read: no session cookie set | SEC-API-22 |
| Token in fragment vs body | implicit-style `#access_token=` on the callback | your client ignores it; only the code exchange (POST body) creates a session | SEC-API-23 |
| Refresh rotation | use a refresh token twice | second use fails and the whole family is revoked: the access token from the first use is now 401 | SEC-API-24 |
| Scope escalation | request `scope=admin` as a client registered for `read`; present a token with scopes the client was not granted | provider stub narrows or rejects; resource server answers 403 for the extra scope | SEC-API-25 |
| Token audience | an access token issued for API A sent to API B | 401 at API B | SEC-API-14 |

---

## SSRF

Every parameter that takes a URL (webhook target, avatar import, document fetch, OpenID discovery, `jku`) is an SSRF
candidate. The oracle is a **sink you control** that logs every request it receives, plus a canary value in the URL
so a hit is attributable to one case.

| Technique | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| Loopback and internal ranges | `http://127.0.0.1/`, `http://[::1]/`, `http://10.0.0.1/`, `http://169.254.169.254/` (cloud metadata), `http://localhost:port/` | 400 naming the field; the application's own log shows no outbound request | SEC-API-30 |
| Scheme smuggling | `file:///etc/hostname`, `gopher://`, `dict://` | 400 | SEC-API-30 |
| Redirect to internal | the sink answers 302 to `http://127.0.0.1/` | the fetcher does not follow (sink sees one request; app log shows no second request) | SEC-API-31 |
| DNS rebinding | a name you control resolving first to the sink, then to an internal address | the fetcher resolves once and connects to the first address, or re-validates after resolution; no internal hit | SEC-API-32 |
| Encoding tricks | decimal IP `2130706433`, `0x7f000001`, `127.1`, `127.0.0.1.nip.io`-style names, `@` userinfo, double-encoded dots | 400 for every form | SEC-API-30 |
| Allowlist positive path | the documented allowed host with the canary `?c=TC-SEC-SSRF-001` | the sink logs exactly one request carrying that canary | SEC-API-33 |

A real public resolver or metadata endpoint is never the target: all addresses in the table are either RFC-reserved
or a host you run in the test environment.

---

## GraphQL

| Technique | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| Introspection in production-like config | `__schema { types { name } }` with the production flag set | 400/403 and no `__schema` key in the body | SEC-API-40 |
| Depth limit | a self-referencing query nested one past the documented depth | error naming the limit; the limit itself (depth N) still answers | SEC-API-41 |
| Complexity / cost limit | a list field with `first: 100000` or a wide selection past the documented cost | error naming the cost; no partial data | SEC-API-41 |
| Batching bypasses rate limit | one HTTP request carrying N+1 operations (array batching) or N+1 aliases of the same mutation | counted as N+1: 429 or per-operation error after the limit | SEC-API-42 |
| Field-level authorization | query a privileged field (`user { passwordHash }`, `order { tenant }`) as a customer | field is `null` with an `errors` entry, or 403; never the value | SEC-API-43 |
| Node lookup BOLA | `node(id: "<other tenant's global id>")` | `null` (do not confirm existence) and the owner's re-read is unchanged | SEC-API-01 |
| Mutation on a foreign object | `updateOrder(id: <other's>)` | same as REST BOLA | SEC-API-01 |

---

## Webhooks

Inbound webhooks (a provider calling you) are an authentication boundary; outbound webhooks (you calling customers)
are SSRF candidates ([SSRF](#ssrf)) plus a secret-handling case.

| Technique | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| HMAC signature required | inbound call without the signature header; with a signature over a different body; with a signature from a key you made up | 401 and no side effect (re-read the resource the webhook would have changed) | SEC-API-50 |
| Timestamp window | a correctly signed call whose timestamp is older than the documented window | 401; the same call inside the window is 200 (positive path) | SEC-API-51 |
| Replay | the same valid call delivered twice | second delivery is acknowledged but idempotent: the resource changed once, one audit entry | SEC-API-52 |
| Constant-time comparison | not testable by status; covered by code review and SAST, note it in the review | n/a | SEC-API-50 |
| Outbound secret | the signing secret for a customer's endpoint | never in the URL, never logged (grep the log sink for the example secret value) | SEC-API-53 |

---

## Idempotency keys and races

| Technique | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| Double submit with the same key | two `POST /payments` with the same `Idempotency-Key` and body | one resource created; second answer returns the first result (same id) | SEC-API-60 |
| Same key, different body | second call reuses the key with another amount | 409/422; the original resource unchanged | SEC-API-60 |
| Concurrent double spend (TOCTOU) | balance 100, two parallel `POST /withdraw` of 100 from two connections | exactly one 2xx; balance 0, never -100; one ledger entry | SEC-API-61 |
| Single-use token in parallel | redeem a coupon from two clients at once | one 2xx, one 4xx; coupon marked used once | SEC-API-61 |
| Workflow step race | `approve` and `cancel` the same request in parallel | the state machine ends in one documented terminal state; no "approved and cancelled" | SEC-API-62 |

Parallelism in the test is real threads or async requests started together, not sequential calls; the assertion is
on the stored state after both return, not on which call "won".

---

## Rate limits and lockout

Copied from `examples/vuln-api/test_security.py` (flaws `ratelimit` and `enum`; both seen red by the selftest on
2026-11-03):

```python
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
```

| Technique | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| Per-account lockout | `LOGIN_LIMIT` failures, then one more | 429 with `Retry-After` (above) | SEC-API-70 |
| Lockout is per account, not global | lock `nobody-rl`, then log in as another user with the right password | 200 for the other user (positive path, prevents a denial-of-service via lockout) | SEC-API-70 |
| Limit survives a client change | the same failures with a rotating `X-Forwarded-For` or a new session cookie each time | still 429: the key is the account, not the client | SEC-API-71 |
| Enumeration by timing or body | unknown user vs wrong password | identical status and body (above); response time within the suite's documented tolerance, reported as advisory | SEC-API-72 |
| Enumeration via registration/reset | `POST /register` and `POST /password-reset` with an existing and a non-existing address | identical status and body; the difference, if any, only reaches the mailbox | SEC-API-72 |
| Expensive endpoint throttle | N+1 export/search calls in the window | 429; cheaper endpoints unaffected | SEC-API-04 |

Whether a limit holds under load is `performance-testing`'s question; these cases only prove the limit exists and
is keyed correctly.

---

## Rules

- **SEC-API-R1** Every row above that applies to the product has either a `TC-SEC-` case or an entry in the coverage
  map marked as a gap with a risk; a row that is "covered by the framework" is a gap until a test shows it red.
- **SEC-API-R2** Denial is asserted twice: the status, then the state (re-read as the owner, audit entry, sink
  log). A 4xx alone proves nothing about what was written.
- **SEC-API-R3** Every negative family has a positive path (the listed origin, the real token, the allowed host) so
  the gate is proven open where it must be, not just closed.
- **SEC-API-R4** Internal addresses in SSRF cases are reserved ranges or hosts you run; identity providers and
  customer endpoints are stubs. Nothing above is sent to a system outside the written scope.
- **SEC-API-R5** Tokens, keys and secrets in cases are example values documented as such (vuln-api's
  `example-signing-key-not-a-secret`); a case never needs a real one.
- **SEC-API-R6** A test that has never been seen red is a hope: the selftest pattern (enable one flaw, assert exactly
  the claiming tests fail) or `can-fail` is the evidence, and the reference says which tests have it.
