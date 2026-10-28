# API Workflow

The calls Claude makes, what comes back, and what each result means. Shapes are from the agent's API (Fastify + zod,
JSON) at ADR-0026; the login cases were exercised end to end against its demo app, the later shapes are read from
`apps/api/src/app.ts`, `packages/domain/src` and the ADRs cited inline. The agent's own README and
`docs/07-data-contracts.md` are the source of truth when they differ from this page.

Contents:

- [Connection](#connection)
- [Which model answers](#which-model-answers)
- [Calls Claude makes](#calls-claude-makes)
- [Calls that belong to people](#calls-that-belong-to-people)
- [Story outcomes](#story-outcomes)
- [Case revisions](#case-revisions)
- [Case format mapping](#case-format-mapping)
- [Proposing an executable](#proposing-an-executable)
- [Runs: statuses and reasons](#runs-statuses-and-reasons)
- [Triage and reproduction](#triage-and-reproduction)
- [Suites and suite reports](#suites-and-suite-reports)
- [Known bugs, stale cases, regression scope](#known-bugs-stale-cases-regression-scope)
- [Manual execution records](#manual-execution-records)
- [Coverage, exports, questions](#coverage-exports-questions)
- [Errors](#errors)

---

## Connection

```bash
export API=http://127.0.0.1:3000          # from the user
export QA_KEY=...                          # from the user; never written to a file or echoed
curl -s $API/healthz                       # {"ok":true}
```

Send the key as `x-api-key: $QA_KEY` (or `Authorization: Bearer`). Roles come from the server-side key lookup only.
Write-type calls accept an `idempotency-key` header (≤ 200 chars); send one derived from the work item
(`story:TC-LOGIN-002`, `run:<caseId>:<date>`) so a retried call doesn't duplicate work.

On Windows PowerShell 5.1 use `curl.exe` (plain `curl` is a different command) or Git Bash.

## Which model answers

`QA_LLM_PROVIDER` on the API and worker picks one of three (agent ADR-0026); ask the operator which, because it
changes what you should expect from drafts and proposals:

| Mode | Setting | What answers readiness, drafts, executable proposals, triage |
|---|---|---|
| API key | `QA_LLM_PROVIDER=anthropic` (default) or `openai`, `QA_LIVE_LLM=1`, the provider's key | the provider's model, unattended, billed per call |
| Session exchange | `QA_LLM_PROVIDER=session`, `QA_SESSION_EXCHANGE_DIR` (default `./.session-exchange`) | Claude in an interactive Claude Code session: each call writes `<kind>-<hash>.request.json`; a person has Claude read it and write `<kind>-<hash>.answer.json`; the workflow is rerun (same idempotency key) or `pnpm qa session replay` resubmits every story that stopped (ADR-0020, 0026) |
| Mock | the default without `QA_LIVE_LLM` | a deterministic keyless stand-in: one case per acceptance criterion, `specification_based` / `positive` only, quotes the measurable line it took the expectation from; no network |

In session mode a story submitted while nobody answers routes to review with `GENERATOR_UNAVAILABLE` /
`CLASSIFIER_UNAVAILABLE`; `pnpm qa session` lists the requests waiting, with kind and subject. If **you** are the
Claude in that session, the request file holds the exact prompt a model would get; answer it as the drafting model
would, in the request's schema — every answer still passes the same grounding, coverage and observability checks as
a key-based call, and the audit says `provider: claude-code-session`. Reports of such drafts must say "drafted in an
interactive session": it is a best case, not a measurement of the unattended agent (ADR-0020).

## Calls Claude makes

With the agent tool server (`pnpm -s mcp`, agent ADR-0011) each row has a tool: `whoami` (`GET /api/me`),
`get_test_case`, `check_executable` (local schema + approved-revision + traceability check), `propose_executable`
(runs that check first), `propose_steps` (asks the server-side generator, ADR-0024/0025), `request_run`, `get_run`
(`waitSeconds` ≤ 120 polls for you), `get_triage`, `get_reproduction`. Story submission, suites, coverage, regression
scope and exports have no tool; over HTTP the `AI_AGENT` key may read coverage, regression and exports, but not
`GET /api/questions`. Story submission stays with people by decision (agent ADR-0012). Over HTTP (`pnpm -s mcp --http`,
ADR-0013) the same tools are served at `POST /mcp`, with the caller's key on every request.

| Purpose | Call | Body | Success |
|---|---|---|---|
| Who the key belongs to | `GET /api/me` | — | `{ actorId, tenantId, projectId, roles }` |
| Submit a story (people only with an `AI_AGENT` key) | `POST /api/stories` | `{ externalId, title, description?, acceptanceCriteria: [{ id, text }], targetRelease?, environmentId? }` | `201` (`200` if deduplicated) |
| Re-draft a stored story (people only, as above) | `POST /api/test-cases/draft` | `{ storyId, environmentId? }` | `201` / `200` |
| List the project's cases | `GET /api/test-cases?status=` | — | `{ items: [{ caseId, code, story, revision, status, knownBug, title, priority, module, level, techniques, reviewFlags (count), missingRequirements (count) }] }` |
| Read a case | `GET /api/test-cases/:caseId` | — | `{ caseId, code, storyId, knownBug, knownBugSteps, revisions[] }` |
| Propose an executable you wrote | `POST /api/test-cases/:caseId/executables` | `{ spec }` | `201` executable row with `reviewFlags` |
| Ask the agent to propose one | `POST /api/test-cases/:caseId/executables/propose` | `{ hints?: string[≤20 × ≤500] }` | `201 { proposed: true, executableId, version, reviewFlags, decisionRecordId }` or `200 { proposed: false, failure, detail, decisionRecordId }` |
| Request a run | `POST /api/test-runs` | `{ caseId, environmentId, approvalId? }` | `202` queued, `200` when it ended at policy (e.g. `BLOCKED`) |
| Read a run | `GET /api/test-runs/:runId` | — | run report |
| Read triage | `GET /api/test-runs/:runId/triage` | — | latest triage (`404` until it exists) |
| Read reproduction | `GET /api/test-runs/:runId/reproduction` | — | markdown |
| Coverage and stale cases | `GET /api/coverage` | — | see [Coverage](#coverage-exports-questions) |
| Regression scope of a requirement | `GET /api/regression?ref=` | — | `{ ref, cited[], p0[], guarding[], caseIds[] }` |
| Exports | `GET /api/export/test-cases.csv?suiteId=`, `GET /api/export/traceability.csv`, `GET /api/export/test-design.md` | — | CSV (20 columns, CRLF, UTF-8 with BOM) / markdown |
| Suites (QA roles; not `AI_AGENT`) | `POST /api/suites`, `POST /api/suites/:id/cases`, `POST /api/suites/:id/runs`, `GET /api/suites/:id/runs`, `GET /api/suite-runs/:id` | see [Suites](#suites-and-suite-reports) | |

## Calls that belong to people

Never make these, whatever the key allows — report that they are waiting, for whom, and with which id:

| Call | Who |
|---|---|
| `POST /api/test-cases/:id/review` (`APPROVE` / `REJECT` / `EDIT`) — the EDIT also sets `module`, `level`, `manualReason`, `smoke`, `openQuestions`, `refs`, `evidence` quotes (ADR-0018, 0019) | QA engineer |
| `POST /api/executables/:id/review` | a person other than the proposer |
| `POST /api/reviews/:id/resolve` (clarifications, source conflicts, action approvals, security triage, `KNOWN_BUG_RETEST`) | product owner / QA lead / QA engineer by review kind |
| `POST /api/test-cases/:id/known-bug` (`{ bugRef | null, steps? }`) — binds a defect to step ids or manual step numbers (ADR-0021, 0023) | QA engineer, lead or admin; refused to `AI_AGENT` |
| `POST /api/manual-runs`, `POST /api/manual-runs/:id/evidence` — recording what a tester observed (ADR-0017) | the tester; refused to `AI_AGENT` |
| `POST /api/reviews/:id/observation` (`{ currentBehaviour }`) — the product's current behaviour on an open question, stored as observed, never as a requirement (ADR-0018) | QA engineer |
| `POST /api/test-cases/import` (`{ csv, label, approve? }`, 4 MB) — a team's catalogue in the 20 export columns (ADR-0022); `approve: true` needs a QA lead or admin (ADR-0023) | QA roles; refused to `AI_AGENT` |
| `POST /api/test-runs/:id/bugs`, `POST /api/bugs/:id/publish`, `/revert` | QA engineer drafts, QA lead approves, a person publishes |
| `POST /api/knowledge/ingestions`, `/revocations`; `pnpm qa env … --test-hooks / --preflight-case / --sentinel-case` | product owner (source owner); administrator |
| `GET /api/reviews` (queue), `GET /api/reviews/:id`, `GET /api/questions`, `GET /api/evidence/:id` (screenshots) | people; the AI agent role is refused all four |

## Story outcomes

`POST /api/stories` returns `{ workflowId, correlationId, storyId, storyVersion, deduplicated, outcome }`. A story is
drafted as a **set** of cases, one per distinct test condition, 1..12 (agent ADR-0016):

| `outcome.route` | Fields | Claude reports |
|---|---|---|
| `DRAFT_CREATED` | `caseIds`, `cases: [{ caseId, title }]`, `caseId` (the first, for callers that handle one), `revision` (1), `sourceRefs` (union), `missingRequirements` (the cases' own plus the set's `coverageGaps`), `designNotes` | every case id with its title and code, the design notes, the sources cited, and each missing requirement (a question for the owner or a story to split) |
| `REVIEW_REQUESTED` | `kind`, `reason`, `question`, `reviewId`, `sourceRefs`; since ADR-0024 also `drafted: { caseIds, cases, clauses }` or `draftPending: <reason>` | the question **verbatim**, its sources and `reviewId`, who answers it (`routing.md`), **and** the cases drafted meanwhile from the criterion's clear clauses |

Common `reason` values: `UNSUPPORTED_ACCEPTANCE_CRITERIA` (the AC isn't measurable — e.g. "multiple failed
logins"), `SOURCE_CONTRADICTION` (two approved sources disagree; `kind: SOURCE_CONFLICT`), `NO_TRUSTED_SOURCES`,
`LOW_CONFIDENCE`, `UNGROUNDED_CLASSIFICATION`; and `kind: PROVIDER_FAILURE` with reason `GENERATOR_<failure>`
(`MALFORMED`, `UNGROUNDED`, `UNAVAILABLE`) or `CLASSIFIER_UNAVAILABLE` when the model could not answer — in session
mode, until the answer file exists (ADR-0026). When the owner resolves
the review, the answer is published as a new approved source (for example `CLAR-LOCKOUT@v1`) and the story re-runs;
the new draft cites it.

**Clause-level drafting** (ADR-0024, readiness `readiness-v2`): when a criterion has one unclear clause, readiness
lists its `draftableClauses` — the clauses specified enough to test, quoted verbatim from the criterion (code drops
any clause that is not the criterion's own words, and rejects a "ready" answer that names any) — and the workflow
drafts them under the criterion's own id while the question is open. So a `REVIEW_REQUESTED` story can already have
cases; report both.

Write ACs as one testable behavior each, in the requirement's words. Don't pad or reword an AC to get past readiness:
a question the agent asks is a real gap.

## Case revisions

`GET /api/test-cases/:caseId` → `{ caseId, code, storyId, knownBug, knownBugSteps, revisions[] }`, revisions newest
last, each:

```json
{
  "revision": 2,
  "status": "APPROVED",
  "content": {
    "title": "…", "priority": "P1",
    "preconditions": ["…"], "testData": ["…"], "assumptions": [], "missingRequirements": [],
    "steps": [{ "action": "…", "expected": "…", "sourceRefs": ["AC-LOGIN@v1"],
                "testData": "nobody@example.test — the unknown-account partition",
                "evidence": "the same message for an unknown email and a wrong password" }],
    "requirementRefs": ["story:AC-LOGIN-02", "AC-LOGIN@v1"],
    "techniques": ["equivalence_partitioning", "error_guessing"],
    "testTypes": ["negative", "security"],
    "testConditions": ["unknown email", "known email, wrong password"],
    "module": "Sign-in", "level": "ui", "manualReason": "",
    "basis": "specified", "openQuestions": [], "refs": [], "smoke": false,
    "reviewFlags": []
  },
  "sourceRefs": ["AC-LOGIN@v1"],
  "authorId": "…"
}
```

| Field | Set by | Contents |
|---|---|---|
| `requirementRefs` | model | what the case verifies: `story:<AC id>` or `sourceId@version` (ADR-0014) |
| `techniques` | model | from a fixed list: `specification_based`, `equivalence_partitioning`, `boundary_value_analysis`, `decision_table`, `cause_effect`, `state_transition`, `use_case`, `permission_matrix`, `pairwise`, `classification_tree`, `domain`, `syntax`, `metamorphic`, `scenario`, `error_guessing`, `exploratory`, `checklist`, `defect_based`, `attack_based` |
| `testTypes` | model | `positive`, `negative`, `boundary`, `security`, `concurrency`, `end_to_end`, `regression`, `ui`, `accessibility` |
| `testConditions` | model | the partitions, boundaries, rule columns and transitions the case was derived from |
| `module`, `level`, `manualReason` | model (`draft-v5`), editable | product area as the sources name it; `api` / `ui` / `manual`; why it stays manual (empty unless manual) (ADR-0018) |
| `steps[].testData` | model | the concrete values of the step, naming the partition or boundary each represents |
| `steps[].evidence` | model (`draft-v6`), editable | a verbatim quote from a cited source the expected result follows from (ADR-0023, 0025) |
| `basis` | **derived in code** | `assumption` when `assumptions` is non-empty, else `specified`; never claimed (ADR-0018) |
| `openQuestions`, `refs`, `smoke` | people (review EDIT) | review ids the case depends on; other references; part of the per-PR smoke set — QA decisions, never the model's |
| `reviewFlags` | code | advisory findings for the reviewer, see below |

Checks the agent runs in code on every draft set (ADR-0016, 0017, 0018, 0023, 0025), whatever model answered:

- `MALFORMED` (the whole set is rejected, never a partial set): empty set, a case with no steps or no technique, two
  cases with the same title; `UNGROUNDED`: a step cites, or a case traces to, a source or criterion not supplied.
- **Coverage across the set:** an acceptance criterion no case traces and no case lists as missing becomes a
  `coverageGaps` entry, surfaced in the outcome's `missingRequirements` as `"<AC id>: not covered by this draft
  (coverage check)"`.
- **`reviewFlags`** on a case: an expected result with no exact message, value or named state, or with a word that
  leaves the judgement to the tester ("correctly", "quickly") — the observability check; `no quoted evidence for
  "…"` or `the quote "…" is not in the cited sources` — `quoteFlags`; a `manual` case with no reason, or a reason on
  an `api`/`ui` case. The observability check is **lexical and advisory**: measured on a held-out set of 983
  human-written expected results it flagged 16 % (12 % with the project's vocabulary), nearly all wrongly ("Still on
  /login", "Paid"), so it never blocks anything (ADR-0023, 0025). A `VOCABULARY` source (the product's own statuses,
  options and labels, one per line) reduces the false flags (ADR-0026).

Statuses: `DRAFT → IN_REVIEW → APPROVED → RETIRED`, `NEEDS_CLARIFICATION`, `REJECTED`. `APPROVED` means the
definition was approved by a person — not that the product passes. Each case of a set is approved, edited or rejected
on its own. Only an `APPROVED` latest revision can receive an executable; editing the case later invalidates pending
proposals. Cases carry a **code** `<MODULE>-NNN` assigned at creation from the draft's module, never reused
(ADR-0021); quote cases by code, and by id only when they predate codes (`pnpm qa codes` backfills them, ADR-0022).

## Case format mapping

How the `test-case-design` format (`references/test-case-format.md`) maps onto the agent's case schema, so a designed
case, a draft and a reviewer's edit use the same words:

| `test-case-design` field | Agent field | Notes |
|---|---|---|
| `TC-<AREA>-NNN` id | `code` (`<MODULE>-NNN`) | the agent assigns its own; a well-formed id survives `import` as the code (ADR-0022) |
| `Verifies:` | `requirementRefs` (+ step `sourceRefs`) | `story:<AC id>` or `sourceId@version`; a bare identifier (`BR-404`) resolves to the source that carries it |
| `Basis:` | `basis` | derived from `assumptions` in the agent; a case with any assumption is `assumption` |
| `Assumptions:` | `assumptions` | |
| `Open questions:` (`OQ-`) | `openQuestions` | review ids of clarification reviews (`GET /api/questions` is the register) |
| `Technique:` | `techniques` + `testConditions` | the element covered (partition, column, transition) is a `testConditions` entry |
| `Priority:`, `Smoke:` | `priority`, `smoke` | `smoke` is a QA edit, never drafted |
| `Type:` | `testTypes` | |
| `Level:` `api` / `ui` / `manual — why` | `level` + `manualReason` | |
| `Test data:` | `testData[]` and per-step `steps[].testData` | dates stay relative ("today + 30 days"); the executable turns them into `values` |
| `Preconditions:`, `Steps:`, `Expected results:` | `preconditions`, `steps[].action`, `steps[].expected` | |
| `Evidence:` quote under a result | `steps[].evidence` | checked in code against the cited chunk (`quoteFlags`) |
| `Known bug: <id>, steps …` | `knownBug` + `knownBugSteps` (case lifecycle, not revision content) | bound to executable step ids or manual step numbers (ADR-0023) |
| `Exclusive: yes` | `ExecutableSpec.exclusive` | on the spec, not the case (ADR-0021) |
| `Refs:` | `refs` | |
| `Automation:` | an approved executable exists / `level: manual` | |
| `Status:` | revision `status` | `Obsolete` ≈ `RETIRED` |
| Execution columns | latest `manual_run` or test run | never design-time; `Not Run` in the CSV until a run exists |

## Proposing an executable

Two ways to a `PROPOSED` executable; both end in the same second-person approval (ADR-0008, 0024):

**A. Write it yourself** (`test-script-writer` → `references/executable-spec.md`):

1. Write the spec. Check it from the agent checkout:
   `pnpm --dir <agent-repo> exec tsx <skill-dir>/scripts/check-spec.mjs spec.json --refs <revision sourceRefs, comma-separated>`
2. `POST /api/test-cases/:caseId/executables` with `{ "spec": … }` (or `check_executable` then `propose_executable`).

**B. Ask the agent** (`POST /api/test-cases/:caseId/executables/propose`, MCP `propose_steps`): the server-side
generator (prompt `exec-v1`) writes a spec for an `APPROVED` `api`/`ui` case from the case and its sources, runs the
same `checkExecutable`, records a decision record and proposes it. `hints` (≤ 20, each ≤ 500 chars) carry facts the
case doesn't state — a sign-in path, a test id, a hook the environment lists — never an expected result. The answer is
`201 { proposed: true, executableId, version, reviewFlags, decisionRecordId }` or `200 { proposed: false, failure,
detail, decisionRecordId }` (`failure` is `REFUSED` when the model answered `{ cannot }` with a reason — usually a gap
in the step format, which belongs in `routing.md`'s backlog; `VALIDATION` 400 when no generator is configured). The
response does not carry the spec and no route reads an executable back (at agent HEAD bb54fe0), so after B the
check is yours: explore the live page against the case and, if anything is wrong, propose a corrected spec with A.
A `409 ILLEGAL_TRANSITION` means the case isn't `APPROVED`.

The response row of A carries `id`, `version`, `specHash`, `destructiveSteps`, `proposedBy`, status `PROPOSED` and
`reviewFlags` — the weak-assertion flags from `weakAssertions` (ADR-0023): a `contains` on fewer than 8 characters, an
API step that checks only its status, actions after the last assertion. The API rejects (`400 VALIDATION`) schema
errors and `sourceRefs` outside the approved case, and (`409`) a case that isn't `APPROVED`. Approval binds to the
spec hash and the case revision — after approval, any change is a new proposal.

## Runs: statuses and reasons

`GET /api/test-runs/:runId` → `{ id, caseRevisionId, executableId, status, reason, environmentId, assertions[],
cleanupFailed, blockedRequests, evidence[], reviewId, approvalId, requestedBy, createdAt, startedAt, finishedAt }`.
Lifecycle: `QUEUED → POLICY_CHECK → RUNNING → PASSED | FAILED | INCONCLUSIVE | BLOCKED`, or `BLOCKED` at policy.
Poll every 2–5 s, up to about 2 minutes, then report it as still running with its id. Each assertion carries
`stepId`, `expected`, `actual`, `passed` (`null` = never evaluated) and, for a spec with `rows`, `row`.

| Status | `reason` examples | Meaning |
|---|---|---|
| `PASSED` | `ALL_ASSERTIONS_PASSED` | every assertion observed the expected value (in every row) |
| `FAILED` | `ASSERTION_FAILED:<stepId>` | an assertion observed a different value; `assertions[]` holds `expected` and `actual`; with rows, the first failing row decides |
| `INCONCLUSIVE` | `STEP_ERROR:<stepId>` (locator ambiguous or missing, capture pattern unmatched, session sign-in non-2xx, test hook not listed or non-2xx), `SETUP_ERROR:<stepId>`, `ASSERTION_NOT_EVALUATED:<stepId>`, `MISSING_SECRET:<NAME>`, `BASE_URL_NOT_ALLOWLISTED`, `EVIDENCE_UNAVAILABLE`, `EXECUTOR_ERROR`, `LEASE_LOST` | the behavior was never observed — not a pass, not a product failure |
| `BLOCKED` | `DESTRUCTIVE_STEPS` (an `ACTION_APPROVAL` review was opened), `DENIED:<policy reasons>`, `DENIED:SPEC_CHANGED`, `DENIED:REQUESTER_NOT_FOUND`, `REVIEW_REQUIRED:…`, `WAIT_TIMEOUT:<stepId>` (a bounded `waitFor` ran out, ADR-0024), `PREFLIGHT_FAILED:<state>` (held behind a suite's preflight case that didn't pass, ADR-0022) | policy didn't allow the run, or the signal the spec waited for never came; nothing was proved either way |

A run `BLOCKED` on `DESTRUCTIVE_STEPS` opens an `ACTION_APPROVAL` review for a QA lead. Once the lead approves it,
request the run again with the `approvalId` they give you. The worker re-checks the approval (expiry, revocation, spec
hash, environment) immediately before executing. An `exclusive` spec (ADR-0021) waits until no other run of its
environment is active, and other runs wait for it — a long `QUEUED` is expected, not an error.

## Triage and reproduction

On `FAILED` / `INCONCLUSIVE` the worker triages automatically when a triage provider is configured.
`GET /api/test-runs/:runId/triage` (retry briefly on `404`; in session mode the cause stays absent until a person
writes the `triage` answer file, ADR-0026):

```json
{
  "suspectedCause": "PRODUCT_DEFECT",
  "securitySensitive": true,
  "confidence": null,
  "rationale": "…",
  "reviewId": "review_…",
  "verifiedCause": null
}
```

`suspectedCause` is one of `PRODUCT_DEFECT`, `TEST_ISSUE`, `ENVIRONMENT`, `UNKNOWN` — a suggestion that never changes
the run's status. `securitySensitive: true` sends it to a QA lead (`SECURITY_TRIAGE` review). `verifiedCause` stays
`null` until a person confirms it.

`GET /api/test-runs/:runId/reproduction` returns markdown: run, case revision, executable version and spec hash,
environment, triage, then setup / steps / cleanup with the failing step marked
(`<- FAILED: expected "…" but was "…"`) and the steps after it marked skipped. Secrets and emails are redacted.
Hand both to `debug-failed-tests` for deeper analysis.

## Suites and suite reports

Group approved cases and run them together (QA roles; the AI agent prepares the calls, a person sends them):

```text
POST /api/suites                 { name, description? }                      → suite id
POST /api/suites/:id/cases       { cases: [{ caseId, section? }] }           (≤ 500 per call)
POST /api/suites/:id/runs        { environmentId, build? }                   → 202 suite run id; 200 when BLOCKED at preflight
GET  /api/suites/:id/runs                                                    → runs with manualPending / manualRecorded
GET  /api/suite-runs/:id                                                     → the report
```

**Preflight** (ADR-0021, 0022, 0023) runs before anything is queued. The environment must exist; when the suite has
an automated case it must not be production, must allow `execute`, must have a target on an allowed host that answers
HTTP with a status below 500, and its named preflight and sentinel cases must be approved with an approved executable.
A failed check is one suite run with `status: BLOCKED`, `reason: PREFLIGHT:<checks>` — `UNKNOWN_ENVIRONMENT`,
`PRODUCTION_ENVIRONMENT`, `EXECUTE_NOT_ALLOWED`, `ENVIRONMENT_NOT_EXECUTABLE`, `TARGET_UNREACHABLE`,
`PREFLIGHT_CASE_NOT_EXECUTABLE`, `SENTINEL_CASE_NOT_EXECUTABLE`, comma-joined — every item `BLOCKED`, no test run
created, HTTP 200. When the environment names a **preflight case** (signing in as each role, say), it runs first and
the other automated runs are held (`after_run_id`) until it `PASSED`; otherwise they end `BLOCKED
PREFLIGHT_FAILED:<state>`. Manual cases are never held.

`GET /api/suite-runs/:id` → per item: `caseId`, `code`, `section`, `title`, `sourceRefs`, `status` (automated
verdict, or the latest manual record's status, or `NOT_AUTOMATED` / `NOT_APPROVED` / `BLOCKED`), `reason`, duration,
evidence count, suggested cause, and the labels of ADR-0021/0023/0024:

| Item field | Meaning |
|---|---|
| `knownBug`, `knownBugSteps`, `failedStep` | the bound defect and the step (first failed assertion's id, or the manual step number) |
| `expectedFailure` | `FAILED` **at a bound step** — accounted for by the known bug |
| `failedOutsideKnownBug` | `FAILED` at another step — a real failure despite the mark |
| `knownBugUnbound` | the mark has no steps, so every failure is labelled expected; the report says so |
| `retestNeeded` | `PASSED` with a known bug — the bug may be fixed; a `KNOWN_BUG_RETEST` review opens for a QA engineer (ADR-0022) |
| `unstable` | the verdict differed between runs of the same spec hash, environment and build — derived, never retried (ADR-0023) |
| `assertions`, `rows: { total, failed }` | how much the run checked; one verdict per data row |
| `unproven` | a P0 manual `FAILED` / `BLOCKED` with no evidence attached |

Report level: `preflight: { runId, caseId, status, reason }`, `sentinel`, `detection` and `outcome`, `build`, and
`totals` (`expectedFailures`, `retestNeeded`, `failedOutsideKnownBug`, `unstable`, `unproven`, `notAutomated`,
`manualRecorded`, …). The **sentinel** (ADR-0023) is an approved case known to fail on this build; the suite runs it
with the others and `detection` is `PROVEN` when it `FAILED`, `NOT_PROVEN` when it ended any other terminal way,
`PENDING`, or `NONE` without a sentinel. `outcome` is `INCONCLUSIVE` when `NOT_PROVEN` — the run's passes then prove
nothing — else `AS_RECORDED`. **Verdicts never change** (ADR-0009): every label sits beside the status, never instead
of it. A suite run is terminal when every automated item is `PASSED`, `FAILED`, `INCONCLUSIVE` or `BLOCKED`;
`notAutomated` counts the cases still awaiting a tester.

## Known bugs, stale cases, regression scope

- **Known bug** (ADR-0021, 0023): `POST /api/test-cases/:id/known-bug` `{ bugRef: "BUG-041" | null, steps?: [...] }`
  — people only. `bugRef` matches `^[A-Za-z][A-Za-z0-9_]*-\d+$`; `steps` (≤ 50) are executable step ids or manual
  step numbers (1–3 digits). Lifecycle state, not revision content: no new revision, no re-review; audited. When Claude
  analyses a failure that an open defect explains, it drafts the call for the QA engineer with the **exact step ids**
  the defect breaks — an unbound mark hides new defects behind the old one.
- **Stale cases** (ADR-0021, 0022, 0023): `GET /api/coverage` → `stale[]` lists approved cases citing a source version
  that is superseded, revoked or unknown (`sourceId@version` citations only — a bare identifier or source id is never
  stale by version), and cases whose latest revision predates a text change behind a bare identifier they cite
  (`TEXT_CHANGED:<old>-><new>`). Each is a case for the QA engineer to re-review; computed from citations, never
  stored.
- **Regression scope** (ADR-0021): `GET /api/regression?ref=` with an identifier inside a source (`BR-404`), a source
  id, `sourceId@version` or `story:AC` → `{ ref, cited[], p0[], guarding[] (with bugs[]), caseIds[] }`: the cases
  citing the requirement, every approved P0 case, and the cases guarding a published or known bug. Use it to answer
  "what do we run for this change" and to assemble a suite.

## Manual execution records

People only (ADR-0017); Claude reads the results in suite reports and exports and never records one. For completeness
of what the report means: `POST /api/manual-runs` `{ caseId, environmentId, build?, suiteRunId?, startedAt?,
finishedAt?, steps: [{ status: PASSED | FAILED | BLOCKED | SKIPPED, actual }][1..200], reason?, notes?, defectRef? }`
→ `201` with the status **derived in code**: `FAILED` at the first failed step (which must carry an `actual`), else
`BLOCKED` when a step is blocked (with a `reason`), else `PASSED`; a step may be `SKIPPED` only after a failed or
blocked one. Records are immutable; executing again adds one. Evidence (`POST /api/manual-runs/:id/evidence`, 5 MB,
allowlisted types) goes through the same store as automated evidence and is never served to the AI agent. Testers use
the `/tester` screen (ADR-0019): one static page served by the API, their own key in `sessionStorage`, no verdict
logic — it shows what the server derived, plus draft review, known-bug binding, detection, preflight, unstable,
unproven and regression scope (ADR-0025).

## Coverage, exports, questions

- `GET /api/coverage` (ADR-0018, 0021, 0022) → `{ totals: { sources, sourcesCovered, criteria, criteriaCovered,
  identifiers, identifiersCovered, identifiersNamed, cases, approvedCases, staleCases }, gaps: { sources[],
  criteria[], identifiers[], identifiersNotNamed[] }, stale[], bySource[], byCriterion[], byIdentifier[] }`. Computed
  from citations at source and criterion granularity: an identifier inside a source counts as covered when a case
  cites that source, and as *named* only when a case cites it by name; nothing is estimated. One source holding
  several rules overstates identifier coverage — splitting sources per rule gives exact figures.
- `GET /api/export/test-cases.csv?suiteId=` (ADR-0018): the 20 columns of `test-case-design`'s CSV order — Test Case
  ID, Requirement ID(s), Title, Feature/Module, Technique(s), Test Type, Priority, Preconditions, Test Data, Steps,
  Expected Results, Basis, Assumptions, Open Questions, Actual Result, Status, Defect ID, Environment, Notes,
  Automation Candidate — CRLF, UTF-8 with BOM. Execution columns come from the latest recorded run, manual or
  automated (`Not Run` otherwise); Defect ID shows the known bug when no run recorded one; Notes carry the revision
  status when not approved, the review flags and the build of the last run. The same file is what
  `POST /api/test-cases/import` reads back.
- `GET /api/export/traceability.csv`: requirement → cases.
- `GET /api/export/test-design.md` (ADR-0021): the eight sections of `test-case-design`'s document — requirement
  analysis and open questions, techniques, coverage model, cases by module, traceability, gaps and assumptions with
  stale cases, risk-based order with the smoke set, regression scope by module and the cases guarding defects —
  every figure a count from the records; no model writes any of it. Prefer it over regenerating a design document by
  hand when the cases live in the agent.
- `GET /api/questions` (ADR-0018; **not** for the AI agent): the clarification reviews (`REQUIREMENT_CLARIFICATION`,
  `MISSING_KNOWLEDGE`) with the observed current behaviour and the cases that list them in `openQuestions`. When Claude
  finds what the product does today for an open question, it writes the observation text for the QA engineer to post
  with `POST /api/reviews/:id/observation` — labelled observed, never as the answer.

## Errors

Errors are `{ error, message }` with HTTP status: `VALIDATION` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403,
`NOT_FOUND` 404, `CONFLICT` / `IMMUTABLE` / `ILLEGAL_TRANSITION` 409, rate limit 429 (120 requests/minute per key;
wait for `retry-after`). Report `FORBIDDEN` as a permission boundary — never retry it with a different key.
