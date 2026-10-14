# Locators

One priority list, one scoping rule, and how to use each scaffold's element classes without fighting their DOM
assumptions. Examples show Playwright/TypeScript and Selenium/Java side by side.

Contents:

- [Scoping](#scoping)
- [Priority](#priority)
- [Element classes and the `locator` option](#element-classes-and-the-locator-option) (Playwright scaffold)
- [Selenium / Java element classes](#selenium--java-element-classes)
- [When the DOM doesn't match a class](#when-the-dom-doesnt-match-a-class)
- [Requests to developers](#requests-to-developers)
- [Avoid](#avoid)

---

## Scoping

Every element locator is built **from its container's root** (or a section's root). The container root is the only
page-level lookup. This is what keeps a "Save" button in the main form from matching the "Save" in a modal or a
hidden tab.

```ts
this.container = $('section.main');                                                      // root: the one page-level lookup
this.btnSave = new Button({ locator: this.container.getByRole('button', { name: 'Save' }) }); // element: from the root
```

```java
private final Locator root = Locator.root(By.cssSelector("section.main"));   // root: the one page-level lookup
public final Button btnSave = new Button(root.find(Bys.button("Save")));       // element: from the root
```

---

## Priority

Pick the first that is stable and unique **within the container**:

```text
1. Test id            this.container.getByTestId('todo-count')         (attribute set by testIdAttribute in playwright.config.ts)
2. Role + name        this.container.getByRole('button', { name: 'Clear completed' })
3. Label              this.container.getByLabel('Mark all as complete')
4. Placeholder        this.container.getByPlaceholder('What needs to be done?')
5. Stable text        this.container.getByText('Total', { exact: true })     (not for localized or frequently edited copy)
6. Stable CSS         this.container.locator('[name="email"]')
7. XPath              last resort, with a comment saying why
```

Selenium / Java (`Bys` in the Java scaffold; every strategy stays inside the parent):

```text
1. Test id            root.find(Bys.testId("todo-count"))                (attribute from TEST_ID_ATTRIBUTE)
2. Accessible name    root.find(Bys.button("Clear completed")), Bys.link(..), Bys.heading(..), Bys.ariaLabel("Delete")
3. Label              root.find(Bys.label("Mark all as complete"))
4. Placeholder        root.find(Bys.placeholder("What needs to be done?"))
5. Stable text        root.find(Bys.text("Total"))
6. Stable CSS / id    root.find(By.cssSelector("[name='email']")), By.id("email")
7. XPath              root.find(By.xpath(".//…")) — relative only; "//" escapes the parent
```

Use `exact: true` for names that are prefixes of other names (`All` vs `All items`). Prefer role+name over a test id
when both exist and the accessible name is stable — it also checks accessibility.

---

## Element classes and the `locator` option

The scaffold's element classes (`src/elements/common/*`) accept an options object. **Default to the `locator`
option** with a locator built from the container — it works for any DOM and keeps the priority above:

```ts
new Input({ locator: this.container.getByPlaceholder('What needs to be done?') })
new Label({ locator: this.container.getByRole('heading', { level: 1 }) })
new Link({ locator: this.container.getByRole('link', { name: 'Active', exact: true }) })
```

The other options (`label`, `id`, `index`, `parentLocator`) build locators from **conventions of the product the
framework was extracted from** — e.g. `Input({ label })` looks for an `<input>` inside a `.input` wrapper containing
the label text; `Button({ label })` looks for `button:has(text)`. Use them only after confirming the target app's DOM
follows that convention. Never omit both `locator` and `parentLocator` — the classes then fall back to the whole page.

Signatures differ per class; check the constructor before use. Known differences:

| Class | Constructor |
|---|---|
| `Label` | `{ locator?: string \| Locator; parentLocator?; text?; exact?; id? }` |
| `Table` (component) | `new Table(parent)` — pass the **parent**; it appends `table` itself |
| `Form` (component) | `new Form(parent)` — scopes to `form` inside `parent`; `form.getInput({...})`, `form.getButton({...})` |
| `DatePicker` | `new DatePicker(label, parentLocator?, id?)` |
| `Dropdown` | `{ label?; index?; parentLocator?; id? }` — no `locator` option; expects the product's `.dropdown` markup |

---

## Selenium / Java element classes

Every class takes exactly one argument — a scoped `Locator` — so there is one way to build an element:

```java
new Input(root.find(Bys.placeholder("What needs to be done?")))
new Label(root.find(By.tagName("h1")))
new Link(root.find(Bys.link("Active")))
```

- `Locator` is lazy (re-resolved on every call — no stale elements), scoped (`find` searches inside the parent's
  single match), and strict (`resolve()` fails with `StrictLocatorException` on several matches).
- Repeated items: `items.withDescendantText(Bys.testId("todo-title"), title)` or `items.filter(predicate, "what")`
  to pick one row by business key.
- `CheckBox` and `Dropdown` model **native** `<input type=checkbox>` and `<select>`; custom widgets get their own
  element or component class.
- `isDisplayed()` follows Selenium's visibility rules: an `opacity: 0` input under a styled label reports hidden even
  though it is clickable. Actions don't depend on it; for assertions on such controls, assert the visible
  counterpart (label, row class) instead.

---

## When the DOM doesn't match a class

The classes also encode **behavior** of the original product's widgets (e.g. `CheckBox.uncheck()` reads an
`is-checked` class inside a `.checkbox` wrapper). Before using a class, check the methods your tests need actually
work on the target DOM:

| Situation | Do |
|---|---|
| Locating differs, behavior fits | Pass `locator:` (default above) |
| Behavior differs (native checkbox, custom select) | Create a new element class (`create-custom-element` in the scaffold), e.g. `NativeCheckBox` using `locator.check()` / `isChecked()`, register it in `docs/registry/elements.md` |
| One-off read on a container | A container method using the container's root (`getTitles()`), not a new class |

---

## Requests to developers

When an important control has no stable hook (no test id, no accessible name, only generated classes), record a
request instead of reaching for a brittle selector:

```text
REQUEST: add data-testid="order-total" to the order total on /checkout (currently only .css-1x9k2 span)
Interim locator: this.container.getByText(/^Total/).locator('..')  — UNSTABLE, replace when test id lands
```

Collect these in the inventory and hand them to the team; test ids are a testability contract.

---

## Avoid

```text
nth-child / nth() as the primary identifier   — breaks when order changes; identify by business key
generated or hashed class names                — change every build
long CSS chains / deep XPath                   — break with any layout change
page-global lookups for elements               — match the same control in modals, hidden tabs, prerendered routes
text of localized / marketing copy             — changes without a functional change
```
