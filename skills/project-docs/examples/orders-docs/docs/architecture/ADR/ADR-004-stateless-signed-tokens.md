# ADR-004 — Stateless HMAC-signed bearer tokens with a 60-minute expiry

Status: Accepted
Date: 2026-11-03
Deciders: tech lead, security reviewer (example roles)

## Context

The API has no session store and no registration, refresh or logout in scope (`01_SCOPE.md`). S2 issues a JWT-shaped
token signed with HMAC-SHA256 carrying `sub`, `tenant`, `role`, `exp` (one hour).

## Decision

Keep stateless bearer tokens: HS256 over a server-side key, claims `sub`, `tenant`, `role`, `exp = issued + 60
min` (`token.ttl_minutes`). Verification rejects `alg` `none`, a signature that does not verify, and a past `exp`
(BR-AUTH-003). No refresh endpoint; the client logs in again. The key is a deployment secret
(`../../delivery/ENVIRONMENTS.md`), never in the repository; the value in S2 is an example.

## Alternatives

- Opaque server-side sessions — rejected: needs a store and a logout, both out of scope.
- Asymmetric signatures (RS256) — rejected: one service verifies its own tokens; no third party.

## Why

Smallest design that satisfies S1 sentence 9 (401 without a token) and the security tests the skill ships
(`alg=none`, tampered, expired).

## Consequences

Positive:
- No state to invalidate; horizontal scaling of authentication is free.

Negative:
- A token cannot be revoked before `exp`; a role change takes up to 60 minutes to apply.
- The claims are readable by the client (not encrypted); they contain no secret.

## Revisit When

Logout, role changes during a session or a second service appear.
