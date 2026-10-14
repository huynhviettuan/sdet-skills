# Framework and Coding Standards

Content for `docs/architecture/` and `docs/standards/`. **The framework design itself is owned by the
`sdet-framework-architect` skill** (five-layer blueprint, non-negotiable rules, decision framework) — load it when
writing `FRAMEWORK_ARCHITECTURE.md`, `COMPONENT_DESIGN.md`, or `FIXTURE_DESIGN.md`. This file only covers what those
documents must record and the test-writing standards around them.

Examples are pseudocode unless labeled with a tool. Labeled examples are illustrations; translate them to the
project's stack.

Contents:

- [FRAMEWORK_ARCHITECTURE.md](#framework_architecturemd)
- [PROJECT_STRUCTURE.md](#project_structuremd)
- [COMPONENT_DESIGN.md](#component_designmd)
- [FIXTURE_DESIGN.md](#fixture_designmd)
- [DATA_FLOW.md](#data_flowmd)
- [LOGGING_STANDARD.md](#logging_standardmd)
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

## PROJECT_STRUCTURE.md

A folder map where every folder has one line saying what belongs there and one rule for what doesn't. The exact
names follow the framework's layers; a typical shape:

```text
src/
├── elements/       # element/control wrappers (button, input, table) — no page knowledge
├── components/     # reusable widgets (modal, toast, pagination) — constructed with a root
├── pages/          # page/screen objects composed of containers/components — no assertions
├── services/       # one API client per resource — no UI imports
├── fixtures/       # composition root: wiring, data factories, setup + teardown
├── data/           # factories/builders and static reference data — no secrets
└── utils/          # generic, stateless helpers — no domain knowledge
tests/
├── api/
├── ui/
└── integration/
config/             # environments, per-env settings — secrets from env/secret store only
```

Also record: file naming (`*.page.ts`, `*.service.ts`, `*.spec.ts`), the import direction rule (tests → fixtures →
pages/services → elements; never the reverse), and where a new kind of thing goes when it doesn't fit (ask, then
update this doc — don't create an ad hoc folder).

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

## DATA_FLOW.md

One diagram plus a short walk-through of how a single test runs end to end, so a reader can see where state comes
from and where it goes:

```text
CI job / CLI
 → config resolves environment (base URLs, flags; secrets from secret store)
 → global setup: health check, reference data, per-worker auth state saved
 → worker fixtures: reserve account, load auth state, create API clients
 → test fixtures: create test data via API (tagged with run id), build page objects
 → test body: act through pages/services, assert on observable outcome
 → test fixture teardown: delete created data (idempotent, runs on failure too)
 → reporter: results + artifacts (trace, screenshots, logs, created data ids)
 → global teardown: release accounts, sweep orphans tagged with this run id
```

Also mark which steps touch external systems (identity provider, email inbox, third-party stubs) and which
environments each step is allowed to run against.

---

## LOGGING_STANDARD.md

Test logs exist to make a CI failure diagnosable without re-running it.

- **Log at the step level**, not the click level: "create contract via API → id 8f3a", "approve as manager". Most
  runners have a step/annotation API; use it so steps appear in the report.
- **Always log identifiers** of data the test created, the account/worker used, the environment, and the run id —
  these are what you search production-like logs with.
- **Correlate** with the system under test: send a per-test correlation id header (e.g. `X-Request-Id`/
  `traceparent`) on API calls and record it, so a failing request can be found in backend logs/traces.
- **Never log secrets or personal data**: mask tokens, passwords, cookies, auth headers, and PII in request/response
  logging by default.
- **Levels**: `info` for steps, `debug` for request/response bodies (enabled in CI on failure/retry only), `warn`
  for recoverable anomalies (retried call, slow response), `error` only with the failure.
- **No `console.log` left in tests**; go through the one shared logger so format, masking, and levels stay
  consistent.

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
