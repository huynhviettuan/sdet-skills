# Flaky Test and Retry Policy — Orders

Snapshot: 2026-11-03. Flaky and retry policy in one file (`document-package.md` allows merging for a small suite).
`debug-failed-tests` applies it when a test actually fails.

## Verdicts

Every test result is exactly one of these. No retry count, heuristic or AI judgement turns one into another.

| Verdict | Meaning | Orders example |
|---|---|---|
| PASSED | ran, every assertion held, first attempt | — |
| FAILED | ran, an assertion did not hold | TC-ORD-004 on the reference server: the note is shortened, not rejected (OQ-002) |
| FLAKY | passed and failed on the same commit (across repeats or retries) | a list assertion that depended on another worker's orders |
| INCONCLUSIVE | the check could not reach a verdict: the baseline did not pass, the environment was not ready, a lookup was ambiguous, a tool was missing | `can-fail` exit 2 (unmutated file did not pass); the security self-test's exit 2 when pytest is missing; the server health check timed out |
| BLOCKED | the case cannot run until something outside the suite changes | TC-ORD-034 and TC-AUTH-008 until OQ-A-002 gives a clock |
| QUARANTINED | known flaky, still runs, reported apart, owner and expiry recorded | — (none today) |

A FLAKY or INCONCLUSIVE result is never counted as a pass. A BLOCKED case is listed with its OQ in every report;
it is not `skip`ped silently.

## Retries

| Context | Retries | Why |
|---|---|---|
| Local | 0 | |
| Pull request | 0 | a P0 gate must fail on the first wrong answer |
| Merge to `main` | 0, three repeats | repeats detect flakiness without hiding it |
| Nightly | 0, three repeats x 4 workers | same as the repo's `Nightly examples` job (`--repeat-each=3 --workers=4 --retries=0`) |

No rerun plugin is installed. The Playwright template's default `retries: process.env.CI ? 1 : 0`
(`playwright.config.ts`) is the setting this policy overrides if OQ-A-001 picks that stack. Raising a retry count to
turn a run green is a defect in the change (repo `.claude/CLAUDE.md`, rule 2).

## Sentinel

The security suite keeps one known-false expectation under `xfail(strict=True)` (reference
`test_sentinel_other_tenant_reads_order`: another tenant must never read the order). Expected result: `1 xfailed`.
If it XPASSes, pytest fails the run, and every green in that run is treated as INCONCLUSIVE: object-level
authorization may be gone (the reference self-test shows the sentinel XPASS together with the BOLA tests when the
`bola` flaw is on).

## Quarantine

- Who: the SDET proposes; the QA lead approves for a P0 test.
- Record per test: case id, AC, first flaky run, root-cause hypothesis, owner, expiry date.
- Expiry: 14 days, 7 for P0 (Assumption (example), OQ-A-007). An expired quarantine fails the nightly run until
  the test is fixed or deleted with its case; it never stays forever.
- A quarantined P0 test still runs on every PR and is reported; while quarantined, its AC is listed as "at risk"
  in the PR summary.
- A matrix row cannot be quarantined: `authz_matrix.py verify` counts a non-passing cell as a finding, and the
  verify gate has no exception list.

## Common causes in this suite, and the fix

| Cause | Fix |
|---|---|
| Asserting an exact list length over shared data | Assert the scope property over all rows and membership of owned ids (LOCATOR_STRATEGY.md) |
| A seed user locked by another test's wrong passwords | Lockout safety rules in TEST_DATA_STRATEGY.md |
| Two workers changing alice's open-order count | `cap-serial` group until OQ-A-003 |
| Token older than 60 minutes on a long worker | re-login after 50 minutes in `actor_tokens` |
| Time-dependent assertion | controllable clock (OQ-A-002), never a sleep |

## Evidence on failure

The JUnit file (it is also `authz_matrix.py verify`'s input), and per failing test: the request method, path and
actor, the response status, headers and body, the ids `order_factory` created, worker id, commit SHA. Tokens and the
password are masked in every log. Kept 14 days for PR runs, 30 for nightly (Assumption (example)).
