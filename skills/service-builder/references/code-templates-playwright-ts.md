# Code Templates — Playwright / TypeScript

Templates for the init-playwright-framework scaffold, shown with Swagger Petstore 3.0 (`tag: pet`). They compile
against the scaffold's `BaseService`, `ServiceResponse`, `JSONObject`, and `validateJsonSchema`, and the smoke test
passes against the public Petstore — use them verbatim, replacing names.

Contents:

- [Types](#types)
- [Service](#service)
- [Skipped operation](#skipped-operation)
- [Configuration](#configuration)
- [Fixtures with auth](#fixtures-with-auth)
- [Registry row](#registry-row)
- [Smoke test per service](#smoke-test-per-service)
- [Review checklist](#review-checklist)

---

## Types

`src/models/pet/pet.interface.ts`

```ts
// Generated 1:1 from OpenAPI components.schemas — <API title> <spec version>. Regenerate; don't hand-edit.

export type PetStatus = 'available' | 'pending' | 'sold';

export type Category = {
    id?: number;
    name?: string;
};

export type Tag = {
    id?: number;
    name?: string;
};

export type Pet = {
    id?: number;
    name: string;
    category?: Category;
    photoUrls: string[];
    tags?: Tag[];
    status?: PetStatus;
};
```

---

## Service

`src/services/pet.service.ts` — imports sorted (the scaffold's ESLint enforces `simple-import-sort`), methods in spec
order.

```ts
import { type Pet, type PetStatus } from '@models/pet/pet.interface';
import { type ServiceResponse } from '@models/requests/request.type';
import { BaseService } from '@services/base.service';

/**
 * Generated 1:1 from OpenAPI tag `pet` — <API title> <spec version>.
 * One method per operation; method name = operationId. Regenerate from the spec instead of renaming.
 */
export class PetService extends BaseService {
    /**
     * @operationId addPet
     * POST /pet
     */
    async addPet(body: Pet): Promise<ServiceResponse<Pet>> {
        return this.send<Pet>('post', { uri: '/pet', body });
    }

    /**
     * @operationId findPetsByStatus
     * GET /pet/findByStatus
     */
    async findPetsByStatus(options?: { query?: { status?: PetStatus } }): Promise<ServiceResponse<Pet[]>> {
        return this.send<Pet[]>('get', { uri: '/pet/findByStatus', params: options?.query });
    }

    /**
     * @operationId getPetById
     * GET /pet/{petId}
     */
    async getPetById(petId: number): Promise<ServiceResponse<Pet>> {
        return this.send<Pet>('get', { uri: this.pathOf('/pet/{petId}', { petId }) });
    }

    /**
     * @operationId deletePet
     * DELETE /pet/{petId}
     */
    async deletePet(petId: number, options?: { headers?: { api_key?: string } }): Promise<ServiceResponse<void>> {
        return this.send<void>('delete', { uri: this.pathOf('/pet/{petId}', { petId }), headers: options?.headers });
    }
}
```

`pathOf` is a `BaseService` helper that fills `{name}` placeholders (URI-encoded) and throws if one is missing — it
keeps the spec path verbatim in the method.

---

## Skipped operation

Inside the class, where the method would be:

```ts
    /**
     * @operationId uploadFile
     * POST /pet/{petId}/uploadImage
     * @skipped request body is application/octet-stream; BaseService has no raw-body support (OQ-004)
     */
```

`coverage` reports it as SKIPPED with the reason instead of MISSING.

---

## Configuration

`src/constants/config.constant.ts` — add only what the security schemes need:

```ts
    api: {
        domain: getEnv('API_DOMAIN'),
        key: getEnv('API_KEY')
    },
```

`.env.example` — names only, never values:

```text
# API
API_DOMAIN=            # server URL incl. base path, e.g. https://petstore3.swagger.io/api/v3
API_KEY=
```

---

## Fixtures with auth

`src/fixtures/service-fixtures.ts` — credentials resolved once per worker, services created per test.

```ts
import { Config } from '@constants/config.constant';
import { test as base } from '@playwright/test';
import { PetService } from '@services/pet.service';

type ServiceObjects = {
    petService: PetService;
};

type ServiceWorkerObjects = {
    /** From securitySchemes.api_key (apiKey, header `api_key`). */
    apiKey: string;
};

export const test = base.extend<ServiceObjects, ServiceWorkerObjects>({
    apiKey: [async ({}, use) => await use(Config.api.key), { scope: 'worker' }],
    petService: async ({ apiKey }, use) => {
        await use(new PetService().setHeaders({ api_key: apiKey }));
    }
});
```

Bearer token obtained through the API (login operation generated in an `AuthService`):

```ts
    apiToken: [
        async ({}, use) => {
            const { statusCode, data } = await new AuthService().login({ email: Config.auth.superAdminEmail, password: Config.auth.password });
            if (statusCode !== 200) throw new Error(`API login failed: ${statusCode}`);
            await use(data.accessToken);
        },
        { scope: 'worker' }
    ],
    usersService: async ({ apiToken }, use) => {
        await use(new UsersService().setToken(apiToken));
    }
```

`service-fixtures.ts` is already merged into `src/fixtures/fixtures.ts`; tests import `test`/`expect` from
`@fixtures/fixtures` only.

---

## Registry row

`docs/registry/services.md`:

```md
| Service | Class | Base Path | Methods | Models |
|---|---|---|---|---|
| Pet | `PetService` | spec paths `/pet…` (tag `pet`) | 7 + 1 skipped — see `@operationId` tags | `@models/pet/pet.interface` |
```

---

## Smoke test per service

One read-only call per service proves wiring, auth, and the schema. `tests/api/<tag>.smoke.spec.ts`:

```ts
import { expect, test } from '@fixtures/fixtures';
import { validateJsonSchema } from '@helpers/services/validate-schema.helper';
import { StatusCodes } from 'http-status-codes';

test.describe('PetService — smoke', () => {
    test('[findPetsByStatus] returns pets matching the requested status', async ({ petService }) => {
        const { statusCode, data } = await petService.findPetsByStatus({ query: { status: 'available' } });

        expect(statusCode).toBe(StatusCodes.OK);
        await validateJsonSchema('findPetsByStatus_200', 'pet', data);
        expect(data.every((pet) => pet.status === 'available')).toBe(true);
    });
});
```

Real test cases (boundaries, negative paths, permissions) come from `test-case-design` / `security-testing`, not
from this skill.

---

## Review checklist

```text
[ ] Spec stored in the repo; inventory regenerated from it
[ ] coverage: 0 missing, 0 extra, 0 duplicate; every SKIPPED has a reason + OQ
[ ] Method names = operationIds; JSDoc @operationId + METHOD /path on every method
[ ] Paths verbatim via pathOf; no hardcoded host
[ ] Types are `type` aliases; enums as named unions; required vs optional matches the spec
[ ] Response schemas generated by the tool, not edited
[ ] Auth from securitySchemes, credentials from env, resolved once per worker
[ ] Services registered in service-fixtures.ts and docs/registry/services.md
[ ] npx tsc --noEmit clean; one smoke test per service passes
```
