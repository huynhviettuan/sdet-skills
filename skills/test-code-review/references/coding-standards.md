# Coding Standards — DRY, KISS, YAGNI in Test Code

Three principles decide most of what makes test code readable and reusable. Each standard below belongs to one of
them, has an ID (`S-…`) for reviews, a severity, and a before/after. The rules are the same in both stacks;
examples are TypeScript (Playwright scaffold) with a Java (Selenium/RestAssured, TestNG scaffold) version wherever
Java reads differently, plus [TypeScript / Playwright-only](#typescript--playwright-only-standards),
[Python / pytest-only](#python--pytest-only-standards) and [Java-only](#java-only-standards) standards. The architecture rules (`R-…`, in
`refactor-test-suite/references/rules.md`) decide *where* code lives; these decide *how it reads* once it's there.

Contents:

- [The three principles, and who wins](#the-three-principles-and-who-wins)
- [DRY — one source of truth](#dry--one-source-of-truth)
- [KISS — the least machinery that does the job](#kiss--the-least-machinery-that-does-the-job)
- [YAGNI — build for the cases you have](#yagni--build-for-the-cases-you-have)
- [Hygiene the three don't cover](#hygiene-the-three-dont-cover)
- [TypeScript / Playwright-only standards](#typescript--playwright-only-standards)
- [Python / pytest-only standards](#python--pytest-only-standards)
- [Java-only standards](#java-only-standards)
- [Quick table](#quick-table)

---

## The three principles, and who wins

| Principle | In test code it means | The question to ask |
|---|---|---|
| **DRY** | One source of truth per *fact*: a locator lives in one page object, a message in one constants file, a data recipe in one factory, a setup in one fixture. Duplicated *facts* drift apart and fail one at a time. | "If this changes in the app, how many files change here?" — the answer must be 1 |
| **KISS** | The least machinery that proves the case: a flat test the reader follows top to bottom; a page method per user action; no engine, framework-within-the-framework, or clever generic where a plain function does. | "Can a new team member read this test and say what it proves without opening anything else?" |
| **YAGNI** | Build for the cases in `docs/test-cases/`, not for cases that might come: no abstraction with one caller, no option nobody passes, no base class for a hierarchy of one. | "Which test uses this today?" — if none, delete it |

**They pull against each other, and the tie-breaks are fixed:**

- **DRY vs YAGNI — the rule of three.** Two similar tests or methods are allowed to look similar; the *third* use
  extracts. Extracting at the second produces an abstraction shaped by one caller's accident.
- **DRY vs KISS — facts, not sentences.** Dedupe *facts* (a locator, a message, a recipe) aggressively; don't dedupe
  *sentences* (two tests whose steps happen to look alike). A shared helper that hides which steps a test runs
  makes the test unreadable to save four lines.
- **KISS vs correctness — never.** Simplicity never justifies a weak assertion, a sleep, or a skipped teardown;
  those are the `R-…` block rules and win over everything here.

---

## DRY — one source of truth

**S-DRY-LOCATOR (warn) — a locator exists in exactly one page object or container.** Two files that both know
`'.todo-list li'` break together and get fixed one at a time. A locator needed by a second page is a shared
component (`page-builder/references/decomposition.md`), not a copy.

```ts
// before: two specs, same selector
await page.locator('.new-todo').fill('x');          // todo.spec.ts
await page.locator('.new-todo').fill('y');          // filters.spec.ts
// after: one container
this.txtNewTodo = new Input({ locator: this.container.getByPlaceholder('What needs to be done?') });
```

**S-DRY-COPY (warn) — user-facing text in one constants file.** Messages, headings and labels the tests assert
on live in `messages.constant.ts` / a final `Messages` class with `public static final String` fields, named by
meaning (`AccessMessages.FORBIDDEN`), so a copy change is one edit and a locale switch is one file.

**S-DRY-ROUTES (warn) — routes and endpoints as constants** (`Endpoints.signIn`), never string literals in tests
(`R-HARDCODED-URL` covers full URLs).

**S-DRY-DATA (warn) — one factory per thing tests create.** `petFactory.create({ status })` / `data().pets().create(…)`
with defaults and owned cleanup; never the same object literal or builder chain pasted into five tests.

```java
// before: every test builds the same pet and forgets a field differently
Pet pet = Pet.builder().id(rnd()).name("p").photoUrls(List.of()).status(AVAILABLE).build();
services().pet().addPet(pet);
// after
Pet pet = data().pets().create(PetStatus.AVAILABLE);   // registers its own deletePet in teardown
```

**S-DRY-SETUP (warn) — repeated setup is a fixture / context accessor, not a copied `beforeEach`.** Signing in,
seeding a record, resolving a token: once, in `src/fixtures/*` or `TestContext`, reused by every test that needs it.

**S-DRY-PARAM (warn) — tests that differ in one value are one test with data rows** (`for (const row of rows)
test(...)`; Java `@DataProvider` with the partition name as the first column so the report names each row). Two
page methods that differ in a label are one method with a parameter.

**S-DRY-REGISTRY (warn) — look before building.** The registry (`docs/registry/*.md`), fixtures and `Services` list
what exists. A second `LoginPage`, a second `createUser` helper or a second date formatter is a block when it
duplicates behavior that exists (`R-COMPOSITION` territory), a warn when it only overlaps.

**S-DRY-CROSS-CUTTING (warn) — toasts, loading states, pagination, tables: one shared component.** A page object
that re-implements the toast reader is the most common DRY violation in automation code
(`sdet-framework-architect` principles).

**S-DRY-NOT-SENTENCES (nit) — don't dedupe steps into a helper that hides what the test does.** Two tests that both
"sign in, open leads, add one" may stay two readable tests; extract only the *facts* (`signIn`, `addLead`) into page
methods, not the sequence into `doTheLeadThing()`.

---

## KISS — the least machinery that does the job

**S-KISS-FLAT (warn) — a test reads top to bottom: Arrange, Act, Assert.** No branches or loops that decide which
assertion runs (`if (row.heading) … else …` is two tests); no helper call whose name doesn't say what it asserts.

```java
// before: assertions interleaved with setup, the reader can't find the act
Pet pet = data().pets().create(AVAILABLE);
assertThat(pet.getId()).isNotNull();
ApiResponse<Pet> r = services().pet().getPetById(pet.getId());
Pet again = data().pets().create(SOLD);
assertThat(r.statusCode()).isEqualTo(200);
// after
Pet pet = data().pets().create(AVAILABLE);                            // Arrange
ApiResponse<Pet> response = services().pet().getPetById(pet.getId()); // Act
assertThat(response.statusCode()).isEqualTo(200);                     // Assert
assertThat(response.body().getStatus()).isEqualTo(AVAILABLE);
```

**S-KISS-ONE (warn) — one behavior per test.** A test proves one expected-result set from one case; a second
`// Act` is a second test; a data row is a separate test.

**S-KISS-INTENT (warn) — tests read as business steps; mechanics live below.** `addTodo('buy milk')`,
`completeTodo('buy milk')`, `filterBy('Active')`. If a test needs a `locator`, `click` or an HTTP verb, the page
object or service is missing a method (`R-RAW-*` blocks it). Java: no `By`, `WebElement`, `driver` or `given()` in a
test class, only `pages()`, `services()`, `data()` (`ArchitectureRulesTest` enforces it).

**S-KISS-NAME (warn) — names say what, not how.** A page method is the user's intent; an element its role and
label; a test title the case id and the behavior.

```ts
// before
await loginPage.fillAndClick(user.email, user.password);
const r = await svc.get1(id);
// after
await signInPage.signIn(user.email, user.password);
const pet = await petService.getPetById(id);
```

```java
// before
pages().login().doIt(u.getEmail(), u.getPassword());
// after
pages().signIn().signIn(user.getEmail(), user.getPassword());
```

Test titles: `[TC-TODO-003] blank titles are not added (spaces only)`, never `test3` or `should work`. Java: the id
and behavior in `@Test(description = "[TC-…] …")` and a behavior-named method (`blankTitleIsNotAdded`), because
reports show the description and stack traces show the method. Booleans read as questions (`isCompleted()`,
`hasRows()`); elements carry their prefix (`btnSave`, `txtEmail`, `lblTotal`, `lnkHelp`, `chkTerms`, `drpCountry`,
`tblOrders`); containers end in `Container`, repeated items in `Section`, services in `Service`, factories in
`Factory`.

**S-KISS-NO-ENGINE (warn) — no framework inside the framework.** A typed `given/when/then` step wrapper beats a
Gherkin engine nobody authors `.feature` files for; a `for` loop over rows beats a reflection-driven data loader; a
constants file beats a localisation subsystem for two languages. Pick the least machinery that satisfies the cases
you have (`sdet-framework-architect` KISS).

**S-KISS-PAGE (warn) — page methods are verbs the user would say; no assertions, navigation decisions or `expect`
inside page objects.** One container per region, one page per screen; a container over ~150 lines or a page over
~10 methods is two things (`page-builder/references/decomposition.md`).

**S-KISS-SERVICE (warn) — a service sends and parses, one method per operation named after its operationId.** It
never asserts, retries, or decides what "success" means (`service-builder`).

**S-KISS-ASSERT (warn, R-WEAK-ASSERT) — assert the value the case states, in the plainest matcher.**
`toBe('1 item left')`, not `toBeTruthy()`; `isEqualTo(404)`, not `isNotNull()`; a schema check plus the fields the
requirement names. A message where the value alone won't explain the failure, especially on preconditions:
`expect(statusCode, 'precondition: create user').toBe(201)`; AssertJ `as("precondition: delete")`.

```java
// before
assertThat(response.body()).isNotNull();
assertThat(response.body().getStatus().toString()).contains("AVAIL");
// after
assertThat(response.statusCode()).isEqualTo(200);
SchemaValidator.assertMatches(response, "pet", "getPetById_200");
assertThat(response.body())
        .extracting(Pet::getId, Pet::getName, Pet::getStatus)
        .containsExactly(pet.getId(), pet.getName(), PetStatus.AVAILABLE);
```

**S-KISS-COMPOSE (nit) — share by composition, not inheritance.** A widget is `new TableComponent(root)`, not a
"BasePage" of locators to extend; setup is a fixture / `TestContext` capability, not `BaseTest → LoggedInTest →
AdminTest`. Inheritance chains are the opposite of simple: to read one test you read four classes. Every stack is
built this way (`sdet-framework-architect` → `stack-contract.md`), and `R-INHERIT` flags a page, container, test or
service that inherits anything but the framework's thin bases.

**S-KISS-COMMENT (nit) — comments explain why, never what.** `// 404 when already deleted: fine` earns its place;
`// click the button` restates the line and is deleted. A non-obvious constraint (an Origin check, a rate limit, a
race) is exactly what a comment is for.

---

## YAGNI — build for the cases you have

**S-YAGNI-RULE3 (warn) — extract on the third use, not the first.** A factory, a page method, a fixture or a
helper appears when the third caller does. Extracting earlier yields an abstraction with one caller, a parameter
nobody passes, and a name that fits the first caller only.

**S-YAGNI-ONE-CALLER (warn) — no interface, base class, generic or option with exactly one implementation or
caller.** `IPage` with one page, `BaseService<T>` with one `T`, `options?: { retries?: number }` that no test passes:
delete them until a second real use exists (`sdet-framework-architect` warn smells).

```ts
// before: a "flexible" factory nobody needs flexible
petFactory.create({ status, name, tags, category, photoUrls, idStrategy, retryOn409 })
// after: what the cases use, with defaults for the rest
petFactory.create('available')
```

**S-YAGNI-SCOPE (warn) — model only what the test cases touch.** A page object for a screen the cases visit, with
the elements the steps act on or assert; not every control on the page "while we're here"
(`page-builder`: scope from docs). Services for the tags the cases call (`coverage --tags`), not the whole spec.

**S-YAGNI-DEAD (warn) — no commented-out code, unused parameters, unreachable branches, `console.log` leftovers,
or `test.skip` without a reason and an id.** Disabled tests carry the TC id and the reason (`fixme(…, 'OQ-012')`).
Code that "might be useful later" is in git history, not in the tree.

**S-YAGNI-DEFENSIVE (nit) — no guards against the framework's own guarantees.** Null checks on fixtures,
`if (await el.isVisible()) await el.click()` (a conditional click hides a missing element), retries around
assertions, `try/catch` "just in case": each one hides a failure the test exists to find.

**S-YAGNI-CONFIG (nit) — no configuration switch without two environments that need different values.** A flag
that is always `true` is a constant; a strategy pattern for one strategy is a function.

**S-YAGNI-SHARE (nit) — don't package for reuse across products until a second product exists;** and then share
the vocabulary (element classes) only, never page objects, services, copy or test data
(`sdet-framework-architect` cross-project reuse).

---

## Hygiene the three don't cover

Correctness rules that a review must still check, mostly enforced by tools:

**S-DATA-UNIQUE (block, R-SHARED-STATE) — every test creates its own data with a unique key** (`autotest-<ts>-<n>`),
through a factory that owns the cleanup. Fixed shared records (`user1`, "the demo contract") are shared state.

**S-DATA-NO-SECRET (block, R-SECRETS) — credentials only from configuration/environment;** a deliberately wrong
password in a negative test is the only literal allowed, and it should look wrong (`'not-the-right-password-1'`).

**S-WAIT-SIGNAL (block, R-NO-SLEEP) — wait on the signal, with a bounded timeout:** `expect.poll`, web-first
assertions, `Eventually.verify`, `waitForResponse` registered before the action. No sleeps, no `force: true`.

**S-ASYNC-AWAIT (block) — every Playwright action and assertion is awaited** (`playwright/missing-playwright-await`
and `no-floating-promises` catch most; the review catches `void promise` and forgotten returns inside helpers).

**S-ERROR-BOUNDARY (warn) — no `try/catch` that swallows, no `.catch(() => undefined)` outside teardown.** A
precondition that fails throws with a message naming the precondition; teardown may tolerate "already gone" and
nothing else.

**S-TYPE-STRICT (warn) — no `any`, no `@ts-ignore`, no raw `Object`/`Map<String,Object>` for API bodies.** Models
come from the spec (`service-builder`); a response is typed before it is asserted.

**S-FILE (nit) — one class per file, named after it; a spec file per test-case document; path-alias imports; a
spec under ~300 lines and a page object under ~150** (split by section or flow past that).

---

## TypeScript / Playwright-only standards

The Playwright scaffold runs each worker as its own process with tests in sequence, so a module-level singleton is
safe; the fixture system is the composition root. Most TypeScript-specific rules follow from those two facts.

**S-TS-FIXTURES (block, R-COMPOSITION) — tests take everything from fixtures; `test` and `expect` come from
`@fixtures/fixtures`.** No `import { test } from '@playwright/test'` outside `src/fixtures/`; no `new TodoPage()`
in a spec. New pages, services and factories are registered in their fixture file and merged once in
`fixtures.ts` (ESLint `no-restricted-imports` / `no-restricted-syntax` enforce this).

```ts
// before
import { test, expect } from '@playwright/test';
test('x', async ({ page }) => { const todo = new TodoPage(page); /* … */ });
// after
import { expect, test } from '@fixtures/fixtures';
test('[TC-TODO-001] added todo appears in the list', async ({ todoPage }) => { /* … */ });
```

**S-TS-SCOPE (warn) — fixture scope matches the lifetime of what it holds.** A token, a saved session or a
browser-wide setting is `{ scope: 'worker' }` (resolved once per worker, S-DRY-SETUP); a page object, a service
instance or a data factory is test-scoped so its teardown runs per test. Never `beforeAll` plus a module `let` to
share state between tests (R-SHARED-STATE): that is a worker-scoped fixture written the hard way.

**S-TS-USE (nit) — `test.use({ storageState })` at the `describe` that needs the role**, not per test and not at
file level when the file mixes roles; signed-out suites say so:
`test.use({ storageState: { cookies: [], origins: [] } })`.

**S-TS-POLL (block, R-NO-SLEEP) — page state is asserted with web-first assertions or `expect.poll`,** which retry
until the bounded timeout: `await expect(todoPage.main.lblCount).toHaveText('1 item left')`,
`await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk'])`. Never `expect(await x.innerText())` on
state that may still be changing, never `waitForTimeout`, never `waitForLoadState('networkidle')` as a wait for an
element.

**S-TS-AWAIT (block) — every locator action and every assertion is awaited.** `playwright/missing-playwright-await`
and `no-floating-promises` catch most; the review still reads helpers for a returned promise nobody awaits and
`void somePromise`.

**S-TS-ROWS (nit) — data-driven tests are a `for` loop over a typed table at module level,** with the partition in
the title; the table is `as const` (or typed) so a typo in a status is a compile error, not a runtime surprise.

```ts
const blankTitles = [
    { partition: 'empty', title: '' },
    { partition: 'spaces only', title: '   ' }
] as const;
for (const { partition, title } of blankTitles) {
    test(`[TC-TODO-003] blank titles are not added (${partition})`, async ({ todoPage }) => { /* … */ });
}
```

**S-TS-TYPES (warn, S-TYPE-STRICT) — API models are `type` aliases generated from the spec;** `interface` is for
behaviour contracts (`IBaseControl`), not for request/response bodies (only aliases are assignable to
`BaseService`'s `JSONObject`; ESLint enforces `type` under `src/models/<tag>/`). No `any`, no `as unknown as`,
no non-null `!` to silence a type the code should narrow; `import { type X }` for types.

**S-TS-CONST (nit) — constants objects are `as const`** (`Endpoints`, `Staff`, `AccessMessages`) so values are
literal types and `keyof typeof` gives the role/route union for free (`type StaffRole = keyof typeof Staff`).

**S-TS-TAGS (warn) — traceability through the test options, not the title alone:**
`{ tag: ['@P1', '@smoke'], annotation: { type: 'requirement', description: 'AC-TODO-001' } }`, with the case id at
the start of the title (`[TC-TODO-001] …`). `test.fixme(…, 'OQ-012')` for blocked cases, never a bare `test.skip`.

**S-TS-STEP (nit) — `test.step` only when a test has several user-level stages that the report should separate**;
not around every line, and never as a substitute for a page method.

**S-TS-ELEMENTS (nit) — the element classes' `{ locator }` option with a container-scoped locator;** the convenience
options (`label`, `index`, `id`) assume the component library's markup (the Playwright template's element
registry documents which) and `index` is positional (R-POSITION).

**S-TS-JS (warn) — a JavaScript repo (no `tsconfig`, `.js` specs) gets TypeScript before new tests are added:**
`init-playwright-framework` is TypeScript, the generated models are types, and half of the rules above (S-TS-TYPES,
S-TS-ROWS, S-TS-CONST) have no JavaScript equivalent. Until the migration, JSDoc `@type`/`@param` on page methods and
services, `// @ts-check` at the top of each file, and the same fixture, scope and await rules apply unchanged.

---

## Python / pytest-only standards

The Python scaffold (`init-pytest-playwright-framework`) runs pytest-xdist workers as processes and gives each test
its own Playwright page; pytest fixtures are the composition root.

**S-PY-FIXTURES (block, R-COMPOSITION) — tests take pages, services and factories as fixture arguments, and import only
`qa.*` and `pytest`.** No `TodoPage(page)` in a test, no `playwright`, `httpx` or `requests` import (ruff
`banned-api` enforces it).

```python
# before
def test_x(page: Page) -> None:
    todo = TodoPage(page)
    httpx.post(f"{API}/pet", json={...})
# after
def test_x(todo_page: TodoPage, pet_factory: PetFactory) -> None: ...
```

**S-PY-SCOPE (warn) — fixture scope matches the lifetime of what it holds:** the HTTP client, tokens and saved
sessions are `scope="session"` (per worker); pages, services and factories are function-scoped so their teardown runs
per test. Never module-level variables to share state between tests (R-SHARED-STATE).

**S-PY-YIELD (block, R-TEARDOWN) — cleanup lives after `yield` in the fixture that created the data,** which runs when
the test fails; never a `delete` at the end of a test body, never `addfinalizer` in the test itself.

**S-PY-WAIT (block, R-NO-SLEEP) — locator state through `expect(...)` from `qa.assertions`; values through
`eventually(lambda: ...)`.** No `time.sleep` outside `qa/ui/wait.py`; no `assert page_object.titles() == [...]` on
state that may still be changing (wrap it in `eventually`).

**S-PY-PARAM (warn, S-DRY-PARAM) — data rows are `@pytest.mark.parametrize` with readable `ids`**
(`ids=["empty", "spaces only"]`), so the report names each row; never a loop inside one test.

**S-PY-MARKS (warn) — traceability through registered markers:** `@pytest.mark.case("TC-…")`,
`@pytest.mark.requirement("AC-…")`, a priority marker, and the docstring `[TC-…] behavior`. Markers are registered in
`pyproject.toml` and `--strict-markers` rejects typos. Blocked cases: `@pytest.mark.skip(reason="OQ-012: …")`.

**S-PY-TYPES (warn, S-TYPE-STRICT) — typed everywhere; mypy strict on `src/`.** Fixtures and tests annotate
parameters and return types; API models are pydantic models generated from the spec with aliases for camelCase
fields; no `Any` in page or service signatures, no `# type: ignore` without a reason.

**S-PY-ASSERT (warn, S-KISS-ASSERT) — plain `assert` with the stated value, and a message on preconditions:**
`assert response.status_code == 404`, `assert delete.status_code == 200, "precondition: delete"`. Never a bare
`assert response` (R-WEAK-ASSERT); compare tuples or models for several fields at once.

**S-PY-NAMES (nit) — PEP 8 names with the collection's prefixes:** `btn_save`, `txt_email`, `lbl_count`; classes
`TodoPage`, `TodoMainContainer`, `TodoItemSection`, `PetService`, `PetFactory`; service methods are
snake_case(operationId) with `@operationId` in the docstring.

---

## Java-only standards

The Java scaffold runs TestNG with `parallel="methods"`: one instance of the test class serves several threads at
once. Most Java-specific rules follow from that.

**S-JAVA-NO-FIELDS (block, R-SHARED-STATE) — test classes declare no instance fields.** Drivers, pages, services,
ids and counters are local variables or live in the thread's `TestContext`; a field is shared between the threads
running sibling methods.

```java
// before: the second thread overwrites pet while the first is still asserting on it
private Pet pet;
@BeforeMethod public void setUp() { pet = data().pets().create(AVAILABLE); }
// after
@Test(description = "[TC-PET-001] Created pet can be retrieved by id")
public void createdPetCanBeRetrievedById() {
    Pet pet = data().pets().create(AVAILABLE);
    // …
}
```

**S-JAVA-NO-ORDER (block, R-SHARED-STATE) — no `priority`, `dependsOnMethods` or `dependsOnGroups` to pass state
between tests.** Each test arranges its own data through `data()`; a dependency is allowed only to skip tests when
a smoke test proves the environment is down, never to sequence state.

**S-JAVA-EVENTUALLY (block, R-NO-SLEEP) — UI state is asserted inside `Eventually.verify(...)`**, which retries the
AssertJ assertion until it passes or the bounded timeout ends; conditions wait through `Waits.until(..., "what")`.
Never `Thread.sleep`, never `implicitlyWait` above zero, never a hand-rolled `while` loop.

**S-JAVA-ASSERTJ (warn) — AssertJ only, one assertion style.** No mixing of `org.testng.Assert`, JUnit and AssertJ;
chain on one subject (`extracting(...).containsExactly(...)`) instead of five `assertEquals` lines; `as("…")` on
preconditions and on data-provider rows (`as("partition: %s", partition)`).

**S-JAVA-ANNOTATIONS (warn) — traceability through annotations, not comments:** `@Test(groups = {"P1", "smoke"},
description = "[TC-…] …")`, `@Link(name = "AC-…")`, `@Feature` on the class, `@Issue("DEF-…")` on a disabled
known-bug test. A disabled test carries the id and the reason in its `description`.

**S-JAVA-LOMBOK (nit) — models are Lombok `@Data @Builder @NoArgsConstructor @AllArgsConstructor`;** enums carry
`@JsonValue` for the wire value. No hand-written getters, no `Map<String, Object>` bodies (S-TYPE-STRICT), no
`toString` surprises in assertion output (Lombok's `@Data` gives a readable one).

**S-JAVA-OPTIONAL (nit) — never return `null` from a page or service method;** return `Optional`, an empty list, or
throw with a message. A test that does `if (x != null)` is hiding a missing element (S-YAGNI-DEFENSIVE).

**S-JAVA-EXCEPTIONS (warn) — preconditions throw `IllegalStateException("Precondition failed: …")`** with the
status and body text; nothing catches `Exception` broadly; `InterruptedException` restores the interrupt flag.

**S-JAVA-ROOT-FIRST (nit) — in a container, declare `root` before the fields built from it;** Java initializes
fields in declaration order, and a field built from a not-yet-assigned root fails at construction with an NPE that
looks like a locator problem.

**S-JAVA-FINAL (nit) — containers expose `public final` elements;** page and container classes are not extended
(composition, S-KISS-COMPOSE); helper classes are `final` with a private constructor.

---

## Quick table

| ID | Principle | Severity | One line |
|---|---|---|---|
| S-DRY-LOCATOR | DRY | warn | A locator lives in exactly one page object |
| S-DRY-COPY | DRY | warn | User-facing text in one constants file |
| S-DRY-ROUTES | DRY | warn | Routes and endpoints as constants |
| S-DRY-DATA | DRY | warn | One factory per thing tests create |
| S-DRY-SETUP | DRY | warn | Repeated setup is a fixture, not a copied beforeEach |
| S-DRY-PARAM | DRY | warn | Same test, different value → data rows |
| S-DRY-REGISTRY | DRY | warn | Look in the registry before building |
| S-DRY-CROSS-CUTTING | DRY | warn | Toasts, loading, pagination: one shared component |
| S-DRY-NOT-SENTENCES | DRY | nit | Dedupe facts, not step sequences |
| S-KISS-FLAT | KISS | warn | Arrange, Act, Assert; no logic picking the assertion |
| S-KISS-ONE | KISS | warn | One behavior per test |
| S-KISS-INTENT | KISS | warn | Tests read as business steps |
| S-KISS-NAME | KISS | warn | Names say what, not how; `[TC-id] behavior` titles |
| S-KISS-NO-ENGINE | KISS | warn | No framework inside the framework |
| S-KISS-PAGE | KISS | warn | Page methods are user verbs; no assertions; split big pages |
| S-KISS-SERVICE | KISS | warn | One method per operation; services never assert |
| S-KISS-ASSERT | KISS | warn | Plainest matcher for the stated value; messages on preconditions |
| S-KISS-COMPOSE | KISS | warn (R-INHERIT) | Share by composition, not inheritance |
| S-KISS-COMMENT | KISS | nit | Comments explain why |
| S-YAGNI-RULE3 | YAGNI | warn | Extract on the third use |
| S-YAGNI-ONE-CALLER | YAGNI | warn | No abstraction, generic or option with one caller |
| S-YAGNI-SCOPE | YAGNI | warn | Model only what the cases touch |
| S-YAGNI-DEAD | YAGNI | warn | No dead code, unexplained skips, leftovers |
| S-YAGNI-DEFENSIVE | YAGNI | nit | No guards against the framework's guarantees |
| S-YAGNI-CONFIG | YAGNI | nit | No switch without two environments |
| S-YAGNI-SHARE | YAGNI | nit | No cross-product package until a second product |
| S-DATA-UNIQUE | hygiene | block | Own, unique data per test with owned cleanup |
| S-DATA-NO-SECRET | hygiene | block | Credentials from config only |
| S-WAIT-SIGNAL | hygiene | block | Wait on the signal, bounded |
| S-ASYNC-AWAIT | hygiene | block | Every action and assertion awaited |
| S-ERROR-BOUNDARY | hygiene | warn | No swallowed errors outside teardown |
| S-TYPE-STRICT | hygiene | warn | No `any`, raw types or untyped bodies |
| S-FILE | hygiene | nit | One class per file; sizes; aliases |
| S-TS-FIXTURES | TS | block | Tests take everything from fixtures; no @playwright/test in specs |
| S-TS-SCOPE | TS | warn | Worker scope for sessions/tokens; test scope for pages, services, factories |
| S-TS-USE | TS | nit | test.use({ storageState }) at the describe that needs the role |
| S-TS-POLL | TS | block | Web-first assertions / expect.poll; no innerText snapshots of changing state |
| S-TS-AWAIT | TS | block | Every action and assertion awaited |
| S-TS-ROWS | TS | nit | Data rows: typed as-const table, for-loop at module level |
| S-TS-TYPES | TS | warn | API models are type aliases from the spec; no any / as unknown / ! |
| S-TS-CONST | TS | nit | Constants objects as const; keyof typeof for unions |
| S-TS-TAGS | TS | warn | tag + annotation options; [TC-id] title; fixme with a reason |
| S-TS-STEP | TS | nit | test.step for user-level stages only |
| S-TS-ELEMENTS | TS | nit | { locator } with a container-scoped locator; index is positional |
| S-TS-JS | TS | warn | JavaScript repos move to TypeScript before new tests; JSDoc + ts-check meanwhile |
| S-PY-FIXTURES | Python | block | Tests take fixtures; import only qa.* and pytest |
| S-PY-SCOPE | Python | warn | Session scope for clients/tokens; function scope for pages, services, factories |
| S-PY-YIELD | Python | block | Cleanup after yield in the creating fixture |
| S-PY-WAIT | Python | block | expect for locators, eventually for values; no sleeps |
| S-PY-PARAM | Python | warn | parametrize with readable ids |
| S-PY-MARKS | Python | warn | case / requirement / priority markers; strict markers |
| S-PY-TYPES | Python | warn | Typed; mypy strict; pydantic models from the spec |
| S-PY-ASSERT | Python | warn | Plain assert of the stated value; messages on preconditions |
| S-PY-NAMES | Python | nit | PEP 8 with the collection's prefixes; snake_case(operationId) |
| S-JAVA-NO-FIELDS | Java | block | No instance fields in TestNG test classes |
| S-JAVA-NO-ORDER | Java | block | No priority / dependsOn to pass state |
| S-JAVA-EVENTUALLY | Java | block | UI assertions inside Eventually.verify; no sleeps |
| S-JAVA-ASSERTJ | Java | warn | AssertJ only; chained; as("…") on preconditions |
| S-JAVA-ANNOTATIONS | Java | warn | TC id and groups in @Test, AC in @Link |
| S-JAVA-LOMBOK | Java | nit | Lombok models, @JsonValue enums |
| S-JAVA-OPTIONAL | Java | nit | No null returns from pages/services |
| S-JAVA-EXCEPTIONS | Java | warn | Preconditions throw with a message; no broad catches |
| S-JAVA-ROOT-FIRST | Java | nit | Declare root before the elements built from it |
| S-JAVA-FINAL | Java | nit | public final elements; final helpers; no page inheritance |
