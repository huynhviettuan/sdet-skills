# Refactor plan - legacy-orders

Ordered as the skill orders it (`references/migration-plan.md` - Ordering the work): safety -> foundations ->
isolation -> synchronization -> structure -> assertion quality. Every step is a pure refactor except 3b, which
changes what two tests prove and is reviewed as such.

In a real repo each row below is its own pull request ("one rule in one area"); this example groups them into three
folders so the ratchet has three points to prove. The proof column is the audit count for the step's rules, before ->
after, from `audit-suite.mjs` on the step folders (2026-11-03). The run column is what a real step verifies as well
and what this example could not (no application): same tests, green with retries off, `--repeat-each=5`, parallel,
duration not worse.

| Step | Scope | Rules retired | Files | Proof (audit) | Risk |
|---|---|---|---|---|---|
| 1 | Secrets, URLs and retries to configuration; a fixtures module as composition root (`ordersPage`, `loginAs`) | R-SECRETS 2 -> 0, R-HARDCODED-URL 1 -> 0, R-RETRY-MASK 1 -> 0, R-COMPOSITION 6 -> 0 | `config/env.ts` (new), `fixtures/fixtures.ts` (new), `playwright.config.ts`, `utils/helpers.ts`, `pages/BasePage.ts`, both specs | 53 -> 43, no count up | Rotate both staging accounts; `env.ts` throws on a missing variable, so CI needs the secrets before this merges. Once `fixtures/fixtures.ts` exists, any spec still importing `@playwright/test` is an `R-COMPOSITION` finding - both specs switch in the same change |
| 2 | Isolation: `OrdersService` + `orderFactory` with teardown; each test creates its own order. Synchronization: every sleep becomes a real signal; no forced clicks | R-SHARED-STATE 3 -> 0, R-TEARDOWN 3 -> 0, R-RAW-HTTP-IN-TEST 4 -> 0, R-NO-SLEEP 7 -> 0, R-FORCE 2 -> 0 (R-SCOPE 13 -> 11 incidentally) | `services/orders.service.ts` (new), `fixtures/fixtures.ts`, both pages, both specs, `utils/helpers.ts`, `playwright.config.ts` | 43 -> 22, no count up | The cancel test re-creates the chain's precondition (approve first) inside itself. Removing sleeps can expose races the sleeps hid: run `--repeat-each=10` and in parallel before merging; `fullyParallel` is turned on in this step because isolation is what it needed |
| 3a | Structure: `OrdersPage` composed from scoped containers (list, form, notes, confirm dialog), a `ToastComponent`, a `LoginPage`; rows and notes found by business key | R-RAW-UI-IN-TEST 3 -> 0, R-SCOPE 11 -> 0, R-POSITION 6 -> 0, R-INHERIT 1 -> 0 | `pages/**` (rebuilt), `components/toast.component.ts` (new), `fixtures/fixtures.ts`, both specs | 22 -> 1 (the remaining finding is 3b's) | `placeOrder` now returns the id from the create response instead of reading row 0; `item(note)` replaces "first note" - both are locator-key changes, reviewed against ORD-1 and ORD-3 |
| 3b | Assertion quality: the weak assertion and the test without one get the expected value from the requirement | R-WEAK-ASSERT 1 -> 0; manual finding "test without an assertion" | `tests/orders.spec.ts` (ORD-1), `tests/order-notes.spec.ts` (ORD-4) | 1 -> 0 | Not a refactor: it changes what two tests prove. Each new assertion must fail when its expectation is broken (`can-fail`); that evidence needs the application and is not earned here |

Steps 3a and 3b land in the same folder (`step-3/`); the audit count after 3a alone (1: `R-WEAK-ASSERT` in
`tests/orders.spec.ts`) was measured on 2026-11-03 on a scratch copy of `step-3/` with 3b's two assertion changes
reverted, not committed as a folder.

## Exit criterion per step

1. Audit: every targeted rule at the count in the proof column; `--baseline audit-baseline.json` prints
   `OK: no rule count increased`.
2. Same 6 tests exist, same titles (step 3 prefixes the requirement ID; no test removed, none skipped).
3. Every assertion of the previous step is still there, or is strengthened in 3b with its requirement named in the
   test.
4. Run (not earned in this example): green with retries off, `--repeat-each=5`, parallel; duration not worse.
5. `audit-baseline.json` regenerated and committed with the step (see [RATCHET.md](RATCHET.md)).

## Out of scope

- A second screen, new test cases, coverage growth - `test-case-design` and `test-script-writer`, after the
  structure exists.
- Lint rules keyed to the same IDs (`eslint.config.mjs` from `init-playwright-framework`) - added when
  `--fail-on warn` is on, see [RATCHET.md](RATCHET.md).
