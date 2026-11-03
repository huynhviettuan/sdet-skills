# vuln-api — security tests that are proven to detect what they claim

A multi-tenant orders API in Python stdlib (`app.py`, no dependencies) that is **secure by default** and has eleven
switchable flaws. The pytest suite (`test_security.py`) is green against the secure server; `scripts/selftest.py`
then enables one flaw at a time and proves that **exactly** the tests claiming that flaw turn red and nothing
else moves. A security test that was never seen red is a hope; these have each been seen red for their flaw.

```bash
python -m pytest examples/vuln-api -q
```

Ran once on 2026-11-03: `35 passed, 1 xfailed` (the sentinel). CI's `skill-scripts` job reruns the selftest.

```bash
VULN_API_INSECURE=bola,headers python examples/vuln-api/app.py 8765     # run it with flaws, for a manual look
python scripts/headers_check.py http://127.0.0.1:8765/orders            # -> findings
```

## Flaws and the tests that catch them

| Flaw (`VULN_API_INSECURE=`) | What breaks | Tests that go red (selftest asserts this set exactly) |
|---|---|---|
| `bola` | object-level authorization skipped | matrix rows AZ-003/004/006/009/010/013, `test_bola_attacker_cannot_change_another_tenants_order`, sentinel XPASS |
| `mass` | PATCH accepts `status` and `tenant` | `test_mass_assignment_rejected` |
| `headers` | security headers omitted | `test_security_headers_present` |
| `cors` | any origin reflected, with credentials | `test_cors_rejects_unknown_origin` |
| `errors` | stack trace in 500 responses | `test_error_response_does_not_leak` |
| `ratelimit` | no login rate limit | `test_login_rate_limited` |
| `enum` | login reveals whether the user exists | `test_login_does_not_reveal_usernames` |
| `jwt-none` | `alg=none` tokens accepted | `test_unsigned_token_rejected` |
| `jwt-nosig` | signature not verified | `test_tampered_token_rejected` |
| `jwt-noexp` | expiry not checked | `test_expired_token_rejected` |
| `audit` | denied requests not logged | `test_denied_request_is_audited` |

## What the suite shows

| Case | Technique | Oracle |
|---|---|---|
| TC-SEC-AUTHZ-001 (23 rows) | access-control matrix driven from `ROLES_PERMISSIONS.md` via `authz_matrix.load_matrix`; the table is the only source of expected results | status per cell; `authz_matrix.py verify` proves every cell ran and passed |
| TC-SEC-BOLA-001 | two legitimate users: attacker denied **and** the object unchanged | 404 + owner's read shows the original |
| TC-SEC-MASS-001 | read-only fields rejected, not ignored | 400 naming the fields; object unchanged |
| TC-SEC-HDR-001, CORS-001/002 | exact header values; unknown origin gets no grant; listed origin does (positive path) | header equality |
| TC-SEC-ERR-001 | 500 carries a reference, no trace, no path, no internal wording | body text |
| TC-SEC-AUTHN-001/002 | lockout after `LOGIN_LIMIT` failures with `Retry-After`; identical error for unknown user vs wrong password | status + body equality |
| TC-SEC-JWT-001/002/003 | `alg=none`, re-signed payload, expired | 401 |
| TC-SEC-AUDIT-001 | a denied request leaves an entry naming actor, action, outcome | audit read-back |
| Sentinel | another tenant reads the order — `xfail(strict=True)` | must stay red |

## Honest notes

- `POST /_reset` and `GET /_boom` are **test hooks** with no authentication. In a real product both would be
  findings (an unauthenticated reset is a denial-of-service; `_boom` is a debug endpoint). They exist so the suite
  needs no data factory; a real suite resets through its factories and provokes a 500 through a real fault path.
- Denied object access answers `404` (BR-SEC-001 in `ROLES_PERMISSIONS.md`): do not confirm existence.
- Example values only: users, `example-password`, the signing key and `example.test` origins are synthetic.
- The suite runs the server in-process on an ephemeral port; flaws are read from the environment per request, so
  the selftest sets `VULN_API_INSECURE` per pytest run.
