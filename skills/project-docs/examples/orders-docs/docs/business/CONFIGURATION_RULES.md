# Configuration Rules

Snapshot: 2026-11-03. Fixed workflow (the lifecycle, the check order, the roles) is code. The values below are
expected to change and live in configuration, each with its default, range, owner and retroactivity. The
reference implementation (S2) hard-codes the first two as module constants; the rest are assumptions until their
OQ is decided.

| Key | Used by | Default | Allowed range | Who may change | Applies retroactively | Source |
|---|---|---|---|---|---|---|
| `login.failed_attempt_limit` | BR-AUTH-002 | 5 | 1–20 | platform operator | yes, next attempt | S1 sentence 10; S2 `LOGIN_LIMIT` |
| `login.window_seconds` | BR-AUTH-002 | 60 | 10–3600 | platform operator | yes | S1 sentence 10 (`Retry-After: 60`) |
| `token.ttl_minutes` | BR-AUTH-003 | 60 | 5–1440 | platform operator | no, tokens already issued keep their `exp` | S2 `issue_token`; ADR-004 |
| `order.note_max_chars` | BR-ORD-003 | 200 | 1–2000 | Product Owner | no, stored notes are not re-validated | S1 sentence 4 |
| `order.cancel_window_hours` | BR-ORD-006 | 24 | 0–720 | Product Owner | yes, evaluated at cancel time | ASSUMPTION (OQ-001) |
| `order.open_cap` | BR-ORD-007 | 5 | 1–100 | Product Owner | yes, evaluated at create time | ASSUMPTION (OQ-003) |
| `cors.allowed_origins` | BR-SEC-005 | `https://app.example.test` (example) | list of origins | platform operator | yes | S2 `ALLOWED_ORIGINS` |

Rules:
- A configurable value is read in one domain function; handlers never read configuration directly.
- Changing a value is a deployment-time setting, not an API call (there is no settings endpoint, `01_SCOPE.md`).
- Tests state the value they assume (the default) so a changed configuration is a visible failure, not a flake.
