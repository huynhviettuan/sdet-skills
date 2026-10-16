---
name: service-builder
description: >
  Generate the API service layer of a test framework (Playwright/TypeScript or RestAssured/Java) 1:1 from an
  OpenAPI/Swagger spec — one service class per tag, one method per operation named exactly after its operationId,
  types/models from components.schemas, response JSON Schemas extracted from the spec, registration with auth derived
  from securitySchemes, plus a coverage check that every spec operation is mapped. Use this skill whenever the user
  wants to create or update API services/clients from OpenAPI or Swagger, add an endpoint to a service, sync
  services after the spec changed, or build services when no spec exists (draft one from captured traffic).
  Trigger on phrases like "generate services from swagger", "openapi to service", "create API service", "sync
  services with the spec", "API client for tests", "service builder". Targets the init-playwright-framework
  and init-selenium-java-framework scaffolds.
---

# Service Builder

The spec is the source of truth; the service layer is its executable mirror. **Every operation in the spec maps to
exactly one method, named exactly after its `operationId`**, so anyone can go from a spec line to the code and back
with a grep, and regeneration never renames anything.

**How to use this skill:** follow the workflow. The deterministic parts run through `openapi-tool.mjs` (Node ≥ 18,
no dependencies): in a repo scaffolded by `init-playwright-framework` use its copy via `npm run api:inventory|
api:schemas|api:coverage -- <args>`; elsewhere run this skill's `scripts/openapi-tool.mjs`. Below, `<tool>` means
either. Load a reference when you need it:

- [`references/mapping-rules.md`](references/mapping-rules.md) — the complete spec → code mapping and every edge
  case: missing/colliding operationIds, multiple tags, API versions, servers, params, bodies, enums, nullable,
  `allOf`/`oneOf`, inline schemas, error responses, auth schemes.
- Code templates per stack — types/models, service, auth registration, registry row, smoke test, review checklist;
  each verified against the live Petstore API:
  - [`references/code-templates-playwright-ts.md`](references/code-templates-playwright-ts.md) — Playwright /
    TypeScript (`init-playwright-framework`)
  - [`references/code-templates-restassured-java.md`](references/code-templates-restassured-java.md) —
    RestAssured / Java / TestNG (`init-selenium-java-framework`)
- [`references/drift-and-no-spec.md`](references/drift-and-no-spec.md) — updating services when the spec changes,
  and drafting a spec from captured traffic when none exists.

**Detect the stack first:** `package.json` with `@playwright/test` → TypeScript; `pom.xml` with `rest-assured` →
Java. The contract and workflow are identical; only paths and syntax differ.

## The 1:1 contract

| OpenAPI | Playwright / TypeScript | RestAssured / Java |
|---|---|---|
| tag (first tag) | `<Tag>Service extends BaseService` in `src/services/<tag>.service.ts` | `<Tag>Service extends BaseService` in `api/services/<Tag>Service.java` |
| operation | one method, name = camelCase(`operationId`), JSDoc `@operationId <id>` + `METHOD /path` | same, in Javadoc |
| path template | verbatim: `this.pathOf('/pet/{petId}', { petId })` | verbatim: `send(Method.GET, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId), …)` |
| path params | positional arguments, typed from their schema | positional arguments (`long`, `String`, …) |
| JSON request body | positional `body`, typed | positional body model |
| query / header params | `options?: { query?, headers? }` | `<OperationId>Query` Lombok builder (+ header args when non-auth headers exist) |
| `components.schemas.X` | `export type X` in `src/models/<tag>/<tag>.interface.ts` | Lombok class `api/models/<tag>/X.java`; enums with `@JsonValue` |
| JSON 2xx response | `ServiceResponse<T>` + `src/data/schemas/<tag>/<operationId>_<status>_schema.json` | `ApiResponse<T>` + `src/test/resources/schemas/<tag>/<operationId>_<status>_schema.json` |
| `securitySchemes` | worker-scoped fixture in `service-fixtures.ts` → `setToken` / `setHeaders` | `Credentials` (env, once per run) + accessor in `context/Services.java` → `setToken` / `setHeader` |
| operation not generatable | doc block with `@operationId <id>` + `@skipped <reason>` — never silently absent | same |

## Workflow

