import { type APIResponse, type Response } from '@playwright/test';
import * as fs from 'fs/promises';
import { decode } from 'html-entities';
import { BrowserInstance } from 'src/common/browser';

export class ArrayHelper {
    static async forEachSync<T, R>(
        items: T[],
        callback: (item: T, index: number, items: T[]) => Promise<R>
    ): Promise<R[]> {
        const results: R[] = [];
        for (let index = 0; index < items.length; index++) {
            const result = await callback(items[index], index, items);
            results.push(result);
        }
        return results;
    }

    static async forEachAsync<T, R>(
        items: T[],
        callback: (item: T, index: number, items: T[]) => Promise<R>
    ): Promise<R[]> {
        return Promise.all(items.map((item, index, array) => callback(item, index, array)));
    }
}

export class StringHelper {
    static decodeHtml(html: string): string {
        return decode(html);
    }

    // An array becomes one key per value (?tags=a&tags=b): OpenAPI's default for query arrays (style form, explode
    // true). A comma-joined value is a different request — Petstore's findByTags answers [] to ?tags=a,b.
    // Undefined values are left out, so optional query fields can be passed as they are.
    static normalizeParams(
        params: Record<string, string | number | boolean | string[] | number[] | boolean[] | undefined>
    ): URLSearchParams {
        const result = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined) continue;
            for (const item of Array.isArray(value) ? value : [value]) result.append(key, String(item));
        }
        return result;
    }
}

export class ResponseHelper {
    static async toJson<T>(response: { response: APIResponse }): Promise<T> {
        return (await response.response.json()) as T;
    }

    static async interceptedToJson<T>(response: Response): Promise<T> {
        return (await response.json()) as T;
    }

    static async waitFor(url: string | RegExp, timeout?: number): Promise<Response> {
        const regex = typeof url === 'string' ? new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : url;
        return await BrowserInstance.currentPage.waitForResponse((response) => regex.test(response.url()), { timeout });
    }
}

export class FileWriter {
    static async writeJson(filePath: string, data: string): Promise<void> {
        await fs.writeFile(filePath, data);
    }
}
