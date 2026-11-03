// Environment comes from variables (CI secret store locally: a .env file that is not committed).
// Example: BASE_URL=https://orders.example.test API_URL=https://api.orders.example.test CUSTOMER_USER=customer01 ...
function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable ${name}`);
    return value;
}

export type Role = 'customer' | 'manager';

export const env = {
    baseUrl: required('BASE_URL'),
    apiUrl: required('API_URL'),
    users: {
        customer: { username: required('CUSTOMER_USER'), password: required('CUSTOMER_PASSWORD') },
        manager: { username: required('MANAGER_USER'), password: required('MANAGER_PASSWORD') }
    } satisfies Record<Role, { username: string; password: string }>
};
