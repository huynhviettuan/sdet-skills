# Definition of Done — Orders automation work

Snapshot: 2026-11-03. When an automation task is DONE. The product's
[DEFINITION_OF_DONE.md](../../../../../project-docs/examples/orders-docs/docs/quality/DEFINITION_OF_DONE.md) decides
when a feature is done ("every AC of the feature has a case quoting it; authz_matrix.py verify is clean"); this list
decides when the tests that prove it are.

```text
[ ] The case exists in docs/test-cases/ with Verifies, Basis, Priority and the AC quoted as Evidence
[ ] The test title is "[TC-<AREA>-NNN] <behaviour> (AC-...)", with case() and requirement() markers
[ ] Layer is the one 01_AUTOMATION_STRATEGY.md assigns
[ ] Arrange comes from fixtures; the test body acts and asserts; no httpx in tests
[ ] Every expected value is quotable from the package (AC, matrix row, TEST_STRATEGY.md); none copied from the server's answer
[ ] A write is asserted twice: the response and a re-read (a denial: the status and the owner's re-read unchanged)
[ ] Data created by order_factory, torn down there, confirmed gone by the record
[ ] Parallel-safe, or in a recorded serial group
[ ] No fixed wait; audit-suite --fail-on block clean
[ ] can-fail kills every mutant of the new or changed assertions (exit 0)
[ ] Passes 3 runs in a row with 4 workers and 0 retries, locally and in CI
[ ] Matrix work: authz_matrix.py verify reports every cell verified and 0 findings
[ ] The sentinel still reports 1 xfailed
[ ] check_cases.py --catalogue --trace exits 0; TRACEABILITY_MATRIX.md row updated
[ ] Reviewed (CODE_REVIEW checklist of the skill's standards.md)
[ ] CHANGELOG entry; this package updated if a rule changed
```

Passing once locally is not done. A case that is BLOCKED is done as a case (written, Basis and blocker recorded)
but not as a test; it is reported as blocked in every run until its OQ-A closes.

## Agent task shape

Bounded, one feature at a time, as the skill's AI agent task template. Example:

```md
# Task: Automate order lifecycle transitions
Acceptance criteria: AC-ORD-030..033, 035
Risk: P0
Layer: API, data-driven over the STATE_MACHINES.md transition table
Read first: AGENTS.md, docs/strategy/01_AUTOMATION_STRATEGY.md, docs/data/TEST_DATA_STRATEGY.md
Scenarios: TC-ORD-030, 031, 032, 033, 035
Constraints: states reached through the action endpoints by order_factory; no status writes; no sleeps
Done when: this file's list holds; TC-ORD-034 stays BLOCKED (OQ-A-002), not skipped
```
