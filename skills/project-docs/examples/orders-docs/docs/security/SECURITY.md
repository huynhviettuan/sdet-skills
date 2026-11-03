# Security

Snapshot: 2026-11-03. Source: S1 sentences 9–13; S2; ADR-002, ADR-004. Where the product has no requirement
yet, the line says so rather than inventing one.

| Topic | Requirement | Rule / where |
|---|---|---|
| Authentication | Username + password at `POST /auth/login`; stateless signed bearer token, 60 min; `alg=none`, bad signature and expiry rejected | BR-AUTH-003, ADR-004 |
| Authorization | Server-side on every request; data scope (OWN / TENANT / ALL) then function; matrix is the test source | BR-ORD-002, BR-SEC-001/002, ADR-001 |
| Object enumeration | Denied object access answers 404 identical to "missing" | BR-SEC-001, ADR-002 |
| Mass assignment | PATCH allow-list `{note}`; everything else 400 naming the fields | BR-SEC-003 |
| Sensitive fields | Passwords never returned; audit log and other tenants' orders admin-only | ROLES_PERMISSIONS.md "Sensitive Fields" |
| Encryption in transit | HSTS header is sent (BR-SEC-004); TLS termination itself is a deployment concern (`../delivery/DEPLOYMENT.md`) | BR-SEC-004 |
| Encryption at rest | No requirement: in-memory store, no persistence in scope | — |
| Audit | Every denial, with actor, action, outcome; admin read | BR-AUD-001, `AUDIT_LOGGING.md` |
| Rate limiting | Login: 5 failures / username / 60 s → 429 + `Retry-After: 60`; no other endpoint is limited (OPEN QUESTION for a product: per-token request limits) | BR-AUTH-002 |
| User enumeration | One generic login failure | BR-AUTH-001 |
| Secrets handling | Signing key from the environment, never in the repo; the reference value is an example | `../delivery/ENVIRONMENTS.md`, ADR-004 |
| Security headers | Six fixed headers on every response | BR-SEC-004 |
| CORS | Allow-list; no reflection; never credentials | BR-SEC-005 |
| Error disclosure | 500 carries only a reference | BR-SEC-006 |
| Backup / restore | No requirement: nothing persists | — |
| PII | Usernames are the only personal-looking data and are example values; no email, phone or address field exists | DATA_MODEL.md |
| Data retention / deletion | No requirement beyond `DELETE /orders/{id}`; the audit log is never deleted by the API (OPEN QUESTION for a product: retention period) | BR-AUD-001 |
| Export permissions | No export exists (`../product/01_SCOPE.md`) | — |
| Test hooks | `POST /_reset`, `GET /_boom` exist only in the reference implementation; a deployed build must not expose them — an unauthenticated reset is a denial of service, `_boom` a debug endpoint | `01_SCOPE.md` |

Compliance: no regulated data is in scope; no legal requirement is recorded (none was given — a product adds
them as SOURCE REQUIREMENT or OQ, never guessed).
