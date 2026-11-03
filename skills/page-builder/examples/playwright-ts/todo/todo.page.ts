import { type TodoFilter, TodoFooterContainer } from '@components/containers/todo/footer.container';
import { TodoHeaderContainer } from '@components/containers/todo/header.container';
import { TodoMainContainer } from '@components/containers/todo/main.container';

/**
 * The TodoMVC list screen (`/todomvc/#/`), composed of header, main and footer. Methods express the intent the test
 * cases use (TC-TODO-001..005) and delegate to the containers; navigation lives in tests (`goto`), assertions too.
 */
export class TodoPage {
    readonly header: TodoHeaderContainer;
    readonly main: TodoMainContainer;
    readonly footer: TodoFooterContainer;

    constructor() {
        this.header = new TodoHeaderContainer();
        this.main = new TodoMainContainer();
        this.footer = new TodoFooterContainer();
    }

    /** Types the title and presses Enter. The app ignores an empty or spaces-only title (TC-TODO-003). */
    async addTodo(title: string): Promise<void> {
        await this.header.txtNewTodo.search(title);
    }

    async completeTodo(title: string): Promise<void> {
        await this.main.getItem(title).complete();
    }

    async reopenTodo(title: string): Promise<void> {
        await this.main.getItem(title).reopen();
    }

    async deleteTodo(title: string): Promise<void> {
        await this.main.getItem(title).delete();
    }

    async filterBy(name: TodoFilter): Promise<void> {
        await this.footer.getFilter(name).click();
    }
}
