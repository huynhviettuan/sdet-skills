# Mapping Test Cases to Test Scripts

How each part of a `test-case-design` test case becomes code. The worked example is
[`sample-test-cases.md`](sample-test-cases.md) (TodoMVC UI + Petstore API); its implementation is in the code
templates for each stack.

Contents:

- [Selecting cases](#selecting-cases)
- [Prerequisite check](#prerequisite-check)
- [Field-by-field mapping](#field-by-field-mapping)
- [Preconditions → Arrange](#preconditions--arrange)
- [Steps → Act](#steps--act)
- [Expected results → Assert](#expected-results--assert)
- [Negative cases](#negative-cases)
- [Test data tables](#test-data-tables)
- [Naming, tags, traceability](#naming-tags-traceability)
- [Cases you can't implement yet](#cases-you-cant-implement-yet)
- [Review checklist](#review-checklist)

---

## Selecting cases

| Case field | Implement? |
|---|---|
| `Status: Ready` + `Automation: Candidate` | Yes |
| `Status: Blocked by OQ-…` | No — add a skipped placeholder (below) so the gap stays visible |
| `Automation: Manual` (usability, visual judgement, one-off) | No — list in the report |
| `Status: Obsolete` | No — remove an existing test for it in the same change |
| `Layer: API` / `UI` / `Integration` | Implement at that layer; don't move a case to the UI because it's easier to see |

If a case has no `Layer`, apply "lowest reliable layer" (`test-case-design` → layer assignment) and say which you
chose in the report.

---

## Prerequisite check

Before writing a test, list what each precondition and step needs and confirm it exists:

| Needed | Look in | Missing → |
|---|---|---|
| Page object / element / page method | `docs/registry/pages.md`, `src/pages`, containers | `page-builder` (extend the existing page) |
| Service operation | `docs/registry/services.md`, `openapi-tool coverage` | `service-builder` (regenerate from the spec) |
| Data factory for a precondition | `src/fixtures/data-fixtures.ts` (TS) / `context/TestData.java` (Java) | write it: create through the service, register cleanup, unique data |
| Route / URL | `Endpoints` (TS) / test's `open(...)` path (Java) | add it |
| Test data (accounts, files) | env config, fixtures | add to config/fixtures — never hardcode secrets |

A test that needs a raw locator or raw HTTP call is a signal that a prerequisite is missing.

---

## Field-by-field mapping

| Test-case field | Code |
|---|---|
| ID + title | Test title `[TC-TODO-001] added todo appears in the list and the counter` |
| Verifies (AC/BR) | Annotation / link: TS `annotation: { type: 'AC', description: 'AC-TODO-001' }`; Java `@Link(name = "AC-TODO-001")` |
| Priority | Tag / group: TS `tag: ['@P0']`; Java `groups = "P0"`; P0 cases also `smoke` |
| Layer | File location: `tests/e2e` vs `tests/api` (TS); `tests.ui` vs `tests.api` (Java) |
| Preconditions | Arrange block (factories, navigation) |
| Steps | Act block — one page/service call per step, in order |
| Expected results | Assert block — at least one assertion per numbered result |
| Test data table | One generated test per row (`for` over rows / `@DataProvider`), row label in the title |
| Technique | Comment only if it explains the data (e.g. which partition a row represents) |

One spec file / test class per test-case file (`docs/test-cases/todo.md` → `tests/e2e/todo.spec.ts` /
`TodoTest.java`), with a doc comment pointing back to the file.

---

## Preconditions → Arrange

| Precondition | Arrange with |
|---|---|
| "An entity exists" (pet, order, user) | Data factory: `petFactory.create('available')` / `data().pets().create(AVAILABLE)` — created via API, deleted after the test |
| "An id that does not exist" | Create, then delete through the service (guaranteed absent) — never a "magic" id like 999999 that may exist on a shared env |
| "User X is logged in" | Session/auth fixture for that role (stored state / token), not the login UI — unless login is the behavior under test |
| "On page P" | Navigation in `beforeEach` / at the start of the test (`goto(Endpoints…)` / `open(...)`) |
| "App state only reachable through the UI" (no API) | Page-object calls in the Arrange block, commented as precondition (TodoMVC example) |
| "Feature flag / config" | Config or a dedicated fixture; never toggled by one test for others |

Every created thing has its teardown registered at creation time (fixture teardown / `context().onTeardown`), so a
failing assertion can't leak data.

---

## Steps → Act

- One step → one intent-level call: `todoPage.completeTodo('buy milk')`, `petService.getPetById(id)`.
- When a step has its own expected result (multi-step cases), assert right after that step — the test mirrors the
  case's step/result numbering.
- No element-level choreography in tests (click, fill, press): if a step needs it, add a page method.

---

## Expected results → Assert

| Expected result says | UI assertion | API assertion |
|---|---|---|
| "X is shown / list shows exactly …" | poll the read: `expect.poll(() => page.main.getTitles()).toEqual([...])` / `Eventually.verify(() -> assertThat(page.main.titles()).containsExactly(...))` | — |
| "Counter / label shows …" | poll the element text | — |
| "Status 200 / 404 …" | — | `expect(statusCode).toBe(StatusCodes.OK)` / `assertThat(response.statusCode()).isEqualTo(200)` |
| "Body matches the schema" | — | `validateJsonSchema('<op>_<status>', '<tag>', data)` / `SchemaValidator.assertMatches(response, "<tag>", "<op>_<status>")` |
| "Body has the same id, name, …" | — | `toMatchObject({...})` / `extracting(...).containsExactly(...)` |
| "Every item has property P" | — | `every(...)` / `allSatisfy(...)` |
| "Record is persisted / changed" | re-read through a service, not the UI | re-read with the GET operation |

Assert values from the case (and from data the test created), never values read from the app at runtime and then
compared with themselves.

---

## Negative cases

A negative expected result ("is not added", "is rejected", "returns 404") needs:

1. **A sync point** — proof the app processed the action. Without it an absence check passes before the app
   reacts. Examples: a valid action afterwards whose result is visible (TodoMVC `sentinel` todo); the error message
   or status of the rejected request; a response awaited for the action.
2. **The rejection itself** — status code, error message (via the shared notification/error component), or
   unchanged UI.
3. **No state change** — re-read the entity / list and compare with the state before the action.

---

## Test data tables

- Each row becomes **its own test** with the row label in the title (`… (spaces only)`, `… (pending)`), so a
  failure names the partition and the other rows still run.
- TS: a `for` loop over a typed array of rows generating `test(...)` calls. Java: `@DataProvider` returning one
  `Object[]` per row, with the label as the first parameter when it helps the report.
- Keep boundary values exactly as the case lists them; don't add or drop rows silently — propose changes to the
  case instead.

---

## Naming, tags, traceability

- Title: `[TC-<AREA>-NNN] <expected behavior in lower case>` (+ ` (<row label>)` for data rows).
- Tags / groups: priority (`@P0`…`@P3` / `P0`…), `@smoke` for P0 journeys; features via `test.describe` /
  `@Feature`.
- AC link: annotation (TS) / `@Link` (Java) — Allure and the Playwright report show it.
- After implementing, update the case: `Automation: Automated — tests/e2e/todo.spec.ts` (or the Java class) and the
  feature's coverage summary.

---

## Cases you can't implement yet

| Situation | Do |
|---|---|
| Blocked by an open question | TS: `test.fixme('[TC-…] … (blocked by OQ-012)', …)`; Java: `@Test(enabled = false, description = "[TC-…] … (blocked by OQ-012)")` — visible in reports, never silently absent |
| Known product bug | Implement the correct expectation and mark expected-to-fail with the defect: TS `test.fail()` + annotation `{ type: 'issue', description: 'DEF-231' }`; Java: keep red per team policy or `@Test(enabled = false)` with the defect in the description |
| Expected result ambiguous | Raise an OQ against the case; don't guess |
| Missing testability hook (no test id, no API for setup) | Request it (`page-builder` → requests to developers); implement with the interim approach and a TODO pointing to the request |

---

## Review checklist

```text
[ ] Only Ready, automatable cases implemented; skipped ones listed with reasons
[ ] One test per case (per data row), title starts with [TC-…], AC linked, priority tagged
[ ] Preconditions via factories/fixtures with automatic teardown; unique data
[ ] Steps through page objects / services only; no raw locators or HTTP in tests
[ ] Every expected result has an assertion; values come from the case
[ ] Negative cases: sync point + rejection + no state change
[ ] UI assertions retry (expect.poll / Eventually.verify); no fixed waits
[ ] Compiles; passes; passes repeated and in parallel; fails when an expectation is broken
[ ] Test-case file updated (Automation field, coverage summary)
```
