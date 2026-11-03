# Deployment

Snapshot: 2026-11-03. The reference implementation runs as a single process; this file states what a deployed
build must do differently and who owns it. Environments: [`ENVIRONMENTS.md`](ENVIRONMENTS.md).

## Build

- One artefact: the service with its seed file. No build step beyond packaging (standard library only, ADR-001).
- The product build excludes the test hooks `POST /_reset` and `GET /_boom` (`../security/SECURITY.md`); a
  deployment smoke check asserts both answer 404.

## Configuration

Every value in `../business/CONFIGURATION_RULES.md` and the signing key are read from the environment at start;
a missing signing key is a start-up failure, never a fallback to the example value.

## Rollout

1. Deploy to Staging; run the API suite and `authz_matrix.py verify` against it.
2. Promote the same artefact to Production.
3. Rollback: redeploy the previous artefact. There is no schema and no persisted data, so rollback has no data
   step; the lockout counters and the audit log are lost on restart (known limitation, SYSTEM_ARCHITECTURE.md
   "Non-goals").

## TLS

HSTS is sent by the service (BR-SEC-004); TLS termination is the reverse proxy's job. The service listens on
plain HTTP on the loopback interface only (`127.0.0.1`), never on a public interface without the proxy.

## Ownership and incidents

| Concern | Owner (example role) |
|---|---|
| Deployment and rollback | platform operator |
| Signing-key rotation (invalidates every token; announce, then rotate) | platform operator |
| An audit-log finding | Product Owner with the security reviewer |
| A 500 `ref` reported by a client | on-call, searches the server log for the reference |

## Backup

None required: nothing persists (`../security/SECURITY.md`). A product with persistence adds a restore
verification step here before it goes live.
