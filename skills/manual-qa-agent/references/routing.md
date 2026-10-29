# Routing

Where each outcome goes next, and who decides. Claude prepares the material for every route; the decisions marked
**person** are never Claude's.

Contents:

- [Clarifications and source conflicts](#clarifications-and-source-conflicts)
- [Draft review](#draft-review)
- [Executable review](#executable-review)
- [Run outcomes](#run-outcomes)
- [Suite report labels](#suite-report-labels)
- [Triage to a filed bug](#triage-to-a-filed-bug)
- [Cases the agent can't run](#cases-the-agent-cant-run)
- [Status report template](#status-report-template)

---

## Clarifications and source conflicts

| Review | Claude does | Person |
|---|---|---|
| `UNSUPPORTED_ACCEPTANCE_CRITERIA` ("how many attempts?") | Relays the question verbatim with the AC and cited sources; may list what a measurable answer needs (a number, a unit, a duration); reports the cases already drafted from the criterion's clear clauses (`drafted.clauses`, agent ADR-0024) | Product owner answers; the answer becomes an approved source |
| `SOURCE_CONTRADICTION` (two sources disagree) | Relays both source ids/versions and the conflicting rule key | Product owner picks the authoritative source or publishes a correction |
| Story should be split (several behaviors in one AC) | Proposes the split as separate ACs | QA engineer / product owner submits the split stories |
| `NO_TRUSTED_SOURCES` | Points out which requirement document is missing; offers to draft it (`project-docs`) | Source owner reviews and ingests it |
| `PROVIDER_FAILURE` / `GENERATOR_UNAVAILABLE` (session mode, ADR-0026) | Reports that the model's answer is missing; if the user is running the session exchange, offers to answer the waiting request files (`pnpm qa session`) | A person reruns the story (`pnpm qa session replay`) |
| Open question with a known current behaviour | Writes the observed behaviour ("today the API answers 200 and freezes again") for the QA engineer to record with `POST /api/reviews/:id/observation` — labelled observed, never as the answer (ADR-0018) | QA engineer records it; the owner still answers |

Never answer a question with your own reading of the product, and never reword the AC so the question goes away.
Answering a review with an unrelated answer publishes a wrong trusted source. Observed behaviour is not an answer: it
gives the owner something concrete to accept or reject.

## Draft review

A story now yields a **set** of cases, one per test condition (agent ADR-0016). Compare the set with the designed
cases (`test-case-design`) and list, for the QA engineer, per case (each is approved, edited or rejected on its own):

- expected results the draft is missing or states vaguely ("works", "shows an error") — with the exact text from the
  source;
- steps or data the designed case has (partitions, boundary values) that the draft doesn't; whether each step's
  `testData` names the partition or boundary its value represents (ADR-0018);
- assumptions the draft makes that no source states — any entry makes the case `basis: assumption`;
- **quoted evidence** (ADR-0023, 0025): every `no quoted evidence` or `quote … is not in the cited sources` flag;
  supply the verbatim sentence from the cited source when one exists, or say that the expected result is an
  assumption when none does. Quotes don't retrofit (4 of 105 steps found one afterwards in the agent's own replay), so
  a draft without them usually needs its results rewritten in the source's words;
- **design** (ADR-0014): whether `techniques` fit the requirement's structure (a numeric limit without
  `boundary_value_analysis`, a rule combination without `decision_table`, roles without `permission_matrix`), and
  whether every `testConditions` entry is something a source states — a technique never justifies an expected
  result on its own; read `designNotes` to see where the set came from;
- **level** (ADR-0018): `api` / `ui` / `manual` with a `manualReason`; check the reason against
  [Cases the agent can't run](#cases-the-agent-cant-run) — many reasons are no longer true, and a `manual` case with a
  stale reason is a missed executable;
- **observability flags**: `reviewFlags` such as `no exact message, value or state in "…"` or `the word "correctly"
  leaves the judgement to the tester`. The check is lexical and advisory — on human-written results it flags 16 %
  (12 % with a product vocabulary), nearly all wrongly (ADR-0023, 0025) — so judge each flag against the product's
  words rather than treating it as a defect; a flagged result that names a real product state ("Paid", "Still on
  /login") is fine, and a `VOCABULARY` source listing the product's statuses and labels makes the check stop flagging
  them (ADR-0026);
- **coverage** across the set: each `missingRequirements` entry ending in "(coverage check)" is an acceptance
  criterion no case in the set tests. The fix is another case for that condition or a split story, not a longer case.

Comparing with the designed case's `Technique:` line:

| Agent `techniques` | `test-case-design` |
|---|---|
| `equivalence_partitioning`, `boundary_value_analysis`, `decision_table`, `state_transition`, `pairwise`, `error_guessing`, `metamorphic`, `syntax`, `exploratory`, `checklist` | same names |
| `use_case`, `scenario` | Scenario / use-case testing |
| `permission_matrix` | CRUD and lifecycle matrix (roles × operations) |
| `defect_based`, `attack_based` | error guessing from past defects; security testing |
| `cause_effect`, `classification_tree`, `domain`, `specification_based` | no section of its own — judge them against the requirement directly |

The QA engineer edits and approves; the EDIT form also sets `module`, `level`, `manualReason`, `smoke`,
`openQuestions`, `refs` (ADR-0019). A data table is one case with `rows` in its executable (ADR-0024), or one case per
row when the QA engineer wants separate verdicts in the case list — say which you recommend and why.

## Executable review

Whether the spec is yours or the agent's (`propose_steps`, ADR-0024), the reviewer sees its `reviewFlags`
(`weakAssertions`, ADR-0023). Before a person spends time on it, Claude resolves or explains each:

| Flag | Fix |
|---|---|
| `"contains" on the short text "…"` | `match: "exact"` with the full message the source states, or a longer fragment |
| `only the status … is checked; nothing reads what the request did` | add `expectJson` checks on the fields the case names, or a UI assertion of the effect |
| `steps … act after the last assertion` | assert the effect of those actions, or move them to `teardown` |
| a proposal `REFUSED` with a reason | the reason names a gap in the step format or in the case; route it below, or supply the missing fact as a `hint` and ask again |

## Run outcomes

| Run | Next |
|---|---|
| `PASSED` | Report it with the run id. If the case has a known bug, say that a `KNOWN_BUG_RETEST` review is now waiting for a QA engineer (ADR-0022). Nothing else. |
| `FAILED` (`ASSERTION_FAILED:<step>`) | Read triage + reproduction → `debug-failed-tests` (classify: product defect, test/spec issue, environment, data). Report the expected/actual pair, the row when the spec has `rows`, and the evidence ids. If the **spec** is wrong (stale locator text, wrong expectation versus the approved case), propose a corrected spec — a new approval follows. If the **case** is wrong, that's a case edit for the QA engineer. If an **open defect** explains it, draft the known-bug call with the exact step ids for the QA engineer (ADR-0023). Never "fix" an expectation the approved case states. |
| `INCONCLUSIVE` — `STEP_ERROR` / `SETUP_ERROR` / `ASSERTION_NOT_EVALUATED` | Usually a locator that didn't resolve or resolved twice, a page that changed, setup data missing, a `capture` pattern that didn't match, a `session` sign-in that answered non-2xx, or a `testHook` path the environment doesn't list. Re-explore the page or re-read the response, correct the spec, re-check, propose again. |
| `INCONCLUSIVE` — `MISSING_SECRET:<NAME>` | Tell the operator to set `QA_SECRET_<NAME>` on the worker (also for `{ totp }` secrets). |
| `INCONCLUSIVE` — `BASE_URL_NOT_ALLOWLISTED`, `EVIDENCE_UNAVAILABLE`, `EXECUTOR_ERROR`, `LEASE_LOST` | Environment or platform problem: report it to the operator; re-run after it's fixed. |
| `BLOCKED` — `WAIT_TIMEOUT:<step>` (ADR-0024) | The signal the `waitFor` polled for never came within its bound. Not a failure and not a pass: check whether the job or state change happens at all in that environment (a hook to trigger it? a longer bound ≤ 120 s? the wrong signal?), then correct the spec or route the case to framework code. Never replace the wait with a sleep. |
| `BLOCKED` — `DESTRUCTIVE_STEPS` | Report the approval review waiting for a QA lead; re-request the run with the `approvalId` once approved. |
| `BLOCKED` — `PREFLIGHT_FAILED:<state>` (ADR-0022) | The suite's preflight case didn't pass, so this run was never attempted. Look at the preflight run, not this one. |
| `BLOCKED` — `DENIED:…` | Policy refused (production, unknown environment, spec changed, permission lost). Report the reason; don't look for a way around it. |

Repeated `INCONCLUSIVE` on the same step with an unchanged page is a flakiness signal: look for a race in the app
(`debug-failed-tests` → reproduction) rather than adding retries — the format has none, by design. A case the suite
report marks `unstable` (its verdict differed between runs of the same spec hash, environment and build, ADR-0023) is
named so nobody trusts it until the cause is known; the analysis, not a re-run, is the next step.

## Suite report labels

`GET /api/suite-runs/:id` says more than pass/fail (ADR-0021, 0022, 0023, 0024); report all of it:

| Report says | Claude reports | Person |
|---|---|---|
| `status: BLOCKED`, `reason: PREFLIGHT:<checks>` | the environment wasn't fit to run (which checks failed); no case ran, nothing is a product result | operator fixes the environment or its registration |
| `detection: NOT_PROVEN`, `outcome: INCONCLUSIVE` | the sentinel case didn't fail, so the run's passes prove nothing — and a sentinel that starts passing is itself a finding | QA lead decides whether the sentinel's expectation is still false |
| `detection: NONE` | no sentinel is set; the passes stand on the per-case assertions alone | administrator may name one (`--sentinel-case`) |
| `expectedFailure` | failed at the bound step: accounted for by the known bug | — |
| `failedOutsideKnownBug` | a real failure at another step, despite the mark | triage as any failure |
| `knownBugUnbound` | the mark hides every failure; ask for the steps the defect breaks | QA engineer binds the steps |
| `retestNeeded` | the bug may be fixed; a `KNOWN_BUG_RETEST` review is open | QA engineer retests and clears or keeps the mark |
| `unstable` | verdict not trustworthy; see above | — |
| `unproven` | a P0 manual failure with no evidence attached | tester attaches evidence |
| `rows: { total, failed }` | which data rows failed (read the run's assertions by `row`) | — |
| `notAutomated` > 0 | cases still awaiting a tester; the report is complete only for automation | testers record them (`/tester`) |

## Triage to a filed bug

1. The agent's triage suggests a cause (`suspectedCause`) and flags security-sensitive failures.
2. Claude adds the analysis a person needs to confirm it: the failing assertion, what the source says (the step's
   `evidence` quote), the reproduction, related runs (does it fail on every run? only in one environment? is the case
   `unstable`?), the build under test, and the likely component.
3. **Person** confirms the cause on the triage review (`confirmedCause`). Security-sensitive ones go to a QA lead.
4. **Person** drafts and a **QA lead** approves the bug; a person publishes it to Jira. Claude can draft the bug text
   (title, steps from the reproduction, expected vs actual, evidence ids, source references, build) for them to
   paste, with `qa-reporting`.
5. Once filed, Claude drafts the known-bug binding (`bugRef`, the step ids) for the QA engineer, so later runs label
   the failure `expectedFailure` and a pass opens the retest (ADR-0021, 0023).

## Cases the agent can't run

Each manual case records why it isn't executable (`manualReason`); that reason decides where it goes. Build the target
with the framework skills (`init-playwright-framework` / `init-selenium-java-framework`, then `page-builder`,
`service-builder`, `test-script-writer`).

**Check the format and the API before writing a reason.** The reasons that made the Gym CRM showcase leave 131 of 261
cases manual are mostly gone: dates, carried values, response bodies, data tables, API-level role changes, waits with
a bound, uploads and downloads, raw bodies, headers and one-time codes are all in the step format now (agent
ADR-0015, 0024, 0025 — details in `test-script-writer` → `references/executable-spec.md`). And if the product's API
or a listed test hook can put a record into the needed state, the case is an executable, not a manual one. In the Gym
CRM pilot, 5 of the 9 cases the showcase had labelled manual were automated that way.

What the step format can and cannot express is one table, owned by `test-script-writer` →
`references/executable-spec.md` → "Cases the format can't express". This page adds only the route for the reasons
that remain:

| `manualReason` the format still can't express | Framework approach |
|---|---|
| Two users in the browser | two browser contexts from fixtures, each with its own auth state |
| Data the environment can't provide, no listed hook | data factories through the API (`service-builder`), teardown owned by the factory |
| Time passing beyond 120 s, no job hook | `page.clock` (Playwright) / a server-side test clock or time-travel endpoint |
| Download contents | download handling with content assertions |
| Outside the browser (email, SMS, push) | mail/SMS test inbox client |
| Computed expectation | read values through page objects, compute, assert |
| Shared-data mutation on a shared environment | isolated data per test with factory teardown, in a non-shared environment |
| Concurrency, two browser users at once | parallel requests through the service layer; two contexts |
| Human judgement (layout, wording) | stays manual; visual comparison only for stable layouts |

The routed test keeps the same case code and cites the same AC, so traceability holds across both runners. Record
`Automation: Automated — <file>` (framework) or the agent's case code (agent) in the test-case document. A proposal
the agent `REFUSED` names the gap in its `detail`; it belongs in this table's third column until the format grows.

## Status report template

Use this when reporting pipeline progress to the user:

```md
## QA agent pipeline — <feature> — <date> — build <build>

| TC | Agent case | Stage | Status | Waiting for |
|---|---|---|---|---|
| TC-LOGIN-001 | LOGIN-001 | Run | PASSED (run_…) | — |
| TC-LOGIN-002 | LOGIN-002 | Run | FAILED (run_…) — expectedFailure, BUG-041 @ generic-message | — |
| TC-LOGIN-004 | — | Readiness | REVIEW_REQUESTED (review_…); 2 cases drafted from clear clauses | Product owner: "<question verbatim>" |
| TC-LOGIN-006 | LOGIN-006 | Routed | Framework (12-hour idle timeout) | — |

Suite run: <id> — preflight <PASSED | PREFLIGHT:…>, detection <PROVEN | NOT_PROVEN | NONE>, outcome <AS_RECORDED | INCONCLUSIVE>,
  <n> failedOutsideKnownBug, <n> unstable, <n> retestNeeded, <n> notAutomated
Stale cases: <codes with the superseded citation or TEXT_CHANGED>
Failures: <run id, failing step (row), expected vs actual, triage suggestion, analysis>
Actions for people: <one line per waiting review, with id and role>
```
