import { type Locator } from '@playwright/test';
import { ToastComponent } from '../../components/toast.component';
import { ConfirmDialogContainer } from './confirm-dialog.container';
import { NotePanelContainer } from './note-panel.container';
import { OrderFormContainer } from './order-form.container';
import { OrderListContainer } from './order-list.container';

/** The Orders screen, composed of its regions; every element is built from its container's root. */
export class OrdersPage {
    readonly list: OrderListContainer;
    readonly form: OrderFormContainer;
    readonly notes: NotePanelContainer;
    readonly confirm: ConfirmDialogContainer;

    constructor(
        private readonly screen: Locator,
        readonly toast: ToastComponent
    ) {
        this.list = new OrderListContainer(screen.locator('table.orders'));
        this.form = new OrderFormContainer(screen.locator('section.new-order'));
        this.notes = new NotePanelContainer(screen.locator('aside.notes'));
        this.confirm = new ConfirmDialogContainer(screen.locator('.confirm-dialog'));
    }

    async open(): Promise<void> {
        await this.screen.page().goto('/orders');
        await this.list.root.waitFor(); // the screen has rendered when its list is attached
    }

    /** Places an order and returns its id from the create response; resolves once the list shows it. */
    async placeOrder(item: string, qty: number): Promise<string> {
        await this.form.btnNewOrder.click();
        await this.form.txtItem.fill(item);
        await this.form.txtQty.fill(String(qty));
        const created = this.screen.page().waitForResponse((r) => r.url().endsWith('/orders') && r.request().method() === 'POST');
        await this.form.btnPlace.click();
        const { id } = (await (await created).json()) as { id: string };
        await this.list.row(id).root.waitFor();
        return id;
    }

    async approve(orderId: string): Promise<void> {
        await this.list.row(orderId).btnApprove.click();
    }

    async cancel(orderId: string): Promise<void> {
        await this.list.row(orderId).btnCancel.click();
        await this.confirm.accept();
    }

    async openNotes(orderId: string): Promise<void> {
        await this.list.row(orderId).lnkNotes.click();
    }

    async addNote(text: string): Promise<void> {
        await this.notes.txtNote.fill(text);
        const saved = this.screen.page().waitForResponse((r) => r.url().endsWith('/notes') && r.request().method() === 'POST');
        await this.notes.btnSave.click();
        await saved;
    }

    async focusNoteEditor(): Promise<void> {
        await this.notes.txtNote.click();
    }
}
