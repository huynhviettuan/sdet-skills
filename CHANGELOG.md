# Changelog

All notable changes to the sdet-skills plugin. Versions follow the `version` in `.claude-plugin/plugin.json`.

## [Unreleased]

### Fixed

- The repo's working rules moved from `CLAUDE.md` to `.claude/CLAUDE.md`. CI's strict validation of the plugin
  manifest had failed on every push since the rules were added (a root `CLAUDE.md` is not loaded for plugin users);
  only the marketplace target had been validated locally. Claude Code reads `.claude/CLAUDE.md` as project
  instructions, so contributors keep the rules; the local check now names every target CI validates.

### Added

- `security-testing` upgraded for cybersecurity QA. A runnable example `examples/vuln-api` (stdlib API, eleven
  switchable flaws: bola, mass, headers, cors, errors, ratelimit, enum, jwt-none, jwt-nosig, jwt-noexp, audit) with the suite the skill
  asks for — matrix from the permission table, BOLA with the object-unchanged assertion, mass assignment, headers
  and CORS both ways, error leakage, lockout, enumeration, three JWT cases, audit, a strict sentinel: 35 passed +
  1 xfailed on 2026-11-03; `scripts/selftest.py` enables one flaw at a time and proves exactly the tests that claim
  it turn red. Two scripts: `authz_matrix.py generate|verify` (the `ROLES_PERMISSIONS.md` table is the single
  source of authorization cases; verify proves every cell ran and passed from JUnit) and `headers_check.py` (live
  header/cookie/CORS policy with a `test_hosts` guard). Three references: `api-security.md` (OWASP API Top 10 2023
  item by item, JWT/OAuth/OIDC, SSRF, GraphQL, webhooks, idempotency and races), `schema-driven-negative-tests.md`
  (deterministic negative cases from the OpenAPI schema via `service-builder`), `security-in-the-sdlc.md` (DoD,
  PR checklist for test code, environment guard, release regression, synthetic data, CI secrets, the framework's
  own supply chain, external report intake, metrics, review template). `automated-security-tests.md` now copies its
  code from the example; the threat model names the LLM boundary (`ai-guardrail-testing`).
- `ai-guardrail-testing`: testing the rails around an LLM feature or agent — a `GR-<AREA>-NNN` policy catalogue,
  the entry-point × side-effect threat grid with an OWASP LLM Top 10 mapping, an attack catalogue in eight classes
  (direct, indirect through tool output / documents / pages, encoding and language, multi-turn, tool-argument
  tampering, extraction, resource abuse, over-refusal) each with a deterministic oracle, paraphrase sets as
  metamorphic relations, the tool-gate test pattern, output contracts, a strict sentinel, verdicts with
  *inconclusive* for a flaky model path, and an LLM judge that stays advisory until `scripts/measure_judge.py --gate`
  passes on a held-out set (defaults n ≥ 100, FPR ≤ 2 %, FNR ≤ 5 %, overridable and recorded). A runnable
  `examples/stub-agent` (pytest, no model) with a gullible fake model and the real gate: 12 passed + 1 xfailed
  sentinel on 2026-11-03; its first paraphrase-set run caught a one-spelling Vietnamese intent pattern. The
  selftest scores the judge gate, runs the example and proves the sentinel turns the suite red when the gate is
  opened; it runs in CI's `skill-scripts` job.
- The automation pipeline runs as a team: `sdet-automation-coordinator` (Sonnet) owns `docs/automation-status.json`
  and spawns one isolated subagent per stage — `sdet-assess` (Opus), `sdet-build-page` / `sdet-build-service` (one
  per screen / tag, in parallel), `sdet-implement` (per case file, in parallel), `sdet-verify`, an independent
  `sdet-review`, `sdet-triage` (Haiku). Stage brief and stage report shapes in `automation-pipeline/references/stages.md`;
  `sdet-automation-agent` kept behind `/automate --single-context`.
- Ran once on 2026-11-02 as a pilot (TodoMVC + Petstore on a fresh Playwright scaffold, this session acting as the
  coordinator): 2 build agents and 2 implement agents in parallel over disjoint paths, verify and an independent
  reviewer in parallel, three gates with the user. 10/10 cases automated, 42 passed ×3 on 4 workers, sentinel held,
  can-fail 20 killed / 0 survived; the implement agent refused to loosen a red test caused by other users' data on
  the shared server (decision D-18); the reviewer found the verify/review shared-tree hazard (decision D-19) and a
  missing precondition check. Two coordinator brief errors (a tool flag, a project name) were caught by the agents
  and fixed in the tool and the brief template.
- Stop rules as hooks in every scaffold: `scripts/guard-hooks.mjs` (PreToolUse on Bash and Edit/Write, PostToolUse
  audit) blocks a merge or push to the default branch, a production host (`.claude/guard.json`), a permission bypass,
  a fixed sleep, and an edit that changes an existing assertion in a test (`ALLOW_ASSERTION_EDIT=1` is a person's
  override); `audit-suite --fail-on block` runs after every write under `src/` or `tests/`. Self-tested; every guard
  shown to fail its tests when removed.
- `automation-status.json` with a schema (`automation-pipeline/schemas/`) and `scripts/status.mjs validate | render |
  summary` (dependency-free validator; the Markdown status is rendered from the JSON). Shipped in every scaffold.
- `openapi-tool schemas --tags <tags>`: writes only those services' schemas, so a service builder working on one tag
  never writes outside its paths (found when a stage agent's brief named a flag that did not exist and the agent
  generated to scratch rather than write other tags' folders). `service-builder/scripts/selftest.mjs` covers
  inventory, schemas with and without `--tags`, and coverage (clean, missing, extra).
- Schema helpers validate one value, not only a whole response: `SchemaValidator.assertMatches(Object, folder, name)`
  (Java) and `assert_value_matches(value, folder, name)` (Python); TypeScript's `validateJsonSchema` already took
  any object. Needed by TC-PET-003 below.
- `.mcp.json.example` in the Playwright scaffold: a headless, isolated, origin-limited Playwright MCP for an explorer
  subagent that should have a browser and nothing else.

- Working rules for the repo itself: `CLAUDE.md` (a refusal is a stop, green is earned, no "verified" without a
  repeating job, heuristics measured or advisory, one owner per table, Windows-first hygiene, the subagent brief),
  path-scoped `.claude/rules/` (skills, scripts, examples and templates, evals), and `docs/decisions.md` (the calls
  made so far: three stacks, composition, KQ- vs OQ-, Low conflicts, literal-only mutation, separate document
  packages, evals on demand, nightly examples, OQ-13 human-only, the agent repo's docs, denied calls stop a step).
- Two of the rules are mechanical: `check-repo` fails a README stack row that says "verified" without the job that
  re-runs it; CI fails a PR that changes a skill script without touching its self-test.

### Fixed

- Example factories (all three stacks): teardown is judged by the real signal — the pet is gone — not by the delete's
  status. The nightly run of 2026-10-30 failed on a Petstore `DELETE` that answered 304 for a pet that was deleted;
  the Java factory had the opposite flaw and never reported a leak. A non-200/404 delete now gets a GET-checked retry
  and only a pet still present fails the teardown (decision D-13).

### Changed

- TC-PET-003 (sample cases, the three example suites, the code templates) asserts the contract on the pet the test
  created, not on every record of the shared server's response: on 2026-11-02 the public Petstore served three pets
  without the required `name`, planted by other users, and the pipeline's implement agent correctly refused to
  loosen the test. Decision D-18; the whole-body check belongs to a case against a server you control.

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
