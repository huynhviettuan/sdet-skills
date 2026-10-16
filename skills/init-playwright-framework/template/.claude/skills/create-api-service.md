# Skill: Create API Service

## When to Use

Use this skill for `BaseService` mechanics and for a **manual** service when no OpenAPI spec describes the
endpoints.

> **A spec exists? Don't write the service by hand.** Use [`create-service-from-swagger.md`](./create-service-from-swagger.md)
> (or the `service-builder` skill if installed): services are generated 1:1 from the spec — one method per
> operation, named exactly after its `operationId`. The CRUD names below apply only to manual services.

## Design Principle: Controller Pattern

Each service class maps to **one Swagger tag / backend controller**. Each method maps to **one endpoint**. This makes
Swagger-to-code conversion mechanical:

```
Swagger tag: "Users"          →  UsersService
  GET    /users               →  usersService.getAll(params?)
  GET    /users/{id}          →  usersService.getById(id)
  POST   /users               →  usersService.create(body)
  PUT    /users/{id}          →  usersService.update(id, body)
  DELETE /users/{id}          →  usersService.deleteById(id)
```

## Critical Rules

### ✅ Types Live in `@models`, Not Beside the Service

Request and response types belong under `src/models/<module>/<module>.interface.ts` — **never** co-located with the
service class. This matches the existing convention (`@models/elements/*.interface.ts`,
`@models/mail/mail.interface.ts`, `@models/requests/*`) and lets consumers (commands, factories, fixtures, tests) import
types without pulling in service implementations.

### ✅ Token Set Once, Not Per Method

Use `service.setToken(token)` or set it in the fixture/beforeAll — don't pass `token` to every method. The service holds
auth state.

### ✅ Use `send<T>()` for Typed Responses

The `send<T>()` method returns `ServiceResponse<T>` with parsed `data` — callers don't need `ResponseHelper.toJson()`.

### ✅ Method Names Follow CRUD Conventions (manual services only)

Generated services use `operationId` verbatim instead — see [`create-service-from-swagger.md`](./create-service-from-swagger.md).

| HTTP                    | Method name        | Signature                                                |
| ----------------------- | ------------------ | -------------------------------------------------------- |
| `GET /resource`         | `getAll()`         | `(params?) → ServiceResponse<T[]>`                       |
| `GET /resource/{id}`    | `getById(id)`      | `(id: string) → ServiceResponse<T>`                      |
| `POST /resource`        | `create(body)`     | `(body: CreateRequest) → ServiceResponse<T>`             |
| `PUT /resource/{id}`    | `update(id, body)` | `(id: string, body: UpdateRequest) → ServiceResponse<T>` |
| `PATCH /resource/{id}`  | `patch(id, body)`  | `(id: string, body: PatchRequest) → ServiceResponse<T>`  |
| `DELETE /resource/{id}` | `deleteById(id)`   | `(id: string) → ServiceResponse<void>`                   |

For non-CRUD endpoints (e.g. `POST /auth/signin`), use a domain-specific name: `signIn(body)`.

## Instructions

1. **Define request/response types** in `src/models/[module]/[module].interface.ts`:

    ```ts
    // src/models/users/users.interface.ts
    export type CreateUserRequest = {
        name: string;
        email: string;
    };

    export type User = {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    ```

2. **Create the service class** in `src/services/[service-name].service.ts`:

    ```ts
    import { type ServiceResponse } from '@models/requests/request.type';
    import { type CreateUserRequest, type User } from '@models/users/users.interface';
    import { BaseService } from '@services/base.service';

    export class UsersService extends BaseService {
        constructor() {
            super('/users');
        }

        async getAll(params?: { page?: number; perPage?: number }): Promise<ServiceResponse<User[]>> {
            return await this.send<User[]>('get', { params });
        }

        async getById(id: string): Promise<ServiceResponse<User>> {
            return await this.send<User>('get', { id });
        }

        async create(body: CreateUserRequest): Promise<ServiceResponse<User>> {
            return await this.send<User>('post', { body });
        }

        async update(id: string, body: CreateUserRequest): Promise<ServiceResponse<User>> {
            return await this.send<User>('put', { id, body });
        }

        async deleteById(id: string): Promise<ServiceResponse<void>> {
            return await this.send<void>('delete', { id });
        }
    }
    ```

    > Use `JSONObject` from `@models/requests/json-object.type` only when the body shape is genuinely generic (e.g.
    > passthrough endpoints). Otherwise type the body with a concrete `Request` interface.

3. **Update the service registry** — add or update the entry in
   [`docs/registry/services.md`](../../docs/registry/services.md) with the service class, base path, methods, and models
   path.

4. **Register the service in fixtures** at `src/fixtures/service-fixtures.ts`:

    ```ts
    import { UsersService } from '@services/users.service';

    type Services = {
        usersService: UsersService;
    };

    export const test = base.extend<Services>({
        usersService: async ({}, use) => {
            await use(new UsersService());
        }
    });
    ```

## ServiceResponse<T>

All `send<T>()` calls return:

```ts
{
    statusCode: number; // HTTP status code
    data: T; // Parsed response body (typed)
    response: APIResponse; // Raw Playwright response (for headers, etc.)
}
```

