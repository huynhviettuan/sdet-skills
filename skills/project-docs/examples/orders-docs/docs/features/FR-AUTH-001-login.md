# FR-AUTH-001 — Login

Snapshot: 2026-11-03. Source: S1 sentences 9–11; S2 `login`, `issue_token`.

## Purpose
Exchange a username and password for a bearer token so every other operation can identify the caller's tenant and
role, without leaking which usernames exist and without allowing password guessing.

## Actors
Anonymous (any client).

## Preconditions
The username is a seeded user (`../../specs/seed-data.json`); the account is not locked (BR-AUTH-002).

## Main Flow
1. Client sends `POST /auth/login` with `{"username": "...", "password": "..."}`.
2. Server checks the lockout counter for the submitted username; locked → 429 (alternative flow A).
3. Server checks the credentials; match → 200 `{"token": "..."}` with `exp` 60 minutes ahead (BR-AUTH-003).

## Alternative Flows
- A. Locked: 429, header `Retry-After: 60`, body `{"error": "too many attempts"}`; the password is not checked.
- B. Wrong password or unknown username: a failure is recorded for the submitted username; 401
  `{"error": "invalid credentials"}` — identical in both cases (BR-AUTH-001).
- C. Missing or non-JSON body: treated as empty username and password → flow B.

## States
Login attempt counter per username: open / locked (`../business/STATE_MACHINES.md`).

## Business Rules
BR-AUTH-001, BR-AUTH-002, BR-AUTH-003

## Fields
| Field | Type | Required | Notes |
|---|---|:---:|---|
| username | string | yes | compared exactly (case-sensitive) |
| password | string | yes | never logged, never returned |
| token (response) | string | — | three base64url segments, HS256 |

## Permissions
None required; the endpoint is the only one reachable without a token.

## API
`POST /auth/login` — `../api/API_SPECIFICATION.md`.

## Validation
Both fields are strings; anything else is a failed attempt (flow B), not a 400 — a 400 would reveal that the
format, not the credential, was wrong. (MODEL RECOMMENDATION, consistent with S2.)

## Calculations
`locked(username, now)` — `../architecture/DATA_MODEL.md` LoginAttempt.

## Audit Events
None (MODEL RECOMMENDATION in BR-AUTH-002: audit the first lockout).

## Notifications
N/A

## Error Cases
| Case | Answer |
|---|---|
| unknown username | 401 `invalid credentials` |
| wrong password | 401 `invalid credentials` |
| 5 failures in the last 60 s for this username | 429, `Retry-After: 60`, `too many attempts` |

## UI Behavior
N/A (API only).

## Acceptance Criteria
AC-AUTH-001, AC-AUTH-002, AC-AUTH-003, AC-AUTH-004, AC-AUTH-005, AC-AUTH-006, AC-AUTH-007

## Dependencies
Seed users; the signing key (`../delivery/ENVIRONMENTS.md`); ADR-004.

## Open Questions
None.
