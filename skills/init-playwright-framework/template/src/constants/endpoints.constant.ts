/**
 * App page routes (used by the `goto` fixture / `BrowserInstance.currentPage.goto`), grouped by feature.
 * Example shape:
 *   export const Endpoints = {
 *       auth: { signIn: '/sign-in' }
 *   } as const;
 */
export const Endpoints = {} as const;

/**
 * Backend API endpoint paths (used by services extending `BaseService`), grouped by resource.
 * Example shape:
 *   export const ApiEndpoints = {
 *       users: { me: '/users/me' }
 *   } as const;
 */
export const ApiEndpoints = {} as const;
