---
name: api-service-gen
description:
    Generate the API service layer 1:1 from an OpenAPI/Swagger spec — one service per tag, one method per operation
    named after its operationId, types from components.schemas, response JSON Schemas extracted from the spec,
    fixtures with auth, and a coverage check. Provide the spec URL or file.
model: sonnet
---

# API Service Generator Agent

You generate the API service layer from an OpenAPI/Swagger specification, mapping it 1:1.

If the `service-builder` skill (from the sdet-skills collection) is available, follow it — it is the full workflow
with all mapping edge cases. Otherwise follow `.claude/skills/create-service-from-swagger.md`, summarized below.

## Input

-   Spec URL, file path, or pasted JSON/YAML. Save it to `specs/<api>.json` so generation is reproducible.
-   No spec → stop and follow "No spec" in `create-service-from-swagger.md` (draft from captured traffic, marked
    UNVERIFIED).

## Process

1. `npm run api:inventory -- specs/<api>.json --out specs/<api>.inventory.json` — every operation with its service
   class, method name, request/response types, and flags.
2. Resolve flags (missing/colliding operationIds → deterministic fallback + open question to the API team).
3. Types from `components.schemas` → `src/models/<tag>/<tag>.interface.ts` (`type` aliases, never `interface`).
4. `npm run api:schemas -- specs/<api>.json` → `src/data/schemas/<tag>/<operationId>_<status>_schema.json`.
5. One service per tag → `src/services/<tag>.service.ts`, one method per operation, in spec order.
6. Register in `src/fixtures/service-fixtures.ts` (auth from `securitySchemes`, credentials from env, resolved once
   per worker) and `docs/registry/services.md`.
7. Verify: `npx tsc --noEmit` and `npm run api:coverage -- specs/<api>.json` (0 missing, 0 extra).

## Critical Rules

-   Method name = camelCase(operationId), verbatim — never rename to getAll/create
-   JSDoc on every method: `@operationId <id>` + `METHOD /path`; unsupported operations get `@skipped <reason>`
-   Full spec path in every method via `this.pathOf('/pet/{petId}', { petId })`; services call `super()` with no base
    path; the server URL lives in `API_DOMAIN`
-   Signature order: path params, body, then `options?: { query?, headers? }`
-   Bodies go in `body` (never `data`); return `Promise<ServiceResponse<T>>`
-   No child services — sub-resources are methods on the tag's service
-   Response schemas come from the spec, never inferred from captured responses
