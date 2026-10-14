# Skill: Create Service from Swagger

## When to Use

Use this skill when you have a **Swagger/OpenAPI spec** (JSON or YAML, v2 or v3) and want to generate the service
layer: types, response schemas, service classes, fixtures, and registry — **mapped 1:1 to the spec**.

> If the `service-builder` skill from the sdet-skills collection is installed, use it: it is the full version of
> this workflow with every mapping edge case (versions, collisions, `allOf`/`oneOf`, auth schemes, spec drift).

Typical triggers:

-   "Here's the Swagger JSON for the Users API — generate the service"
-   "Sync the services with the new spec"
-   "Add the new endpoint from the spec to the service"

## When NOT to Use

| Situation                                | Use instead                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| No spec at all                           | "No spec" below — draft one first, then come back                       |
| A single endpoint not described anywhere | [`create-api-service.md`](./create-api-service.md) (manual, documented) |

## The 1:1 Contract

| OpenAPI                       | Generated                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| tag (first tag)               | one `<Tag>Service extends BaseService` in `src/services/<tag>.service.ts`          |
| operation                     | one method, name = camelCase(`operationId`) **verbatim**                           |
| path                          | kept verbatim in the method: `this.pathOf('/users/{id}', { id })`                  |
| path params                   | positional arguments, typed from their schema                                      |
| JSON request body             | `body` argument, typed                                                             |
| query / header params         | `options?: { query?: {…}; headers?: {…} }`                                         |
| `components.schemas.X`        | `export type X` in `src/models/<tag>/<tag>.interface.ts`                               |
| JSON 2xx response             | `ServiceResponse<T>` + `src/data/schemas/<tag>/<operationId>_<status>_schema.json` |
| `securitySchemes`             | credentials in `service-fixtures.ts`, resolved once per worker                     |
| operation that can't be built | JSDoc `@operationId <id>` + `@skipped <reason>` — never silently absent            |

Why verbatim operationIds: a spec line and its method are one grep apart, and regenerating never renames anything.
Better names belong in the spec, not in the service.

## Workflow

```
1. Save the spec        → specs/<api>.json
2. Inventory            → npm run api:inventory -- specs/<api>.json --out specs/<api>.inventory.json
3. Resolve flags        → NO-OPERATION-ID / NAME-COLLISION (see Edge Cases)
4. Types                → src/models/<tag>/<tag>.interface.ts
5. Response schemas     → npm run api:schemas -- specs/<api>.json
6. Services             → src/services/<tag>.service.ts
7. Fixtures + registry  → src/fixtures/service-fixtures.ts, docs/registry/services.md
8. Verify               → npx tsc --noEmit, npx eslint, npm run api:coverage -- specs/<api>.json
```

`scripts/openapi-tool.mjs` (behind the `api:*` npm scripts) is dependency-free. YAML specs need `npm i -D yaml`, or
convert them to JSON.

## Step 2: Inventory

The inventory prints one row per operation with the target class, method name, request/response types, and flags.
It is the generation plan — follow it instead of re-deriving names by hand.

## Step 4: Types

| OpenAPI                            | TypeScript                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `object` + `properties`            | `export type X = {…}` — always `type`, never `interface` (bodies must be assignable to `JSONObject`) |
| required / not required            | `name: T` / `name?: T`                                                     |
| `string` (any format but `binary`) | `string`                                                                   |
| `integer` / `number`               | `number`                                                                   |
| `boolean`                          | `boolean`                                                                  |
| `enum`                             | named string-literal union: `export type UserRole = 'admin' \| 'user'`     |
| `array` of T                       | `T[]`                                                                      |
| `nullable: true`                   | `T \| null`                                                                |
| `$ref`                             | the referenced type name                                                   |
| `allOf` / `oneOf`                  | `A & B` / `A \| B`                                                         |
| inline object                      | named after the method: `GetInventoryResponse`                             |

A schema used by two or more tags goes to `src/models/common/api.interface.ts`.

## Step 5: Response schemas

Extracted from the spec — never inferred from captured responses — and read by the existing helper:

```ts
await validateJsonSchema('getUserById_200', 'users', data);
```

If a real response fails validation, the API or the spec is wrong: report it; never loosen the schema.

## Step 6: Services

Example for tag `users` with operations `getUsers`, `createUser`, `getUserById`, `deleteUser`:

