---
name: page-builder
description: >
  Build page objects for a Playwright/TypeScript test framework by exploring the live application in a browser and
  reading the feature's docs (user stories, test cases, UI specs) — scoping which screens and states matter,
  decomposing each screen into containers, repeated sections and shared components, choosing parent-scoped
  locators, confirming an element inventory with the user, then generating, registering, and verifying the code.
  Use this skill whenever the user wants to create or update a page object, model a new screen or modal, add
  elements to an existing page, or turn exploration of an app into automation code. Trigger on phrases like
  "create page object", "build the page for", "explore this screen", "model this page", "add locators for",
  "page builder", "new page". Generates code for the init-playwright-framework (Playwright/TypeScript) and
  init-selenium-java-framework (Selenium/Java/TestNG) scaffolds.
---

# Page Builder

Turn a screen into page objects that tests can use for years: scoped to the regions the user sees, built only for
what the test cases need, with every locator checked against the real DOM before it is committed.

**How to use this skill:** follow the workflow. Load a reference when you reach its step:

- [`references/exploration.md`](references/exploration.md) — reading docs for scope, driving the browser
  (built-in browser / Playwright MCP / inspector), the states checklist, capturing network calls for
  `service-builder`.
- [`references/decomposition.md`](references/decomposition.md) — page vs container vs section vs shared component vs
  modal; naming; what becomes a page method vs an exposed element.
- [`references/locators.md`](references/locators.md) — the one locator priority, scoping rules, how the scaffold's
  element classes map to DOM, and what to do when the DOM doesn't match their conventions.
- Code templates per stack — container, section with factory, page, registration, registry row, smoke test, review
  checklist; each verified against a live app:
  - [`references/code-templates-playwright-ts.md`](references/code-templates-playwright-ts.md) — Playwright /
    TypeScript (`init-playwright-framework`)
  - [`references/code-templates-selenium-java.md`](references/code-templates-selenium-java.md) — Selenium / Java /
    TestNG (`init-selenium-java-framework`)
  - [`references/code-templates-pytest-playwright.md`](references/code-templates-pytest-playwright.md) — pytest +
    Playwright / Python (`init-pytest-playwright-framework`)

**Detect the stack first** with the table in `sdet-framework-architect` →
`references/stack-contract.md` (`package.json` with `@playwright/test` → TypeScript; `pom.xml` with
`selenium-java` / `rest-assured` → Java; `pyproject.toml` with `pytest` → Python). Use only that stack's templates; the workflow, the composition design and the rules are the same. A stack listed there as
*planned* has no templates yet: say so and offer a supported scaffold rather than improvising.

## Workflow

1. **Scope from docs.** Read the feature's user story, `docs/test-cases/<feature>.md`, and any UI spec. List the
   screens and the **states** the test cases need (empty, populated, error, loading, modal open, each tab). Build
   only those — elements no test case touches are not modeled yet.
2. **Check the registry.** `docs/registry/pages.md` and `elements.md`: reuse existing pages, containers, and shared
   components; extend instead of duplicating.
3. **Explore live.** Open the app in a browser, walk each state from step 1, read the accessibility tree, and
   inspect test ids and structure. Record network calls per interaction for `service-builder`. No live access →
   build from docs/screenshots and mark every locator `UNVERIFIED`.
4. **Decompose** each screen into page → containers (header/main/footer or the app's real regions) → sections for
   repeated items (factory, never singleton) → shared components (modal, table, form, toast via the `notification`
   fixture).
5. **Choose locators**, always derived from the owning container, using the single priority in `locators.md`.
   Missing test ids on important controls become a request to developers (recorded in the inventory).
6. **Inventory gate.** Present the inventory (container → element name → class → locator → states where it
   exists, plus the captured API calls) and wait for the user's confirmation before writing code.
7. **Generate** containers, sections, and the page in the scaffold's structure (the stack's code-templates file).
8. **Register** the page — Playwright: `src/fixtures/page-fixtures.ts`; Java: `context/Pages.java` — and add a row
   to `docs/registry/pages.md` (new element classes → `elements.md` where the scaffold has one).
9. **Verify**: compile clean (`npx tsc --noEmit` + ESLint, or `mvn -q test-compile`); a smoke test that walks the
   captured states through the page object passes — every locator acted on or read in it must resolve to exactly
   one element (Playwright strict mode and the Java scaffold's strict `Locator` enforce this).

## Non-negotiable rules

- **Every element is resolved through its container.** The only page-level lookup allowed is a container's own root.
- **Repeated or dynamic regions are sections created by a factory** (`getItem(title)`, `getRow(index)`) — never a
  singleton field.
- **Toasts and inline errors are read through the shared `notification` fixture**, never re-modeled per page.
- **No assertions in page objects.** They expose elements and do actions; tests assert.
- **Navigation lives in tests/fixtures** (`goto`), not in the page constructor.
- **Never invent locators.** Each one is observed in the DOM (or marked `UNVERIFIED`), and checked in every state it
  is claimed to exist in.
- **No fixed waits.** Page methods wait on real signals (element state, response); list getters return snapshots and
  tests poll them (`expect.poll` / `Eventually.verify`).
- **Build for the test cases, not the whole screen** (YAGNI) — extend the page object when a new case needs more.

## Decision table

| Situation | Model as |
|---|---|
| Region always on the page (header, main, sidebar, footer) | Container field on the page |
| Item that repeats (row, card, list item, tab panel) | Section class + factory method on its container |
| Widget reused across pages (modal, data table, date picker, nav bar) | Shared component in `src/components/`, composed into containers |
| Modal / drawer | Shared component scoped to its dialog root; opened by a page method, returned to the caller |
| Multi-step wizard | One page; one container per step, plus a method that returns the active step |
| Same layout, different data (detail pages) | One page class; data passed to methods, not new classes |
| Control not matching an element class's DOM convention | Pass `locator:` to the element; if behavior also differs, create a new element (`create-custom-element`) |
| Element only in some states | Keep the field; note the states in JSDoc; tests reach the state before using it |

## Related skills

- **`test-script-writer`** — writes the tests that use what this skill builds.
- **`init-playwright-framework`** / **`init-selenium-java-framework`** — provide the element classes, container
  structure, composition root, and registry this skill fills.
- **`service-builder`** — receives the network calls captured during exploration; services do setup, pages do the
  behavior under test.
- **`test-case-design`** — the test cases that scope which screens and states to build.
- **`sdet-framework-architect`** — the scoping, composition, and single-owner rules this skill implements.
