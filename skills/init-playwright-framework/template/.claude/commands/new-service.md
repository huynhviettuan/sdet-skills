---
description: Create an API service extending BaseService
argument-hint: <resource name> [swagger url/path]
---

Read `.claude/skills/create-api-service.md`, then create an API service for: **$ARGUMENTS**

Requirements:

-   Service class extends `BaseService` and follows the controller pattern.
-   Add request/response types under `src/models`.
-   Register the service in `src/fixtures/service-fixtures.ts` and add a row to `docs/registry/services.md`.
-   Use path aliases, never relative imports.

If a Swagger/OpenAPI URL or path was provided, follow the `api-service-gen` agent (or the `service-builder` skill if
installed): map the spec 1:1 — one method per operation named after its operationId — and finish with
`npm run api:coverage`.
