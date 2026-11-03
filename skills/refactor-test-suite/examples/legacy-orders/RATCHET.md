# The ratchet - how the counts stay down

`audit-suite.mjs` has two gates. `--baseline <report.json>` fails when any rule's count is above the saved report;
`--fail-on block|warn` fails when any finding of that severity or worse exists. The ratchet is the first from day
one, the second rule by rule as counts reach zero. All paths below are relative to this folder; in a real repo the
script lives in `scripts/` and the baseline at the repo root.

## Day one: nothing may grow

Commit the step-0 report and run the ratchet in CI on every pull request:

```bash
node ../../scripts/audit-suite.mjs step-0 --json audit-baseline.json      # once, committed
node ../../scripts/audit-suite.mjs <suite> --baseline audit-baseline.json  # every PR; exit 1 on any increase
```

```yaml
- name: Test-suite audit (ratchet)
  run: node scripts/audit-suite.mjs . --baseline audit-baseline.json
```

A refactor PR that lowers counts regenerates `audit-baseline.json` with `--json` in the same PR, so the next PR is
held to the new numbers. A PR that needs a justified exception adds `audit-ignore R-XXX: reason` on the line and the
reviewer reads the reason; a suppression without one is a finding.

## Rule by rule: what each step turns on

`--fail-on` takes a severity, not a rule, so it is switched on when every rule of that severity is at zero. Until
then the baseline is the per-rule gate, and the table shows which rules are already locked at zero by it.

| After | Rules now at 0 (held there by `--baseline`) | Block rules left | CI flags |
|---|---|---:|---|
| step-0 | R-FOCUS, R-XPATH-ABS (never fired) | 7 | `--baseline audit-baseline.json` |
| step-1 | + R-SECRETS, R-COMPOSITION, R-HARDCODED-URL, R-RETRY-MASK | 5 | `--baseline audit-baseline.json` |
| step-2 | + R-NO-SLEEP, R-RAW-HTTP-IN-TEST, R-SHARED-STATE, R-TEARDOWN, R-FORCE | 1 (R-RAW-UI-IN-TEST: 3) | `--baseline audit-baseline.json` |
| step-3a | + R-RAW-UI-IN-TEST, R-SCOPE, R-POSITION, R-INHERIT | 0 | `--baseline audit-baseline.json --fail-on block` |
| step-3b | + R-WEAK-ASSERT (all 16 at 0) | 0 | `--fail-on warn` (the baseline becomes redundant: every count is 0) |

Verified on the step folders, 2026-11-03:

```bash
node ../../scripts/audit-suite.mjs step-1 --baseline audit-baseline.json                  # exit 0, 43 findings
node ../../scripts/audit-suite.mjs step-2 --baseline audit-baseline.json                  # exit 0, 22 findings
node ../../scripts/audit-suite.mjs step-2 --baseline audit-baseline.json --fail-on block  # exit 1: 3 block findings (R-RAW-UI-IN-TEST)
node ../../scripts/audit-suite.mjs step-3 --baseline audit-baseline.json --fail-on warn   # exit 0, 0 findings
```

The third line is the point of the table: `--fail-on block` is not turned on after step 2 because one block rule is
still open; the baseline holds the other six block rules at zero meanwhile.

## After the last step

- Keep `--fail-on warn` in CI; drop `--baseline` or keep the all-zero report, either is the same gate.
- Add the editor-time rules keyed to the same IDs (`eslint.config.mjs` from `init-playwright-framework`:
  `no-restricted-syntax` for `waitForTimeout`, `no-restricted-imports` for `@playwright/test` in tests,
  `playwright/no-focused-test`), so a finding is flagged before CI runs. The audit stays the gate for what lint cannot
  see: teardown in bodies, secrets, positions, retries.
- A count that goes up is a failed PR, not a warning; the fix is in the PR, never in the baseline.
