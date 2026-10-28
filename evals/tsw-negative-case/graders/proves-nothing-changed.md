---
type: llm
weight: 2
---
The answer is a Playwright test for a negative case: typing only spaces must not add a todo.

PASS only if ALL hold:
1. It asserts the list still holds exactly ["Buy milk"] (an exact list or count of 1 plus the text), not merely that
   some element is hidden or absent.
2. Before that absence check it has a sync point proving the app processed the Enter — for example waiting for the
   field to be empty again (expected result 2), adding a valid todo afterwards and seeing it, or a web-first
   assertion that retries — so the "nothing added" check cannot pass before the app reacts.
3. It goes through the page object (`todoPage.addTodo`, `todoPage.list…`, `todoPage.newTodo`), not raw
   `page.locator(...)` / `page.getByRole(...)` calls in the test.
4. Expected result 2 (the field is empty again) is asserted.

FAIL if it uses a fixed wait, asserts only `not.toBeVisible()` on a guessed new item, or skips either expected result.
