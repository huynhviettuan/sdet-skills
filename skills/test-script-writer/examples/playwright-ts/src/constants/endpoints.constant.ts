/**
 * App page routes (used by the `goto` fixture / `BrowserInstance.currentPage.goto`), grouped by feature.
 */
export const Endpoints = {
    todo: { list: '/todomvc/#/' }
} as const;

/**
 * Backend API endpoint paths (used by services extending `BaseService`), grouped by resource.
 * Services generated from an OpenAPI spec keep the spec path verbatim in the method instead (`pathOf`).
 */
export const ApiEndpoints = {} as const;
