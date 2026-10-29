# Changelog

All notable changes to the sdet-skills plugin. Versions follow the `version` in `.claude-plugin/plugin.json`.

## [Unreleased]

### Changed

- One owner per shared table: the ID scheme lives in the README (project-docs keeps only the prefixes it owns);
  "what the executable-spec format can't express" lives in `test-script-writer/references/executable-spec.md`
  (manual-qa-agent's routing page keeps only the framework route per remaining reason); the `@AGENTS.md` import
  mechanic lives in project-docs.

## [1.6.0] — 2026-10-28

What a green run has to earn.

### Added

- `test-script-writer/scripts/can-fail.mjs`, in every scaffold: changes the expected value on each new assertion line
  one at a time, runs the file, restores it; a mutation the run doesn't notice is an assertion that cannot fail.
  Skips assertion messages (Python `assert …, "msg"`, TestNG/JUnit/`node:assert` trailing messages, AssertJ `.as()`),
  checks polling assertions (`expect.poll`, `Eventually`, `eventually`), and treats an all-skipped baseline as
  inconclusive, never as a pass. Self-tested in CI.
- Sentinel tests: one known-false expectation per suite, through the same page objects and assertions, marked so the
  run is red if it ever passes (`test.fail()`, `expectedExceptions = AssertionError.class`, `xfail(strict=True)`).
- Metamorphic and derived-value tests in each stack's code templates (filter partition of a list, inverse
  relations, a record moving between filters, superset queries).
- `test-script-writer/examples/<stack>/`: the sample cases implemented on each scaffold with a sentinel and
  metamorphic tests, and `run-examples.sh` (scaffold, gates, 3 repeats in parallel, can-fail); a `Nightly examples`
  workflow runs all three against the public demo apps, so "verified on TodoMVC and Petstore" is re-earned nightly.
- `check_cases.py --kb`: coverage of the knowledge base's testable rules ("N of M testable rules have a case", the
  not-testable-yet rows listed with their question), and a case marked `specified` on a requirement disputed in a
  High or Medium conflict of the KB's analysis is an error — it encodes a guess. It reads the 20-column CSV workbook.
- Evals for `test-script-writer` (a negative case: no fixed waits, the page object, proof that nothing changed) and
  `project-knowledge-base` (no invented steps, both sides of a conflict, line citations, dashed inferred edges).

### Changed

- `check_cases.py` measured on a held-out catalogue (Flow Fitness: 376 cases, 983 expected results): 0 errors; the
  per-line status-only check flagged 10 % of lines, mostly falsely, and was replaced by a per-case rule (3 % of cases,
  about half genuinely weak); missing evidence quotes are summarised per case. The numbers are in
  `coverage-and-prioritization.md`.
- The Python scripts write UTF-8 on Windows consoles (they crashed on a dash or Vietnamese text before).

### Fixed (found by running the examples for real)

- Playwright template: `StringHelper.normalizeParams` joined query arrays with commas (`?tags=a,b`); OpenAPI's default
  is one key per value (`?tags=a&tags=b`), and Petstore's `findByTags` answered `[]` to the comma form. It now returns
  `URLSearchParams` with repeated keys and drops undefined values. (httpx and RestAssured already repeat keys.)
- Java template: `ArchitectureRulesTest`'s composition rule rejected the anonymous `new TypeReference<>() {}` that
  service-builder's own template uses for list responses, so any service with a list operation failed on a stock
  scaffold; the services rule now checks top-level classes, like the test-class rule.
- Python template: the `metamorphic` and `sentinel` markers are registered (the template runs `--strict-markers`).
- Playwright template troubleshooting: Playwright 1.61 cannot load any config on Node 22.15
  (`context.conditions?.includes is not a function`); `PLAYWRIGHT_FORCE_ASYNC_LOADER=1` works around it.
- Code templates: an assertion message on TC-PET-002 made a can-fail mutant survive, and TC-PET-003 passed on an empty
  search; both fixed in the references and the examples.

## [1.5.0] — 2026-10-28

### Added

- `evals/`: behavioural evals for `claude plugin eval` — `test-case-design` on a six-rule story (boundaries beyond
  the range, the no-approval column, a refused-role case at API level, quoted evidence, the vague clause as a
  question), trigger cases for `project-knowledge-base` and `manual-qa-agent` (with the refusal to edit an
  expectation), and a must-not-trigger case; a manual `Skill evals` workflow with a JSON summary.
