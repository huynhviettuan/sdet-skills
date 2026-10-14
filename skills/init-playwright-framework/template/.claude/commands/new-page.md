---
description: Scaffold a container-based page object for a screen
argument-hint: <feature/screen name> [url]
---

Read `.claude/skills/create-page-object.md`, then create a container-based page object for: **$ARGUMENTS**

Requirements:

-   Use Header / Main / Footer containers as appropriate.
-   Parent-scoped locators only — never page-global `getByTestId`.
-   Use a `Form` component where the screen has form inputs.
-   Read error/success messages via the `notification` fixture (don't add per-page toast/error elements).
-   Use path aliases (`@pages/*`, `@elements/*`, ...), never relative imports.
-   Register the new page object in `src/fixtures/page-fixtures.ts` and add a row to `docs/registry/pages.md`.

If a URL was provided, follow the `page-builder` agent (or the `page-builder` skill if installed): scope from the
feature's test cases, explore every needed state, confirm the element inventory, then generate and smoke-test.
