import { type APIRequestContext } from '@playwright/test';

export const Endpoints = { orders: '/api/orders' } as const;

export type OrderStatus = 'new' | 'shipped' | 'cancelled';
export type Order = { id: string; number: string; status: OrderStatus; note: string };
export type ApiResponse<T> = { status: number; body: T };

/** Orders API: one method per operation. It sends and parses; the caller decides what success means. */
export class OrdersService {
    constructor(private readonly request: APIRequestContext) {}

    /** @operationId createOrder */
    async createOrder(body: { status: OrderStatus; note?: string }): Promise<ApiResponse<Order>> {
        const response = await this.request.post(Endpoints.orders, { data: body });
        return { status: response.status(), body: (await response.json()) as Order };
    }

    /** @operationId deleteOrder */
    async deleteOrder(id: string): Promise<number> {
        const response = await this.request.delete(`${Endpoints.orders}/${id}`);
        return response.status();
    }
}
