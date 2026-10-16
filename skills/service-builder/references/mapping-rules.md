# Mapping Rules

The complete OpenAPI → code mapping. `openapi-tool.mjs inventory` applies the naming rules mechanically; this file
explains them and covers what the tool leaves to you (types, signatures, auth).

Contents:

- [Services](#services)
- [Method names](#method-names)
- [Method signatures](#method-signatures)
- [Types](#types)
- [Response schemas](#response-schemas)
- [Auth](#auth)
- [Errors and non-2xx responses](#errors-and-non-2xx-responses)

---

## Services

| Rule | Detail |
|---|---|
| One class per tag | `pet` → `PetService` in `src/services/pet.service.ts` (Java: `api/services/PetService.java`); tag words are PascalCased (`store-orders` → `StoreOrdersService`). |
| First tag wins | An operation with tags `[orders, admin]` lives in `OrdersService` only; the inventory lists `also:admin`. |
| Untagged operations | Go to `DefaultService`; prefer asking the API team to tag them. |
| Versions | When one tag spans several versions (`/v1/users`, `/v2/users`), one class per version: `UsersV1Service`, `UsersV2Service`, files `users-v1.service.ts`, `users-v2.service.ts`. A tag with a single version gets no suffix. |
| Base path | Services have no base path (TS: `super()`; Java: default constructor); every method passes its **full spec path**, so the path in code is grep-identical to the spec. The server URL (including any path like `/api/v3`) lives in `API_DOMAIN`. |
| No child services | Sub-resources (`/users/{id}/orders`) are methods on the tag's service. Split a huge tag only by retagging the spec, never by inventing classes. |

---

## Method names

```text
operationId present   → camelCase(operationId), internal casing kept:  findPetsByStatus → findPetsByStatus
                                                                       get_user-by.name  → getUserByName
operationId missing   → <verb> + path segments, params as By<Name>:     GET /users/{id}/orders → getUsersByIdOrders
starts with a digit   → prefixed with "op"
collision in a class  → numeric suffix (getUser, getUser2) + NAME-COLLISION flag
```

Missing and colliding operationIds are spec defects. Generate with the fallback so work isn't blocked, then raise an
OQ asking for a real operationId — when the spec is fixed, the method is renamed by regeneration once, on purpose.

The JSDoc of every method carries the exact spec operationId (not the camelCased name) and the HTTP line:

```ts
/**
 * @operationId findPetsByStatus
 * GET /pet/findByStatus
 */
```

`coverage` matches on `@operationId`, so never remove or edit these lines by hand. Tags count only at the start of a
JSDoc line, so a comment may mention "@operationId" in prose without being read as one.

**Framework-generated operationIds** (NestJS `UsersController_create`, Spring `createUsingPOST`) are still used
verbatim — `usersControllerCreate` — because traceability to the spec beats nicer names. Raise an OQ asking the API
team to set explicit operationIds (`@ApiOperation({ operationId })` in NestJS); regeneration then renames on purpose.

---

## Method signatures

Order is fixed so every method reads the same way:

```text
(pathParam1, pathParam2, …, body?, options?: { query?: {…}; headers?: {…} }) → Promise<ServiceResponse<T>>
```

| Spec | TypeScript |
|---|---|
| path param `{petId}` `integer` | `petId: number` (positional, spec order) |
| required JSON body | `body: Pet` |
| optional JSON body | `body?: Pet` |
| body array of `$ref` | `body: User[]` |
| query params | `options?: { query?: { status?: PetStatus; limit?: number } }` — required query params are non-optional inside, and then `options` / `query` become required too |
| header params (not auth) | `options?: { headers?: { 'X-Request-Id'?: string } }` |
| auth headers (`api_key`, `Authorization`) | **not** in the signature — set once by the fixture (see Auth) |
| `multipart/form-data` | `body: { file: { name: string; mimeType: string; buffer: Buffer }; …fields }` passed as `multipart` |
| `application/octet-stream`, XML, other | not supported by `BaseService` → `@skipped` + OQ, or extend `BaseService` deliberately |
| no 2xx JSON response | `Promise<ServiceResponse<void>>` |

Call shape inside the method:

```ts
return this.send<Pet>('get', { uri: this.pathOf('/pet/{petId}', { petId }), params: options?.query, headers: options?.headers });
```

### Java (RestAssured scaffold)

```text
(pathParam1, …, body?, query?) → ApiResponse<T>
```

| Spec | Java |
|---|---|
| path param `{petId}` `integer` (int64) | `long petId` (positional, spec order); `int` for int32, `String` for strings |
| required / optional JSON body | `Pet body` (optional bodies may be passed `null`) |
| body array of `$ref` | `List<User> body` |
| query params | one `<OperationId>Query` Lombok `@Builder` class in the tag's model package, passed as `ApiRequest.with().query(query)` (null fields are dropped) |
| header params (not auth) | `String` arguments after the query, added with `.header(name, value)` |
| auth headers | **not** in the signature — set once in `Services` (see Auth) |
| no 2xx JSON response | `ApiResponse<Void>` via `send(method, path, request)` |
| list response | `ApiResponse<List<Pet>>` via `new TypeReference<>() {}` |

Call shape:

```java
return send(Method.GET, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId), Pet.class);
```

---

## Types

Generated into `src/models/<tag>/<tag>.interface.ts`, or `src/models/common/api.interface.ts` when a schema is used by two
or more tags. One `export type` per `components.schemas` entry used by the generated operations.

| Schema | TypeScript |
|---|---|
| `object` with `properties` | `export type X = { … }` — **always `type`, never `interface`**: only type aliases are assignable to `BaseService`'s `JSONObject` body type |
| property in `required` | non-optional `name: T` |
| property not in `required` | optional `name?: T` |
| `string` / `integer`, `number` / `boolean` | `string` / `number` / `boolean` |
| `format: date`, `date-time`, `uuid`, `email` | `string` |
| `format: binary` | `Buffer` (multipart only) |
| `enum` | named string-literal union: `export type PetStatus = 'available' \| 'pending' \| 'sold'` — name = parent schema + property in PascalCase, or the schema name if the enum is a component itself |
| `array` of T | `T[]` |
| `nullable: true` (3.0) / `type: [T, 'null']` (3.1) | `T \| null` |
| `$ref` | the referenced type name |
| `allOf: [A, B]` | `A & B` |
| `oneOf` / `anyOf` | `A \| B`; with a `discriminator`, keep the discriminator property typed as its literal in each branch |
| `additionalProperties: T` (map) | `Record<string, T>` |
| free-form object | `Record<string, unknown>` |
| inline object in a request/response | named type after the method: `GetInventoryResponse`, `CreateOrderRequest` |
| `readOnly` property | included in the type (it is in responses); omit from a separate `…Request` type only if the API rejects it |

Keep `description` as a JSDoc line on the property when it adds meaning (units, allowed ranges).

### Java models (Lombok + Jackson)

| Schema | Java |
|---|---|
| `object` with `properties` | class `X` in `api/models/<tag>/X.java` with `@Data @Builder @NoArgsConstructor @AllArgsConstructor` |
| required vs optional | not expressible in the type — use boxed types for all properties; required fields are enforced by the response schema and by test-data builders |
| `string` (incl. `date`, `date-time`, `uuid`, `email`) | `String` |
| `integer` int32 / int64 / no format | `Integer` / `Long` / `Long` |
| `number` | `Double` (`BigDecimal` for money if the API documents decimal precision) |
| `boolean` | `Boolean` |
| `enum` | Java enum with `@JsonValue` on the wire value: `AVAILABLE("available")`; name = parent schema + property |
| `array` of T | `List<T>` |
| `$ref` | the referenced class |
| `allOf: [A, B]` | one class with the union of properties (Lombok has no intersection); name after the schema |
| `oneOf` / `anyOf` with `discriminator` | abstract base + subclasses with `@JsonTypeInfo` / `@JsonSubTypes` on the discriminator property |
| `additionalProperties: T` (map) | `Map<String, T>` |
| inline object | class named after the operation: `GetInventoryResponse`, `CreateOrderRequest` |
| query parameters | `<OperationId>Query` class (see signatures) |

Models are shared by tag package; a schema used by two or more tags goes to `api/models/common/`. `JsonMapper` ignores
unknown response fields (the schema checks the contract) and omits nulls from request bodies.

---

## Response schemas

`openapi-tool.mjs schemas` writes one draft-07 JSON Schema per operation × JSON 2xx response:

```text
src/data/schemas/<tag>/<methodName>_<status>_schema.json
```

- `$ref`s become local `definitions`, so recursive schemas work.
- OpenAPI-only keywords (`xml`, `example`, `discriminator`, `externalDocs`) are removed so Ajv strict mode compiles
  them; unsupported `format`s are dropped with a warning.
- `nullable: true` becomes a `null`-allowing type.
- The scaffolds read them directly — TS: `await validateJsonSchema('findPetsByStatus_200', 'pet', data)` (files in
  `src/data/schemas`); Java: `SchemaValidator.assertMatches(response, "pet", "findPetsByStatus_200")` (files in
  `src/test/resources/schemas`, draft-07 via networknt).

Schemas are generated, never edited. If validation fails against a real response, compare the response with the
spec: either the API is wrong (bug) or the spec is stale (OQ to the API team). Don't loosen the schema to pass.

---

## Auth

Read `securitySchemes` and the global/per-operation `security` from the inventory:

| Scheme | Fixture strategy |
|---|---|
| `http` + `bearer` | Worker-scoped fixture obtains a token (env-provided, or by calling the spec's login operation through the generated service once per worker) → `service.setToken(token)` |
| `apiKey` in header | Worker-scoped fixture reads the key from `Config` → `service.setHeaders({ '<name>': key })` |
| `apiKey` in query | Pass it per call via `options.query` from a fixture-provided value — prefer asking for header auth |
| `oauth2` client credentials | Worker-scoped fixture requests a token from the token URL with client id/secret from env → `setToken` |
| `oauth2` implicit / authorization code, `openIdConnect` | Not automatable headlessly — use a test token from env or the environment's test login endpoint; raise an OQ if neither exists |
| operation with `security: []` | Public — tests that call it must not depend on credentials; still covered by the same service instance |
| `apiKey` **in cookie** (session cookie, e.g. `better-auth.session_token`) | Worker-scoped fixture signs in once, takes the cookie from `set-cookie`, and services send it as a `cookie` header: `service.setHeaders({ cookie, origin })` |

**Cookie-session APIs usually check `Origin`** (CSRF protection): state-changing calls without the web app's origin
fail with 403 ("Cross-origin request rejected") even with a valid session. Send `origin: Config.app.baseUrl` from
the same fixture. **When the sign-in operation is not in the spec** (common with auth libraries mounted beside the
API), write a small hand-written `AuthService` with **no** `@operationId` tag (it stays out of coverage), say so in
its doc comment, and record the spec drift as a finding.

One credential per role (admin, user…) when the API authorizes by role: expose `petServiceAs(role)` or one fixture
per role, so permission tests (see `security-testing`) can call the same operation as different users.

Java: credentials live in a `Credentials` class (`Config.get("API_KEY")`, or a token obtained once and cached in a
static `ConcurrentHashMap` keyed by role), and each accessor in `context/Services.java` applies them with
`setToken(...)` / `setHeader(...)` when it creates the service.

---

## Errors and non-2xx responses

- Services return every status (`failOnStatusCode: false`); tests assert the expected one.
- If the spec defines error bodies (`4xx`/`5xx` with a schema), generate their types (often a shared
  `ErrorResponse` in `common/api.interface.ts`) so negative tests can type `data` as
  `ServiceResponse<ErrorResponse>` via a cast at the call site.
- Only 2xx schemas are extracted for validation by default; extract error schemas too when negative tests need to
  validate them (copy the pattern with the error status).
