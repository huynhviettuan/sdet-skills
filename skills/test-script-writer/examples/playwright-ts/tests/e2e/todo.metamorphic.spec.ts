import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

/**
 * Metamorphic / derived-value checks — implements docs/test-cases/todo.md (TC-TODO-004, TC-TODO-005).
 * No expected list or count is computed by hand: each assertion is a relation between two independent reads of the
 * same state. Relations are written as a difference against a literal 0 (or -1), so can-fail.mjs has a constant to
 * mutate and proves each relation can fail.
 */
test.describe('Todo list — relations', () => {
    test.beforeEach(async ({ goto }) => {
        await goto(Endpoints.todo.list);
    });

    test(
        '[TC-TODO-004] Active and Completed partition All and the counter equals the Active count',
        { tag: ['@P2', '@metamorphic'], annotation: { type: 'AC', description: 'AC-TODO-002' } },
        async ({ todoPage, todoFactory }) => {
            // Arrange: a mixed history — add five, complete two, delete one (no API, so through the page object)
            const titles = todoFactory.titles(5);
            for (const title of titles) await todoPage.addTodo(title);
            await expect.poll(() => todoPage.main.getTitles()).toEqual(titles);
            const [first, deleted, third] = titles;
            await todoPage.completeTodo(first);
            await todoPage.completeTodo(third);
            // audit-ignore R-TEARDOWN: deleting a todo is a step of the sequence under test, not cleanup
            await todoPage.deleteTodo(deleted);

            // Act: read the same state through three filters and the counter
            const all = await todoPage.getTitlesUnder('All');
            const active = await todoPage.getTitlesUnder('Active');
            const completed = await todoPage.getTitlesUnder('Completed');
            const itemsLeft = await todoPage.footer.getItemsLeft();

            // Assert: the sequence happened (otherwise every relation below holds trivially) ...
            expect(all).not.toContain(deleted);
            expect(completed).toContain(first);
            // ... no todo is both Active and Completed ...
            expect(active.filter((title) => completed.includes(title))).toHaveLength(0);
            // ... every todo under All is Active or Completed ...
            expect(all.filter((title) => !active.includes(title) && !completed.includes(title))).toHaveLength(0);
            // ... |Active| + |Completed| == |All| ...
            expect(active.length + completed.length - all.length).toBe(0);
            // ... and the counter (a derived value) equals |Active|.
            expect(itemsLeft - active.length).toBe(0);
        }
    );

    test(
        '[TC-TODO-005] completing then reopening a todo restores the counter',
        { tag: ['@P2', '@metamorphic'], annotation: { type: 'AC', description: 'AC-TODO-002' } },
        async ({ todoPage, todoFactory }) => {
            // Arrange
            const titles = todoFactory.titles(3);
            for (const title of titles) await todoPage.addTodo(title);
            await expect.poll(() => todoPage.main.getTitles()).toEqual(titles);
            const before = await todoPage.footer.getItemsLeft();
            const change = async (): Promise<number> => (await todoPage.footer.getItemsLeft()) - before;
            const [target] = titles;

            // Act + Assert: completing one todo lowers the counter by one ...
            await todoPage.completeTodo(target);
            await expect.poll(change).toBe(-1);

            // ... and the inverse operation restores it.
            await todoPage.reopenTodo(target);
            await expect.poll(change).toBe(0);
        }
    );
});
