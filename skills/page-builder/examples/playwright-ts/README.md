# page-builder example — TodoMVC on the Playwright/TypeScript scaffold

The page object the skill produced in the team-runner pilot (2026-11-02) for `https://demo.playwright.dev/todomvc`,
copied verbatim from the pilot repo (`src/pages/todo/index.ts` → `todo/todo.page.ts`, the containers unchanged).
It is what step 6 of the skill's workflow writes after the inventory gate, for the five cases in
`test-script-writer/references/sample-test-cases.md` (TC-TODO-001..005).

| File | Layer | What it shows |
|---|---|---|
| `todo/todo.page.ts` | page | composition root of the screen: owns the three containers, no locators of its own, no navigation |
| `todo/header.container.ts` | fixed container | the "What needs to be done?" input scoped under `.header` |
| `todo/main.container.ts` | fixed container | the list; `item(text)` returns a section factory, never a cached instance |
| `todo/todo-item.section.ts` | section (factory) | one row: label, toggle, destroy, edit — every locator through the row's own locator; the native checkbox handled with an idempotent `complete()`/`reopen()` (pilot stop at Gate B, interim kept) |
| `todo/footer.container.ts` | fixed container | count, filters, clear-completed |
| `registry-pages.md` | registry | the rows the builder returned for `docs/registry/pages.md` |

Rules it demonstrates (IDs from `sdet-framework-architect`): parent scoping on every locator, strict locators (no
`.first()`), sections as factories, elements that hold one locator, page methods for intent only.

## Verification

Compiled and exercised in the pilot: `npx tsc --noEmit` clean; `tests/e2e/todo.spec.ts` 5 cases, 42 passed x3 on
4 workers across the two suites, sentinel held, `can-fail` 20 killed / 0 survived — **ran once on 2026-11-02** in
`automation-pipeline/examples/pilot-todo-petstore/automation-status.json`. The files here are not compiled by CI on
their own (they import the scaffold's element classes); the same five cases run nightly on the scaffold through
`test-script-writer/examples/playwright-ts` (`Nightly examples`), which is the job that re-earns the behaviour.

To compile them yourself: scaffold with `init-playwright-framework`, copy `todo/` to `src/pages/todo/` (rename
`todo.page.ts` back to `index.ts`), run `npx tsc --noEmit`.
