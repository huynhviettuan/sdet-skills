import { defineConfig } from '@playwright/test';
import { env } from './config/env';

// At most one retry in CI while the migration runs; a pass on retry is reported as flaky, not as passed.
export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    fullyParallel: true, // every test owns its data now, so the workers cap can go
    use: { headless: true, baseURL: env.baseUrl }
});
