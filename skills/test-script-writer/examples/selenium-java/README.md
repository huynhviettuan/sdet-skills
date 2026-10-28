# Verified examples — Selenium + RestAssured / Java

The files a user adds on top of a fresh `init-selenium-java-framework` scaffold to implement
[`sample-test-cases.md`](../../references/sample-test-cases.md), plus a sentinel and metamorphic tests. Same package
layout as the template, so "copy over the scaffold" works. `run-examples.sh` re-checks it all against the live apps
(nightly).

## What it covers

| Case | Class | Tests |
|---|---|---|
| TC-TODO-001, 002, 003 (2 rows) | `tests/ui/TodoTest` | 4 |
| MR-TODO-001 (filters partition All; counter = Active), MR-TODO-002 (complete ∘ un-complete = identity) | `tests/ui/TodoMetamorphicTest` (group `metamorphic`) | 2 |
| Sentinel | `tests/ui/SentinelTest` (group `sentinel`) | 1 |
| TC-PET-001, 002, 003 (3 rows) | `tests/api/PetTest` | 5 |
| MR-PET-001 (status search follows an update), MR-PET-002 (two tags ⊇ one tag) | `tests/api/PetMetamorphicTest` (group `metamorphic`) | 2 |

The cases are written out in [`docs/test-cases/`](docs/test-cases/). Supporting code: `pages/todo/TodoPage` and
`ui/containers/todo/*` (https://demo.playwright.dev/todomvc), `api/services/PetService` + `api/models/pet/*` +
`src/test/resources/schemas/pet/*` (generated from `specs/petstore.json`, tag `pet`, 7 operations + 1 skipped),
`data/PetFactory`, and the registrations in `context/{Pages,Services,TestData}.java` and `config/dev.properties`.

The Petstore is a shared public server. `PetFactory` gives every pet and tag a unique id and name, registers
`deletePet` on the test context right after creating it (run by `BaseTest`'s `@AfterMethod`, also after a failed
assertion), and refuses to write to any host outside `WRITE_ALLOWED_HOSTS` (default: localhost, 127.0.0.1,
petstore3.swagger.io).

## Run

```bash
bash skills/test-script-writer/examples/selenium-java/run-examples.sh      # Git Bash on Windows works
RUNS=5 THREADS=8 KEEP=1 bash .../run-examples.sh                         # more runs, more threads, keep the temp copy
```

It copies the template to a temp dir, copies `src/`, `docs/` and `specs/` over it, then runs: `mvn test-compile` →
`ArchitectureRulesTest` → the suite `RUNS` times (default 3, parallel methods at the template's 4 threads, headless
Chrome), requiring 14/14 passed per run and the sentinel passed → `can-fail.mjs --max 100` on every test class except
the sentinel → `audit-suite.mjs --fail-on block` → `openapi-tool.mjs coverage --tags pet`. Any failing step exits 1;
the temp dir is removed. Needs JDK 17, Maven, Node ≥ 18, Chrome, network.

To use the examples in a project instead: copy `src/`, `docs/` and `specs/` over a fresh scaffold and run
`mvn test -Dtest='com/example/qa/tests/**/*Test'`.

## What the sentinel proves

`SentinelTest` adds one todo and asserts the counter reads "2 items left", through the same page objects,
`Eventually.verify` and AssertJ as every other test. It is declared
`expectedExceptions = AssertionError.class` with a message regex pinning `expected: "2 items left"` and
`but was: "1 item left"`, so it passes only when that exact assertion failed (after manual-qa-agent ADR-0023). If the
assertion path ever stops failing (a swallowed error, a retry that turns red into green), the sentinel goes red; if the
page breaks instead (locator timeout), the error does not match and it goes red too. Checked: with the expectation
changed to the true "1 item left", the run fails with "should have thrown an exception of type AssertionError".

## What the metamorphic tests prove

They need no stored expected screen or list. They check relations between independent reads of the same state, and
values derived from the operations performed:

- **MR-TODO-001**: after add 5 / complete 2 / delete 1: Active ∩ Completed = ∅, |Active| + |Completed| = |All|,
  Active ∪ Completed = All; the counter equals |Active| (two independent paths); |All| = 5 − 1 and |Active| =
  5 − 2 − 1 are derived from the sequence.
- **MR-TODO-002**: completing then un-completing a todo restores the counter, the todo's state and the Active list.
- **MR-PET-001**: a new `available` pet is under findByStatus(available), not under sold; after updatePet to `sold`,
  the reverse. This is membership of its own unique id, so it holds on a shared server whatever else is there.
- **MR-PET-002**: findByTags([a, b]) ⊇ findByTags([a]); with unique tags, [a] is exactly pet A and [a, b] is exactly
  A and B. Observed: the server returns a pet once per matching tag, so ids are compared as sets.

can-fail only mutates literals, so relation lines without one (`isEqualTo(all.size())`) are not mutated. The
sentinel covers that: it shows a false relation of the same shape fails on this build.

## Last verified run

2026-10-28, Windows 11, Git Bash, JDK 17.0.4, Maven 3.8.6, Node 22.15.0, Chrome 156 (headless), live TodoMVC and
petstore3.swagger.io:

- ArchitectureRulesTest 8/8.
- Suite: 3 runs × 14 tests, 14 passed in each run, sentinel passed each time; about 22 s per run at 4 threads.
- can-fail: 15 killed, 0 survived, 0 inconclusive.
- Audit: 0 findings (block and warn). Coverage: tag pet 7/8 mapped, 1 skipped (uploadFile).
- Total 375 s.
