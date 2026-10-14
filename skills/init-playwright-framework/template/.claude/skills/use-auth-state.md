# Skill: Use Auth State (Session Reuse)

## When to Use

Use this skill when an E2E test needs an **already-authenticated** user. Logging in through the UI on every test is slow
(often 3–8s per spec) and brittle. Playwright's `storageState` lets you log in **once**, persist cookies +
`localStorage` to a file, and start every other test already signed in.

Use this for the **majority** of E2E tests. Do **not** use it when the test under test _is_ the login flow itself.

## Critical Rules

### ✅ Log in once, reuse everywhere

-   Run authentication in **global setup** (or a worker-scoped fixture) — not in `beforeEach`.
-   Save the resulting `storageState` to a file under a gitignored folder (e.g. `.auth/`).
-   Reference it in `playwright.config.ts` via `use.storageState`.

### ✅ Prefer API login over UI login

The scaffold ships no login helper — the target app's auth API isn't known yet. Create one as an API service (e.g.
`AuthService` extending `BaseService` in `src/services/`, see [`create-api-service.md`](create-api-service.md)) with a
method that returns a token for an account. API login is ~10× faster than driving the UI form and doesn't depend on
selectors. Reserve UI login for tests that explicitly verify the sign-in flow.

### ✅ One file per role

If your app has roles (`superAdmin`, `user`, `viewer`), produce **one storage-state file per role** and select via
Playwright project config — never share one file across roles.

### ✅ Refresh policy

Storage state goes stale (tokens expire, password rotates). Regenerate on every CI run via global setup, and
`.gitignore` the `.auth/` folder.

## Step 1: Add a Global Setup

Create `src/common/global-setup.ts`:

```ts
import { AuthService } from '@services/auth.service'; // create this first — see Critical Rules
import { Config } from '@constants/config.constant';
import { BrowserInstance } from '@common/browser';
import { mkdirSync } from 'fs';
import { join } from 'path';

const AUTH_DIR = join(process.cwd(), '.auth');
export const STORAGE_STATE_PATHS = {
    superAdmin: join(AUTH_DIR, 'super-admin.json')
} as const;

async function globalSetup(): Promise<void> {
    mkdirSync(AUTH_DIR, { recursive: true });

    await BrowserInstance.start();
    const page = await BrowserInstance.startNewPage();

    const token = await new AuthService().getToken(Config.auth.superAdminEmail);

    // Inject the token into the context the way your app expects it
    // (cookie, localStorage key, etc. — choose ONE pattern based on the app)
    await page.context().addCookies([
        {
            name: 'auth_token',
            value: token,
            url: Config.app.baseUrl
        }
    ]);

    await page.context().storageState({ path: STORAGE_STATE_PATHS.superAdmin });
    await BrowserInstance.browser?.close();
}

export default globalSetup;
```

> ⚠️ The `addCookies` / `localStorage` injection above is illustrative. Confirm how your app actually authenticates
> (HttpOnly cookie set by the server? Bearer token in `localStorage`?) before wiring this up. If the only safe way is
> via the UI, use `commands.loginWithUser()` and let Playwright record the resulting state via
> `page.context().storageState()`.

## Step 2: Wire it into `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';
import { STORAGE_STATE_PATHS } from '@common/global-setup';

export default defineConfig({
    globalSetup: require.resolve('./src/common/global-setup'),

    projects: [
        {
            name: 'e2e',
            testDir: './tests/e2e',
            use: {
                channel: 'chrome',
                viewport: { height: 1080, width: 1920 },
                storageState: STORAGE_STATE_PATHS.superAdmin
            }
        },
        {
            name: 'e2e-unauthenticated',
            testDir: './tests/e2e/auth', // login tests live here
            use: { channel: 'chrome', storageState: undefined }
        }
        // ...other projects
    ]
});
```

The `e2e-unauthenticated` project runs **without** storageState — point it at directories holding tests that need a
clean browser (login, signup, forgot-password).

## Step 3: Gitignore the auth dir

Add to `.gitignore`:

```
.auth/
```

## Usage in Tests

Tests now start signed in — no `beforeEach` login needed:

```ts
import { BrowserInstance } from '@common/browser';
import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

test.describe('Dashboard', () => {
    test('should show user widgets on landing', async ({ dashboardPage }) => {
        await BrowserInstance.currentPage.goto(Endpoints.app.dashboard);

        // Already authenticated — no login step
        await expect(dashboardPage.main.lblWelcome).toBeVisible();
    });
});
```

For a test that **must** start unauthenticated, opt out per-test:

```ts
test.use({ storageState: { cookies: [], origins: [] } });

test('should reject invalid credentials', async ({ signInPage }) => {
    await signInPage.signIn('wrong@example.com', 'wrong-password');
    await expect(signInPage.main.lblError).toContainText('Invalid');
});
```

## Multiple Roles

```ts
export const STORAGE_STATE_PATHS = {
    superAdmin: join(AUTH_DIR, 'super-admin.json'),
    standardUser: join(AUTH_DIR, 'standard-user.json'),
    viewer: join(AUTH_DIR, 'viewer.json')
} as const;

// In global setup — loop through roles
for (const [role, path] of Object.entries(STORAGE_STATE_PATHS)) {
    const email = ROLE_EMAILS[role];
    const token = await authService.getToken(email);
    // ...persist state to `path`
}
```

Then in `playwright.config.ts`, define one project per role, each pointing at its file.

## ⚠️ Important Caveat — Parallelism

This skill's speed win requires **parallel test execution**. The current `playwright.config.ts` has:

```ts
workers: 1,
fullyParallel: false,
```

With one worker, you'll still save the per-test UI-login time, but you won't get the suite-level parallelism multiplier.
Consider raising `workers` (e.g. `process.env.CI ? 4 : 2`) and setting `fullyParallel: true` **once tests are confirmed
independent** — auth state makes that independence easier to achieve, but doesn't guarantee it.

## Benefits

-   ✅ Removes 3–8 seconds per test (UI login overhead gone)
-   ✅ Removes the largest source of flakiness in most suites (the login form)
-   ✅ Cleaner tests — no `beforeEach` boilerplate
-   ✅ Foundation for parallelism

## Related

-   [`create-api-service.md`](create-api-service.md) — build the `AuthService` used for API login
-   [`../rules/05-imports.md`](../rules/05-imports.md) — why tests import from `@fixtures/fixtures`
-   Playwright docs: [Authentication](https://playwright.dev/docs/auth)
