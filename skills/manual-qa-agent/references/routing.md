# Routing

Where each outcome goes next, and who decides. Claude prepares the material for every route; the decisions marked
**person** are never Claude's.

Contents:

- [Clarifications and source conflicts](#clarifications-and-source-conflicts)
- [Draft review](#draft-review)
- [Run outcomes](#run-outcomes)
- [Triage to a filed bug](#triage-to-a-filed-bug)
- [Cases the agent can't run](#cases-the-agent-cant-run)
- [Status report template](#status-report-template)

---

## Clarifications and source conflicts

| Review | Claude does | Person |
|---|---|---|
| `UNSUPPORTED_ACCEPTANCE_CRITERIA` ("how many attempts?") | Relays the question verbatim with the AC and cited sources; may list what a measurable answer needs (a number, a unit, a duration) | Product owner answers; the answer becomes an approved source |
| `SOURCE_CONTRADICTION` (two sources disagree) | Relays both source ids/versions and the conflicting rule key | Product owner picks the authoritative source or publishes a correction |
| Story should be split (several behaviors in one AC) | Proposes the split as separate ACs | QA engineer / product owner submits the split stories |
| `NO_TRUSTED_SOURCES` | Points out which requirement document is missing; offers to draft it (`project-docs`) | Source owner reviews and ingests it |

Never answer a question with your own reading of the product, and never reword the AC so the question goes away.
Answering a review with an unrelated answer publishes a wrong trusted source.

## Draft review

Compare each drafted case with the designed case (`test-case-design`) and list, for the QA engineer:

- expected results the draft is missing or states vaguely ("works", "shows an error") — with the exact text from the
  source;
- steps or data the designed case has (partitions, boundary values) that the draft doesn't;
- assumptions the draft makes that no source states.

The QA engineer edits and approves. A case with several data rows becomes one case per row.

## Run outcomes

| Run | Next |
|---|---|
| `PASSED` | Report it with the run id. Nothing else. |
| `FAILED` (`ASSERTION_FAILED:<step>`) | Read triage + reproduction → `debug-failed-tests` (classify: product defect, test/spec issue, environment, data). Report the expected/actual pair and the evidence ids. If the **spec** is wrong (stale locator text, wrong expectation versus the approved case), propose a corrected spec — a new approval follows. If the **case** is wrong, that's a case edit for the QA engineer. Never "fix" an expectation the approved case states. |
| `INCONCLUSIVE` — `STEP_ERROR` / `SETUP_ERROR` / `ASSERTION_NOT_EVALUATED` | Usually a locator that didn't resolve or resolved twice, a page that changed, or setup data missing. Re-explore the page, correct the spec, re-check, propose again. |
| `INCONCLUSIVE` — `MISSING_SECRET:<NAME>` | Tell the operator to set `QA_SECRET_<NAME>` on the worker. |
| `INCONCLUSIVE` — `BASE_URL_NOT_ALLOWLISTED`, `EVIDENCE_UNAVAILABLE`, `EXECUTOR_ERROR`, `LEASE_LOST` | Environment or platform problem: report it to the operator; re-run after it's fixed. |
| `BLOCKED` — `DESTRUCTIVE_STEPS` | Report the approval review waiting for a QA lead; re-request the run with the `approvalId` once approved. |
| `BLOCKED` — `DENIED:…` | Policy refused (production, unknown environment, spec changed, permission lost). Report the reason; don't look for a way around it. |

Repeated `INCONCLUSIVE` on the same step with an unchanged page is a flakiness signal: look for a race in the app
(`debug-failed-tests` → reproduction) rather than adding retries — the format has none, by design.

## Triage to a filed bug

1. The agent's triage suggests a cause (`suspectedCause`) and flags security-sensitive failures.
2. Claude adds the analysis a person needs to confirm it: the failing assertion, what the source says, the
   reproduction, related runs (does it fail on every run? only in one environment?), and the likely component.
3. **Person** confirms the cause on the triage review (`confirmedCause`). Security-sensitive ones go to a QA lead.
4. **Person** drafts and a **QA lead** approves the bug; a person publishes it to Jira. Claude can draft the bug text
   (title, steps from the reproduction, expected vs actual, evidence ids, source references) for them to paste.

## Cases the agent can't run

Each manual case records why it isn't executable; that reason decides where it goes. Build the target with the
framework skills (`init-playwright-framework` / `init-selenium-java-framework`, then `page-builder`,
`service-builder`, `test-script-writer`).

**Check the API before writing a reason.** Most "manual" cases are limits of the step format, not of the product: if
the API can put an account or record into the needed state (disable it, set its allowed hours, switch a permission
off, create the data), a framework test can automate the case. In the Gym CRM pilot, 5 of the 9 cases the showcase had
labelled manual — two as "needs a controllable clock", two as "two people in sequence" — were automated that way;
only one (a 12-hour idle timeout) really needed a clock.

| Reason | Why the format can't | Framework approach |
|---|---|---|
| Date-relative values | literals only | compute dates in the test; assert formatted values through a date helper |
| Value carried between steps | no variables | create through a service, keep the returned id, open by id |
| Two users in sequence | one browser session | two contexts / sessions from fixtures, each with its own auth state |
| Data the environment can't provide | only the app's own endpoints | data factories through the API (`service-builder`), teardown owned by the factory |
| Time passing (expiry, reminders) | no clock control | `page.clock` (Playwright) / server-side test clock or time-travel endpoint |
| Outside the browser (email, SMS, files) | browser + HTTP status only | mail/SMS test inbox client; download handling |
| Computed expectation | compares text, doesn't compute | read values through page objects, compute, assert |
| Shared-data mutation without approval and cleanup | gated as destructive | isolated data per test with factory teardown, in a non-shared environment |
| Response-body assertions | status only | service-level API tests with schema validation (`service-builder`) |
| Concurrency | one session at a time | parallel requests through the service layer |
| Human judgement (layout, wording) | not automatable | stays manual; consider visual comparison only for stable layouts |

The routed test keeps the same TC id and cites the same AC, so traceability holds across both runners. Record
`Automation: Automated — <file>` (framework) or the agent's case id (agent) in the test-case document.

## Status report template

Use this when reporting pipeline progress to the user:

```md
## QA agent pipeline — <feature> — <date>

| TC | Agent case | Stage | Status | Waiting for |
|---|---|---|---|---|
| TC-LOGIN-001 | case_… | Run | PASSED (run_…) | — |
| TC-LOGIN-004 | — | Readiness | REVIEW_REQUESTED (review_…) | Product owner: "<question verbatim>" |
| TC-LOGIN-006 | — | Routed | Framework (time passing) | — |

Failures: <run id, failing step, expected vs actual, triage suggestion, analysis>
Actions for people: <one line per waiting review, with id and role>
```
