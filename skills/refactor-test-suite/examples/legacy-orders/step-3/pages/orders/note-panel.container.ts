import { type Locator } from '@playwright/test';

export class NotePanelContainer {
    readonly txtNote: Locator;
    readonly btnSave: Locator;
    private readonly items: Locator;

    constructor(readonly root: Locator) {
        this.txtNote = root.locator('#note-text');
        this.btnSave = root.locator('#note-save');
        this.items = root.locator('.note-list li');
    }

    /** A listed note identified by its text. */
    item(text: string): Locator {
        return this.items.filter({ hasText: text });
    }
}