- `check_cases.py --kb <knowledge-base>`: the catalogue comes from the KB's sources, `[Sxx Lnn]` citations in a case
  must resolve, and an evidence quote with a citation is verified against the source line.

### Changed

- `project-docs` hands source analysis to `project-knowledge-base` for large document sets and maps each step of its
  requirement-analysis workflow to the KB page that already holds the input.
- `manual-qa-agent` and `test-script-writer/references/executable-spec.md` brought up to the Manual QA Agent's
  ADR-0015–0026, with every shape taken from the agent's code: run-scoped values and captures, draft sets, the full
  case schema and the mapping to the `test-case-design` format, coverage/exports/questions, case codes, known bugs
  bound to steps, stale cases, regression scope, suite preflight and report labels (detection, unstable, unproven),
  the API-testing steps (`session`, `expectJson`, `rows`, `waitFor`, `press`, `upload`, `expectDownload`,
  `rawBody`, `headers`, `totp`, `testHook`), the agent's own step proposals (`propose_steps`), clause-level drafting
  and the three model modes. `check-spec.mjs` checks the new step kinds and relays the agent's weak-assertion flags.

## [1.4.0] — 2026-10-28

### Added

- `project-knowledge-base`: turns a folder of project documents (Markdown, Word, PDF, Excel, PowerPoint, HTML, CSV,
  images) into a cited, navigable knowledge base — digests per source, overview, glossary, roles, domain model and
  lifecycles, business flows with Mermaid diagrams, rules, requirements, integrations, decisions, cross-source
  analysis (conflicts, gaps, ambiguities, stale and missing documents, open questions), a testing view and an index.
  `scripts/ingest.py` (extraction, manifest, outlines, incremental change detection) and `scripts/check_kb.py`
  (citations resolve to live sources and lines, digests, links and heading anchors, fences; warns on email
  addresses and phone-like numbers), and `scripts/selftest.py` for both, run in CI. Verified on a 51-file gym CRM
  document set: 51 digests, 23 pages, 12 flows, 94 graded cross-source findings, checker clean.

### Changed

- `test-case-design`, upgraded with what the Manual QA Agent learned from a 376-case pilot (agent ADR-0015–0026):
  - **Cases:** each case has a basis (specified or assumption) and a verbatim evidence quote per expected result.
    Clear clauses of unclear criteria are designed; only the unclear clause goes to an OQ. No case for a limit the
    documents don't state.
  - **Records:**
    - a dated requirement catalogue, with stale cases when the text behind an ID changes;
    - an OQ register with observed behaviour;
    - known bugs bound to steps;
    - regression scope by area and by requirement;
    - generated views and the 20-column CSV.
  - **Techniques:** permission matrix (privilege boundary, every layer, signed-out, data scope, exhaustive API
    sweep), account journeys, syntax testing, metamorphic relations, defect-based sweeps, pairwise verified by
    program, and "where designs are thin".
  - **Scripts:** `check_cases.py` (IDs, fields, basis, catalogue references, AC coverage, advisory evidence and
    vagueness hints, traceability CSV) and `pairwise.py` (generate and verify all-pairs tables with the reason for
    each value), with `selftest.py`.
- `test-script-writer` reads the new case fields: `Level`, `Basis: assumption` (record what was observed), evidence
  quotes in assertion messages, known bugs failing expectedly only at the named step, `Exclusive` cases run
  serially, one `@req:<ID>` tag per verified requirement.
- `sdet-automation-docs` generates the requirement → case half of the traceability matrix with `check_cases.py`.
- `project-docs` points to `project-knowledge-base` when the input is a large pile of existing documents.
- CI: a `skill-scripts` job runs every skill's `scripts/selftest.py`; CONTRIBUTING requires one for any checking or
  generating script.

## [1.3.0] — 2026-10-28

### Added

- Python stack: `init-pytest-playwright-framework` (pytest, Playwright for Python, httpx, pydantic, jsonschema,
  xdist, uv; ruff banned-api + mypy strict) and Python templates for `page-builder`, `service-builder` and
  `test-script-writer`, generated from code verified on TodoMVC and Petstore (9/9, ×3 repeat, 4 workers, can-fail).
- Stack contract (`sdet-framework-architect/references/stack-contract.md`): composition as the design at every
  layer, the 14 requirements for a supported stack, supported and planned stacks, stack detection.
