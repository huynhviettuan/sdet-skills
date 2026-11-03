# Error Codes

Snapshot: 2026-11-03. One body shape, `{"error": "<message>"}`; the message strings below are exact and tests
compare them with equality. Source: S2 for the first seven, ADR-003 / assumptions for the 409s and the 400 on
note length.

| HTTP | `error` | Extra fields | When | Rule |
|---|---|---|---|---|
| 400 | `unknown or read-only fields` | `fields`: sorted list of names | PATCH body names anything but `note` | BR-SEC-003 |
| 400 | `note too long` | — | note > 200 characters on POST or PATCH (assumption, OQ-002) | BR-ORD-003 |
| 401 | `unauthorized` | — | no, malformed, unsigned, tampered or expired token | BR-AUTH-003 |
| 401 | `invalid credentials` | — | login failed, unknown user or wrong password alike | BR-AUTH-001 |
| 403 | `forbidden` | — | role may not perform the function on an object it can see | BR-SEC-002 |
| 404 | `not found` | — | object outside the caller's scope, or no such id, or route not matched | BR-SEC-001 |
| 405 | `method not allowed` | — | unsupported method on `/orders/{id}` | S2 |
| 409 | `invalid transition` | — | no row for (status, action) in STATE_MACHINES.md | BR-ORD-005 |
| 409 | `cancellation window closed` | — | cancel on `paid` at or after 24 h since `paid_at` (assumption, OQ-001) | BR-ORD-006 |
| 409 | `too many open orders` | — | 6th order in `new` for one customer (assumption, OQ-003) | BR-ORD-007 |
| 429 | `too many attempts` | header `Retry-After: 60` | 5 failed logins for the username in 60 s | BR-AUTH-002 |
| 500 | `internal error` | `ref`: 8 hex characters | unhandled failure; nothing else in the body | BR-SEC-006 |

Rules:
- A denial (401/403/404 from an authorization check) is audited (BR-AUD-001); a 400, 405, 409, 429 or 500 is not.
- A 404 for "hidden" and a 404 for "missing" are byte-identical (AC-ORD-015).
- No error body ever includes a stack trace, file path, SQL, or the name of a field's expected value beyond the
  field name itself.
