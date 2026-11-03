export function uniqueNote(prefix = 'note'): string {
    return `${prefix}-${Date.now()}`;
}
