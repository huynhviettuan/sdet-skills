# Framework and Coding Standards

Content for `docs/architecture/` and `docs/standards/`. **The framework design itself is owned by the
`sdet-framework-architect` skill** (five-layer blueprint, non-negotiable rules, decision framework) — load it when
writing `FRAMEWORK_ARCHITECTURE.md`, `COMPONENT_DESIGN.md`, or `FIXTURE_DESIGN.md`. This file only covers what those
documents must record and the test-writing standards around them.

Examples are pseudocode unless labeled with a tool. Labeled examples are illustrations; translate them to the
project's stack.

Contents:

- [FRAMEWORK_ARCHITECTURE.md](#framework_architecturemd)
- [COMPONENT_DESIGN.md](#component_designmd)
- [FIXTURE_DESIGN.md](#fixture_designmd)
- [LOCATOR_STRATEGY.md](#locator_strategymd)
- [WAIT_STRATEGY.md](#wait_strategymd)
- [ASSERTION_STRATEGY.md](#assertion_strategymd)
- [NAMING_CONVENTION.md](#naming_conventionmd)
- [TEST_DESIGN_STANDARD.md](#test_design_standardmd)
- [CODE_REVIEW_CHECKLIST.md](#code_review_checklistmd)

---

## FRAMEWORK_ARCHITECTURE.md

Record, per `sdet-framework-architect`:

- the layers and the single responsibility of each (element/control, container/page, service/API, composition
  root, driver/session holder)
- the dependency direction (tests → fixtures → pages/components/services → driver; never upward)
- where each kind of file lives (`PROJECT_STRUCTURE.md`)
- the driver/session holder shape and why (process-parallel → singleton; thread-parallel → thread-local)

Summary rules to state in the doc:

```text
Tests orchestrate and assert; they get everything else from fixtures.
Pages/screens compose containers; containers are scoped to their own root.
Components represent reusable UI parts, scoped to a root passed in.
Services wrap one API resource each.
Fixtures own setup AND teardown.
Utilities stay generic and stateless.
```

Avoid giant page objects — split by region/component long before a page object reaches hundreds of lines.

---

## COMPONENT_DESIGN.md

Use one component object per reusable widget (modal, dropdown, table, uploader, date picker, toast, header,
navigation) instead of duplicating its selectors across pages. Cross-cutting widgets (toast, inline error, loading
state, pagination) get **exactly one** shared component.

A component is constructed with its **root element**, never with the whole page, so the same widget appearing twice
(or in a hidden tab) cannot be matched by accident:

```text
class UploadDocumentModal:
    constructor(root)                 # root = the modal's own container
    upload(file):  root.find(fileInput).setFiles(file)
    submit():      root.find(submitButton).click()

# caller (a page object) scopes it:
uploadModal = UploadDocumentModal(page.find(dialog named "Upload document"))
```

---

## FIXTURE_DESIGN.md

Document each fixture with: purpose, scope, setup, teardown, dependencies.

Scopes and typical uses:

| Resource | Scope |
|---|---|
| Browser page / API client | test |
| Account reservation | worker |
| Authenticated session state (login once via API) | worker or global setup |
| Environment seed (read-only reference data) | global setup |
| Feature-specific data | test |

Rules:

- The fixture that creates data, a mock, or session state owns its **idempotent** teardown. Teardown never lives in
  the test body, where a failed assertion would skip it.
- No fixtures with invisible side effects — anything a fixture changes is stated in its doc entry.
- Tests receive pages, components, services, and data factories only through fixtures.

---

## LOCATOR_STRATEGY.md

**Scope first:** resolve every locator through its owning page region or component root, never a page-global
lookup. Then pick the most stable selector in that scope. Default priority (record deviations as an ADR):

```text
1. Dedicated test id (data-testid or the project's equivalent) — a testability contract with developers
2. Accessible role + name
3. Label
4. Stable visible text (only if copy is not localized/frequently edited)
5. Stable CSS attribute
6. XPath — last resort
```

Some teams put role+name first for accessibility pressure; either is defensible — pick one and document why.

Avoid: `:nth-child()`, generated/hashed class names, layout-dependent selectors, long XPath.

Good locators are: stable, readable, domain-meaningful, unique within their scope, accessible where possible.

*Playwright example:*

```ts
// preferred — scoped, stable
form.getByTestId('email-input')
// avoid — global, layout-dependent
page.locator('.login-form > div:nth-child(2) input')
```

---

## WAIT_STRATEGY.md

Never use a fixed sleep as a synchronization strategy. Wait on the real signal:

- expected element state (visible, enabled, has text)
- response received for the specific request
- loading indicator hidden (via the shared loading component)
- expected state persisted
- expected count reached

**Network ready does not always mean UI ready** — after waiting for a response, still wait for the UI state the
assertion depends on.

*Playwright example:*

```ts
// avoid
await page.waitForTimeout(5000);

// prefer: register the wait before the action, match the exact request
const approved = page.waitForResponse(r =>
  r.request().method() === 'POST' && /\/contracts\/[^/]+\/approve$/.test(r.url()));
await contractDetail.approveButton.click();
await approved;
await expect(contractDetail.status).toHaveText('APPROVED');
```

Any remaining fixed wait needs an inline comment citing the technical reason and a linked OQ/issue to remove it.

---

## ASSERTION_STRATEGY.md

Assertions must prove business behavior.

- Prefer domain assertions (`status == 'ACTIVE'`, `response code == 201`) over truthiness checks.
- UI assertions target user-visible behavior.
- API assertions validate status, schema, business fields, error codes, and state transitions.
- Never assert on a mock's internal call state — assert on what the user/consumer observes.
- Avoid asserting irrelevant implementation details (internal component state, CSS classes).
- Every test ends in at least one meaningful assertion.

---

## NAMING_CONVENTION.md

Use the shared ID scheme (see `../SKILL.md`). Each automated scenario has a `TC-<AREA>-NNN` id and names the AC it
verifies.

```text
File:   contract-approval.spec.<ext>
Title:  [TC-CONTRACT-015] manager can approve pending contract (AC-CONTRACT-010)
```

Titles describe behavior ("manager can approve pending contract"), not steps ("click approve button").

---

## TEST_DESIGN_STANDARD.md

Arrange / Act / Assert, with arrangement coming from fixtures:

```text
test "[TC-CONTRACT-015] manager can approve pending contract" (fixtures: managerApi, pendingContract):
    # Arrange — pendingContract fixture created it via API and will delete it in teardown
    # Act
    result = managerApi.contracts.approve(pendingContract.id)
    # Assert
    assert result.status == 'APPROVED'
```

- Keep tests short; one behavior per test.
- Split workflow setup (fixtures) from business assertions (test body).
- No conditional logic in tests that changes what is asserted.

---

## CODE_REVIEW_CHECKLIST.md

```text
[ ] Correct test layer for the behavior
[ ] No duplicated abstraction — reused existing component/service/fixture
[ ] Locators scoped through their owning parent and stable
[ ] No arbitrary wait
[ ] Assertions prove behavior (no mock-call assertions)
[ ] Data isolated; created and torn down by a fixture
[ ] Parallel-safe
[ ] Cleanup safe (targets only data this test created)
[ ] Title carries TC id and describes behavior
[ ] Failure can be diagnosed from CI artifacts
[ ] Traceability updated
```
