# Automation status — todo + pet (pilot of the team runner)

Stack: playwright-ts · Repo: scratchpad/pilot · Branch: automation/todo · Updated: 2026-11-02T15:40:00Z
Stage: done · Next: -

**10 automated · 0 in progress · 0 blocked · 0 routed · 0 manual** (10 cases)

## Gates

| Gate | State | By | At | Note |
| --- | --- | --- | --- | --- |
| A test cases | passed | tuan (cases are the verified examples) | 2026-11-02T10:00:00Z |  |
| B inventory | passed | tuan | 2026-11-02T11:20:00Z | inventory confirmed; NativeCheckBox request kept as interim (scaffold improvement for later) |
| C merge | passed | tuan | 2026-11-02T15:40:00Z | pilot closed; scratch repo, nothing merged |

## Intake

- appUrl: https://demo.playwright.dev/todomvc
- apiUrl: https://petstore3.swagger.io/api/v3
- spec: specs/petstore.json
- casesFile: docs/test-cases/todo.md, docs/test-cases/pet.md
- environment: public demo apps
- credentials: none

## Stages

| Stage | Agent | Model | Finished | Outcome | Summary |
| --- | --- | --- | --- | --- | --- |
| 0-assess | coordinator |  | 2026-11-02T10:00:00Z | done | fresh init-playwright-framework scaffold; cases copied from the verified examples; app https://demo.playwright.dev/todomvc and API https://petstore3.swagger.io/api/v3 reachable; no credentials needed |
| 1-document | coordinator |  | 2026-11-02T10:00:00Z | done | docs/test-cases/todo.md (5 cases) and pet.md (5 cases) already in the test-case-design format |
| 2-scaffold | coordinator |  | 2026-11-02T10:00:00Z | done | npm install clean |
| 3-build | sdet-build-page | sonnet (general-purpose in the pilot) | 2026-11-02T10:50:00Z | done | TodoPage with header/main/footer and a title-keyed item section; 8 states explored live; 0 UNVERIFIED; tsc, eslint, prettier, audit clean; re-verified by the coordinator (tsc, no .first()/sleeps) |
| 3-build | sdet-build-service | sonnet (general-purpose in the pilot) | 2026-11-02T10:45:00Z | done | PetService 7/8 operations mapped, uploadFile skipped with reason; coverage, tsc, eslint, audit clean; re-verified by the coordinator (coverage re-run) |
| 3-build | coordinator |  | 2026-11-02T11:05:00Z | done | registrations merged from the two reports; tsc and eslint clean on the merged tree |
| 4-implement | sdet-implement (todo.md) | sonnet (general-purpose in the pilot) | 2026-11-02T12:00:00Z | done | 5/5 automated; 18 passed x3 on 4 workers; can-fail 14 killed 0 survived; sentinel failed on its false value x3; re-verified by the coordinator (4/4 re-run) |
| 4-implement | sdet-implement (pet.md) | sonnet (general-purpose in the pilot) | 2026-11-02T12:10:00Z | partial | 4/5 green x3 on 4 workers, metamorphic can-fail 4 killed; TC-PET-003 (available) red on the shared server (finding verified by the coordinator: 3 of 254 pets without name); pet.spec.ts can-fail INCONCLUSIVE on the red baseline; nothing loosened |
| 4-implement | coordinator |  | 2026-11-02T12:30:00Z | done | petFactory registered; spec-local extends removed; tsc + eslint clean |
| 5-verify | sdet-verify | sonnet (general-purpose in the pilot) | 2026-11-02T14:20:00Z | partial | before the fixes: 36/39 passed x3 on 4 workers (3 reds = TC-PET-003 available, the known finding); sentinel failed-as-expected x3; can-fail 18 killed 0 survived, pet.spec.ts INCONCLUSIVE on the red baseline; audit/tsc/eslint/coverage clean; git status empty before and after |
| 5-review | sdet-review | sonnet (general-purpose in the pilot) | 2026-11-02T14:35:00Z | done | changes requested: 1 block (blocked case ran red unmarked), 3 warn (createAbsent unchecked delete; sentinel outside the e2e/api projects; Automation field vs status), 2 nit (registry row, DRY goto). Verified from a detached worktree after a concurrent can-fail mutant made its first run inconclusive. Every expected result of all 10 cases asserted; nothing weakened. |
| 5-verify | coordinator |  | 2026-11-02T15:05:00Z | done | applied the owner's answer to OQ-PET-001 (case first, then the test), the review's warns 2-4 and nit 5; nit 6 left (accepted decision). Re-run: 42 passed x3 on 4 workers, sentinel in e2e failed-as-expected x3, can-fail pet.spec.ts 2 killed 0 survived, tsc+eslint clean |

