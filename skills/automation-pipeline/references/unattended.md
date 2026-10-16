# Unattended Runs

What the pipeline may do without a person in the session, decided from the Gym CRM pilot, and the CI templates for
it. The templates are in [`../templates/`](../templates/); they have **not yet run in CI** (they need the team's
Anthropic API key) — run each once by hand (`workflow_dispatch`) before trusting the schedule.

Contents:

- [Evidence](#evidence)
- [Decision](#decision)
- [Nightly triage](#nightly-triage)
- [Authoring from changed test cases](#authoring-from-changed-test-cases)
- [Guardrails for every unattended run](#guardrails-for-every-unattended-run)

---

## Evidence

Gym CRM, module "sign-in, sessions, roles and permissions" (79 designed cases), new Playwright repo, 2026-10-16:

| Measure | Pipeline (framework) | Manual QA Agent showcase (executable specs) |
|---|---|---|
| Cases automated | 75 of 79 (3 more need only data factories; 1 needs a clock) | 70 of 79 |
| Agent effort, exploration → verified suite | ≈ 31 min | specs hand-written, not timed |
| Suite run time | 1.1 min, plus 18 s for the isolated rate-limit test | ≈ 3 min 15 s of browser time + ≈ 7 min waiting on the sign-in limit |
| Sign-ins per run | 6 (one per role, API) + 10 cases that test sign-in | one per case (64) |
| Flakiness | 0 failures in 358 executions (1-worker, 4-worker and ×3 repeat runs), after fixing one bug in a test I wrote; the only other failures were the deliberate rate-limit burst | identical results on 2 runs |
| Findings | 1 product (rate limiting reported as "wrong password"), 3 API (sign-in not in the spec, no delete-user operation, framework-generated operationIds), 6 in the skills/templates (fixed) | 1 product defect, 1 inconclusive |

What the pilot did **not** test: the human gates. Claude stood in at Gate A and Gate B; nobody reviewed the
inventory or the cases. The decision below keeps every step that needs that judgement with a person.

## Decision

| Mode | Unattended? | Why |
|---|---|---|
| Run the existing suite on a schedule and **triage** the reds into an issue | **Yes** | Read-only on the code; the verdict comes from the test run, not the model; the pilot's triage findings (rate limit, spec drift) were the kind a person acts on from a report |
| **Author** tests for new or changed cases whose pages and services already exist, as a PR | **Yes, PR only** | Gate C (review and merge) stays with a person; no new page objects or services means no inventory decision is skipped |
| Author cases that need new page objects or services | No — stop with a Gate B request | The inventory (what to model, which locators, which test ids to request) is the judgement the pilot couldn't validate |
| Scaffold repos, resolve spec drift, approve anything in the Manual QA Agent | No | Gates A/B/C and the agent's own approvals are people's decisions |
| Anything that writes to shared data without isolation, or production | Never | Same as interactive runs |

## Nightly triage

[`templates/nightly-triage.yml`](../templates/nightly-triage.yml):

1. Run the suite **deterministically** (no model): `npx playwright test --project=e2e --reporter=json`.
2. Only when tests failed: run Claude Code headless with the plugin loaded and the `debug-failed-tests` skill, limited
   to reading files, re-running Playwright, and writing `triage/report.md`. It classifies each failure (product,
   test, environment, data) with evidence and never edits tests or expectations.
3. Open (or update) one issue with the report. A person decides what to fix.

## Authoring from changed test cases

[`templates/author-from-test-cases.yml`](../templates/author-from-test-cases.yml), on a push that changes
`docs/test-cases/**`:

1. Claude Code headless runs `/automate` for the changed feature with the instruction: stages 4–6 only; if any case
   needs a page object or service that doesn't exist, stop and list them as a Gate B request.
2. The job pushes branch `automation/<feature>-<run id>` and opens a PR with the status file as its description.
3. A person reviews and merges (Gate C). The workflow has no merge step and its token can't approve PRs.

## Guardrails for every unattended run

- **Permissions:** `--permission-mode dontAsk` with an explicit `--allowedTools` list; nothing outside the list runs.
  No `--dangerously-skip-permissions`.
- **Secrets:** API key and test-environment credentials from the CI secret store; never echoed. The model never sees
  production credentials because the job never has them.
- **Environment:** a test environment only, with the sign-in rate limit raised for the runner's IP or the suite's
  sessions reused (one sign-in per role).
- **Budget:** `--max-budget-usd` on every Claude Code call and a job `timeout-minutes`; one feature per run.
- **Output is advisory:** issues and PRs. No merge, no approval, no deploy, no data clean-up outside test data the run
  created.