- `R-INHERIT` (composition rule) in the audit for TypeScript, Java and Python, in the TS scaffold's ESLint config
  and in the Java scaffold's `ArchitectureRulesTest`; Python rules for every audit rule.
- `openapi-tool coverage` reads Python docstrings, `#`/`//` comment blocks and C# files.
- Python-only coding standards (`S-PY-…`) in `test-code-review`.
- CONTRIBUTING.md (definition of done for a skill and for a stack); CI jobs for the Python scaffold and a changelog
  guard on pull requests.

## [1.2.0] — 2026-10-28

### Added

- `test-code-review`: coding standards grouped under DRY, KISS and YAGNI (`S-…` rules, TypeScript and Java), a review
  checklist merging the `R-…` rules and the builders' checks, a verified-findings workflow, and `/review-tests`.

- `scripts/check-repo.mjs` and a GitHub Actions workflow: frontmatter, links and anchors, identical shared-script
  copies, and both templates compile / lint / audit clean on every push.
- Editor and build-time enforcement of the audit rules, keyed to the same rule IDs: ESLint `no-restricted-*` rules
  in the Playwright template; `ArchitectureRulesTest` (ArchUnit) in the Java template.
- Element-class DOM assumptions documented in the Playwright template's element registry.
- LICENSE (MIT) and this changelog.
- `openapi-tool coverage --tags <tags>`: feature-scoped coverage (missing operations outside the scope no longer fail
  the check; extra and duplicated still do). Found by running the pipeline's Java/API path on Petstore.
- `manual-qa-agent` skill: the agent's HTTP tool-server mode (agent ADR-0013) and the story-submission decision
  (agent ADR-0012).

- From the Gym CRM pilot (`automation-pipeline/references/unattended.md` has the numbers): what may run unattended
  and two CI templates (`templates/nightly-triage.yml`, `templates/author-from-test-cases.yml`, not yet run in
  CI); "Sessions per role" in the test-script-writer templates; the Playwright template pins the browser locale and
  lints API models to `type`-only; guidance for landmark-less component libraries, portals, streamed rendering,
  cookie sessions with Origin checks, sign-in endpoints missing from the spec, APIs without delete, framework-generated
  operationIds, shared rate limits, and checking the API before routing a case to manual.

### Fixed

- `openapi-tool coverage` read the word "@operationId" in prose as a tag; tags now count only at the start of a JSDoc
  line.
- Audit: a deliberately wrong credential in a negative test (`password: 'wrong…'`) is no longer reported as a
  secret; real-looking values still are.
- Playwright template: custom `expect` matchers registered under Playwright's own names replaced the built-ins
  globally, so `toHaveText` / `toBeVisible` failed for elements **and** raw locators. `expect` now unwraps element
  classes to their Locator and uses Playwright's matchers; `toBeSorted` no longer sorts its input in place (it always
  passed).
- Playwright template docs: removed the non-existent `apiCommands` fixture (services arrive authenticated from the
  service fixtures); corrected helper import paths; empty `PageObjects` type no longer fails lint.
- Audit: `architecture/` folders are tooling, not tests.
- `service-builder`: the Java template excerpt now says which `pet` operations it omits; the skill no longer claims
  per-tag coverage without the option that provides it.

### Known issues

- Playwright template: `BrowserInstance.getRequest()` opens a new API request context per call and never disposes
  it. Harmless in the pilot's runs; disposing it after the body is read would break code that reads the response
  later, so it needs a design change rather than a one-line fix.

## [1.1.0] — 2026-10-16

### Added

- Automation agent: `automation-pipeline` skill (stages, gates, stop rules, resumable status file),
  `sdet-automation-agent`, and `/automate`.
- `manual-qa-agent` skill and the executable-spec target in `test-script-writer`, with `check-spec.mjs`.

### Fixed

- Playwright template: `playwright-core` pinned to match `@playwright/test`; missing `users.json`; five lint errors.

## [1.0.0] — 2026-10-14

### Added

- Skills: `sdet-framework-architect`, `init-playwright-framework`, `init-selenium-java-framework`, `page-builder`,
  `service-builder`, `test-script-writer`, `debug-failed-tests`, `refactor-test-suite`, `test-case-design`,
  `project-docs`, `sdet-automation-docs`, `performance-testing`, `security-testing`.
- Plugin manifest and marketplace entry.
