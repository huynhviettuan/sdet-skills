# Verified example suite — Playwright / TypeScript

The files a user adds on top of a fresh `init-playwright-framework` scaffold to implement the sample cases in
[`../../references/sample-test-cases.md`](../../references/sample-test-cases.md), plus a sentinel and metamorphic
tests. The folder mirrors the scaffold's layout, so copying it over a scaffold is the whole installation.
[`run-examples.sh`](run-examples.sh) does exactly that and re-checks the result against the live apps — the
evidence behind "verified on TodoMVC and Petstore", meant to run nightly.

## What it covers

| Case | Spec | Test |
|---|---|---|
| TC-TODO-001 added todo appears in the list and the counter | `tests/e2e/todo.spec.ts` | 1 |
| TC-TODO-002 completed todo under Completed, hidden under Active | `tests/e2e/todo.spec.ts` | 1 |
| TC-TODO-003 blank titles are not added (empty, spaces only) | `tests/e2e/todo.spec.ts` | 2 (one per row) |
| TC-PET-001 created pet can be retrieved by id | `tests/api/pet.spec.ts` | 1 |
| TC-PET-002 unknown pet id returns 404 | `tests/api/pet.spec.ts` | 1 |
| TC-PET-003 search by status returns only that status (available, pending, sold) | `tests/api/pet.spec.ts` | 3 (one per row) |
| TC-TODO-004 Active and Completed partition All; counter = \|Active\| `@metamorphic` | `tests/e2e/todo.metamorphic.spec.ts` | 1 |
| TC-TODO-005 complete then reopen restores the counter `@metamorphic` | `tests/e2e/todo.metamorphic.spec.ts` | 1 |
| TC-PET-006 a pet is listed under its own status only, and moves on update `@metamorphic` | `tests/api/pet.metamorphic.spec.ts` | 1 |
| TC-PET-007 two-tag search is a superset of a one-tag search `@metamorphic` | `tests/api/pet.metamorphic.spec.ts` | 1 |
| Sentinel `@sentinel` (expected to fail) | `tests/sentinel.spec.ts` | 1 |

14 tests. The cases, with `Automation:` filled in, are in `docs/test-cases/`. TC-TODO-004/005 and TC-PET-006/007
are added by this example; TC-PET-003 gained a precondition (a pet with that status exists, so the search can't
return `[]` on a shared server and pass vacuously). TC-TODO-003's sync-point todo is titled `sync point`, not
`sentinel`, so it can't be confused with the sentinel test.

What the rest adds to the scaffold:

- `src/pages/todo/`, `src/components/containers/todo/` — `TodoPage` composing header / main (+ `TodoItemSection`
  per row) / footer containers; every element built from its container root.
- `src/services/pet.service.ts`, `src/models/pet/`, `src/data/schemas/pet/` — generated from `specs/petstore.json`
  (Petstore 1.0.28) with `scripts/openapi-tool.mjs`; `openapi-tool coverage specs/petstore.json --tags pet` → 6/8
  mapped, 2 skipped with a reason.
- `src/fixtures/` — `todoPage`, `petService`, and `data-fixtures.ts`: `petFactory` (unique id, name and tags; deletes
  every pet it created in teardown, also when the test fails) and `todoFactory` (unique titles).
- `src/constants/endpoints.constant.ts`, `docs/registry/` — the route and the registry rows.
- `playwright.examples.config.ts` — inherits the scaffold's config, but one headless project on Playwright's bundled
  Chromium and a JSON report. The scaffold's own projects use the installed Google Chrome channel, run headed
  outside CI and report to ReportPortal on CI; the scaffold's `playwright.config.ts` is not changed.

No template file had to change.

## How to run

```bash
bash skills/test-script-writer/examples/playwright-ts/run-examples.sh   # from the repo root; Git Bash works
```

