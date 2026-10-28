import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

/** Implements docs/test-cases/todo.md (TC-TODO-001..003). */
test.describe('Todo list', () => {
    test.beforeEach(async ({ goto }) => {
        await goto(Endpoints.todo.list);
    });

    test(
        '[TC-TODO-001] added todo appears in the list and the counter',
        { tag: ['@P0', '@smoke'], annotation: { type: 'AC', description: 'AC-TODO-001' } },
        async ({ todoPage }) => {
            // Act
            await todoPage.addTodo('buy milk');

            // Assert
            await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk']);
            await expect.poll(() => todoPage.footer.lblCount.getInnerText()).toBe('1 item left');
        }
    );

    test(
        '[TC-TODO-002] completed todo is listed under Completed and hidden under Active',
        { tag: ['@P1'], annotation: { type: 'AC', description: 'AC-TODO-002' } },
        async ({ todoPage }) => {
            // Arrange: precondition is two todos (the app has no API, so through the page object)
            await todoPage.addTodo('buy milk');
            await todoPage.addTodo('walk dog');

            // Act + Assert, step by step as in the test case
            await todoPage.completeTodo('buy milk');
            await expect.poll(() => todoPage.footer.lblCount.getInnerText()).toBe('1 item left');

            await todoPage.filterBy('Completed');
            await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk']);

            await todoPage.filterBy('Active');
            await expect.poll(() => todoPage.main.getTitles()).toEqual(['walk dog']);
        }
    );

    const blankTitles = [
        { partition: 'empty', title: '' },
        { partition: 'spaces only', title: '   ' }
    ];

    for (const { partition, title } of blankTitles) {
        test(
            `[TC-TODO-003] blank titles are not added (${partition})`,
            { tag: ['@P2'], annotation: { type: 'AC', description: 'AC-TODO-003' } },
            async ({ todoPage }) => {
                // Act
                await todoPage.addTodo(title);
                // Sync point for a negative check: a valid todo added afterwards proves the blank one was processed
                await todoPage.addTodo('sync point');

                // Assert
                await expect.poll(() => todoPage.main.getTitles()).toEqual(['sync point']);
            }
        );
    }
});
