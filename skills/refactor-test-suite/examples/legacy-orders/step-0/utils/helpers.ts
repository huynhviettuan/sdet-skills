import { type Page } from '@playwright/test';

export const BASE_URL = 'https://orders.example.test';
export const API_URL = 'https://api.orders.example.test';

// Accounts of the shared staging environment (example values, not real credentials).
export const CUSTOMER = { username: 'customer01', password: 'customer-example-pw' };
export const MANAGER = { username: 'manager01', password: 'manager-example-pw' };

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(page: Page, user: { username: string; password: string }) {
    await page.goto(BASE_URL + '/login');
    await page.fill('#username', user.username);
    await page.fill('#password', user.password);
    await page.click('button[type=submit]');
    await sleep(1000); // the redirect to /orders takes a moment
}

export function uniqueNote(prefix = 'note'): string {
    return `${prefix}-${Date.now()}`;
}
