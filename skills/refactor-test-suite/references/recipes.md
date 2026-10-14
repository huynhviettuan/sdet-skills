# Refactoring Recipes

Before → after for each rule, in both stacks. "Before" snippets come from real legacy suites that pass today (which
is why such suites survive); "after" snippets are excerpts of code that the collection's builders generate and that
was verified against the same apps. Each recipe ends with how to keep the refactor behavior-preserving.

Contents:

- [Raw UI calls → page objects](#raw-ui-calls--page-objects)
- [Raw HTTP → services](#raw-http--services)
- [Sleeps → real signals](#sleeps--real-signals)
- [Shared state → isolated tests](#shared-state--isolated-tests)
- [Cleanup in the body → factories with teardown](#cleanup-in-the-body--factories-with-teardown)
- [Ad hoc construction → composition root](#ad-hoc-construction--composition-root)
- [Positions → business keys](#positions--business-keys)
- [Weak assertions → exact expectations](#weak-assertions--exact-expectations)
- [Secrets and URLs → configuration](#secrets-and-urls--configuration)
- [Deep inheritance → composition](#deep-inheritance--composition)

---

## Raw UI calls → page objects

Rules: `R-RAW-UI-IN-TEST`, `R-SCOPE`, `R-XPATH-ABS`.

Before (TS):

```ts
await page.locator('.new-todo').fill('buy milk');
await page.locator('.new-todo').press('Enter');
expect(await page.locator('xpath=//section/div/section/ul/li').getAttribute('class')).toContain('completed');
```

Before (Java):

```java
WebElement input = driver.findElement(By.xpath("/html/body/section/div/header/input"));
input.sendKeys(title + Keys.ENTER);
```

After — build the page with `page-builder` (container per region, elements scoped to the container root, sections for
repeated rows), then the test speaks intent:

```ts
await todoPage.addTodo('buy milk');
await expect.poll(() => todoPage.main.getItem('buy milk').isCompleted()).toBe(true);
```

```java
todo.addTodo("buy milk");
Eventually.verify(() -> assertThat(todo.main.item("buy milk").isCompleted()).isTrue());
```

Steps:

1. Pick one screen; list every locator the tests use on it (grep the audit findings for that page).
2. Generate/extend its page object with `page-builder`; keep locator *strategies* that are stable, replace absolute
   XPath and generated classes with test ids / role+name.
3. Migrate tests of that screen one file at a time; run them after each file.
4. Delete the now-unused raw locators; the audit count for the screen drops to zero.

---

## Raw HTTP → services

Rule: `R-RAW-HTTP-IN-TEST`.

Before:

```ts
const res = await request.post(`${API}/pet`, { headers: { api_key: apiKey }, data: { id: petId, name: 'doggie', photoUrls: [], status: 'available' } });
```

```java
Response res = given().header("api_key", apiKey).contentType("application/json").body("{\"id\":" + petId + ",...}").post(API + "/pet");
```

After — generate services 1:1 from the OpenAPI spec with `service-builder`; auth applied once by the composition root:

```ts
const { statusCode, data } = await petService.getPetById(pet.id);
```

```java
ApiResponse<Pet> response = services().pet().getPetById(pet.getId());
```

Steps: put the spec in `specs/`, generate the services for the tags the tests use, replace calls test by test, then
run `openapi-tool coverage` so hand-written endpoints that aren't in the spec surface as findings (spec drift or
undocumented API).

---

## Sleeps → real signals

Rules: `R-NO-SLEEP`, `R-FORCE`.

| Sleep was waiting for… | Wait on |
|---|---|
| Element to appear / change | Retrying assertion on the element state (`expect.poll`, web-first assertions / `Eventually.verify`) |
| A request to finish | The response (`waitForResponse` registered before the action) |
| A spinner / overlay to go away | The shared loading component's hidden state |
| Background processing | Poll the observable outcome through the API, bounded by a timeout |
| "Clicks don't work without it" (or `force: true`) | Find the real blocker (overlay, animation, disabled state) and wait for it to clear |

Java: set the implicit wait to zero in the driver factory *in the same change* that replaces sleeps — mixing implicit
and explicit waits makes timing unpredictable.

Verify: run the migrated tests with `--repeat-each=10` / `invocationCount = 10` and in parallel; they must not get
slower or flakier than the baseline.

---

## Shared state → isolated tests

Rule: `R-SHARED-STATE`.

Before:

```ts
let petId: number;
test.describe.serial('pet api', () => {
    test('create pet', async ({ request }) => { petId = /* … */ });
    test('get pet', async ({ request }) => { /* uses petId */ });
});
```

```java
protected static WebDriver driver;                // one driver for all threads
private long petId;                               // instance field shared by parallel methods
@Test(priority = 1) public void createPet() { … }
@Test(priority = 2) public void getPet() { … }    // depends on createPet having run
```

After — each test creates what it needs through a factory and runs alone:

```ts
test('[TC-PET-001] created pet can be retrieved by id', async ({ petFactory, petService }) => {
    const pet = await petFactory.create('available');
    const { statusCode, data } = await petService.getPetById(pet.id);
    // …
});
```

```java
@Test(description = "[TC-PET-001] Created pet can be retrieved by id")
public void createdPetCanBeRetrievedById() {
    Pet pet = data().pets().create(PetStatus.AVAILABLE);
    ApiResponse<Pet> response = services().pet().getPetById(pet.getId());
    // …
}
```

Driver: replace `static WebDriver` with a per-thread holder (`DriverFactory` + `ThreadLocal`) before turning on
parallel runs. Verify by running the affected classes with parallel methods and threads > 1.

---

## Cleanup in the body → factories with teardown

Rule: `R-TEARDOWN`.

Before: `await request.delete(...)` as the last line of a test — skipped when an earlier assertion fails.

After: the factory that creates the data registers its cleanup at creation time:

```ts
petFactory: async ({ petService }, use) => {
    const created: number[] = [];
    await use({ async create(status) { /* addPet, created.push(id) */ } });
    for (const id of created) await petService.deletePet(id); // runs even when the test failed
}
```

```java
context.onTeardown("delete pet " + id, () -> service.deletePet(id)); // registered right after creating it
```

Full versions: `test-script-writer` code templates (data fixtures / `PetFactory`). Cleanup must be idempotent (a 404
on delete is fine).

---

## Ad hoc construction → composition root

Rule: `R-COMPOSITION`.

| Before | After |
|---|---|
| `const page = new LoginPage(page)` in a test | `test(..., async ({ loginPage }) => …)` — registered in `page-fixtures.ts` |
| `import { test } from '@playwright/test'` in tests | `import { expect, test } from '@fixtures/fixtures'` |
| `driver = new ChromeDriver(...)` in a base test | `DriverFactory.start()` in `BaseUiTest`, per thread |
| `new PetService()` in a test | `services().pet()` — credentials applied in `Services` |

Introduce the composition root first (an empty fixtures module / `TestContext`), then move one dependency at a time.

---

## Positions → business keys

Rule: `R-POSITION`.

| Before | After |
|---|---|
| `page.locator('.todo-list li').nth(0)` | `todoPage.main.getItem('buy milk')` — row found by its title |
| `driver.findElements(By.cssSelector("input.toggle")).get(0)` | `todo.main.item("buy milk").chkToggle` |

Generic table/list components may still address rows by index internally; tests and page objects ask by business key.

---

## Weak assertions → exact expectations

Rule: `R-WEAK-ASSERT`.

| Before | After |
|---|---|
| `expect(res.ok()).toBeTruthy()` | `expect(statusCode).toBe(StatusCodes.OK)` + schema validation |
| `expect(await row.innerText()).toBeTruthy()` | `await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk'])` |
| `Assert.assertNotNull(res)` | `assertThat(response.statusCode()).isEqualTo(200)` and the fields the requirement names |

Take the expected value from the requirement / test case. If the test never had one, that's a gap to raise, not to
invent.

---

## Secrets and URLs → configuration

Rules: `R-SECRETS`, `R-HARDCODED-URL`.

1. Move URLs to configuration (`BASE_URL`, `API_DOMAIN` per environment).
2. Move secrets to environment variables / the CI secret store; reference them through `Config`.
3. **Rotate any secret that was committed** — removing it from the code doesn't remove it from git history.

---

## Deep inheritance → composition

Manual finding (no rule ID). Typical legacy shape: `BaseTest → LoggedInTest → AdminTest`, pages extending pages.

- Turn each "layer" of behavior into a fixture / context capability (logged-in session, admin role) that tests opt
  into, instead of a parent class they must inherit.
- Pages share widgets by composing components, not by inheriting from a "BasePage" full of locators.
- Keep only the thin base test classes the scaffolds provide (context lifecycle, browser lifecycle).
