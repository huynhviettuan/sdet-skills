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
- Update `Automation:` fields in the case file.

## 5 Verify

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

## Resuming a run

Read `docs/automation-status.md` first. The `Stage` and `Gate` fields say where to continue; per-case rows say
what's done. A changed app (locators failing) resumes at stage 3 for the affected page; changed requirements
resume at stage 1 for the affected cases and re-open Gate A for them; review comments resume at 4/5.
