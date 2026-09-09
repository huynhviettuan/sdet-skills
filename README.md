# sdet-skills

A collection of portable [Claude Code](https://claude.com/claude-code) skills for SDET / test-automation work.

## Skills

- [`skills/sdet-framework-architect`](skills/sdet-framework-architect/SKILL.md) — framework-agnostic SOLID/clean-code/
  design-pattern guidance for building or reviewing test-automation frameworks (UI, API, or both) in any language or
  tool. Distilled from a production Playwright/TypeScript framework and cross-checked against a Java/Selenium/TestNG
  framework.

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
