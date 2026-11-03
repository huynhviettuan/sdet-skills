# Stages

What each stage consumes, produces and verifies, and how it hands over to the next. Skill names in bold are loaded
for the stage; their SKILL.md is the procedure.

Contents:

- [0 Assess](#0-assess)
- [1 Document](#1-document)
- [Gate A — test cases](#gate-a--test-cases)
- [2 Scaffold](#2-scaffold)
- [3 Build](#3-build)
- [Gate B — inventory](#gate-b--inventory)
- [4 Implement](#4-implement)
- [5 Verify](#5-verify)
- [6 Deliver](#6-deliver)
- [Gate C — merge](#gate-c--merge)
- [7 Govern (optional)](#7-govern-optional)
- [Resuming a run](#resuming-a-run)

---

## 0 Assess

Consumes: the repo, the intake answers. Produces: the "Assessment" section of the status file.

1. Create the branch `automation/<scope>` from the default branch (or init the repo if empty).
2. Detect what exists: `package.json` with `@playwright/test`, `pom.xml` with TestNG, nothing. Record the stack.
3. Existing suite → **`refactor-test-suite`**: baseline run with retries off, `audit-suite.mjs --json`, manual
   findings. Decide strangler adoption (grow the target structure beside the legacy code); the pipeline does not
   rewrite. A red baseline stops here (triage first).
4. New repo → **`sdet-framework-architect`** only as reference for decisions the scaffold doesn't make (auth
   strategy, data strategy, environments).
5. Record reachable URLs (`GET` the app and the spec) and which secrets the environment provides.

## 1 Document

Consumes: requirements source. Produces: `docs/test-cases/<area>.md`; if requirements were missing,
`docs/requirements/<area>.md` (or the team's layout) with `FR-/BR-/AC-<AREA>-NNN`.

1. Requirements absent or informal → **`project-docs`** for the scope only: business rules, AC, open questions.
   This output is part of Gate A.
2. **`test-case-design`**: techniques per rule, one case per behavior, data tables for partitions, `Layer` and
   `Automation: Candidate` set, coverage table.
3. Anything unanswerable is an `OQ-NNN` in the docs, and the affected cases are `Blocked by OQ-NNN`.

## Gate A — test cases

Present: the case file (and new requirement docs), the coverage table, the OQ list, and the count of cases that
will be automated vs blocked vs manual. Ask for approval or edits. Apply edits, then proceed. Record the
approval (who, when, what changed) in the status file.

## 2 Scaffold

Consumes: stack decision. Produces: a compiling framework with a passing smoke test.

- New repo → **`init-playwright-framework`** or **`init-selenium-java-framework`**, following their steps exactly
  (config, env files with placeholders, CI docs).
- Existing repo → add only the layers the strangler plan needs, copied from the scaffold template.
- Verify: `tsc --noEmit` / `mvn -q test-compile`, the template smoke test, and `audit-suite.mjs --fail-on block`
  clean. Commit "scaffold".

## 3 Build

Consumes: approved cases, live app, OpenAPI spec. Produces: page objects, containers, services, types, schemas,
registry entries, the inventory.

1. From the cases, list screens × states and the API operations the preconditions and assertions need.
2. **`page-builder`** per screen: live exploration (browser tool), decomposition, locators scoped through parents,
   element classes; the inventory table it produces is Gate B material.
3. **`service-builder`** per tag the cases touch: operationId methods, spec-derived types/schemas, auth fixture,
   coverage report. No spec → capture traffic and draft an UNVERIFIED spec; that's also Gate B material.
4. Verify: compile, each locator unique in each state, smoke spec per page, `openapi-tool coverage --tags <the tags in scope>` clean.

**As a team:** one `sdet-build-page` per screen and one `sdet-build-service` per tag, launched together. Write paths
are disjoint by construction — `src/pages/<screen>/**` + `src/components/containers/<screen>/**` per page agent,
`src/services/<tag>*` + `src/models/<tag>/**` + `src/data/schemas/<tag>/**` per service agent (the stack's
equivalents for Java and Python). Agents return their fixture/context registrations and registry rows in the report;
the coordinator writes them, so no two agents touch `fixtures.ts`, `Pages.java` or `docs/registry/*`.

## Gate B — inventory

Present: per page the container → element → locator → verified-in-states table (UNVERIFIED marked), the test-id
requests for developers, the services × operations list and coverage, and open questions (ambiguous locators,
spec drift). Ask for confirmation. Record it.

## 4 Implement

Consumes: approved cases, built pages/services. Produces: specs/tests, data factories, traceability updates.

- **`test-script-writer`**: prerequisite check first (missing page parts → back to stage 3 for that part), then
  one test per case/data row through the composition root; factories with teardown; negative cases with a sync
  point; `[TC-…]` titles and AC tags.
- Target "Manual QA Agent" → the executable-spec reference instead, then stage 7.
- Blocked cases get `test.fixme` / `enabled = false` with the TC id and reason; nothing silently skipped.
- Several roles, or a sign-in rate limit → one saved session per role from a setup project, never a UI sign-in per
  test (test-script-writer → "Sessions per role"). Tests that deliberately hit a limit get their own project that runs
  last.
- Before routing a case to "manual", check whether the API can create the state it needs (manual-qa-agent →
  routing).
- Update `Automation:` fields in the case file.

**As a team:** one `sdet-implement` per case file (or per batch of about five cases), launched together, each writing
only `tests/<feature>*` and `src/data/factories/<feature>*` (stack equivalents). Each agent proves its own tests
(pass, ×3, can-fail clean) before reporting; the coordinator applies the `Automation:` updates and any fixture lines.

## 5 Verify

**As a team:** `sdet-verify` runs on the branch's working tree; `sdet-review` runs at the same time from a detached
`git worktree` of HEAD. Never two runners on one tree: `can-fail` rewrites test files for the length of a run, and a
concurrent runner reads the mutant (a phantom red in the 2026-11-02 pilot). Review findings come back as
`findings[]` with file:line, severity by consequence and how each was verified; the coordinator applies small fixes
itself (a registry row, a precondition check) and sends larger ones back to stage 4 as a new batch.

Consumes: the implemented tests. Produces: the verification table in the status file.

```text
[ ] compile + lint
[ ] full run green, retries 0
[ ] --repeat-each=3 / invocationCount=3 green
[ ] parallel run green (workers > 1 / parallel=methods)
[ ] every new test fails when its expected value is broken (break, run, restore — sample at least one per file)
[ ] audit-suite.mjs --fail-on block clean; warnings listed
[ ] openapi coverage --tags <scope> clean (if services were built)
```

Red tests → **`debug-failed-tests`**: classify, one honest fix if it's a test/framework cause; a product cause is a
finding, not a test edit. After one failed attempt, `fixme` with evidence and move on.

A parallel run that is **slower** than one worker means the app, not the runner, is the bottleneck — record it; don't
raise workers. Repeat runs of tests that sign in can trip a shared rate limit: a failure that appears only in the
last repeat is checked against that before it is called flaky.

Keep the failure output of every red run (`--reporter=line` plus `test-results/`) before re-running — a failure seen
only on the first, cold run (browser download, first navigation) that doesn't recur in 20+ repeats is recorded in
"Stops and decisions" as unreproduced, with whatever output was kept; it is neither fixed nor hidden.

A scaffold that doesn't compile, lint or audit clean is a template defect: fix it in the scaffold template (so the
next run starts clean) and record it, instead of working around it in the generated repo.

## 6 Deliver

Produces: commits on the branch (scaffold / pages+services / tests / status), a PR description, the final status
file.

PR description sections: scope and stack; cases automated / blocked / routed with counts; what was verified live;
how to run; open questions and test-id requests; what the reviewer should look at first. Push only if a remote
exists and the user agreed at intake; otherwise leave the branch local and say so.

## Gate C — merge

The user (or their reviewer) merges. The pipeline reports and stops. A follow-up run after review comments
starts at stage 4 or 5 for the touched cases.

## 7 Govern (optional)

For cases the team runs under approval: **`manual-qa-agent`** + **`test-script-writer`** (executable spec). The
agent's own gates (approve case, approve executable by a second person, lead approval for destructive runs)
apply; the pipeline proposes and reports, never approves. Cases the step format can't express stay in the
framework (routing table in `manual-qa-agent/references/routing.md`).

## Stage brief

What the coordinator gives a stage agent. An agent cannot follow a rule it was not given, so the whole block goes in
every brief:

```text
Repo: <path>. Stack: <stack>. Read CLAUDE.md and .claude/rules/ first and follow them.
Stage: <n name>. Inputs (files, read them): <case file>, <inventory / status excerpt>, <produced paths from earlier stages>.
You may write ONLY: <explicit paths>. Fixtures, context, registry, the status file, the case file and everything else
are the coordinator's: return the lines to add in your report instead.
Done means: <exact outcome — e.g. TC-TODO-001..003 implemented, each passes, passes with --repeat-each=3, can-fail 0 survivors>.
Verify for real: run the commands; never skip, loosen, retry or edit an expectation to go green; a failing baseline
is INCONCLUSIVE and is reported as such. A refused tool call (a guard hook, a permission) stops that step: report it,
do not route around it.
End with the stage report below, then two sentences in plain words.
```

## Stage report

One fenced JSON block, the same shape for every stage, so the coordinator can update `automation-status.json` without
reading prose:

```json
{
  "stage": "4-implement",
  "agent": "sdet-implement",
  "outcome": "done | partial | stopped",
  "produced": ["tests/e2e/todo.spec.ts", "src/data/factories/todo.ts"],
  "registrations": ["src/fixtures/page-fixtures.ts: todoPage: async ({ page }, use) => use(new TodoPage(page))"],
  "cases": [{ "id": "TC-TODO-001", "state": "automated", "level": "ui", "file": "tests/e2e/todo.spec.ts",
              "verified": { "green": true, "repeats": 3, "workers": 4, "canFail": "killed" } },
            { "id": "TC-TODO-003", "state": "blocked", "reason": "OQ-001 empty-todo message not specified" }],
  "inventory": { "pages": [], "services": [], "testIdRequests": [] },
  "commands": [{ "command": "npx playwright test tests/e2e/todo.spec.ts --repeat-each=3", "result": "6 passed" }],
  "questions": [{ "id": "OQ-001", "question": "…", "blocks": ["TC-TODO-003"], "forWhom": "product owner" }],
  "stops": [{ "rule": "missing-requirement", "detail": "…", "cases": ["TC-TODO-003"] }],
  "refusals": []
}
```

`refusals` lists every tool call a hook or permission blocked, verbatim — each is a stop. The coordinator re-verifies
one claim per report (opens a produced file, re-runs one command, checks a count) before writing it to the status.

## Resuming a run

Read `docs/automation-status.md` first. The `Stage` and `Gate` fields say where to continue; per-case rows say
what's done. A changed app (locators failing) resumes at stage 3 for the affected page; changed requirements
resume at stage 1 for the affected cases and re-open Gate A for them; review comments resume at 4/5.
