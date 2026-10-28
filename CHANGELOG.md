# Changelog

All notable changes to the sdet-skills plugin. Versions follow the `version` in `.claude-plugin/plugin.json`.

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