## Inventory

- page TodoPage (src/pages/todo/index.ts): 7 elements, live
- service pet (src/services/pet.service.ts): 8 operations, coverage 7/8 mapped in tags pet (11 out of scope), 1 skipped (uploadFile, octet-stream)

## Cases

| Case | State | Level | File / reason | Verified |
| --- | --- | --- | --- | --- |
| TC-TODO-001 | automated | ui | tests/e2e/todo.spec.ts | green ×3 /4w, can-fail killed |
| TC-TODO-002 | automated | ui | tests/e2e/todo.spec.ts | green ×3 /4w, can-fail killed |
| TC-TODO-003 | automated | ui | tests/e2e/todo.spec.ts | green ×3 /4w, can-fail killed |
| TC-TODO-004 | automated | ui | tests/e2e/todo.metamorphic.spec.ts | green ×3 /4w, can-fail killed |
| TC-TODO-005 | automated | ui | tests/e2e/todo.metamorphic.spec.ts | green ×3 /4w, can-fail killed |
| TC-PET-001 | automated | api | tests/api/pet.spec.ts | green ×3 /4w, can-fail killed |
| TC-PET-002 | automated | api | tests/api/pet.spec.ts | green ×3 /4w, can-fail not-run |
| TC-PET-003 | automated | api | tests/api/pet.spec.ts | green ×3 /4w, can-fail killed |
| TC-PET-006 | automated | api | tests/api/pet.metamorphic.spec.ts | green ×3 /4w, can-fail killed |
| TC-PET-007 | automated | api | tests/api/pet.metamorphic.spec.ts | green ×3 /4w, can-fail killed |

## Verification

- command: `npx playwright test --project=e2e --project=api --retries=0 --repeat-each=3 --workers=4`
- passed 42, failed 0, skipped 0, ×3, 4 workers
- sentinel: failed-as-expected
- can-fail: 20 killed, 0 survived
- audit: clean
- independent review (sdet-review (detached worktree)): 6 finding(s) — changes requested -> applied; nit 6 declined (navigation stays in tests by the page doc)

## Open questions

| ID | Question | For | Blocks |
| --- | --- | --- | --- |
| OQ-PET-AUTH | Does the target environment enforce petstore_auth / api_key on pet operations? The public demo does not; if yes, which test credential (API_KEY variable)? | API team |  |
| OQ-PET-001 | petstore3 serves pets without the required name under findByStatus (it accepts spec-violating POSTs). For TC-PET-003 on a shared server: bind a known bug (Petstore validation) at step 1, or restate expected result 1 to validate the pet this test created? The same assertion is in the sdet-skills example suites, so tonight's nightly will show it. ANSWERED 2026-11-02 by the case owner: validate the pet this test created; case restated, tests follow (D-18). | tuan (case owner) | TC-PET-003 |

## Stops and decisions

- 2026-11-02T10:50:00Z · 3-build · **other** — The app's row toggle is a native checkbox; the scaffold's CheckBox class (click-to-toggle, is-checked class) does not fit. Interim: Clickable + idempotent complete()/reopen() in TodoItemSection. Request: a NativeCheckBox element in src/elements/common (coordinator's path) — decide at Gate B. (TC-TODO-002, TC-TODO-004, TC-TODO-005) → Gate B: keep the interim; NativeCheckBox recorded as a scaffold improvement
- 2026-11-02T10:45:00Z · 3-build · **other** — Coordinator's brief named openapi-tool flags that do not exist (schemas --tag/--out); the agent generated to scratch and copied pet/ only. Fix: give openapi-tool schemas a --tags filter (shared script) and correct the brief. → to do in sdet-skills
- 2026-11-02T12:10:00Z · 4-implement · **red-baseline** — TC-PET-003 (available) fails schema validation on every run because of other users' spec-violating pets on the shared server; can-fail for tests/api/pet.spec.ts INCONCLUSIVE; expectation not loosened, case file not edited (TC-PET-003)
- 2026-11-02T12:00:00Z · 4-implement · **other** — Coordinator's brief said project "chromium"; the scaffold has e2e/chrome/api projects. Agents used the right ones and reported the mismatch. Fix: the brief names the projects from playwright.config.ts. → brief template corrected
- 2026-11-02T14:30:00Z · 5-verify · **other** — verify and review ran can-fail/tests on the same working tree; the reviewer saw a __mutant__ literal and a false red, re-verified from a detached worktree. Pipeline fix: runners never share a tree (D-19, sdet-review.md, stages.md 5). → fixed in sdet-skills

_Rendered from automation-status.json; edit the JSON, not this file._
