---
name: refactor-test-suite
description: >
  Audit and incrementally refactor an existing test-automation suite (Playwright/TypeScript, Selenium/RestAssured/
  Java, or similar) toward the collection's architecture without changing what the tests prove — baseline the suite,
  run the bundled audit script that counts violations per rule (sleeps, raw locators or HTTP in tests, shared state,
  cleanup in test bodies, ad hoc construction, secrets, positional/absolute-XPath locators, weak assertions, retry
  masking), plan small steps by dependency and risk, apply before/after recipes, verify each step against the
  baseline, and lock progress in with a CI ratchet. Use this skill whenever the user wants to review, clean up,
  modernize, or migrate a legacy test suite, reduce flakiness structurally, adopt page objects/services/fixtures in an
  existing repo, or enforce coding rules on test code. Trigger on phrases like "refactor our tests", "audit the test
  suite", "legacy automation", "migrate to page objects", "test code review", "enforce test coding rules".
---

# Refactor Test Suite

Move an existing suite to the target architecture **one safe step at a time**, keeping it green and keeping its
coverage, and stop it from sliding back. Never a big-bang rewrite.

**How to use this skill:** follow the workflow. The audit runs through the bundled script
`scripts/audit-suite.mjs` (Node ≥ 18, no dependencies, TS/JS and Java). Load a reference when you need it:

- [`references/rules.md`](references/rules.md) — the rule catalogue with IDs (`R-NO-SLEEP`, `R-SHARED-STATE`, …),
  severities, what the script detects, what only a reviewer can see, how to suppress a justified finding.
- [`references/recipes.md`](references/recipes.md) — before/after for each rule in TypeScript and Java, with how to
  keep each change behavior-preserving.
- [`references/migration-plan.md`](references/migration-plan.md) — baseline, audit report template, ordering,
  adopting the target structure inside an existing repo, PR sizing, per-step verification, retries and flaky
  tests, the CI ratchet, when a rewrite is justified, done criteria.

## Workflow

1. **Baseline.** Run the suite with retries off (several times for a flaky sample): pass/fail/flaky per test,
   duration, rough coverage. Triage tests already failing with `debug-failed-tests` — never refactor a red test.
2. **Audit.** `node <skill-dir>/scripts/audit-suite.mjs <repo> --json audit-baseline.json` — counts per rule, hot
   spots, examples. Add the manual findings (missing composition root, giant page objects, deep inheritance,
   duplicated cross-cutting concerns). Write the audit report (template in `migration-plan.md`).
3. **Plan** in dependency order: secrets → foundations (composition root, per-thread driver, configuration) →
   isolation (factories with teardown) → synchronization (no sleeps) → structure (page objects, services) →
   assertion quality. Each step names its rules, scope, and exit criterion. Get the user's agreement on the plan.
4. **Execute one step per change** with the recipes: one rule in one area, or one screen's page object plus its
   tests. Pure refactors — no new cases, no changed expectations in the same change. Build new parts with
   `page-builder`, `service-builder`, and `test-script-writer`; grow the target structure inside the repo rather
   than copying a scaffold over it.
5. **Verify each step** against the baseline: same tests, all green with retries off, repeated and parallel runs
   green, duration not worse, targeted audit counts down and no count up (`--baseline audit-baseline.json`).
6. **Lock in.** Commit the updated `audit-baseline.json`; run the ratchet in CI so no count can grow; switch to
   `--fail-on block` once block findings reach zero, and add the matching lint / ArchUnit rules.

## Non-negotiable rules

- **No behavior change in a refactor.** Same tests, same expectations, same coverage; strengthening assertions is a
  separate, reviewed change.
- **Green before and after every step**, with retries off. A step that makes a test red or flaky is reverted or
  fixed before the next step.
- **Small steps, never a rewrite** — unless the conditions in `migration-plan.md` all hold.
- **Foundations before structure**: composition root and isolation first, so later steps don't touch every test
  twice.
- **Counts only go down.** The ratchet fails CI when any rule count increases; suppressions need a written reason.
- **Rotate leaked secrets** — deleting them from code doesn't remove them from history.
- **The audit is a heuristic.** Treat findings as leads to read, not verdicts; fix real ones, suppress justified
  ones with a reason, and tune `roleOf()` when the repo layout misclassifies files.

## Related skills

- **`sdet-framework-architect`** — the target architecture and the principles behind each rule.
- **`page-builder`** / **`service-builder`** / **`test-script-writer`** — build the replacement page objects,
  services, and tests.
- **`init-playwright-framework`** / **`init-selenium-java-framework`** — the reference structure to grow inside the
  repo (both audit clean).
- **`debug-failed-tests`** — triage red and flaky tests before and during the refactor.
- **`sdet-automation-docs`** — document the target standards, flaky policy, and quality gates the refactor
  converges on.
