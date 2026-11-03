import { defineConfig } from '@playwright/test';

// CI was flaky, so retries were raised until the pipeline went green.
export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    retries: 3,
    workers: 1, // the orders specs share state, so they cannot run in parallel
    use: { headless: true }
});
