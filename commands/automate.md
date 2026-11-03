---
description: Run the automation pipeline (docs → test cases → framework → tests → verified branch) for a scope, as a team of stage agents
argument-hint: <feature or product> [--stack playwright|selenium-java|pytest-playwright|qa-agent] [--url <app>] [--spec <openapi>] [--single-context]
---

Run the `automation-pipeline` skill for: **$ARGUMENTS**

1. Load the `automation-pipeline` skill and complete its intake table from the arguments, the repo, and
   `docs/automation-status.json` if it exists (then resume where it says). Ask for anything missing before starting.
2. Run it as the **`sdet-automation-coordinator`** (spawn it with the intake): one isolated subagent per stage, stages
   3 and 4 fanned out in parallel over disjoint write paths, an independent reviewer at stage 5, the status JSON as
   the source of truth. With `--single-context`, run the older `sdet-automation-agent` instead (one session, all
   stages) — for small scopes or when subagents are unavailable.
3. Stop at Gate A (test cases), Gate B (inventory) and Gate C (merge) and wait for my answer; apply the stop rules;
   the scaffold's guard hooks block merges, pushes to the default branch, production hosts, sleeps and edits to
   existing assertions.
4. Finish with the status summary (`node scripts/status.mjs summary docs/automation-status.json`): automated /
   blocked / routed / manual counts, verification results, review verdict, open questions, and what I need to do
   next. Never merge.

If the scope is the whole product, run one feature at a time and stop after each feature's Gate C.
