# Test Cases

This folder contains manual test cases in Markdown format.

## Purpose

**Read these before writing automated test specs** to understand:

-   Business requirements
-   User scenarios
-   Expected behaviors
-   Edge cases
-   Acceptance criteria

## Structure

One file per feature (`<feature>.md`). Each test case includes:

-   **ID**: `TC-<AREA>-NNN` (e.g. `TC-AUTH-001`; security cases `TC-SEC-<AREA>-NNN`) — never reused or renumbered
-   **Title**: the expected behavior, not the steps
-   **Covers**: the `AC-<AREA>-NNN` ID(s) it verifies, or `Inferred — <category>`
-   **Layer**: `E2E` or `API`
-   **Preconditions**: the state required, not how to create it
-   **Steps**: actions
-   **Expected**: concrete, observable outcomes
-   **Priority**: P0–P3

Execution results (pass/fail per run) belong in the test report or test management tool, not in this file.

## Example

```markdown
### TC-AUTH-001 — User signs in with valid credentials

**Covers:** AC-AUTH-001 **Layer:** E2E **Priority:** P0

**Preconditions:**

-   An active user account exists

**Steps:**

1. Sign in with the account's email and password

**Expected:**

-   User lands on the workspace dashboard
-   The user's name is shown in the header
```

The ID scheme matches the shared one used by the `project-docs`, `test-case-design`, and `sdet-automation-docs`
skills (`FR-` / `BR-` / `AC-` / `TC-`), so stories, test cases, and specs trace end to end.

## Guidelines

-   Write test cases in business language, not technical implementation
-   Include positive and negative scenarios
-   Document edge cases and boundary conditions
-   Keep test cases atomic and focused
-   Reference test case IDs in automated test specs

## Current Test Cases

None yet — this is a fresh scaffold.

## How to add a new test case file

Use the [`generate-test-cases` skill](../../.claude/skills/generate-test-cases.md) — it reads the user story (if
available), delegates exploration to `explore-screens`, and emits the markdown in the format above.