1. **Locate the spec** — file in the repo (`specs/`), URL, or pasted. No spec → follow
   `drift-and-no-spec.md` → "No spec" and continue from the draft. Store the spec in the repo (`specs/<api>.json`)
   so generation is reproducible.
2. **Inventory** — `<tool> inventory specs/<api>.json --out specs/<api>.inventory.json`. It prints every operation
   with its target class, method name, request/response types, and flags (`NO-OPERATION-ID`, `NAME-COLLISION`,
   extra tags, multipart, deprecated). Its `file` column uses TypeScript paths; for Java use the paths above.
3. **Resolve flags** before generating (rules in `mapping-rules.md`). Missing or colliding operationIds are spec
   defects: generate with the tool's deterministic fallback, and raise an OQ asking the API team to fix the spec.
4. **Generate types/models** from `components.schemas`, following the type rules for the stack
   (`mapping-rules.md` → Types).
5. **Extract response schemas** — `<tool> schemas specs/<api>.json --out-dir <schemas dir>` (TS:
   `src/data/schemas`; Java: `src/test/resources/schemas`). Never hand-write or infer them from captured responses.
6. **Generate services** from the inventory, one file per service, methods in spec order.
7. **Register** — TS: `src/fixtures/service-fixtures.ts`; Java: an accessor in `context/Services.java` — with auth,
   and a row per service in `docs/registry/services.md`. Configuration (`API_DOMAIN`, credentials) goes to the
   stack's config (env / `.env.example` / `config/<env>.properties` for non-secrets), never hardcoded.
8. **Verify** — compile (`npx tsc --noEmit` or `mvn -q test-compile`); `<tool> coverage specs/<api>.json --services
   <services dir> [--tags <generated tags>]` must report 0 missing / 0 extra (`--tags` scopes "missing" to the tags
   you generated; extra and duplicated are always checked); run one generated smoke test per service against a test
   environment.

## Non-negotiable rules

- **operationId verbatim.** Don't rename to `getAll`/`create`, don't "improve" names. Better names belong in the
  spec.
- **One method per operation, one place per operation.** No hand-written wrapper methods inside generated
  services; composite flows (create-then-fetch) belong in test-data helpers or fixtures.
- **Types and schemas come from the spec**, not from observed responses. If the API disagrees with the spec, that
  is a finding (spec or API bug) — report it, don't patch the schema to match.
- **Services don't assert.** They return `ServiceResponse<T>` / `ApiResponse<T>` (status, typed body, raw response);
  tests assert.
- **No secrets in code or specs.** Credentials come from env via `Config`.
- **Never skip silently.** An operation that can't be generated gets an `@skipped` block with the reason and an OQ.
- **Regenerate, don't drift.** When the spec changes, rerun the workflow; manual edits to generated files are lost
  or, worse, kept inconsistently.

## Decision table

| Situation | Do |
|---|---|
| Operation has several tags | First tag owns the method; inventory shows the others — don't duplicate. |
| Same tag under `/v1` and `/v2` | One class per version (`UsersV1Service`, `UsersV2Service`) — the tool does this automatically. |
| Several `servers` (envs) | One `API_DOMAIN` per environment file; never pick a server in code. |
| Spec has relative server URL (`/api/v3`) | `API_DOMAIN` = host + that path. |
| Non-JSON body (octet-stream, XML) | `@skipped` + OQ, or extend `BaseService` deliberately if the operation matters. |
| `multipart/form-data` body | Method takes typed fields and passes `multipart`. |
| Spec is large (100+ operations) | Generate only the tags the test plan needs, mark the rest out of scope in the registry — coverage is checked per generated tag. |
| No spec at all | Draft one from captured traffic (`drift-and-no-spec.md`), mark UNVERIFIED, raise an OQ. |

## Related skills

- **`test-script-writer`** — writes the tests that use what this skill builds.
- **`init-playwright-framework`** / **`init-selenium-java-framework`** — provide `BaseService`, schema validation,
  and the composition root this skill fills.
- **`page-builder`** — its exploration captures network traffic, which feeds the "no spec" path here.
- **`test-case-design`** / **`security-testing`** — what to test with the generated services (boundaries, access
  matrix, BOLA).
- **`sdet-framework-architect`** — the service-layer and composition-root rules this skill implements.
