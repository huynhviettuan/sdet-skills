# Exploration

Steps 1–3 of the workflow: deciding what to build from the docs, then observing the real screen.

Contents:

- [Scope from docs](#scope-from-docs)
- [Browser options](#browser-options)
- [Exploration procedure](#exploration-procedure)
- [States checklist](#states-checklist)
- [Network capture for service-builder](#network-capture-for-service-builder)
- [Inventory format](#inventory-format)

---

## Scope from docs

Read, in order: the test cases for the feature (`docs/test-cases/<feature>.md`), the user story and its acceptance
criteria, and any UI spec or design. Extract:

| From | Extract |
|---|---|
| Test case steps | Every control a step acts on ("Approve the contract" → approve button) |
| Expected results | Everything a test reads or asserts (status label, count, row contents, message) |
| Preconditions | States to reach (contract pending → detail page in PENDING state) |
| UI spec / design | Region names the product team uses — reuse them for container names |

The result is a scope table: screen → states → elements needed. Anything not on it is out of scope for now. If the
docs describe a control you can't find in the app (or vice versa), raise it as an OPEN QUESTION — don't model a
guess.

---

## Browser options

| Option | Use when |
|---|---|
| Claude's built-in browser (or Claude in Chrome) | Default. `navigate`, `read_page` for the accessibility tree, `find` for specific controls, `javascript_tool` to inspect attributes/test ids, `read_network_requests` for API calls |
| Playwright MCP | The project already uses it; same steps through its snapshot/click/network tools |
| Playwright inspector / codegen (`npx playwright codegen <url>`) | No browser tools available. Use the recording only to learn locators — never paste generated code into page objects |
| Docs and screenshots only | No access to the app. Every locator is `UNVERIFIED` until checked; say so in the inventory |

Authentication: sign in with the project's test account (from `.env`, never real credentials) or reuse stored
session state. Don't create accounts or change data beyond what exploring the states requires, and only in a test
environment.

If clicks don't register (pane not drawn, overlay), inspect with `read_page` / `javascript_tool` and drive the state
through the app's own UI events; never change app code to explore it.

---

## Exploration procedure

For each screen in scope:

1. **Navigate** to the route; note the URL pattern (Playwright: an `Endpoints` entry used by `goto`; Java: the path
   passed to `open(...)` in tests).
2. **Read the accessibility tree** — landmarks (`banner`, `main`, `navigation`, `contentinfo`, `dialog`), headings,
   and controls with their roles and accessible names. Landmarks usually are the container roots.
3. **Inspect attributes** for the controls in scope: `data-testid` (or the project's test id attribute — check
   `testIdAttribute` in `playwright.config.ts`, or `TEST_ID_ATTRIBUTE` in the Java scaffold's config), `id`, `name`, `aria-label`, wrapper classes. A quick list:

   ```js
   [...document.querySelectorAll('[data-testid]')].map(e => ({ id: e.dataset.testid, tag: e.tagName, text: e.innerText.slice(0, 30) }))
   ```

4. **Walk each state** from the scope table (checklist below), re-reading the tree after every transition — many
   regions only render in some states.
5. **Check uniqueness** of each candidate locator within its container in each state (`find`, or
   `container.querySelectorAll(selector).length` in `javascript_tool`).
6. **Record network calls** per interaction (next section).

---

## States checklist

Walk the ones that apply:

```text
[ ] Initial load (and loading skeleton, if any)
[ ] Empty state (no data)
[ ] Populated state (1 item, many items, paginated)
[ ] After each primary action (created, saved, deleted)
[ ] Validation errors (required fields, invalid values)
[ ] Server error / failed request (if reproducible in the test env)
[ ] Each tab / accordion / step
[ ] Modal / drawer / menu open
[ ] Each role that sees the screen differently (admin vs viewer)
[ ] Narrow viewport (only if mobile layouts are in scope)
```

Record for every element the states it exists in — this becomes its JSDoc and tells tests which state to reach
first.

---

## Network capture for service-builder

For each interaction, record method, path (ids replaced by `{param}`), status, and whether the response is JSON.
Hand the list to `service-builder`:

- If an OpenAPI spec exists, the list confirms which operations the feature uses (and which services need fixtures
  for test setup).
- If no spec exists, it is the raw material for a draft spec (`service-builder` → "No spec").

Sanitize tokens, cookies, and personal data from anything you save.

---

## Inventory format

Present this for confirmation before writing code (workflow step 6):

```text
TodoPage — /todomvc/#/                         states: empty, populated, filtered
├── header (TodoHeaderContainer) root: header.header
│   ├── lblTitle      Label   getByRole('heading', { level: 1 })                    all states
│   └── txtNewTodo    Input   getByPlaceholder('What needs to be done?')            all states
├── main (TodoMainContainer) root: section.main                                     populated only
│   ├── chkToggleAll  CheckBox getByLabel('Mark all as complete')
│   └── getItem(title) → TodoItemSection  root: getByTestId('todo-item') filtered by title
│       ├── chkToggle CheckBox getByRole('checkbox', { name: 'Toggle Todo' })
│       ├── lblTitle  Label    getByTestId('todo-title')
│       └── btnDelete Button   getByRole('button', { name: 'Delete' })              visible on hover
└── footer (TodoFooterContainer) root: footer.footer                                populated only
    ├── lblCount         Label  getByTestId('todo-count')
    ├── getFilter(name)  Link   getByRole('link', { name, exact: true })
    └── btnClearCompleted Button getByRole('button', { name: 'Clear completed' })   ≥1 completed

API calls: none (state in localStorage)
Requests to developers: none
UNVERIFIED locators: none
```
