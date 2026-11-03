# legacy-orders - a refactor from 53 findings to 0, one verified step at a time

A worked example of the `refactor-test-suite` workflow on a small Playwright/TypeScript suite a team could really
inherit: two specs for an Orders screen (customer and manager roles), one page object that does everything, a utils
file with the credentials in it, and a config that retries until green. It is self-contained - no application exists
behind it - so what this example earns is the audit side of the workflow: baseline -> audit -> plan -> steps whose
counts only go down -> ratchet. The run side (green with retries off, repeated, parallel, can-fail) is written into
each step as what a real refactor adds, and marked as not earned here.

| Artefact | What it is |
|---|---|
| [`step-0/`](step-0) | the legacy suite: 6 files, 180 lines, 6 tests, 53 findings across 13 of the 16 rules |
| [`audit-baseline.json`](audit-baseline.json) | `audit-suite.mjs` report on step-0, the committed baseline the ratchet compares with |
| [`AUDIT.md`](AUDIT.md) | the audit report in the skill's template: counts per rule, hot spots, findings read not only counted, manual findings |
| [`PLAN.md`](PLAN.md) | the plan: ordered steps, rules retired, files, proof (count before -> after), risk |
| [`step-1/`](step-1), [`step-2/`](step-2), [`step-3/`](step-3) | the suite after each step, each with a `DIFF.md` (what changed and why, in prose) |
| [`RATCHET.md`](RATCHET.md) | how `--baseline` and `--fail-on` are turned on in CI as counts reach zero, with the flags for this example |
| [`verify.sh`](verify.sh) | re-earns the table below: audits all four steps, requires strictly decreasing totals ending at 0 |

## The counts (2026-11-03)

Commands, run from this folder (Node 22.15.0, `audit-suite.mjs` as committed in `../../scripts/`):

```bash
node ../../scripts/audit-suite.mjs step-0 --json audit-baseline.json
node ../../scripts/audit-suite.mjs step-1 --baseline audit-baseline.json
node ../../scripts/audit-suite.mjs step-2 --baseline audit-baseline.json
node ../../scripts/audit-suite.mjs step-3 --baseline audit-baseline.json --fail-on warn
bash verify.sh
```

| Rule | Severity | step-0 | step-1 | step-2 | step-3 | Retired in |
|---|---|---:|---:|---:|---:|---|
| R-NO-SLEEP | block | 7 | 7 | 0 | 0 | 2 |
| R-RAW-UI-IN-TEST | block | 3 | 3 | 3 | 0 | 3a |
| R-RAW-HTTP-IN-TEST | block | 4 | 4 | 0 | 0 | 2 |
| R-COMPOSITION | block | 6 | 0 | 0 | 0 | 1 |
| R-SHARED-STATE | block | 3 | 3 | 0 | 0 | 2 |
| R-TEARDOWN | block | 3 | 3 | 0 | 0 | 2 |
| R-SECRETS | block | 2 | 0 | 0 | 0 | 1 |
| R-FOCUS | block | 0 | 0 | 0 | 0 | - |
| R-SCOPE | warn | 13 | 13 | 11 | 0 | 3a (2 incidentally in 2) |
| R-POSITION | warn | 6 | 6 | 6 | 0 | 3a |
| R-XPATH-ABS | warn | 0 | 0 | 0 | 0 | - |
| R-FORCE | warn | 2 | 2 | 0 | 0 | 2 |
| R-WEAK-ASSERT | warn | 1 | 1 | 1 | 0 | 3b |
| R-HARDCODED-URL | warn | 1 | 0 | 0 | 0 | 1 |
| R-RETRY-MASK | warn | 1 | 0 | 0 | 0 | 1 |
| R-INHERIT | warn | 1 | 1 | 1 | 0 | 3a |
| **Total** | | **53** | **43** | **22** | **0** | |
| Files scanned | | 6 | 8 | 9 | 15 | |

Every step's ratchet run printed `OK: no rule count increased`; step-3 exits 0 with `--fail-on warn`. CI's `Skill
examples` job re-runs `verify.sh` on every push (`scripts/check-examples.sh`); the specs themselves were not executed
and not type-checked (no application, no `node_modules` in this example).

## The suite and its requirements

An Orders screen: a list of orders (id, item, quantity, status, note link), a "New order" form, a note panel per
order, and manager-only Approve / Cancel actions with a confirm dialog. Two accounts: a customer and a manager.
The requirements are an assumption made for this example (a real suite cites its acceptance criteria or test cases):

| ID | Requirement |
|---|---|
| ORD-1 | A customer places an order; it appears in the list with status `New` and an `Order placed` toast is shown |
| ORD-2 | A manager approves an order (status `Approved`) and cancels an approved order after confirming (status `Cancelled`) |
| ORD-3 | A note saved on an order is listed on that order, for the customer who wrote it and for the manager |
| ORD-4 | Opening the note editor shows an empty, focused note field |

The 6 tests are the same in every step (titles gain the `[ORD-n]` prefix in step 3). Every assertion survives every
step; two are strengthened in step 3b with the value from the table above, and that is reviewed as a change to what
the test proves, not as a refactor (`PLAN.md`).

Values are example values only: `customer01` / `manager01` are account names of a fictional staging environment,
the step-0 passwords are the strings `customer-example-pw` and `manager-example-pw`, and the URLs are under
`example.test`. From step 1 on, everything comes from environment variables (`BASE_URL`, `API_URL`, `CUSTOMER_USER`,
`CUSTOMER_PASSWORD`, `MANAGER_USER`, `MANAGER_PASSWORD`).

## What the example shows that the counts do not

- The composition root comes first (step 1) so steps 2 and 3 plug fixtures in instead of touching every test twice.
- A finding is read before it is fixed: `AUDIT.md` records which `R-SHARED-STATE` hit is the real chain and which is
  per-test in practice, and fixes both the same way rather than suppressing one.
- Removing a sleep means naming what it waited for (`step-2/DIFF.md` has the table), and the one-shot reads it
  protected become polling or web-first assertions with the same value.
- Cleanup moves to whoever created the data: the factory deletes what it created, and the one test that creates
  through the UI hands its id to the factory (`track`) instead of deleting in the body.
- Page objects do not reach for the page: the fixtures own the three page-global lookups, pages compose containers
  from the root they are given, and rows and notes are found by business key.
- The assertion change is separate and sourced (ORD-1, ORD-4), and `--fail-on block` is not turned on until the last
  block rule is at zero (`RATCHET.md`).