It scaffolds the template into a temp dir (replacing `__PROJECT_NAME__`), copies this folder over it, writes `.env`
(`BASE_URL=https://demo.playwright.dev`, `API_DOMAIN=https://petstore3.swagger.io/api/v3`), runs `npm install` and
`npx playwright install chromium`, then the gates — any failure makes the script exit non-zero:

1. `npx tsc --noEmit`, `npx eslint .`, `node scripts/audit-suite.mjs . --fail-on block`;
2. `npx playwright test --config=playwright.examples.config.ts --repeat-each=3 --workers=4 --retries=0`, then a check
   of the JSON report that every sentinel repeat was expected to fail, failed, and failed on its known-false value;
3. `node scripts/can-fail.mjs --max 100 --run "npx playwright test {file} --config=playwright.examples.config.ts
   --workers=1 --retries=0 --reporter=dot" <every spec except sentinel.spec.ts>` — every assertion line with a
   literal is mutated once; every mutant must be killed.

The temp dir is deleted at the end (`KEEP_WORK_DIR=1` keeps it). The script sets `PLAYWRIGHT_FORCE_ASYNC_LOADER=1`:
on Node 22.15 Playwright 1.61's synchronous module hooks fail to load any config (`TypeError:
context.conditions?.includes is not a function` — Node passes a `Set`); the async loader works on every Node.

To use the files in a project instead: copy everything except `run-examples.sh` and this README over a scaffold,
add the two `.env` values, and run `npx playwright test --config=playwright.examples.config.ts`.

## What the sentinel and the metamorphic tests prove

- **Sentinel** (`tests/sentinel.spec.ts`, after `manual-qa-agent` ADR-0023): adds one todo, then asserts the counter
  says "2 items left" through the same fixtures, page object and `expect.poll` as the real tests, under
  `test.fail()`. It proves the assertion path can fail on this build. If it ever passes — a broken `expect`
  wrapper, a poll that accepts anything, a page object reading the wrong element — Playwright reports it as failed
  and the run is red; the script also rejects a sentinel that failed for any other reason than its known-false value.
- **Metamorphic / derived values** (`@metamorphic`): no hand-computed expected counts. TodoMVC: after add 5 /
  complete 2 / delete 1, the lists read through the All, Active and Completed filters are a partition of All, and the
  "items left" counter equals |Active| (two independent read paths); completing then reopening a todo restores the
  counter (inverse). Petstore: a new pet is listed under exactly its own status, and after an update to `sold` under
  `sold` only; a two-tag search returns a superset of a one-tag search, adding exactly the other tag's pet. Each
  relation is first made non-vacuous (the history happened, the search found its pet) and carries a literal (`0`,
  `-1`, `['sold']`) so `can-fail.mjs` can mutate it.

## Last verified run

2026-10-28, Windows 11 (Git Bash), Node 22.15.0, Playwright 1.61.0 (bundled Chromium) — `run-examples.sh`
exited 0 (`GREEN`) in 6 min 25 s:

- `tsc --noEmit`, `eslint .`: clean. `audit-suite --fail-on block`: 117 files, 0 findings in every rule (block and
  warn).
- Suite, `--repeat-each=3 --workers=4 --retries=0`: 42 runs (14 tests × 3), `expected=42 unexpected=0 flaky=0
  skipped=0`, 40.6 s. The 3 sentinel runs: expected `failed`, got `failed`, on `Expected: "2 items left" /
  Received: "1 item left"`.
- `can-fail.mjs` on the 4 non-sentinel specs: 16 mutants, **16 killed, 0 survived, 0 inconclusive** (4 min 43 s).
  Lines without a literal (`toBe(StatusCodes.OK)`, `toContain(pet.id)`, `toEqual(titles)`) are not mutated by the
  tool; every relation line carries one.

Both public apps behaved as their spec says throughout. One server behaviour worth knowing: `findByTags` needs
`?tags=a&tags=b`; `?tags=a,b` returns `[]` (`PetService` builds the exploded form).
