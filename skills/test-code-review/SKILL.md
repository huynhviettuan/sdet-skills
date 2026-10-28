---
name: test-code-review
description: >
  Review test-automation code (a diff, PR, branch or files; Playwright/TypeScript, Selenium+RestAssured/Java, or
  similar) for readability, reusability and correctness, and write test code that passes that review: coding
  standards with stable S- IDs (intent-revealing names and page methods, one behavior per test, rule-of-three
  extraction, data builders over copy-paste, constants for copy, no dead or defensive code, async and type
  hygiene), a checklist that merges the architecture R- rules and each builder's checks, a workflow (deterministic
  checks first, every finding verified, severity by consequence) and a findings format citing file:line and rule.
  Use whenever the user asks to review test code or a PR, wants test code more readable, reusable or "clean", asks
  for coding standards for the automation repo, or wants a self-review before a PR. Trigger on "review this PR",
  "code review", "is this readable", "make it reusable", "coding standards", "clean up this test".
---

# Test Code Review

Code is read far more often than it is written, and test code is read mostly when it fails. The standards here
make a failing test tell its reader what broke without opening the page object; the review makes sure every change
keeps that property.

**How to use this skill:**

- Writing or refactoring → read [`references/coding-standards.md`](references/coding-standards.md) first: the
  standards grouped under **DRY** (one source of truth per fact), **KISS** (the least machinery that proves the
  case) and **YAGNI** (only what the cases need), with the tie-breaks between them (rule of three; dedupe facts,
  not sentences), TypeScript and Java examples, a TypeScript/Playwright-only section (fixtures and scopes,
  web-first assertions, typed data rows, what to do with a JavaScript repo), a Python/pytest-only section (fixtures,
  yield teardown, expect/eventually, parametrize, markers) and a Java-only section (TestNG's
  thread-parallel model, AssertJ, Lombok), and the rule IDs (`S-DRY-…`, `S-KISS-…`, `S-YAGNI-…`) the review cites.
- Reviewing → follow [`references/review-workflow.md`](references/review-workflow.md) and apply
  [`references/review-checklist.md`](references/review-checklist.md), which merges every rule the collection has
  (architecture `R-…` block/warn rules, these `S-…` standards, the builders' own checks) into one pass with
  severities.
- The `/review-tests` command runs the workflow on the current diff or a PR.

## What the review is for

1. **Correctness first:** a test that can pass when the product is broken, or fail when it isn't, is the only
   blocking defect class that readability can't excuse.
2. **KISS — readability:** a reader sees *what business behavior* each test proves and *why* each page method
   exists, without scrolling.
3. **DRY — reusability:** the next test for the same screen or resource reuses the page object, service, factory
   and constants that exist; every fact about the app lives in one place.
4. **YAGNI — no speculative code:** nothing exists without a test that uses it today.
5. **Consistency:** the repo looks like one author wrote it (naming, layering, file layout).

## Non-negotiable rules

- **Deterministic checks before opinions.** Compile, lint, the audit script and the tests run first; the review
  reports their results, never repeats what they already enforce.
- **Every finding is verified** — the reviewer opened the file, saw the line, and can say what goes wrong (the
  failure scenario) or what the reader loses. No findings from pattern-matching on names alone.
- **Severity by consequence, not by taste:** block = wrong verdicts, flakiness, leaked data or secrets, bypassed
  architecture; warn = maintenance cost; nit = style the linter doesn't own. A nit never blocks a merge.
- **Cite the rule.** Each finding names its ID (`R-…`, `S-…`, or a builder checklist line) so the author can read
  the reasoning and the fix recipe, and so reviewers stay consistent.
- **Suggest the fix, don't rewrite the PR.** The review proposes; the author changes. Rewrites happen only when
  the author asks, as a separate change.
- **Don't flag the linter's job, formatting, or anything the review can't justify in one sentence.**
- **Reviewing is not approving:** the review's verdict is advice; a person merges.

## Related skills

- **`sdet-framework-architect`** — the architecture and principles the rules come from.
- **`refactor-test-suite`** — the `R-…` rule catalogue, the audit script and the ratchet; suite-wide cleanup.
- **`page-builder`** / **`service-builder`** / **`test-script-writer`** — the builders whose checklists this review
  merges; the fix for most findings is "build it the way they do".
- **`debug-failed-tests`** — when a review finding is really a flaky or wrong test.
