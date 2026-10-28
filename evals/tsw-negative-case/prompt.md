---
description: test-script-writer turns a negative case into a Playwright test that waits on signals and proves nothing changed
tags: [test-script-writer, behaviour]
runs: 2
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
expected_outcome: >
  One Playwright test titled with the case ID, using the page object's methods, asserting the error message and that
  the todo list is unchanged (a sync point before the absence check), with no fixed waits and no raw locators.
---
Write the Playwright (TypeScript) test for this case. Our scaffold already has a `TodoPage` page object (shown
below) and the `todoPage` fixture. Answer with the test file in the chat.

```md
## TC-TODO-007 — A todo made only of spaces is not added

Verifies:   AC-TODO-03
Basis:      specified
Priority:   P1
Level:      ui

Preconditions:
- The list has one todo "Buy milk"

Steps:
1. Type "   " into the new-todo field and press Enter.

Expected results:
1. No new todo is added; the list still holds exactly "Buy milk".
   Evidence: "Blank or whitespace-only input never creates a todo" — AC-TODO-03
2. The new-todo field is empty again.
```

```ts
// src/pages/todo/index.ts (excerpt)
export class TodoPage {
  readonly newTodo: TextBox;            // the "What needs to be done?" field
  readonly list: TodoListContainer;     // items(): Promise<string[]>, count(): Promise<number>
  async goto(): Promise<void>;
  async addTodo(text: string): Promise<void>;   // fills the field and presses Enter
}
```
