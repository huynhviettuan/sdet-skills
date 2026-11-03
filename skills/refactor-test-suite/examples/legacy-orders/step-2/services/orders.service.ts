import { type APIRequestContext } from '@playwright/test';

export type NewOrder = { item: string; qty: number; customer: string };
export type Order = NewOrder & { id: string; status: string };

/** The orders API, one method per operation; the URL and error handling live here, not in tests. */
export class OrdersService {
    constructor(
        private readonly request: APIRequestContext,
        private readonly baseUrl: string
    ) {}

    async create(order: NewOrder): Promise<Order> {
        const res = await this.request.post(`${this.baseUrl}/orders`, { data: order });
        if (!res.ok()) throw new Error(`POST /orders -> ${res.status()}`);
        return (await res.json()) as Order;
    }

    async addNote(orderId: string, text: string): Promise<void> {
        const res = await this.request.post(`${this.baseUrl}/orders/${orderId}/notes`, { data: { text } });
        if (!res.ok()) throw new Error(`POST /orders/${orderId}/notes -> ${res.status()}`);
    }

    /** Idempotent: a 404 means the order is already gone, which is the state teardown wants. */
    async delete(orderId: string): Promise<void> {
        const res = await this.request.delete(`${this.baseUrl}/orders/${orderId}`);
        if (!res.ok() && res.status() !== 404) throw new Error(`DELETE /orders/${orderId} -> ${res.status()}`);
    }
}
