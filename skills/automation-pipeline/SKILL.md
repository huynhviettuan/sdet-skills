---
name: automation-pipeline
description: >
  Run the whole test-automation pipeline for a feature or product as one orchestrated job — assess the repo (empty
  or existing), get requirements and TC-<AREA>-NNN test cases approved, scaffold or grow the framework, build page
  objects and services from the live app and the OpenAPI spec, implement one test per case, verify (green, repeated,
  parallel, can fail, audit clean), and deliver a branch with a status report — stopping at three human gates
  (test cases, element/API inventory, merge) and on explicit stop rules instead of guessing; keeps a resumable
  docs/automation-status.md. This is the orchestration layer over the other sdet-skills; the plugin's
  sdet-automation-agent and /automate command follow it. Use this skill whenever the user wants automation
  "end to end", "from docs to tests", "automate this feature/product", "set up and write all the tests", "run the
  automation pipeline", or asks for an automation agent to do the job rather than one step of it.
---

# Automation Pipeline

One job from requirements to a verified branch, built from the other skills in a fixed order with fixed gates.
The pipeline's value is the order, the gates, the stop rules, and a status file that lets a run resume — each
stage's actual work is the skill named for it.

**How to use this skill:** read [`references/stages.md`](references/stages.md) once (what each stage consumes,
produces, verifies, and which skill does it), then run the stages. [`references/status-file.md`](references/status-file.md)
is the format of `docs/automation-status.md`, the single source of truth for progress; create it at intake and
update it after every stage. [`references/unattended.md`](references/unattended.md) says what may run without a person
(nightly triage; authoring as a PR when pages and services exist) and links the CI templates in `templates/`.

## Intake

Collect before starting; stop and ask if any is missing:

| Need | Why |
|---|---|
| Repo (path or empty directory) and the branch to work on | never work on `main`; create `automation/<scope>` |
| Scope: one feature (`<AREA>`) or the product | a feature is the realistic unit; "product" runs one feature at a time |
| Target stack: Playwright/TS, Selenium+RestAssured/Java, or the Manual QA Agent | decides scaffold and templates |
| App URL(s) and credentials by environment variable name | live exploration and runs; docs-only ⇒ UNVERIFIED locators, say so |
| Requirements source: docs, OpenAPI spec, or "none" | none ⇒ `project-docs` first, and the user approves them |

## Stages and gates

```text
0 Assess ─► 1 Document ─► [GATE A: test cases] ─► 2 Scaffold ─► 3 Build ─► [GATE B: inventory]
  ─► 4 Implement ─► 5 Verify ─► 6 Deliver ─► [GATE C: merge]   (7 Govern: optional, Manual QA Agent)
```

| # | Stage | Skill(s) | Done when |
|---|---|---|---|
| 0 | Assess | `refactor-test-suite` (existing suite) or `sdet-framework-architect` (new) | baseline + audit recorded; strangler or scaffold decided |
| 1 | Document | `project-docs` (if gaps), `test-case-design` | `docs/test-cases/<area>.md` with TC/AC traceability |
| A | **Gate: test cases** | — | user approved the cases (or edits applied) |
| 2 | Scaffold | `init-playwright-framework` / `init-selenium-java-framework` | scaffold compiles, smoke test green, audit clean |
| 3 | Build | `page-builder`, `service-builder` | inventory presented; code compiles; locators verified live |
| B | **Gate: inventory** | — | user confirmed element/API inventory and open questions |
| 4 | Implement | `test-script-writer` | one test per case/row; blocked cases marked with reason |
| 5 | Verify | `debug-failed-tests` for reds | green, ×3 repeat, parallel, each can fail, audit `--fail-on block` clean |
| 6 | Deliver | — | branch pushed (if remote), PR text drafted, status file final |
| C | **Gate: merge** | — | a person merges; the pipeline never does |
| 7 | Govern | `manual-qa-agent`, `test-script-writer` (executable specs) | cases the team wants under approval proposed to the agent |

A gate is a stop. Present the artifact, ask, and wait — never proceed on silence or on "looks fine" you wrote
yourself.

## Stop rules

Stop the stage and report instead of guessing when:

- a requirement needed for an expected result is missing or two sources disagree → record an `OQ-NNN`, mark the
  case `Blocked by OQ-…`, continue with the others;
- the baseline run of an existing suite is red → triage with `debug-failed-tests`; never refactor a red test;
- the app or API is unreachable, or credentials are missing → do docs-only work and label everything UNVERIFIED;
- a shared limit (sign-in rate limit, API quota) throttles the run → reuse sessions, isolate the limit-hitting
  tests, and ask the owner to raise the limit for test IPs; never retry around it;
- a locator can't be made unique, or the OpenAPI spec and the real API disagree → inventory question / spec-drift
  finding, not a workaround in test code;
- verification fails after one honest fix attempt per test → leave the test marked `fixme` with the evidence, record
  it in the status file, move on;
- anything would need a destructive action against shared data, a production URL, or a secret in code → stop.

## Non-negotiable rules

- **Work on a branch, deliver a PR, never merge.**
- **Gates are the user's.** The pipeline can propose answers; it can't approve them.
- **State lives in `docs/automation-status.md`**, updated after every stage, committed with the work — a second run
  reads it first and resumes.
- **Every skill's own rules apply unchanged** (composition root, scoped locators, factory-owned teardown, no sleeps,
  one test per case, operationId verbatim…); the pipeline adds order and gates, never shortcuts.
- **Report honestly:** counts of automated / blocked / routed cases, what was verified live versus from docs, and
  every stop.

## Related skills

Every other skill in the collection is a stage here; `manual-qa-agent` is the governed-run branch; the
`sdet-automation-agent` plugin agent and `/automate` command are the entry points that follow this skill.
