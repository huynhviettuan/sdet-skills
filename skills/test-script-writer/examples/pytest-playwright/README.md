# Verified example suite — pytest + Playwright + httpx

The sample cases of [`../../references/sample-test-cases.md`](../../references/sample-test-cases.md), implemented on
top of the `init-pytest-playwright-framework` scaffold, plus a sentinel and metamorphic tests. The folder mirrors the
scaffold's layout: copy it over a fresh scaffold and it runs. `run-examples.sh` does exactly that, so a nightly job
can keep re-checking the claim that this stack is "verified on TodoMVC and Petstore".

Targets: TodoMVC `https://demo.playwright.dev/todomvc` and Swagger Petstore `https://petstore3.swagger.io/api/v3`
(spec 1.0.28 in `specs/petstore.json`). The Petstore is shared and public: every pet and tag name is unique per test
(`unique_label`), and `pet_factory` deletes what it created in teardown. `fixtures/data.py` refuses to create data
on any host outside `WRITABLE_API_HOSTS` (local servers and the Petstore demo).

## What it covers

| Case / ID | Test | File |
|---|---|---|
| TC-TODO-001 | `test_added_todo_appears_in_list_and_counter` | `tests/e2e/test_todo.py` |
| TC-TODO-002 | `test_completed_todo_is_filtered_by_status` | `tests/e2e/test_todo.py` |
| TC-TODO-003 (empty, spaces only) | `test_blank_title_is_not_added[...]` | `tests/e2e/test_todo.py` |
| TC-PET-001 | `test_created_pet_can_be_retrieved_by_id` | `tests/api/test_pet.py` |
| TC-PET-002 | `test_unknown_pet_id_returns_404` | `tests/api/test_pet.py` |
| TC-PET-003 (available, pending, sold) | `test_find_by_status_returns_only_that_status[...]` | `tests/api/test_pet.py` |
| MR-TODO-01 (delete active, delete completed) | `test_filters_partition_all_and_counter_equals_active[...]` | `tests/e2e/test_todo_metamorphic.py` |
| MR-TODO-02 | `test_complete_then_uncomplete_restores_counter` | `tests/e2e/test_todo_metamorphic.py` |
| MR-PET-01 | `test_status_update_moves_pet_between_status_searches` | `tests/api/test_pet_metamorphic.py` |
| MR-PET-02 | `test_find_by_more_tags_returns_a_superset` | `tests/api/test_pet_metamorphic.py` |
| Sentinel | `test_sentinel_known_false_expectation_fails` | `tests/test_sentinel.py` |

14 tests (with data rows) + 1 sentinel. Prerequisites added on top of the scaffold: `TodoPage` and its header, main
and footer containers (`src/qa/pages`, `src/qa/components/containers/todo`), `PetService` and the pet models
(`src/qa/api/services`, `src/qa/models`), pet response schemas (`src/qa/schemas/pet`), `PetFactory`
(`src/qa/data`), and the page, service and data fixtures (`src/qa/fixtures`).

## What the extra tests prove

- **Sentinel** (`-m sentinel`): one test whose expectation is known to be false ("2 items left" after adding one
  todo), written through the same page object and `expect` as the real tests and marked
  `xfail(strict=True, raises=AssertionError)`. It is XFAIL when the assertion path can fail; if it ever passes, strict
  xfail turns it into a FAILED run; a non-assertion error (navigation, locator) is also FAILED, not hidden.
- **Metamorphic / derived values** (`-m metamorphic`): relations that hold without a hand-written oracle for each
  value — the Active and Completed filters partition All; the counter equals the rows under Active (two independent
  paths); complete followed by un-complete restores the counter; updating a pet's status moves it from one
  `findByStatus` result to the other; `findByTags(a, b) ⊇ findByTags(a)`. Each relation is anchored on data the test
  created, so it can't hold vacuously over empty results.

## Run

```bash
bash skills/test-script-writer/examples/pytest-playwright/run-examples.sh      # from the repo root (Git Bash on Windows)
KEEP_TMP=1 bash .../run-examples.sh                                            # keep the temp project to debug
```

Steps: scaffold the template into a temp dir and copy this folder over it; `uv sync`; `playwright install chromium`;
`ruff check`; `ruff format --check`; `mypy` (strict); `openapi-tool coverage --tags pet`; the suite with
`--count=3 -n 4` (a skip, xpass, failure or error fails the step, and the sentinel must be XFAIL); `can-fail` on each
non-sentinel test file; `audit-suite --fail-on block`. It exits non-zero if any step fails and deletes the temp dir.
`BASE_URL` and `API_DOMAIN` default to the demo apps.

## Last verified run

2026-10-28, Windows 11, Git Bash, uv 0.11.25, CPython 3.14.6, Node 22.15: **ALL STEPS PASSED** in 203 s.

| Step | Result |
|---|---|
| ruff check / ruff format --check / mypy strict | clean (28 source files) |
| openapi coverage, tag `pet` | no gaps |
| suite `--count=3 -n 4` | 42 passed, 3 xfailed (the sentinel, 3 repeats) in 19.3 s |
| can-fail, 4 files | 21 killed, 0 survived, 0 inconclusive |
| audit `--fail-on block` | 0 findings in every rule |

`can-fail` mutates only lines it recognises as assertions (`assert …`, `expect(…)`) that carry a literal. The lines
it can't mutate — `eventually(lambda: _assert_titles(...))`, relations between two reads, the TC-PET-003 subset —
were mutated by hand on the same date (9 mutants: wrong title, `+ 1` on each side of a relation, `<= set()`, wrong
status): all 9 failed the test.
