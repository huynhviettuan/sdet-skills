# service-builder example — Petstore `pet` tag on the Playwright/TypeScript scaffold

What the skill generated in the team-runner pilot (2026-11-02) from `https://petstore3.swagger.io/api/v3/openapi.json`
for the `pet` tag, copied verbatim from the pilot repo.

| File | Generated from | What it shows |
|---|---|---|
| `pet/pet.service.ts` | the 8 operations tagged `pet` | one method per operation, name = camelCase(`operationId`) verbatim, JSDoc `@operationId` + `METHOD /path`; path params positional, query as a typed object, body typed; `extends BaseService` |
| `pet/pet.interface.ts` | `components.schemas` Pet, Category, Tag, ApiResponse | types, enums as string unions |
| `pet/schemas/*_200_schema.json` | every 2xx JSON response of the tag | one JSON Schema per operation, validated with ajv in tests (`validateJsonSchema`) |
| `registry-services.md` | — | the registry rows the builder returned |

The 1:1 contract (the table in `SKILL.md`) is visible file by file: no operation is renamed to CRUD, no schema is
inferred from a captured response, nothing outside the tag was written (the builder's brief limited it to `pet/`;
when the tool lacked a tag filter it generated to scratch and copied only `pet/` — that stop is in
`automation-pipeline/examples/pilot-todo-petstore/stage-report.build-service.json`, and `openapi-tool schemas --tags`
exists because of it).

## Verification

```bash
node skills/service-builder/scripts/openapi-tool.mjs coverage <petstore-openapi.json> --services skills/service-builder/examples/playwright-ts/pet --tags pet
```

Ran on 2026-11-03 against the spec downloaded that day:

```text
coverage: 7/8 operations mapped in tags pet (11 out of scope), 1 skipped
  SKIPPED  uploadFile — request body is application/octet-stream; BaseService sends JSON or multipart only, and no case in docs/test-cases/pet.md needs it
```

The skip is recorded in the service itself (`@skipped` JSDoc on `uploadFile`) with the reason, so coverage is
honest: 7 implemented, 1 declared out of scope with a cause, 0 silently missing. In the pilot: `npx tsc --noEmit`
clean; `tests/api/pet.spec.ts` 5 cases green x3; TC-PET-003 restated to validate the record the test owns (D-18).
These files are not compiled by CI on their own (they import the scaffold's `BaseService`); the same five cases run
nightly on the scaffold through `test-script-writer/examples/playwright-ts` (`Nightly examples`).

`service-builder/scripts/selftest.mjs` covers the tool itself (inventory, schemas with and without `--tags`, coverage
clean / missing / extra) in CI's `skill-scripts` job.
