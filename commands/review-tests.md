---
description: Review test-automation code (working tree, branch, PR or files) for correctness, readability and reuse
argument-hint: [<PR number> | <base branch> | <paths...>]  [--post]
---

Run the `test-code-review` skill on: **$ARGUMENTS** (no argument: the working tree diff against HEAD).

1. Load the `test-code-review` skill; collect the change as `references/review-workflow.md` says (PR number →
   `gh pr diff`; branch name → `git diff <base>...HEAD`; paths → the files; nothing → `git diff` + untracked files).
2. Run the deterministic checks for the stack first and report them verbatim.
3. Apply `references/review-checklist.md` in order; keep only findings you verified (file:line, consequence, rule).
4. Write the review in the format from the workflow: Checks, Verdict, Block / Warn / Nit, Good, Not flagged on
   purpose.
5. If `--post` was given and the target is a PR, post the review as one PR comment (`gh pr comment`). Never submit
   an approve or request-changes state; the verdict in the text is advice.

Don't rewrite the code under review; propose the fix per finding. If I ask you to apply fixes afterwards, do it as a
separate change and re-run the checks.
