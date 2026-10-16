# Changelog

All notable changes to the sdet-skills plugin. Versions follow the `version` in `.claude-plugin/plugin.json`.

## [Unreleased]

### Added

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

### Fixed

- Playwright template: custom `expect` matchers registered under Playwright's own names replaced the built-ins
  globally, so `toHaveText` / `toBeVisible` failed for elements **and** raw locators. `expect` now unwraps element
  classes to their Locator and uses Playwright's matchers; `toBeSorted` no longer sorts its input in place (it always
  passed).
- Playwright template docs: removed the non-existent `apiCommands` fixture (services arrive authenticated from the
  service fixtures); corrected helper import paths; empty `PageObjects` type no longer fails lint.
- Audit: `architecture/` folders are tooling, not tests.
- `service-builder`: the Java template excerpt now says which `pet` operations it omits; the skill no longer claims
  per-tag coverage without the option that provides it.

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
