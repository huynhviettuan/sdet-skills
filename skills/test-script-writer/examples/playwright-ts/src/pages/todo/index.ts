import { type TodoFilter, TodoFooterContainer } from '@components/containers/todo/footer.container';
import { TodoHeaderContainer } from '@components/containers/todo/header.container';
import { TodoMainContainer } from '@components/containers/todo/main.container';
import { ElementStateEnum } from '@enums/element.enum';

export class TodoPage {
    readonly header: TodoHeaderContainer;
    readonly main: TodoMainContainer;
    readonly footer: TodoFooterContainer;

    constructor() {
        this.header = new TodoHeaderContainer();
        this.main = new TodoMainContainer();
        this.footer = new TodoFooterContainer();
    }

    async addTodo(title: string): Promise<void> {
        await this.header.txtNewTodo.search(title); // fill + Enter
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

    /** Clicks the filter and returns once it is selected (the list is re-rendered in the same update). */
    async filterBy(name: TodoFilter): Promise<void> {
        await this.footer.getFilter(name).click();
        await this.footer.getSelectedFilter(name).waitFor({ state: ElementStateEnum.VISIBLE });
    }

    /** The titles shown under a filter — one independent read path per filter. */
    async getTitlesUnder(name: TodoFilter): Promise<string[]> {
        await this.filterBy(name);
        return await this.main.getTitles();
    }
}