```ts
import { type ServiceResponse } from '@models/requests/request.type';
import { type CreateUserRequest, type User } from '@models/users/users.interface';
import { BaseService } from '@services/base.service';

/**
 * Generated 1:1 from OpenAPI tag `users` — <API title> <spec version>.
 * One method per operation; method name = operationId. Regenerate from the spec instead of renaming.
 */
export class UsersService extends BaseService {
    /**
     * @operationId getUsers
     * GET /users
     */
    async getUsers(options?: { query?: { page?: number; perPage?: number } }): Promise<ServiceResponse<User[]>> {
        return this.send<User[]>('get', { uri: '/users', params: options?.query });
    }

    /**
     * @operationId createUser
     * POST /users
     */
    async createUser(body: CreateUserRequest): Promise<ServiceResponse<User>> {
        return this.send<User>('post', { uri: '/users', body });
    }

    /**
     * @operationId getUserById
     * GET /users/{id}
     */
    async getUserById(id: string): Promise<ServiceResponse<User>> {
        return this.send<User>('get', { uri: this.pathOf('/users/{id}', { id }) });
    }

    /**
     * @operationId deleteUser
     * DELETE /users/{id}
     */
    async deleteUser(id: string): Promise<ServiceResponse<void>> {
        return this.send<void>('delete', { uri: this.pathOf('/users/{id}', { id }) });
    }
}
```

Rules:

-   `super()` with no base path; the server URL (including any `/api/v1`) is `API_DOMAIN`.
-   Signature order: path params, body, `options`. Auth headers are not parameters — fixtures set them.
-   No child services: `/users/{id}/orders` is a method on `UsersService` (or on the tag the spec gives it).
-   Methods in spec order; no hand-written helpers inside generated services.
-   `multipart/form-data` → pass `multipart`; other non-JSON bodies → `@skipped` + open question.

## Step 7: Fixtures and registry

```ts
type ServiceObjects = { usersService: UsersService };
type ServiceWorkerObjects = { apiToken: string };

export const test = base.extend<ServiceObjects, ServiceWorkerObjects>({
    apiToken: [async ({}, use) => await use(Config.api.token), { scope: 'worker' }],
    usersService: async ({ apiToken }, use) => {
        await use(new UsersService().setToken(apiToken));
    }
});
```

Credentials come from env through `Config` (add the variable to `.env.example`). For `apiKey` schemes use
`setHeaders({ '<header>': key })`. Add one row per service to `docs/registry/services.md`.

## Step 8: Verify

-   [ ] `npx tsc --noEmit` and `npx eslint` — zero new errors
-   [ ] `npm run api:coverage -- specs/<api>.json` — 0 missing, 0 extra, 0 duplicate
-   [ ] Every method has `@operationId` + `METHOD /path`; every skipped operation has a reason
-   [ ] One read-only smoke test per service passes with schema validation

## Edge Cases

| Case                                 | Rule                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Missing `operationId`                | Tool fallback: verb + path (`GET /users/{id}/orders` → `getUsersByIdOrders`) + open question to fix the spec |
| Colliding names in one class         | Tool adds a numeric suffix and flags it; ask for unique operationIds                                 |
| Several tags on one operation        | First tag owns the method                                                                            |
| `/v1` and `/v2` under one tag        | One class per version (`UsersV1Service`, `UsersV2Service`) — the tool names them                     |
| Spec changes                         | Replace the spec, diff the inventory, regenerate affected files; never delete a removed method without updating its callers |
| Swagger v2                           | Supported by the tool (`definitions`, body parameters, `host` + `basePath`)                          |

## No spec

1. Ask whether one exists (`/swagger.json`, `/v3/api-docs`, `/openapi.json`, backend repo).
2. Capture traffic while exploring (see [`explore-screens.md`](./explore-screens.md)): method, path with `{param}`,
   query, body, status, response — sanitized.
3. Write `specs/<api>.draft.json` (OpenAPI 3.0) with `info.description: "UNVERIFIED — drafted from captured traffic"`,
   and raise an open question to the API team.
4. Generate from the draft with this workflow.

## Related

-   [`create-api-service.md`](./create-api-service.md) — `BaseService` mechanics, manual services
-   [`write-api-test.md`](./write-api-test.md) — writing tests against generated services
-   [`explore-screens.md`](./explore-screens.md) — capturing API calls from a live app