## BaseService API

### Token Management

```ts
// Set token once — used by all subsequent calls
service.setToken(token);

// Or chain it
const service = new UsersService().setToken(token);
```

### Protected Methods

| Method                   | Usage                                        |
| ------------------------ | -------------------------------------------- |
| `send<T>(method, args?)` | Typed request — returns `ServiceResponse<T>` |
| `endpoint(subPath?)`     | Build URL: `API_DOMAIN + basePath + subPath` |

### Low-Level Methods (for backward compatibility)

| Method         | Returns                              |
| -------------- | ------------------------------------ |
| `get(args)`    | `{ statusCode, response }` (untyped) |
| `post(args)`   | `{ statusCode, response }` (untyped) |
| `put(args)`    | `{ statusCode, response }` (untyped) |
| `patch(args)`  | `{ statusCode, response }` (untyped) |
| `delete(args)` | `{ statusCode, response }` (untyped) |

Prefer `send<T>()` in new code. The low-level methods exist for backward compatibility.

## Common Patterns

### Non-CRUD Endpoints

```ts
// POST /user-organization/auth/signin (not a CRUD resource)
async signIn(body: SignInRequest): Promise<ServiceResponse<SignInResponse>> {
    return await this.send<SignInResponse>('post', {
        url: this.endpoint('/signin'),
        body
    });
}
```

### Sub-Resources (Inline)

```ts
// GET /users/{id}/orders — use when there are only 1-2 sub-resource endpoints
async getOrders(userId: string): Promise<ServiceResponse<Order[]>> {
    return await this.send<Order[]>('get', {
        url: this.endpoint(`/${userId}/orders`)
    });
}
```

### Child Route Services

When a controller has many child routes (e.g. `/user-organization/auth`, `/user-organization/users`,
`/user-organization/roles`), extract each group into a **child service** instead of cramming everything into one class.

Pass the parent service to the child's constructor — `BaseService` automatically:

-   Composes the base path (`parent.basePath + childPath`)
-   Delegates `token` and `headers` to the parent (set once, shared by all children)

```ts
// Child service — not exported, only accessed via parent
class MembersService extends BaseService {
    constructor(parent: BaseService) {
        super('/members', parent);
    }

    async getAll(): Promise<ServiceResponse<Member[]>> {
        return await this.send<Member[]>('get');
    }
}

class SettingsService extends BaseService {
    constructor(parent: BaseService) {
        super('/settings', parent);
    }

    async get(): Promise<ServiceResponse<Settings>> {
        return await this.send<Settings>('get');
    }
}

// Parent service — the only export, exposes children as properties
export class ProjectsService extends BaseService {
    readonly members = new MembersService(this);
    readonly settings = new SettingsService(this);

    constructor() {
        super('/projects');
    }

    async getAll(): Promise<ServiceResponse<Project[]>> {
        return await this.send<Project[]>('get');
    }
}
```

**Usage:**

```ts
// Token is set once on the parent — children inherit it
projectsService.setToken(token);

// Access child routes via properties
const { data: members } = await projectsService.members.getAll();
const { data: settings } = await projectsService.settings.get();

// Parent methods still work directly
const { data: projects } = await projectsService.getAll();
```

**When to use child services vs inline sub-resources:**

-   **1-2 sub-resource endpoints** → inline method with `this.endpoint()`
-   **3+ endpoints under a shared sub-path** → extract a child service class

### Multipart Upload

```ts
async uploadAvatar(id: string, file: Buffer): Promise<ServiceResponse<User>> {
    return await this.send<User>('post', {
        url: this.endpoint(`/${id}/avatar`),
        multipart: {
            file: {
                name: 'avatar.png',
                mimeType: 'image/png',
                buffer: file
            }
        }
    });
}
```

### Query Parameters

```ts
async search(query: string, page: number = 1): Promise<ServiceResponse<User[]>> {
    return await this.send<User[]>('get', {
        params: { q: query, page, perPage: 20 }
    });
}
```

## Usage in Tests

```ts
// Services arrive authenticated: `src/fixtures/service-fixtures.ts` resolves the token once per worker (an `apiToken`
// fixture calling the spec's login operation) and creates each service with it — see the `service-builder` skill.
// Tests never fetch or set tokens.
test.describe('Users API', () => {
    test('should create and retrieve user', async ({ usersService }) => {
        // Create
        const { statusCode: createStatus, data: created } = await usersService.create({
            name: DataGenerator.randomName(),
            email: DataGenerator.randomEmail('users-test')
        });
        expect(createStatus).toEqual(StatusCodes.CREATED);

        // Retrieve — data is already typed as User
        const { statusCode, data } = await usersService.getById(created.id);
        expect(statusCode).toEqual(StatusCodes.OK);
        expect(data.email).toEqual(created.email);
    });
});
```

## Swagger-to-Code

Converting a spec is a separate, mechanical workflow with its own rules (operationId method names, verbatim paths via
`this.pathOf(...)`, spec-derived types and response schemas, coverage check): follow
[`create-service-from-swagger.md`](./create-service-from-swagger.md).
