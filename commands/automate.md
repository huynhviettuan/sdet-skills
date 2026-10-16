---
description: Run the automation pipeline (docs → test cases → framework → tests → verified branch) for a scope
argument-hint: <feature or product> [--stack playwright|selenium-java|qa-agent] [--url <app>] [--spec <openapi>]
---

Run the `automation-pipeline` skill for: **$ARGUMENTS**

1. Load the `automation-pipeline` skill and complete its intake table from the arguments, the repo, and
   `docs/automation-status.md` if it exists (then resume where it says). Ask for anything missing before starting.
2. Run the stages in order on a branch `automation/<scope>`, loading each stage's skill when you reach it. Stop at
   Gate A (test cases), Gate B (inventory) and Gate C (merge) and wait for my answer; apply the stop rules.
3. Update `docs/automation-status.md` after every stage and commit with the work.
4. Finish with the status summary: counts of automated / blocked / routed / manual cases, verification results, open
   questions, and what I need to do next. Never merge.

If the scope is the whole product, run one feature at a time and stop after each feature's Gate C.
