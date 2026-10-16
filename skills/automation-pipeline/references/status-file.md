# Status File

`docs/automation-status.md` is the pipeline's memory: created at intake, updated after every stage and gate,
committed with the work. A new run reads it before doing anything. Keep it factual and short; details live in the
case file, the registry and the PR.

```md
# Automation status — <scope>

Stack: Playwright/TS · Repo: <path> · Branch: automation/<scope> · Updated: <YYYY-MM-DD HH:MM>
Stage: 4 Implement · Gate: B passed (<who>, <date>) · Next: finish TC-TODO-003, then stage 5

## Intake
- App: https://… (reachable) · API spec: specs/<name>.json (from URL) · Secrets: API_KEY (env)
- Requirements: docs/requirements/todo.md (written by pipeline, approved at Gate A)

## Assessment
- Existing suite: none → scaffold · Baseline: n/a · Audit: clean after scaffold

## Gates
| Gate | Status | By | Date | Notes |
|---|---|---|---|---|
| A test cases | passed | <user> | <date> | TC-TODO-003 split into two rows |
| B inventory | passed | <user> | <date> | test ids requested for filter links |
| C merge | pending | | | |

## Cases
| TC | Layer | Status | Where | Verified | Notes |
|---|---|---|---|---|---|
| TC-TODO-001 | UI | automated | tests/todo/todo.spec.ts | green ×3, parallel, can fail | |
| TC-TODO-002 | UI | automated | tests/todo/todo.spec.ts | green ×3, parallel, can fail | |
| TC-TODO-003 | UI | in progress | | | row 2 of 2 remaining |
| TC-TODO-004 | UI | blocked | | | OQ-001: trailing-space handling unspecified |
| TC-PET-003 | API | routed | Manual QA Agent case_… | PASSED run_… | governed regression |

Counts: automated 2 · in progress 1 · blocked 1 · routed 1 · manual 0

## Verification (stage 5)
| Check | Result |
|---|---|
| compile + lint | pass |
| full run, retries 0 | pass (12 tests, 41 s) |
| repeat ×3 | pass |
| parallel (4 workers) | pass |
| can fail (sampled) | TC-TODO-001, TC-PET-001 |
| audit --fail-on block | 0 block, 2 warn (listed in PR) |

## Open questions / requests
- OQ-001 → product owner: …
- Test ids requested: filter links (`a[href="#/active"]`) — see docs/registry/pages.md

## Stops and decisions
- <date> stage 3: `.todo-list li` ambiguous in "completed" state → section locator switched to label text
```

Rules:

- One row per case (per data row when rows are separate tests); for a large data-driven set (a 60-row permission
  matrix) one row per group with the count, listing exceptions individually. `Status` is one of `planned`, `in progress`,
  `automated`, `blocked` (with OQ), `routed` (agent/manual, with reason), `fixme` (with evidence link).
- `Verified` records what was actually run, not what should be.
- Never delete history from "Stops and decisions"; append.
