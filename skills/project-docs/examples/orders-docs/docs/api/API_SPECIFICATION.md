# API Specification

Snapshot: 2026-11-03. Level 5 of the hierarchy: this file explains intent and links rule IDs; the machine-readable
contract is [`../../specs/openapi.yaml`](../../specs/openapi.yaml). Error bodies: [`ERROR_CODES.md`](ERROR_CODES.md).

## Conventions

- Base URL: `http://127.0.0.1:8765` locally (`../delivery/ENVIRONMENTS.md`).
- Authentication: `Authorization: Bearer <token>` on every endpoint except `POST /auth/login` (BR-AUTH-003).
- Content type: `application/json` both ways; an empty body is `{}`.
- Versioning: none (single version; a breaking change is a new ADR).
- Error format: `{"error": "<message>"}`, plus `fields` (400 field errors) or `ref` (500).
- Check order on every protected endpoint: token (401) → object scope (404) → function (403) → validation (400) →
  state (409).
- Every response carries the security headers (BR-SEC-004) and CORS per BR-SEC-005.

## POST /auth/login

Permission: none (anonymous).
Request: `{"username": "alice", "password": "<example>"}`
Response 200: `{"token": "<header>.<payload>.<signature>"}`
Validation: none that is visible (FR-AUTH-001 "Validation").
Business rules: BR-AUTH-001, BR-AUTH-002, BR-AUTH-003.
Errors: 401 `invalid credentials`; 429 `too many attempts` + `Retry-After: 60`.
Audit: none. Idempotency: N/A.

## POST /orders

Permission: `order.create` (AZ-019, AZ-020, AZ-021, AZ-049).
Request: `{"note": "up to 200 characters"}` (note optional).
Response 201: `{"id": 1, "owner": "alice", "tenant": "tenant-a", "note": "...", "status": "new", "paid_at": null}`
Validation: note ≤ 200 chars (400, OQ-002); open-order cap (409, OQ-003).
Business rules: BR-ORD-001, BR-ORD-003, BR-ORD-007.
Errors: 401, 403 (admin), 400 `note too long`, 409 `too many open orders`.
Audit: denials. Idempotency: not idempotent — two identical posts create two orders (no client key in scope).

## GET /orders

Permission: `order.read` (AZ-044, AZ-045).
Response 200: `[Order, ...]` — the caller's whole data scope (BR-ORD-002); no paging.
Errors: 401.

## GET /orders/{id}

Permission: `order.read` (AZ-001..AZ-007).
Response 200: `Order`.
Errors: 401; 404 `not found` for hidden or missing (BR-SEC-001).

## PATCH /orders/{id}

Permission: `order.edit_note` (AZ-008, AZ-009, AZ-010, AZ-022, AZ-050, AZ-051).
Request: `{"note": "..."}` — the only accepted key.
Response 200: the whole `Order`.
Validation: keys ⊆ {note} else 400 `unknown or read-only fields` with `fields` sorted (BR-SEC-003); note ≤ 200.
Business rules: BR-ORD-003, BR-ORD-004, BR-SEC-003.
Errors: 401, 404, 400.
Idempotency: idempotent (same note → same result).

## POST /orders/{id}/pay | /ship | /cancel

Permission: `order.pay` (AZ-024..030), `order.ship` (AZ-031..036), `order.cancel` (AZ-037..043).
Request: no body.
Response 200: the `Order` after the transition (`paid_at` set by `pay`).
Business rules: BR-ORD-005, BR-ORD-006 (cancel on paid).
Errors: 401, 404, 403, 409 `invalid transition`, 409 `cancellation window closed` (cancel only).
Audit: denials only. Idempotency: a repeated call is a 409 and changes nothing.

## DELETE /orders/{id}

Permission: `order.delete` (AZ-011..AZ-014, AZ-023).
Response 204: no body.
Errors: 401, 404 (hidden, missing, or already deleted), 403 (customer).
Idempotency: the second call answers 404; the state is the same.

## GET /admin/users

Permission: `admin.users` (AZ-015..AZ-018).
Response 200: `[{"username": "alice", "tenant": "tenant-a", "role": "customer"}, ...]` — never a password.
Errors: 401, 403.

## GET /_audit

Permission: `audit.read` (AZ-046..AZ-048).
Response 200: `[{"actor": "bob", "action": "GET /orders/1", "outcome": "denied"}, ...]` in insertion order.
Errors: 401, 403.
Path note: the reference implementation's name; see FR-ADM-001.

## Not part of the product

`POST /_reset`, `GET /_boom` — reference-implementation test hooks (`../product/01_SCOPE.md`,
`../security/SECURITY.md`). They are not in `openapi.yaml`.
