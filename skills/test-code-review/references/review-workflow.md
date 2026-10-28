# Review Workflow

How to review a change in test-automation code so that the findings are verified, consistent and actionable. The
same steps serve a self-review before opening a PR.

Contents:

- [1 Collect the change](#1-collect-the-change)
- [2 Run the deterministic checks](#2-run-the-deterministic-checks)
- [3 Read in the right order](#3-read-in-the-right-order)
- [4 Verify every finding](#4-verify-every-finding)
- [5 Write the review](#5-write-the-review)
- [6 Post it](#6-post-it)
- [Self-review before a PR](#self-review-before-a-pr)

---

## 1 Collect the change

| Target | How |
|---|---|
| Working tree | `git diff` (+ `git diff --cached`) and `git status --short` for new files |
| Branch | `git diff <base>...HEAD` and `git log <base>..HEAD --oneline` |
| GitHub PR | `gh pr view <n> --json title,body,files`, `gh pr diff <n>` |
| Files | the paths given; read them whole, not only the hunks |

Read the PR description and the test-case document the change implements (`docs/test-cases/<feature>.md`): the
case is the oracle for "does this test assert the right thing". Note the stack (`package.json` with
`@playwright/test` → TypeScript; `pom.xml` with TestNG → Java).

## 2 Run the deterministic checks

In the repo, before reading any code:

```bash
# Playwright/TS
npx tsc --noEmit && npx eslint . && node scripts/audit-suite.mjs . --fail-on block
npx playwright test <changed specs> --retries=0 --repeat-each=3
# Java
mvn -q test-compile && mvn -q test -Dtest=ArchitectureRulesTest && node scripts/audit-suite.mjs . --fail-on block
mvn test -Dtest=<ChangedTest>
```

Record the results verbatim in the review's "Checks" section. A red check is the first finding; a green one is
not repeated as a reading finding.

## 3 Read in the right order

1. **Tests first** (`tests/`, `src/test/java`): for each test, find its case; check the Act is the case's step and
   each expected result has an assertion with the stated value (checklist §2). This is where lies hide.
2. **Then the fixtures / context**: new fixtures own their teardown; new factories create unique data.
3. **Then page objects and services**: scope, naming, one-method-per-operation (checklist §6–7).
4. **Then constants, models, docs**: copy in one place, types from the spec, registry rows.

Read whole files, not just hunks: a hunk can look fine while the method it sits in now does two things.

## 4 Verify every finding

A finding is kept only when you can fill in all three:

| Field | Example |
|---|---|
| Where | `tests/e2e/todo.spec.ts:41` |
| What happens | `expect(titles.length).toBeTruthy()` passes when the list has any item, including the wrong one |
| Rule | `S-KISS-ASSERT` (warn) |

When the consequence is a wrong verdict, show it if you can: break the expectation and run the test, or write the
input that makes it pass wrongly. When you can't state the consequence in one sentence, drop the finding.

Severity comes from the rule's table, adjusted by consequence only downwards (a block-level pattern in a file that
can't affect verdicts, such as a tooling script, may be a warn) — never upwards from taste.

## 5 Write the review

```md
## Review — <PR title or branch> — <date>

**Checks:** tsc ✓ · eslint ✓ · audit 0 block / 2 warn · tests 14/14 (×3, 4 workers) · coverage --tags users ✓
**Verdict:** ❌ Request changes (2 block) | ⏳ Approve with changes (0 block, n warn) | ✅ Approve

### Block
1. `tests/e2e/todo.spec.ts:41` — `toBeTruthy()` on the title list passes with any item, including a wrong one.
   **S-KISS-ASSERT.** Fix: `await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk'])`.

### Warn
2. `src/pages/todo/index.ts:30` — `completeAndFilter()` does two user actions; tests can't reuse one without the
   other. **S-KISS-PAGE / S-KISS-ONE.** Fix: `completeTodo(title)` + `filterBy(name)`.

### Nit
3. `tests/e2e/todo.spec.ts:12` — `// navigate to the page` restates the next line. **S-KISS-COMMENT.**

### Good
- `petFactory` owns cleanup in the fixture; unique ids per test.

### Not flagged on purpose
- Two similar tests for the two filter links (third use extracts, S-YAGNI-RULE3).
```

Rules of the write-up: blocks first; each finding is one `file:line`, one consequence, one rule, one fix; a
"Good" section when something is worth repeating in the next PR; "Not flagged on purpose" when a reader would
expect a finding and there is a reason not to. No restatement of the diff, no praise padding, no more than one
finding per cause (a pattern repeated in five places is one finding with five locations).

## 6 Post it

- As a reply in the session: the Markdown above.
- On a GitHub PR, when the user asks: one summary comment with the review (`gh pr comment <n> --body-file
  review.md`), or inline comments per finding (`gh api` review with `comments[]`). Never submit an
  approve/request-changes **review state** on the user's behalf unless they ask for exactly that — the verdict in
  the text is advice; the GitHub state is their decision.

## Self-review before a PR

Same workflow, your own branch, with two additions:

- run the "can it fail" check on every new test yourself (break the expected value, run, restore);
- write the PR description from the review: what, why, the checks with their numbers, what to look at first.
