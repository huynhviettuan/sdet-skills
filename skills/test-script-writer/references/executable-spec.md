# Executable Specs for the Manual QA Agent

The third output target: instead of framework code, an **ExecutableSpec** — the constrained JSON step format the
Manual QA Agent runs in its own browser worker (its ADR-0008). Use it when the team runs regression through the
agent (approved cases, second-person approval, deterministic verdicts, stored evidence). Proposing it, getting it
approved, and running it go through the `manual-qa-agent` skill.

Everything here was verified against the agent's demo app: the five sample cases below were drafted, approved,
proposed, approved by a second person and run — all `PASSED`; with the demo's planted bug switched on, TC-LOGIN-002
ended `FAILED` with the actual text recorded and was triaged.

Contents:

- [When this target fits](#when-this-target-fits)
- [What you implement](#what-you-implement)
- [The step format](#the-step-format)
- [Field-by-field mapping](#field-by-field-mapping)
- [Locators](#locators)
- [Assertions](#assertions)
- [Data, secrets, cleanup, destructive steps](#data-secrets-cleanup-destructive-steps)
- [Cases the format can't express](#cases-the-format-cant-express)
- [Worked example](#worked-example)
- [Check before proposing](#check-before-proposing)

---

## When this target fits

| Use an ExecutableSpec | Use framework code instead |
|---|---|
| The case is approved in the agent and the team wants its verdict, evidence and audit trail there | The team runs automation in a framework repo (`init-*-framework`) |
| Steps are navigate / fill / click / select plus text, visibility, URL and HTTP-status checks | The case needs anything in [Cases the format can't express](#cases-the-format-cant-express) |
| One user, one browser session, data the environment can reset or the spec can create through its API | Values carried between steps, computed expectations, several users or sessions |

The same test case can have both; they don't conflict. The agent's run is the governed regression record, the
framework test is the developer-facing check.

## What you implement

**The approved case revision in the agent is the spec** — read it with `GET /api/test-cases/<caseId>` and take the
latest revision with `status: "APPROVED"`: its `steps[]` (`action`, `expected`, `sourceRefs`), `preconditions`,
`testData`, and its top-level `sourceRefs`. The `test-case-design` document (`docs/test-cases/<feature>.md`) supplies
detail the agent's case may leave out (exact data, partitions); if the two disagree, stop and report it — the
approved revision is what the run will be judged against.

One executable implements one case. A case with a data table of several rows needs one approved case per row (ask the
QA engineer to split it); never loop rows inside one spec.

## The step format

From the agent's `packages/domain/src/executable.ts` (validated with zod; unknown step types and fields are rejected):

```text
spec      = { setup?: Step[≤50], steps: Step[1..200], teardown?: Step[≤50] }
step ids  = unique across the spec, /^[a-z0-9][a-z0-9_-]{0,63}$/
every step: id, type, sourceRefs?: string[]

actions     navigate  { path }                               relative path only ("/login"), never a URL
            click     { target, destructive? }
            fill      { target, value: "text" | { secret: "NAME" } }
            select    { target, option }                     native <select> only
            apiRequest{ method, path, body?, expectStatus?, destructive? }   DELETE is always destructive
assertions  expectText    { target, text, match: contains (default) | exact }
            expectVisible { target }     expectHidden { target }
            expectUrl     { path, match: exact (default) | prefix }
            apiRequest with expectStatus
locator   = { by: role, role, name?, exact? } | { by: testId, testId } | { by: label, label, exact? }
            | { by: text, text, exact? }   — each with optional `within: <locator>` (its owning parent)
roles     = button link textbox checkbox radio combobox heading alert status dialog tab menuitem row cell listitem
            region navigation form main listbox option alertdialog
```

The `steps` must contain at least one assertion. Phases matter for the verdict:

| Phase | Runs | A failure there means |
|---|---|---|
| `setup` | first | `INCONCLUSIVE` — the precondition was never established, so the behavior wasn't observed |
| `steps` | after setup | an assertion with a different value → `FAILED` (actual value recorded); an action or locator error → `INCONCLUSIVE` |
| `teardown` | **always**, even after failures | cleanup problems are logged; they don't change the verdict |

Each action and assertion waits on its real signal up to the step timeout (10 s default) — there is no sleep step and
none is needed.

## Field-by-field mapping

| Test case | Spec |
|---|---|
| Preconditions | `setup` — through the app's API (`apiRequest`) where one exists: reset or create the data, make the prior failed attempts, etc. UI setup only when there is no API |
| Steps | `steps` actions, in order; one case step usually becomes several actions (open, fill, fill, click) |
| Each expected result | at least one assertion step with `sourceRefs` set to the case's source(s) that state it |
| Test data | literal values in `fill` / `body`, except credentials → `{ "secret": "NAME" }` |
| Data the case creates | removed in `teardown` (or a reset hook the environment provides) |
| `Verifies:` AC / source IDs | `sourceRefs` on the assertions — only refs the approved revision cites (the API rejects others), or `story:<AC-ID>` |

Step ids name the intent (`open-sign-in`, `generic-message`, `stays-on-sign-in`), not the mechanics (`step3`,
`click2`): they appear in verdict reasons (`ASSERTION_FAILED:generic-message`) and the reproduction write-up.

## Locators

The same rules as `page-builder`, expressed as JSON:

1. **Explore the live page first** (browser tool → accessibility tree; `find` per control). Never write a locator you
   haven't seen resolve; ambiguous locators fail in strict mode and the run ends `INCONCLUSIVE` — the runner never
   guesses.
2. **Priority:** `testId` → `role` + `name` → `label` → `text`. CSS and XPath don't exist in this format.
3. **Scope through the owning parent** with `within`: the form, dialog, region or `main` landmark that owns the
   control. `{ "by": "label", "label": "Email", "within": { "by": "testId", "testId": "login-form" } }`, not a bare
   label lookup that could match a hidden duplicate elsewhere.
4. Use `exact: true` when a name is a prefix of another control's name (`"Save"` vs `"Save draft"`).
5. The worker pins the browser locale (`en-US` by default): write names and texts in the language the app shows in
   that locale.
6. Custom dropdowns (Radix/shadcn listboxes) are `click` on the `combobox`, then `click` on the `option` — `select`
   works only on a native `<select>`.

## Assertions

- **Assert the value the case states**, exactly: `match: "exact"` for messages and labels the requirement quotes;
  `contains` only when the case itself says "contains" or surrounding text is dynamic.
- **URL checks after navigation-causing actions** (`expectUrl` with the path the case names) — they also act as the
  sync point for what follows.
- **Negative results need a sync point**: assert what proves the app processed the action (the error message, the
  unchanged URL) *before* an `expectHidden`. An `expectHidden` straight after a click passes before the app reacts.
- **API checks** are `apiRequest` with `expectStatus`. The format can't assert on response bodies; when the case's
  expected result is about a body, assert its visible effect in the UI or route the case to framework code.
- Never weaken an expectation to make the run pass. A run that `FAILED` against an approved expectation is a finding
  for triage (`manual-qa-agent` → `debug-failed-tests`), not a reason to edit the spec.

## Data, secrets, cleanup, destructive steps

- **Secrets by reference only:** `{ "secret": "DEMO_PASSWORD" }` resolves from `QA_SECRET_DEMO_PASSWORD` on the
  worker, is masked in screenshots, and is redacted from logs. A deliberately wrong credential (`"wrong-password"`)
  may be a literal.
- **Independence:** each run starts from known state — reset or create in `setup`, clean up in `teardown`. If the
  environment holds shared state (one account, a global counter), runs of these cases must not overlap; say so in
  the case.
- **Destructive steps** — irreversible clicks (delete, pay, send, invite) get `"destructive": true`; `DELETE` requests
  always count. The run is then `BLOCKED` until a QA lead approves that exact spec for that environment, and it never
  runs in production. Don't hide a destructive action behind an unflagged click to avoid the gate.
- **Hosts:** paths are relative to the environment's base URL; requests to any host not on its allowlist are aborted
  and recorded. Third-party widgets that need other hosts make the case unfit for this target.

## Cases the format can't express

Record the reason in the case (it becomes the automation backlog) and route the case — `manual-qa-agent`
([routing](../../manual-qa-agent/references/routing.md)) maps each reason to the framework skill that handles it:

| Reason | Example |
|---|---|
| Date-relative values | "due date shows tomorrow" |
| Value carried between steps | create a record, then open it by its new id |
| Two users in sequence | submit as staff, approve as manager |
| Data the environment can't provide | needs a seeded state with no API to create it |
| Time passing | lockout expires after 15 minutes |
| Outside the browser | email, SMS, push, files |
| Computed expectation | total = sum of the lines shown |
| Shared-data mutation without approval and cleanup | money, merges, deletions |
| Human judgement | layout, wording quality |
| Concurrency | two simultaneous requests |

## Worked example

The demo app's sign-in page (a form with test id `login-form`, a status message, a dashboard with a `welcome` test
id) and these cases, written in the `test-case-design` format:

```md
### TC-LOGIN-002 — Unknown email gets the generic sign-in message
Verifies: AC-LOGIN-02 · Priority: P1 · Type: Functional, negative (EP: unknown account) · Layer: UI
Preconditions: No account exists for nobody@example.test
Steps: 1. Sign in as nobody@example.test with any password.
Expected results: 1. Exactly "Invalid email or password" is shown. 2. The user stays on /login.

### TC-LOGIN-004 — The fifth consecutive failure locks the account
Verifies: AC-LOGIN-04 (as clarified: CLAR-LOCKOUT@v1) · Priority: P1 · Type: Functional, BVA (at the limit)
Preconditions: Account qa@example.test has 4 consecutive failed sign-ins
Steps: 1. Sign in as qa@example.test with a wrong password.
Expected results: 1. Exactly "Account locked. Try again in 15 minutes." is shown.
```

TC-LOGIN-002 as the API body for `POST /api/test-cases/<caseId>/executables`:

```json
{
  "spec": {
    "setup": [
      { "id": "fresh-account", "type": "apiRequest", "method": "POST", "path": "/__test__/reset", "expectStatus": 200 }
    ],
    "steps": [
      { "id": "open-sign-in", "type": "navigate", "path": "/login" },
      { "id": "email", "type": "fill",
        "target": { "by": "label", "label": "Email", "within": { "by": "testId", "testId": "login-form" } },
        "value": "nobody@example.test" },
      { "id": "password", "type": "fill",
        "target": { "by": "label", "label": "Password", "within": { "by": "testId", "testId": "login-form" } },
        "value": "wrong-password" },
      { "id": "sign-in", "type": "click",
        "target": { "by": "role", "role": "button", "name": "Sign in", "within": { "by": "testId", "testId": "login-form" } } },
      { "id": "generic-message", "type": "expectText",
        "target": { "by": "role", "role": "status", "within": { "by": "role", "role": "main" } },
        "text": "Invalid email or password", "match": "exact", "sourceRefs": ["AC-LOGIN@v1"] },
      { "id": "stays-on-sign-in", "type": "expectUrl", "path": "/login", "sourceRefs": ["AC-LOGIN@v1"] }
    ],
    "teardown": [
      { "id": "reset-account", "type": "apiRequest", "method": "POST", "path": "/__test__/reset", "expectStatus": 200 }
    ]
  }
}
```

TC-LOGIN-004 differs in two places. The precondition "4 consecutive failed sign-ins" goes into `setup` through the
API, so a problem there reads as `INCONCLUSIVE` rather than as a failed lockout:

```jsonc
"setup": [
  { "id": "fresh-account", "type": "apiRequest", "method": "POST", "path": "/__test__/reset", "expectStatus": 200 },
  { "id": "failed-attempt-1", "type": "apiRequest", "method": "POST", "path": "/api/login",
    "body": { "email": "qa@example.test", "password": "wrong-password" }, "expectStatus": 401 }
  // … failed-attempt-2 to failed-attempt-4
]
```

and its assertion cites the clarification the product owner published, which the approved case cites:

```json
{ "id": "locked-message", "type": "expectText",
  "target": { "by": "role", "role": "status", "within": { "by": "role", "role": "main" } },
  "text": "Account locked. Try again in 15 minutes.", "match": "exact", "sourceRefs": ["CLAR-LOCKOUT@v1"] }
```

The boundary below the limit (TC-LOGIN-005: four failures, then the valid password reaches the dashboard) is the same
`setup` with TC-LOGIN-001's steps. "The lock expires after 15 minutes" can't be expressed (time passing) and is routed
to framework code with a controllable clock.

## Check before proposing

Run the bundled checker from the agent checkout. It validates with the agent's own schema, so it can't drift from
what the API accepts, then adds review checks the schema can't express:

```bash
pnpm --dir <agent-repo> exec tsx <manual-qa-agent-skill-dir>/scripts/check-spec.mjs tc-login-002.json --refs AC-LOGIN@v1
```

| Level | Finding |
|---|---|
| error | schema violation (with the field path); `sourceRefs` the approved case doesn't cite (`--refs`); a literal value in a credential field or body key |
| warn | unscoped locator; irreversible-looking click or path not flagged destructive; data created without teardown; spec ends on an action; `expectHidden` straight after an action; assertion without `sourceRefs` |
| info | destructive steps (run will be `BLOCKED` for approval); secrets the worker needs; setup failures read as `INCONCLUSIVE` |

Then, before proposing, review against this list:

```text
[ ] Implements the latest APPROVED revision; every expected result has an assertion citing its source
[ ] Every locator seen resolving in the live app, scoped through its owner
[ ] Preconditions in setup through the API; created data cleaned in teardown
[ ] Credentials as { "secret": … }; destructive actions flagged
[ ] check-spec.mjs: 0 errors; each warning fixed or explained to the reviewer
```
