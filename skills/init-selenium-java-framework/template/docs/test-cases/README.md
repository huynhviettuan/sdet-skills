# Test Cases

One file per feature (`<feature>.md`). Each case:

```markdown
### TC-AUTH-001 — User signs in with valid credentials

**Covers:** AC-AUTH-001 **Layer:** UI **Priority:** P0

**Preconditions:**

-   An active user account exists

**Steps:**

1. Sign in with the account's email and password

**Expected:**

-   User lands on the dashboard
-   The user's name is shown in the header
```

Expected results come from the acceptance criteria, never from current app behavior. Execution results belong in
the Allure report or the test management tool, not here.
