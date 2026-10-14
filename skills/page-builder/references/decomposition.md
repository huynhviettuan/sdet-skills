# Decomposition

How to split a screen into page, containers, sections, and components, and how to name them.

Contents:

- [Layers](#layers)
- [Choosing container boundaries](#choosing-container-boundaries)
- [Sections for repeated items](#sections-for-repeated-items)
- [Shared components](#shared-components)
- [Page methods vs exposed elements](#page-methods-vs-exposed-elements)
- [Naming](#naming)
- [File layout](#file-layout)

---

## Layers

```text
Page (src/pages/<page>/index.ts)
 ├── Container  — one per visible region, owns a root locator   (src/components/containers/<page>/*.container.ts)
 │    ├── Element   — Button, Input, Label, Link, CheckBox, Dropdown… resolved from the container
 │    ├── Section   — repeated item, created by a factory method   (*.section.ts next to its container)
 │    └── Component — shared widget (Form, Table, Modal…) composed in, scoped to the container
 └── business methods that delegate to containers
```

The page object holds no locators of its own; containers do. Tests reach elements as
`page.<container>.<element>` and call `page.<action>()` for multi-step behavior.

---

## Choosing container boundaries

Use the regions the user and the DOM agree on — usually landmarks:

| DOM / a11y landmark | Container |
|---|---|
| `header` / `banner` | `header` |
| `main` / primary `section` | `main` |
| `nav` / `navigation`, sidebar `aside` | `nav`, `sidebar` |
| `footer` / `contentinfo` | `footer` |
| `form` that is the main subject | its own container (`form`) or the `main` container using `Form` |
| tab panel, wizard step, accordion panel | one container each, or a section if they repeat with the same shape |

Header/Main/Footer is a default, not a rule: name containers after the app's real regions. A region that appears on
every page (global nav, app header) is a shared component, not a per-page container.

A container's root is the **only** page-level lookup allowed: prefer a test id or landmark (`$getByTestId('cart')`,
`$('main')`), else a stable structural class (`$('section.main')`).

---

## Sections for repeated items

Rows, cards, list items, comments — anything that appears N times with the same shape:

- One section class, constructor takes its own root `Locator`.
- The container exposes a **factory** that returns a new section per item: `getItem(title)`, `getRow(index)`,
  `getCard({ name })`. Identify items by business key (title, name, id) before index.
- Never store a section as a singleton field — two rows would share state.
- Lists the tests read (`getTitles()` / `titles()`) are container methods returning snapshots; tests poll them
  (Playwright: `await expect.poll(() => page.main.getTitles()).toEqual([...])`; Java:
  `Eventually.verify(() -> assertThat(page.main.titles()).containsExactly(...))`).

---

## Shared components

Already in the Playwright scaffold: `Form` (scopes to `<form>` inside its parent, caches inputs/buttons), `Table`
(pass the table's **parent**: `new Table(this.container)` — it appends `table` itself), `Notification` via the
`notification` fixture, `Skeleton` for loading placeholders. The Java scaffold ships elements only; build the first
shared component (in `ui/components/`, constructed with its root `Locator`) when a second page needs it.

Create a new shared component when a widget appears on **two or more** pages (YAGNI below that): it lives in
`src/components/<name>.component.ts`, takes its root `Locator`, and is composed into containers. Modals and drawers
are components scoped to their dialog root (`$getByRole('dialog', { name: '…' })`); the page method that opens one
returns the component.

---

## Page methods vs exposed elements

| Expose an element (readonly field) | Add a page method |
|---|---|
| Tests read or assert it | The action has several steps (fill form + submit) |
| Single action used by one test | The same action is used by two or more tests |
| Its state is the subject of the test (disabled, visible) | It hides app mechanics tests shouldn't know (open menu, then click item) |

Methods are named for intent (`addTodo`, `approveContract`, `filterBy`), never for mechanics (`clickButton2`).
Methods never assert and never return booleans meant as pass/fail — they return data (`getTitles()`) or nothing.

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| Page class / folder | TS: `<Name>Page` in `src/pages/<name>/index.ts`; Java: `pages/<name>/<Name>Page.java` | `TodoPage` |
| Container | `<Page><Region>Container` | `TodoHeaderContainer` |
| Section | `<Page><Item>Section` (or `<Item>Section` if unambiguous) | `TodoItemSection` |
| Component | `<Name>` in `<name>.component.ts` | `ConfirmDialog` |
| Elements | prefix + intent | `btnSave`, `txtEmail`, `lblTotal`, `lnkHelp`, `chkTerms`, `drpCountry`, `tblOrders`, `imgAvatar` |
| Factories | `get<Item>(key)` | `getItem(title)`, `getRow(orderId)` |

Prefixes: `btn` button, `txt` text input/textarea, `lbl` read-only text, `lnk` link, `chk` checkbox/toggle, `drp`
dropdown/select, `tbl` table, `img` image.

---

## File layout

```text
src/pages/todo/index.ts
src/components/containers/todo/header.container.ts
src/components/containers/todo/main.container.ts
src/components/containers/todo/todo-item.section.ts
src/components/containers/todo/footer.container.ts
src/fixtures/page-fixtures.ts                       ← register todoPage
docs/registry/pages.md                              ← one row per page
```

Imports always use path aliases (`@pages/*`, `@components/*`, `@elements/*`, `@common/*`), never relative paths.

Selenium / Java scaffold (`src/main/java/com/example/qa/`):

```text
pages/todo/TodoPage.java
ui/containers/todo/TodoHeaderContainer.java
ui/containers/todo/TodoMainContainer.java
ui/containers/todo/TodoItemSection.java
ui/containers/todo/TodoFooterContainer.java
context/Pages.java                                  ← register todo()
docs/registry/pages.md                              ← one row per page
```
