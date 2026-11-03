# CI/CD Strategy — Orders

Snapshot: 2026-11-03. Which suite runs where, and what blocks a merge. Modelled on this repository's real pipeline,
[`.github/workflows/ci.yml`](../../../../../../.github/workflows/ci.yml) and
[`.github/workflows/nightly-examples.yml`](../../../../../../.github/workflows/nightly-examples.yml); the Orders
pipeline itself is a design (no Orders CI exists). Commands assume the pytest stack (OQ-A-001).

Contents:

- [Stages](#stages)
- [What blocks a merge](#what-blocks-a-merge)
- [Pipeline detail](#pipeline-detail)
- [What the repository's real CI already proves](#what-the-repositorys-real-ci-already-proves)
- [Environments per stage](#environments-per-stage)

## Stages

Order kept from the product TEST_STRATEGY.md ("lint -> typecheck -> unit -> API/integration (including the matrix)
-> security families"), with the automation gates added where they belong.

| Stage | Trigger | Suites | Blocks |
|---|---|---|---|
| 1 Static | every PR | `ruff check`, `ruff format --check`, `mypy` strict, `audit-suite.mjs . --fail-on block` | yes |
| 2 Unit | every PR (product repo) | the four pure decisions (developers) | yes |
| 3 API P0 + matrix | every PR | `pytest -m P0 -n 4`, which includes the 51 matrix cases; then `authz_matrix.py verify` on its JUnit | yes |
| 4 Security families + sentinel | every PR | `pytest tests/api/test_security.py tests/api/test_sentinel.py`; the sentinel must report `1 xfailed` | yes |
| 5 API P1 | every PR | `pytest -m "P1 and not assumption" -n 4` | yes |
| 6 Assumption group | every PR | `pytest -m assumption -n 4` | no, until OQ-A-004 is decided; results are reported with their OQ |
| 7 can-fail | every PR that adds or changes a test | `node scripts/can-fail.mjs --run "uv run pytest {file} -p no:randomly -q" --base origin/main` | yes (exit 1 survivor; exit 2 inconclusive) |
| 8 Trace | every PR | `check_cases.py docs/test-cases --catalogue REQUIREMENTS_CATALOGUE.md --trace traceability.csv` | yes (unknown ID or uncovered AC) |
| Merge to `main` | push to `main` | stages 1-8, then the whole suite three times in parallel, retries 0 | a red main is fixed or reverted first |
| Nightly | schedule | whole suite x3 x 4 workers; `can-fail` on every test file; flaky and quarantine-expiry report; load run on Local (informational) | no merge; a red nightly opens a triage item |
| Release | before a release (OQ-A-006) | P0 set against the allow-listed Staging host | the release |

## What blocks a merge

| Gate | Passes when | Why |
|---|---|---|
| Static and audit | no finding of severity `block` (`R-NO-SLEEP` and the other block rules) | the repo's template jobs run exactly `node scripts/audit-suite.mjs . --fail-on block` |
| P0 and P1 API | every case PASSED; FLAKY, INCONCLUSIVE or FAILED all block | the risk table |
| Matrix verify | `authz_matrix.py verify` prints `51 cells, 51 verified, 0 findings` and exits 0 | ADR-001; a cell with no test is a finding, not a skip |
| Sentinel | `1 xfailed`; an XPASS fails the run (`strict=True`) | a green that cannot go red proves nothing |
| can-fail | every mutant of a new or changed assertion killed | an assertion that cannot fail is not a test |
| Trace | no case cites an unknown ID; no AC without a case (BLOCKED cases count as cases with their OQ) | the catalogue is the source |
| Changelog | a change under the suite carries a CHANGELOG entry | the repo's `changelog` job does the same for `skills/` |

Non-blocking signals: the assumption group (OQ-A-004), a quarantined test within its expiry, the load run.

## Pipeline detail

| Stage | Environment | Workers | Timeout | Retries | Artifacts |
|---|---|---|---|---|---|
| PR 1-8 | Local server started in the job (`python app.py <port>` for the reference; the product build likewise) | 4 | 10 min (OQ-A-009) | 0 | JUnit, verify output, failing request/response, `can-fail` survivors |
| Merge | same | 4 | 20 min | 0, x3 | as PR |
| Nightly | same | 4 | 30 min | 0, x3 | + flaky report, load JSON |
| Release | Staging (allow-listed) | 4 | 15 min | 0 | full JUnit + verify output |

Timeouts and retention are Assumption (example).

## What the repository's real CI already proves

| Real job | What it runs that this design relies on |
|---|---|
| `skill-scripts` (ci.yml) | `python skills/security-testing/scripts/selftest.py`: the vuln-api suite green with the sentinel red (`35 passed, 1 xfailed`), `authz_matrix.py verify` covering all 23 reference cells, and each of the eleven flaws turning exactly its tests red |
| `skill-scripts` (ci.yml) | `node skills/test-script-writer/scripts/selftest.mjs` (`can-fail`), `node skills/automation-pipeline/scripts/selftest.mjs` (guard hooks) |
| `python-template` (ci.yml) | the pytest template lints, type-checks, collects and audits clean (`--fail-on block`) |
| `Nightly examples` | the three-repeats, four-workers, zero-retries run, sentinel must fail, `can-fail` must kill every mutant: the model for the merge and nightly stages here |

Differences, on purpose: the repo runs `can-fail` only nightly (in `run-examples.sh`), this design runs it on PR
for changed tests; the repo's CI has no unit stage and no matrix of 51 cells.

## Environments per stage

Local for PR, merge and nightly; Staging for release once it exists. Production never (ENVIRONMENTS.md, "Rule"; the
`target` fixture refuses it; `guard.json` `productionHosts` is filled once a product host exists).
