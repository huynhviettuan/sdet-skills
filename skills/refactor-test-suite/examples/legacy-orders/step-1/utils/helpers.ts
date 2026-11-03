export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function uniqueNote(prefix = 'note'): string {
    return `${prefix}-${Date.now()}`;
}
