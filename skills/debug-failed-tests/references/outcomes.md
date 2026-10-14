# Outcomes

Every investigation ends in one of four outcomes: a fix, a defect report, an environment/data ticket, or a
quarantine. Each has a template.

Contents:

- [Proving a fix](#proving-a-fix)
- [Product defect report](#product-defect-report)
- [Environment or data ticket](#environment-or-data-ticket)
- [Quarantine entry](#quarantine-entry)
- [Flaky log entry](#flaky-log-entry)
- [Post-fix checklist](#post-fix-checklist)

---

## Proving a fix

1. Re-run at the **rung that reproduced** the failure (see `reproduction.md`) with `--retries=0` and enough
   repetitions for the old failure rate (`~3 / p`).
2. Run the neighbors (file/folder) and the full suite to check for regressions.
3. Where possible, show the fix is causal: revert it and see the failure return (cheap for deterministic bugs).
4. Add what would have caught it earlier: a missing assertion, a fixture teardown, a guard with a clear error
   message, a regression test for a framework helper.
5. In the change description, state the root cause in one sentence and the evidence.

---

## Product defect report

The test is right and the app is wrong. Give developers everything needed without re-running the suite.

```md
## <Short title: behavior that is wrong>

Requirement: AC-CONTRACT-010 (BR-CONTRACT-005)
Environment: <env>, app version <sha/build>, browser <name version>
Found by: TC-CONTRACT-021 (<spec path>) — fails <n/n> runs | <rate> at <rung>

Steps to reproduce (manual or API):
1. …
2. …

Expected (per AC): …
Actual: …

Evidence: trace <link>, screenshot <link>, request/response <link>, test data IDs <ids>
First seen: <date / run>; last passing: <date / run>; likely change: <deploy/PR if known>
```

Then mark the test as expected-to-fail **with the defect ID** (e.g. `test.fail()` + annotation), or keep it red
per team policy — never change its expectation to the buggy behavior.

---

## Environment or data ticket

```md
## <Env>: <symptom> breaking <n> tests

Since: <time>      Affected: <cluster / tests>      Signature: <normalized error>
Evidence: <failing calls with status/timing>, <health check output>
Impact: <suites blocked>
Ask: <restore service / reset data / rotate credential / scale runners>
```

Re-run the affected cluster once the owner confirms the fix; don't edit tests to route around an outage.

---

## Quarantine entry

Quarantine only when the cause is known or actively investigated, the test can't be fixed now, and its failures
block others. Follow the team policy in `sdet-automation-docs` (flaky test policy).

```md
| Test | Reason | Evidence | Owner | Ticket | Quarantined | Expires |
|---|---|---|---|---|---|---|
| TC-ORDER-014 checkout applies coupon | Race in coupon service (DEF-231) | 4/60 at rung 3 | @team-orders | DEF-231 | 2026-10-14 | 2026-10-28 |
```

- Quarantined tests still run (non-blocking) so their status is visible.
- On expiry: fixed → unquarantine; still failing → escalate or delete the test with a reason. Never extend silently.

---

## Flaky log entry

Record every flaky investigation — the log shows which causes recur and where the framework needs work.

```text
Date | Test | Rate & rung | Category | Root cause (one sentence) | Fix / ticket | Verified (runs)
```

---

## Post-fix checklist

```text
[ ] Root cause stated in one sentence, explains every observation (incl. why it sometimes passed)
[ ] Fix is at the right owner (test / framework / product / env / data)
[ ] No added sleeps, raised timeouts, extra retries, or weakened assertions
[ ] Proven at the reproducing rung with --retries=0 and enough repetitions
[ ] Neighbors and full suite green
[ ] Missing assertion / teardown / regression test added where it would have caught this earlier
[ ] Shared cause fixed once (fixture/helper/matcher), not patched per test
[ ] Defect / ticket / quarantine entry filed with evidence where the cause isn't a test bug
[ ] Flaky log updated
```
