---
paths:
  - "skills/test-script-writer/examples/**"
  - "skills/init-*/template/**"
---

# Green is earned

- Never skip a test, loosen an assertion, add a retry, widen a timeout to hide a race, or edit an expectation to match
  the app. If the app disagrees with the case, that is a finding to report, not a test to fix.
- A baseline that does not pass is **inconclusive**; nothing is proved by mutating it. Report it as such.
- Every suite keeps a sentinel: one known-false expectation through the real page objects and assertions, marked so
  the run is red if it ever passes.
- New assertions pass `node scripts/can-fail.mjs` with 0 survivors. Fix a surviving assertion; never exclude it.
  Relation assertions without a literal are mutated by hand and the result written in the README of the examples.
- Public demo apps are shared: create your own data with unique names, delete it in teardown, never depend on
  pre-existing records, never write to a host outside the allowlist.
- A verified result is recorded with the command, the date, the counts (tests × repeats × workers, killed/survived)
  and the job that repeats it. Without the job it is "ran once".
- Template changes are the exception, each one explained: what failed on a stock scaffold and why the template, not
  the example, was wrong.
