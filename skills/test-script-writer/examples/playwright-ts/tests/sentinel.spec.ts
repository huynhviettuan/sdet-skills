import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

/**
 * Sentinel (after manual-qa-agent ADR-0023): a test whose expectation is known to be false, written through the same
 * fixtures, page objects and assertion helpers as the real tests. `test.fail()` inverts it: it must fail, and the run
 * goes red if it ever passes. That proves the assertion path can fail on this build — a broken expect wrapper, a
 * poll that resolves on any value, or a page object reading the wrong element would make every real test pass
 * vacuously, and would make this one pass too.
 *
 * Everything before the false assertion is asserted normally, so the expected failure is the counter, not a broken
 * setup; a broken setup also fails the real tests, which keeps the run red. The runner (run-examples.sh) also checks
 * that the failure message names the known-false value from the `sentinel` annotation.
 */
const KNOWN_FALSE_COUNTER = '2 items left';

test(
    '[SENTINEL] a known-false counter expectation fails',
    { tag: ['@sentinel'], annotation: { type: 'sentinel', description: KNOWN_FALSE_COUNTER } },
    async ({ goto, todoPage, todoFactory }) => {
        test.fail();
        await goto(Endpoints.todo.list);
        const [title] = todoFactory.titles(1);
        await todoPage.addTodo(title);
        await expect.poll(() => todoPage.main.getTitles()).toEqual([title]);

        // Known false: one todo was added, so the counter says "1 item left".
        await expect.poll(() => todoPage.footer.lblCount.getInnerText()).toBe(KNOWN_FALSE_COUNTER);
    }
);
