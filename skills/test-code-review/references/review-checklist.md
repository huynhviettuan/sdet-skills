# Review Checklist

One pass over a change, in this order. Each line names the rule it applies (`R-…` from
`refactor-test-suite/references/rules.md`, `S-…` from [`coding-standards.md`](coding-standards.md), or a builder's
checklist) and its severity. Tool-enforced lines are confirmed by running the tool, not by reading.

Severity: **block** — must change before merge; **warn** — should change, author may defer with a reason; **nit** —
take it or leave it.

Contents:

- [0 Scope and intent](#0-scope-and-intent)
- [1 Deterministic checks](#1-deterministic-checks)
- [2 Correctness: can this test lie?](#2-correctness-can-this-test-lie)
- [3 Architecture](#3-architecture)
- [4 DRY — one source of truth](#4-dry--one-source-of-truth)
- [5 KISS — the least machinery](#5-kiss--the-least-machinery)
- [5b YAGNI — only what the cases need](#5b-yagni--only-what-the-cases-need)
- [6 Page objects (when the change adds or edits them)](#6-page-objects-when-the-change-adds-or-edits-them)
- [7 Services (when the change adds or edits them)](#7-services-when-the-change-adds-or-edits-them)
- [8 Documentation and traceability](#8-documentation-and-traceability)
- [What not to flag](#what-not-to-flag)

---

## 0 Scope and intent

```text
[ ] The change does one thing (feature, refactor, or fix — not two); a refactor changes no expectation        warn
[ ] Every new test maps to a test case / AC, or the PR says why it has none                                  warn
[ ] Nothing unrelated is touched (formatting-only churn, drive-by renames)                                    nit
```

## 1 Deterministic checks

Run them; report results; don't re-review what they enforce.

```text
[ ] Compiles: tsc --noEmit / mvn -q test-compile                                                             block
[ ] Lint clean: eslint . (incl. the R- rules) / ArchitectureRulesTest                                        block
[ ] Audit: node scripts/audit-suite.mjs . --fail-on block (warn findings listed)                             block
[ ] Changed tests pass with retries 0; new tests pass --repeat-each=3 and in parallel                        block
[ ] At least one new test was shown to fail when its expectation is broken (ask, or do it)                   warn
[ ] openapi-tool coverage --tags <changed tags> clean, if services changed                                   warn
```

## 2 Correctness: can this test lie?

```text
[ ] Every expected result of the case has an assertion with the stated value               S-KISS-ASSERT   warn
[ ] A negative check has a sync point; the "nothing happened" check runs after it          test-script-writer block
[ ] No assertion that passes vacuously (empty list `allSatisfy`, `toBeTruthy` on a string) S-KISS-ASSERT   warn
[ ] Waits are on signals, bounded; no sleeps, no force                                     R-NO-SLEEP/R-FORCE block
[ ] Actions and assertions awaited; no floating promises                                   S-ASYNC-AWAIT    block
[ ] No try/catch or `.catch` that turns a failure into a pass                              S-ERROR-BOUNDARY  block
[ ] No conditional that decides whether an assertion runs                                  S-KISS-FLAT   warn
[ ] Data created per test with unique keys; cleanup owned by the creator, in teardown      R-SHARED-STATE/R-TEARDOWN block
[ ] Retries not raised to hide flakiness                                                   R-RETRY-MASK      warn
```

## 3 Architecture

```text
[ ] Tests use only fixtures / pages() services() data(); no raw locators or HTTP          R-RAW-UI / R-RAW-HTTP block
[ ] No `new Page()` / `new Service()` in tests; no `@playwright/test` import in tests      R-COMPOSITION     block
[ ] Elements resolved through the owning container; roots are the only page-level lookup   R-SCOPE           warn
[ ] Rows found by business key, not index                                                  R-POSITION        warn
[ ] Cross-cutting concerns (toasts, loading, pagination) through the shared component      architect         warn
[ ] Secrets from config; URLs from config/Endpoints                                        R-SECRETS / R-HARDCODED-URL block/warn
[ ] Thread/process model respected (ThreadLocal driver; no instance fields, priority or dependsOn in TestNG tests) R-SHARED-STATE / S-JAVA-NO-FIELDS / S-JAVA-NO-ORDER block
[ ] Java: AssertJ only, UI assertions in Eventually.verify, traceability in annotations S-JAVA-ASSERTJ / S-JAVA-EVENTUALLY / S-JAVA-ANNOTATIONS warn/block
[ ] TypeScript: fixtures only (no @playwright/test in specs), scopes match lifetimes, web-first / expect.poll, tag + annotation options S-TS-FIXTURES / S-TS-SCOPE / S-TS-POLL / S-TS-TAGS block/warn
[ ] JavaScript repo: TypeScript migration planned before new tests; JSDoc + ts-check meanwhile S-TS-JS warn
[ ] Python: fixtures only (no playwright/httpx imports in tests), cleanup after yield, expect/eventually, parametrize ids, markers S-PY-FIXTURES / S-PY-YIELD / S-PY-WAIT / S-PY-MARKS block/warn
[ ] Composition: no page, container, test or service inherits beyond the thin bases            R-INHERIT / S-KISS-COMPOSE warn
```

## 4 DRY — one source of truth

```text
[ ] Every locator in exactly one page object / container; shared widgets are components           S-DRY-LOCATOR / S-DRY-CROSS-CUTTING warn
[ ] User-facing text and routes are named constants                                                S-DRY-COPY / S-DRY-ROUTES warn
[ ] Data created through the one factory for that thing; repeated setup is a fixture               S-DRY-DATA / S-DRY-SETUP warn
[ ] Same test, different value → data rows; same method, different label → a parameter             S-DRY-PARAM       warn
[ ] Registry, fixtures and Services checked; nothing duplicated that exists                        S-DRY-REGISTRY    warn
[ ] Facts deduped, step sequences left readable (no helper that hides what a test does)            S-DRY-NOT-SENTENCES nit
```

## 5 KISS — the least machinery

```text
[ ] Arrange → Act → Assert visible; one behavior per test; no logic picking the assertion         S-KISS-FLAT / S-KISS-ONE warn
[ ] Tests read as business steps; mechanics are in page objects / services                         S-KISS-INTENT     warn
[ ] Names say what, not how; [TC-id] behavior titles; booleans as questions; element prefixes      S-KISS-NAME       warn
[ ] Plainest matcher for the stated value; messages on preconditions                               S-KISS-ASSERT     warn/nit
[ ] Page methods are user verbs; no assertions in pages; one container per region                  S-KISS-PAGE       warn
[ ] No framework inside the framework (engines, reflection loaders, generic "runners")             S-KISS-NO-ENGINE  warn
[ ] Sharing by composition (components, fixtures), not inheritance chains                          S-KISS-COMPOSE    nit
[ ] Comments explain why; none restate the code                                                    S-KISS-COMMENT    nit
```

## 5b YAGNI — only what the cases need

```text
[ ] New helper/factory/fixture has a third real caller, or a stated reason                         S-YAGNI-RULE3     warn
[ ] No interface, base class, generic or option with one implementation / caller                   S-YAGNI-ONE-CALLER warn
[ ] Pages model the elements the cases touch; services cover the tags the cases call               S-YAGNI-SCOPE     warn
[ ] No commented-out code, unused parameters, leftovers; skips carry an id and a reason             S-YAGNI-DEAD      warn
[ ] No guards against the framework's guarantees (conditional clicks, null checks on fixtures)     S-YAGNI-DEFENSIVE nit
[ ] No config switch without two environments; no cross-product package without a second product   S-YAGNI-CONFIG / S-YAGNI-SHARE nit
[ ] Files and classes sized for one reader sitting                                                 S-FILE            nit
```

## 6 Page objects (when the change adds or edits them)

From `page-builder/references/code-templates-*.md`:

```text
[ ] Scope matches the test cases; nothing modeled "just in case"                                           warn
[ ] Every element built from its container/section root; locators follow the priority (testId → role+name → label → text) warn
[ ] Repeated items are sections behind a factory keyed by business value                                   warn
[ ] No assertions, navigation decisions, or fixed waits inside page objects                                block
[ ] Element class behavior verified on the target DOM (new class where the DOM differs)                    warn
[ ] Registered: fixtures / Pages, Endpoints, docs/registry/pages.md; smoke spec covers the explored states   warn
```

## 7 Services (when the change adds or edits them)

From `service-builder/references/code-templates-*.md`:

```text
[ ] One class per tag, one method per operation, name = operationId, spec path verbatim, @operationId tag   warn
[ ] Types and response schemas from the spec; bodies typed (TS: `type`, not `interface`)                   warn
[ ] Auth from securitySchemes in a worker-scoped fixture / Credentials; nothing per test                   warn
[ ] Services never assert or decide success; tests assert on the response                                  S-KISS-SERVICE warn
[ ] Hand-written operations (not in the spec) carry no @operationId and say so                             warn
[ ] Registered in service fixtures / Services and docs/registry/services.md                                warn
```

## 8 Documentation and traceability

```text
[ ] Test-case file updated (Automation field, coverage summary); status file if the pipeline is in use     warn
[ ] Registry rows for new pages/services/elements                                                          warn
[ ] A changed expectation has its case / AC changed too, and says so in the PR                             block
[ ] PR description: what, why, how verified (the runs), what to look at first                              nit
```

---

## What not to flag

- Anything Prettier, ESLint, tsc, ArchUnit or the audit already report — run them and cite the output instead.
- Two similar tests (S-YAGNI-RULE3: the third use extracts, not the second), and readable step sequences that
  could be squeezed into a helper (S-DRY-NOT-SENTENCES).
- Choices the repo's ADRs already made (a fixture singleton, a naming prefix, the alias layout); a disagreement
  with an ADR is a proposal, not a review finding.
- Style with no consequence for the reader (brace placement, import order the linter doesn't own, quote style).
- Hypothetical future needs ("this won't scale if we add 50 roles") when the change is correct for the current
  cases.
- A finding you cannot state as "at line N, X happens, so Y" — if it can't be verified, it isn't reported.
