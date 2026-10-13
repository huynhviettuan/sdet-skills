# sdet-skills

A collection of portable [Claude Code](https://claude.com/claude-code) skills for SDET / test-automation work.

## Skills

- [`skills/sdet-framework-architect`](skills/sdet-framework-architect/SKILL.md) — framework-agnostic SOLID/clean-code/
  design-pattern guidance for building or reviewing test-automation frameworks (UI, API, or both) in any language or
  tool. Distilled from a production Playwright/TypeScript framework and cross-checked against a Java/Selenium/TestNG
  framework.
- [`skills/init-playwright-framework`](skills/init-playwright-framework/SKILL.md) — scaffolds a new
  Playwright/TypeScript test-automation repo with the layered architecture and tooling from `sdet-framework-architect`.
- [`skills/project-docs`](skills/project-docs/SKILL.md) — turns briefs, notes, and legacy docs into a modular Markdown
  documentation package (business rules, state machines, ADRs, acceptance criteria, AGENTS.md/CLAUDE.md, open
  questions) that serves as source of truth for humans and AI coding agents.
- [`skills/sdet-automation-docs`](skills/sdet-automation-docs/SKILL.md) — documents a test-automation project as a
  Senior SDET: risk-based scope, test-layer decisions, standards, data/account strategy, flaky/retry policy, CI
  stages, quality gates, and traceability. Builds on `project-docs` formats and `sdet-framework-architect` design
  rules.

The documentation skills share one ID scheme (`FR-` / `BR-` / `AC-` from product docs, `TC-` for automated
scenarios, `OQ-`, `ADR-`) so requirements trace through to tests.

## Using a skill from this repo

Pick one:

- **Global install**: copy the skill folder into `~/.claude/skills/` (e.g. `~/.claude/skills/sdet-framework-architect`).
- **Per-project**: point a project's `.claude/settings.json` at this repo's `skills/` directory:

  ```json
  {
    "skills": {
      "directories": ["path/to/sdet-skills/skills"]
    }
  }
  ```
