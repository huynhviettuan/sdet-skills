# Executable Specs for the Manual QA Agent

The third output target: instead of framework code, an **ExecutableSpec** — the constrained JSON step format the
Manual QA Agent runs in its own browser worker (its ADR-0008, extended by ADR-0015, 0021, 0022, 0024 and 0025). Use
it when the team runs regression through the agent (approved cases, second-person approval, deterministic verdicts,
stored evidence). Proposing it, getting it approved, and running it go through the `manual-qa-agent` skill.

The sample cases below were drafted, approved, proposed, approved by a second person and run against the agent's demo
app — all `PASSED`; with the demo's planted bug switched on, TC-LOGIN-002 ended `FAILED` with the actual text recorded
and was triaged. The step kinds added since (values, capture, sessions, rows, waits, uploads, hooks) are described from
the agent's schema, `packages/domain/src/executable.ts`, and its ADRs.

Contents:

- [When this target fits](#when-this-target-fits)
- [What you implement](#what-you-implement)
- [The step format](#the-step-format)
- [Validation the schema enforces](#validation-the-schema-enforces)
- [Field-by-field mapping](#field-by-field-mapping)
- [Locators](#locators)
- [Assertions](#assertions)
- [Run-scoped values and data rows](#run-scoped-values-and-data-rows)
- [API sessions and JSON checks](#api-sessions-and-json-checks)
- [Waits, keys, files, hooks](#waits-keys-files-hooks)
- [Data, secrets, cleanup, destructive and exclusive](#data-secrets-cleanup-destructive-and-exclusive)
- [Cases the format can't express](#cases-the-format-cant-express)
- [Worked example](#worked-example)
- [Letting the agent propose the steps](#letting-the-agent-propose-the-steps)
- [Check before proposing](#check-before-proposing)

---

## When this target fits

| Use an ExecutableSpec | Use framework code instead |
|---|---|
| The case is approved in the agent and the team wants its verdict, evidence and audit trail there | The team runs automation in a framework repo (`init-*-framework`) |
| Steps are navigate / fill / click / select / press / upload plus text, visibility, URL, HTTP-status and JSON checks | The case needs anything in [Cases the format can't express](#cases-the-format-cant-express) |
| One browser session plus any number of named API sessions; dates relative to the run; values captured from the page or a response; a data table as `rows` | Computed expectations (sums, arithmetic), several *browser* users at once, concurrency, email or SMS |

The same test case can have both; they don't conflict. The agent's run is the governed regression record, the
framework test is the developer-facing check.

## What you implement

**The approved case revision in the agent is the spec** — read it with `GET /api/test-cases/<caseId>` and take the
latest revision with `status: "APPROVED"`: its `steps[]` (`action`, `expected`, `sourceRefs`, `testData`, `evidence`),
`preconditions`, `testData`, and its top-level `sourceRefs`. A revision also lists `requirementRefs` (what it
verifies), `techniques` and `testConditions` (agent ADR-0014), and its `level` (`api`, `ui` or `manual` with a
`manualReason`, ADR-0018): an `api` case is implemented with `session` + `apiRequest` steps, a `ui` case in the
browser, a `manual` case is not implemented at all until its reason is gone. One assertion per condition;
`story:<AC id>` refs from `requirementRefs` are valid step `sourceRefs`. The `test-case-design` document
(`docs/test-cases/<feature>.md`) supplies detail the agent's case may leave out (exact data, partitions); if the two
disagree, stop and report it — the approved revision is what the run will be judged against.

One executable implements one case. A case whose test data is a table (a permission matrix, a boundary table) is one
spec with `rows` (ADR-0024): the whole spec runs once per row and the report shows one verdict per row — no looping
inside the steps, and no splitting into one case per row unless the QA engineer wants separate cases.

## The step format

From the agent's `packages/domain/src/executable.ts` (validated with zod; unknown step types and fields are rejected):

```text
spec      = { setup?: Step[≤50], steps: Step[1..200], teardown?: Step[≤50],
              values?: { name: { date: { offsetDays, format, timeZone? } } },      ADR-0015
              rows?: [{ column: "text" }][≤200],                                   ADR-0024
              exclusive?: boolean (default false) }                                ADR-0021
step ids  = unique across the spec, /^[a-z0-9][a-z0-9_-]{0,63}$/
every step: id, type, sourceRefs?: string[]
input     = "text" (≤2000) | { secret: "NAME" } | { var: "name" } | { totp: "NAME" }     secrets/TOTP names UPPERCASE,
                                                                                        value names lowercase
path      = relative path starting with "/" (≤500, no whitespace); may hold {{name}} placeholders

browser     navigate  { path }
            click     { target, destructive? }
            fill      { target, value: input }
            select    { target, option }                       native <select> only
            press     { key, target? }                          "Enter", "Escape", "Control+a"; focused element if no target
            upload    { target, file: { name, contentType, dataBase64 ≤1.4M chars (≈1 MB) } }   file travels with the spec
            expectDownload { trigger, nameMatches? }            clicks trigger; the file is kept as evidence
http        apiRequest{ method, path, body? | rawBody?: { contentType, text ≤20000 }, headers?, session?,
                        expectStatus?, expectJson?: JsonCheck[≤50], destructive? }    DELETE is always destructive
            session   { name, method, path, body?, headers?, token?: { path, header = "Authorization", prefix = "Bearer " } }
            testHook  { method, path, body? }                   only under the environment's listed hook prefixes; not an assertion
values      capture   { as, from: { kind: text, target } | { kind: url } | { kind: response, step, path }, pattern? }
            waitFor   { timeoutMs 1000..120000 = 30000, intervalMs 250..10000 = 1000,
                        until: { kind: text, target, text } | { kind: request, method, path, session?, expectStatus?, expectJson?[≤20] } }
assertions  expectText    { target, text, match: contains (default) | exact }      text may hold {{name}}
            expectVisible { target }     expectHidden { target }
            expectUrl     { path, match: exact (default) | prefix }
            apiRequest with expectStatus and/or expectJson
JsonCheck = { path: "data.items[0].id", equals?: input | matches?: regex | exists?: boolean }   at least one of the three
locator   = { by: role, role, name?, exact? } | { by: testId, testId } | { by: label, label, exact? }
            | { by: text, text, exact? }   — each with optional `within: <locator>` (its owning parent)
roles     = button link textbox checkbox radio combobox heading alert status dialog tab menuitem row cell listitem
            region navigation form main listbox option alertdialog
            grid gridcell columnheader rowheader table menu menubar menuitemcheckbox menuitemradio tabpanel switch  (ADR-0022)
headers   = origin referer accept accept-language idempotency-key x-requested-with user-agent   (ADR-0025; never
            Authorization, Cookie or Host)
```

The `steps` must contain at least one assertion (`expect*`, or an `apiRequest` with `expectStatus` or `expectJson`).
Phases matter for the verdict:

| Phase | Runs | A failure there means |
|---|---|---|
| `setup` | first | `INCONCLUSIVE` — the precondition was never established, so the behavior wasn't observed |
| `steps` | after setup | an assertion with a different value → `FAILED` (actual value recorded); an action, locator, capture or sign-in error → `INCONCLUSIVE`; a `waitFor` that runs out → `BLOCKED` (`WAIT_TIMEOUT:<step>`, ADR-0024) |
| `teardown` | **always**, even after failures | cleanup problems are logged (`cleanupFailed`); they don't change the verdict |

With `rows`, all three phases run once per row; each assertion in the report carries its `row`, and the first problem
decides the run's verdict (ADR-0024). Each action and assertion waits on its real signal up to the step timeout (10 s
default) — there is no sleep step; `waitFor` is the only wait, and it is bounded.

## Validation the schema enforces

The API (`400 VALIDATION`), the MCP `check_executable` tool and `check-spec.mjs` all run the same zod schema, so a spec
that passes locally is accepted. Beyond field shapes it rejects (ADR-0015, 0024, 0025):

- a step that reads a value (`{ var }` or `{{name}}`) that is neither in `values`, nor a `rows` column, nor captured
  by an **earlier** step (order: setup, then steps, then teardown);
- a `capture` whose `as` is a declared value (shadowing), or whose `pattern` has no or more than one capturing group;
- a placeholder that would break the relative-path rule (`{{x}}` is checked as if filled; the filled path is checked
  again at run time, so a captured value can never redirect the run off the target host);
- `apiRequest.session` or `waitFor.until.session` naming a session no earlier `session` step opened;
- `capture.from.kind: "response"` naming a step that is not an earlier `apiRequest` or `session`;
- `rows` whose columns differ between rows, or a column that is also a declared value;
- `apiRequest` with both `body` and `rawBody`; a header outside the allowlist;
- duplicate step ids; no assertion in `steps`.

## Field-by-field mapping

| Test case | Spec |
|---|---|
| Preconditions | `setup` — through the app's API (`apiRequest`, or `session` then `apiRequest` as the right role) where one exists; `testHook` for the product's own reset/seed endpoints the administrator listed. UI setup only when there is no API |
| Steps | `steps` actions, in order; one case step usually becomes several actions (open, fill, fill, click) |
| Each expected result | at least one assertion step with `sourceRefs` set to the case's source(s) that state it |
| Test data (per step `testData`) | literal values in `fill` / `body`; dates as `values` (`{ "date": { "offsetDays": 30, "format": "dd/MM/yyyy" } }`); a table as `rows`; credentials → `{ "secret": "NAME" }`; a one-time code → `{ "totp": "NAME" }` |
| A value the case carries forward ("open the new record") | `capture` (from text, URL or a response), then `{ var }` / `{{name}}` |
| Data the case creates | removed in `teardown` (or a reset hook the environment provides) |
| `Verifies:` AC / source IDs | `sourceRefs` on the assertions — only refs the approved revision cites (the API rejects others), or `story:<AC-ID>` |
| `Exclusive: yes` | `"exclusive": true` (ADR-0021) |
| `Known bug` | not in the spec: a QA engineer binds it to step ids with `POST /api/test-cases/:id/known-bug` (ADR-0023), so name the assertion steps the bug breaks in your proposal note |

Step ids name the intent (`open-sign-in`, `generic-message`, `stays-on-sign-in`), not the mechanics (`step3`,
`click2`): they appear in verdict reasons (`ASSERTION_FAILED:generic-message`), in the reproduction write-up, and are
what a known bug is bound to.

## Locators

The same rules as `page-builder`, expressed as JSON:

1. **Explore the live page first** (browser tool → accessibility tree; `find` per control). Never write a locator you
   haven't seen resolve; ambiguous locators fail in strict mode and the run ends `INCONCLUSIVE` — the runner never
   guesses.
2. **Priority:** `testId` → `role` + `name` → `label` → `text`. CSS and XPath don't exist in this format.
3. **Scope through the owning parent** with `within`: the form, dialog, region or `main` landmark that owns the
   control. `{ "by": "label", "label": "Email", "within": { "by": "testId", "testId": "login-form" } }`, not a bare
   label lookup that could match a hidden duplicate elsewhere. In a calendar or data grid, scope a `gridcell` or
   `button` through its `row` / `rowheader`: a booking button looked up in the whole `grid` matches every slot and the
   run is `INCONCLUSIVE` (ADR-0022).
4. Use `exact: true` when a name is a prefix of another control's name (`"Save"` vs `"Save draft"`).
5. The worker pins the browser locale (`en-US` by default): write names and texts in the language the app shows in
   that locale.
6. Custom dropdowns (Radix/shadcn listboxes) are `click` on the `combobox`, then `click` on the `option` — `select`
   works only on a native `<select>`. Row action menus are `click` on the `button` within the `row`, then `click` on
   the `menuitem` within the `menu`.

## Assertions

- **Assert the value the case states**, exactly: `match: "exact"` for messages and labels the requirement quotes;
  `contains` only when the case itself says "contains" or surrounding text is dynamic.
- **URL checks after navigation-causing actions** (`expectUrl` with the path the case names) — they also act as the
  sync point for what follows.
- **Negative results need a sync point**: assert what proves the app processed the action (the error message, the
  unchanged URL) *before* an `expectHidden`. An `expectHidden` straight after a click passes before the app reacts.
- **API checks** are `apiRequest` with `expectStatus` **and** `expectJson` (ADR-0024): a status alone proves little.
  Each JSON check is its own assertion with expected and actual values in the report; `equals` against a
  `{ secret }` shows only the secret's name in evidence.
- **Weak assertions are flagged at proposal** (ADR-0023, `weakAssertions`): a `contains` on fewer than 8 characters,
  an API step that checks only its status when the spec has no `expect*` step, and actions after the last assertion
  all land in the executable's `reviewFlags` for its reviewer. They are flags, not rejections — fix them or explain
  them in the proposal note.
- Never weaken an expectation to make the run pass. A run that `FAILED` against an approved expectation is a finding
  for triage (`manual-qa-agent` → `debug-failed-tests`), not a reason to edit the spec.

## Run-scoped values and data rows

ADR-0015 and ADR-0024. A run has a value table, filled from three sources and read by steps; nothing else writes to it.

```json
"values": {
  "end_date": { "date": { "offsetDays": 180, "format": "dd/MM/yyyy", "timeZone": "Asia/Ho_Chi_Minh" } }
},
"rows": [
  { "role": "staff",   "status": "403" },
  { "role": "manager", "status": "200" }
]
```

- **Declared values** (`values`): derived once, when the run starts, from a single clock reading, so every step sees
  the same date. The only kind is a date: `offsetDays` (whole days, ±3660), `format` from `yyyy-MM-dd`, `dd/MM/yyyy`,
  `MM/dd/yyyy`, `d/M/yyyy`, optional IANA `timeZone` (default UTC). Days are added to the calendar date in that zone,
  so a DST change never moves the day.
- **Row columns** (`rows`): each row's columns become values for that row's pass; every row must have the same
  columns and none may shadow a declared value.
- **Captured values** (`capture`): the text of a strict locator, the current URL, or a JSON `path` of an earlier
  `apiRequest` / `session` response, optionally through a regex with exactly one capturing group. A pattern that
  does not match is a step error (`INCONCLUSIVE`), never a failure; the captured value is recorded in the step log.
- **Reading values**: `{ "var": "name" }` wherever an input is accepted (`fill`, bodies, headers, `expectJson.equals`),
  and `{{name}}` in `navigate` / `expectUrl` / `apiRequest` / `session` / `testHook` / `waitFor` paths, `rawBody.text`,
  `expectText.text` and `waitFor.until.text`.
- Names are lowercase (`[a-z][a-z0-9_]{0,63}`), distinct from secret names (uppercase). Values are **not** secrets:
  they appear in logs and evidence like any page text.
- Not available, by choice (ADR-0015): arithmetic on values and times of day. A computed expectation stays a reason
  to route the case to framework code.

```json
{ "id": "new-id", "type": "capture", "as": "contract_id", "from": { "kind": "url" }, "pattern": "/contracts/([0-9]+)$" },
{ "id": "open-contract", "type": "navigate", "path": "/contracts/{{contract_id}}" },
{ "id": "ends-in-180-days", "type": "expectText",
  "target": { "by": "testId", "testId": "end-date" }, "text": "{{end_date}}", "match": "exact",
  "sourceRefs": ["BR-CONTRACT@v2"] }
```

## API sessions and JSON checks

ADR-0024. An `api`-level case runs entirely through `session` and `apiRequest` steps, with no browser step:

```json
"setup": [
  { "id": "as-manager", "type": "session", "name": "manager", "method": "POST", "path": "/api/login",
    "body": { "email": "manager@example.test", "password": { "secret": "MANAGER_PASSWORD" } },
    "token": { "path": "accessToken" } }
],
"steps": [
  { "id": "approve", "type": "apiRequest", "session": "manager", "method": "POST",
    "path": "/api/contracts/{{contract_id}}/approve", "expectStatus": 200,
    "expectJson": [ { "path": "state", "equals": "APPROVED" }, { "path": "approvedBy", "exists": true } ],
    "sourceRefs": ["BR-CONTRACT-005@v1"] }
]
```

- A `session` is a named cookie jar signed in by one request to the product's own sign-in endpoint, credentials as
  secrets; `token` reads a bearer token from the response and sends it as `<prefix><token>` in `header` on that
  session's later requests. A failed sign-in (non-2xx) is a step error (`INCONCLUSIVE`), never a pass.
- Several roles in one case ("submit as staff, approve as manager") are several `session` steps — at the API level.
  The browser is still one signed-in user.
- `headers` on `apiRequest` and `session` are limited to the allowlist above (what security and locale cases need);
  `rawBody` sends bytes as given with its `contentType`, for malformed-input cases (ADR-0025).
- `{ "totp": "NAME" }` becomes an RFC 6238 code (30 s, 6 digits) at send time from the base32 secret
  `QA_SECRET_NAME`; the step log shows `[totp:NAME]` (ADR-0025).

## Waits, keys, files, hooks

- **`waitFor`** (ADR-0024) polls until a text appears in a strict locator, or until a request answers with the given
  status and JSON values, at `intervalMs` up to `timeoutMs` (≤ 120 s). Use it for a background job, a reminder, a
  status that flips after processing. Running out makes the run **`BLOCKED`** with `WAIT_TIMEOUT:<step>`: the signal
  never came and nothing was proved either way. It is never a fixed sleep and never a pass.
- **`press`** sends a keyboard key (`Enter`, `Escape`, `Control+a`) to a target or the focused element.
- **`upload`** sets a file on a file input; the file travels inside the spec as base64 (about 1 MB), never from the
  worker's disk. **`expectDownload`** clicks `trigger`, expects a download (optionally `nameMatches`) and keeps the
  file as evidence; the format does not read its contents.
- **`testHook`** (ADR-0025) calls one of the product's own test endpoints — a disposable account, a throttle reset, a
  job run, a clock set, if the product offers one — and only on path prefixes the environment's administrator listed
  (`pnpm qa env … --test-hooks /__test__/reset,…`); any other path is a step error, and policy keeps hooks out of
  production. A non-2xx answer is a step error. It is not an assertion. Ask the operator which hooks an environment
  lists before writing one; a hook the environment does not list makes the run `INCONCLUSIVE`.

## Data, secrets, cleanup, destructive and exclusive

- **Secrets by reference only:** `{ "secret": "DEMO_PASSWORD" }` resolves from `QA_SECRET_DEMO_PASSWORD` on the
  worker, is masked in screenshots, and is redacted from logs. A deliberately wrong credential (`"wrong-password"`)
  may be a literal. Secret names are `[A-Z][A-Z0-9_]{1,63}`.
- **Independence:** each run starts from known state — reset or create in `setup`, clean up in `teardown`. If the
  case changes global settings or needs a machine-wide throttle to itself, set `"exclusive": true` (ADR-0021): the
  worker never runs it beside another run of the same environment, nor any run beside it. Otherwise keep shared state
  out of the case.
- **Destructive steps** — irreversible clicks (delete, pay, send, invite) get `"destructive": true`; `DELETE` requests
  always count. The run is then `BLOCKED` until a QA lead approves that exact spec for that environment, and it never
  runs in production. Don't hide a destructive action behind an unflagged click or a `testHook` to avoid the gate.
- **Hosts:** paths are relative to the environment's base URL; requests to any host not on its allowlist are aborted
  and recorded (`blockedRequests` on the run). Third-party widgets that need other hosts make the case unfit for
  this target.

## Cases the format can't express

Record the reason in the case's `manualReason` (it becomes the automation backlog) and route the case —
`manual-qa-agent` ([routing](../../manual-qa-agent/references/routing.md)) maps each reason to the framework skill
that handles it. Several reasons from earlier versions of this page are now expressible; check the second column
before calling a case manual:

| Reason | Now expressible? | Example |
|---|---|---|
| Date-relative values | **yes** — `values` (ADR-0015) | "end date shows today + 180 days" |
| Value carried between steps | **yes** — `capture` (ADR-0015, 0024) | create a record, then open it by its new id |
| Two users in sequence | **at the API level** — two `session` steps (ADR-0024); still no in the browser | submit as staff, approve as manager |
| Response-body assertions | **yes** — `expectJson` (ADR-0024) | `state` equals `APPROVED` |
| Data table | **yes** — `rows` (ADR-0024) | a permission matrix, a boundary table |
| Second factor, malformed input, locale header | **yes** — `totp`, `rawBody`, `headers` (ADR-0025) | TOTP sign-in, truncated JSON, `Accept-Language` |
| Time passing, background job | **only when the product offers a hook or the wait is ≤ 120 s** — `testHook`, `waitFor` | a reminder sent by a job the hook can run; a 12-hour idle timeout stays manual or framework |
| Data the environment can't provide | **only with a listed hook** — `testHook` | a seeded state the API can't create |
| Files | **partly** — `upload`, `expectDownload` (name only, kept as evidence) | import a CSV; export produces a file |
| Outside the browser: email, SMS, push | no | activation mail |
| Computed expectation | no (ADR-0015 excludes arithmetic) | total = sum of the lines shown |
| Two browser users at once, concurrency | no | two simultaneous bookings |
| Shared-data mutation without approval and cleanup | gated as destructive, not forbidden | money, merges, deletions |
| Human judgement | no | layout, wording quality |

## Worked example

The demo app's sign-in page (a form with test id `login-form`, a status message, a dashboard with a `welcome` test
id) and these cases, written in the `test-case-design` format:

```md
### TC-LOGIN-002 — Unknown email gets the generic sign-in message
Verifies: AC-LOGIN-02 · Basis: specified · Priority: P1 · Technique: EP (unknown account) · Level: ui
Preconditions: No account exists for nobody@example.test
Steps: 1. Sign in as nobody@example.test with any password.
Expected results: 1. Exactly "Invalid email or password" is shown.
                     Evidence: "the same message, Invalid email or password, for an unknown email and a wrong password" — AC-LOGIN
                  2. The user stays on /login.

### TC-LOGIN-004 — The fifth consecutive failure locks the account
Verifies: AC-LOGIN-04 (as clarified: CLAR-LOCKOUT@v1) · Basis: specified · Priority: P1 · Technique: BVA (at the limit) · Level: ui
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
`setup` with TC-LOGIN-001's steps. "The lock expires after 15 minutes" is routed to framework code with a controllable
clock, unless the environment lists a hook that advances the lockout (`testHook`).

## Letting the agent propose the steps

Since ADR-0024 the agent can write the first draft of a spec itself: `POST /api/test-cases/:id/executables/propose`
(`{ "hints"?: string[≤20, each ≤500] }`), or the MCP tool `propose_steps`. The server-side generator (prompt `exec-v1`)
reads the approved `api`/`ui` case and its own sources, runs the same `checkExecutable`, and either proposes the spec
(`201`, `{ proposed: true, executableId, version, reviewFlags, decisionRecordId }`) or answers that it cannot (`200`,
`{ proposed: false, failure, detail }`; a model's `{ cannot }` is recorded as `REFUSED`). The proposal needs a
different person's approval like any other, and the `reviewFlags` are the weak-assertion flags above. With the
keyless stand-in or in session mode (ADR-0026) the proposal is a stand-in's or a session's answer — see
`manual-qa-agent` → `api-workflow.md`.

Use it as a starting point, not a verdict. The proposal result carries the executable's id, version and flags but
not the spec, and no HTTP route reads an executable back (checked at agent HEAD bb54fe0), so the reviewer sees the
spec in the proposal's decision record or the database, not through the API. Explore the live page to confirm the
case can be driven as proposed, and if the result's `reviewFlags` or your exploration show a problem, write the
corrected spec and propose it yourself — the agent's proposal stays `PROPOSED` until a person rejects it. `hints` are
for facts the case does not state (the sign-in path, a test id, a hook the environment lists), never for an
expected result.

## Check before proposing

Run the bundled checker from the agent checkout. It validates with the agent's own schema, so it can't drift from
what the API accepts, then adds review checks the schema can't express:

```bash
pnpm --dir <agent-repo> exec tsx <manual-qa-agent-skill-dir>/scripts/check-spec.mjs tc-login-002.json --refs AC-LOGIN@v1
```

| Level | Finding |
|---|---|
| error | schema violation (with the field path — undefined values, sessions used before opened, bad capture patterns, rows with different columns, headers outside the allowlist); `sourceRefs` the approved case doesn't cite (`--refs`); a literal value in a credential field, body key or header |
| warn | unscoped locator; irreversible-looking click or path not flagged destructive; data created without teardown; spec ends on an action; `expectHidden` straight after an action; assertion without `sourceRefs`; the agent's own weak-assertion flags (short `contains`, status-only API check, actions after the last assertion); a `waitFor` at the 120 s ceiling |
| info | destructive steps (run will be `BLOCKED` for approval); secrets and TOTP secrets the worker needs; `testHook` paths the environment must list; declared values, rows (one verdict per row) and `exclusive`; setup failures read as `INCONCLUSIVE`; `waitFor` timeouts read as `BLOCKED` |

Then, before proposing, review against this list:

```text
[ ] Implements the latest APPROVED revision at its level (api → sessions + requests; ui → browser); every expected
    result has an assertion citing its source
[ ] Every locator seen resolving in the live app, scoped through its owner
[ ] Preconditions in setup through the API, a session or a listed hook; created data cleaned in teardown
[ ] Credentials as { "secret": … } / { "totp": … }; destructive actions flagged; exclusive set when the case says so
[ ] Dates as values, carried ids as capture, tables as rows — no literal date, no copy per row
[ ] API checks have expectJson, not only a status; no contains on a fragment under 8 characters
[ ] check-spec.mjs: 0 errors; each warning fixed or explained to the reviewer
```
