import { defineConfig, devices } from '@playwright/test';

import baseConfig from './playwright.config';

/**
 * Runs the verified example suite on Playwright's bundled Chromium, headless, with no external reporter.
 * The scaffold's own playwright.config.ts is left untouched: its projects use the installed Google Chrome channel,
 * run headed outside CI and report to ReportPortal on CI — none of which a nightly check of the examples needs.
 * Everything else (timeouts, baseURL from .env, testIdAttribute, locale) is inherited.
 */
export default defineConfig({
    ...baseConfig,
    use: { ...baseConfig.use, headless: true, launchOptions: {} },
    reporter: [['list'], ['json', { outputFile: 'test-results/examples-report.json' }]],
    projects: [{ name: 'examples', testDir: './tests', use: { ...devices['Desktop Chrome'] } }]
});
