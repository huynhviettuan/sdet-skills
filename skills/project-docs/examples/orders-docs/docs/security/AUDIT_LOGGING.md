# Audit Logging

Snapshot: 2026-11-03. Source: S1 sentence 13; S2 `deny`, `audit`. Rule: BR-AUD-001.

## What is audited

| Event | Audited | Entry |
|---|---|---|
| 401 — no or invalid token | yes | `actor: "anonymous"` |
| 403 — function denied | yes | `actor: <username>` |
| 404 — hidden object (scope denied) | yes | `actor: <username>` |
| 404 — id never existed | yes (S2 cannot tell them apart; the entry is the same) | `actor: <username>` |
| 400, 405, 409, 429, 500 | no | — |
| successful create / edit / transition / delete | no (MODEL RECOMMENDATION: audit deletes and transitions) | — |
| login success / failure / lockout | no (MODEL RECOMMENDATION: audit the first lockout per username) | — |

## Entry format

```json
{"actor": "bob", "action": "GET /orders/1", "outcome": "denied"}
```

- `actor`: the token's `sub`, or `anonymous`.
- `action`: `"<METHOD> <path>"` exactly as requested (path without query string).
- `outcome`: `denied` (the only value S2 writes).
- MODEL RECOMMENDATION: add `at` (UTC timestamp) and `tenant`; the format is then append-only extended, never
  changed.

## Who writes, who reads

- Written only by the single deny function (`../architecture/SYSTEM_ARCHITECTURE.md`); a handler cannot refuse a
  request without producing an entry.
- Read only by the admin: `GET /_audit` (AZ-046..048). A refused read of the audit log is itself audited.
- Never deleted or edited by the API. Retention is an open point for a product (`SECURITY.md`).

## Verified by

AC-AUD-001 (an entry per denial, with the three fields), AC-AUD-002 (admin-only read).
