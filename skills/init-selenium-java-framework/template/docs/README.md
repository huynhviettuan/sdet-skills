# Documentation

| Goal | Read |
| --- | --- |
| Conventions for code in this repo | [`../CLAUDE.md`](../CLAUDE.md), [`../.claude/rules/`](../.claude/rules/) |
| See which pages and services exist | [registry/](./registry/) |
| Document a user story | [user-stories/](./user-stories/) — acceptance criteria as `AC-<AREA>-NNN` |
| Document test cases | [test-cases/](./test-cases/) — `TC-<AREA>-NNN`, each citing the AC it verifies |
| Know why the framework is shaped this way | [decisions/](./decisions/) — ADRs, append-only |
| Run in CI | [ci/](./ci/) — GitHub Actions template (inert until copied to `.github/workflows/`) |

## IDs

Acceptance criteria `AC-<AREA>-NNN`, test cases `TC-<AREA>-NNN` (security: `TC-SEC-<AREA>-NNN`), never reused or
renumbered. Put the TC ID in the TestNG `description` so reports trace back to the case.

## Beyond this scaffold

Strategy-level documents (automation strategy, risk scope, data and account strategy, flaky policy, CI stages,
quality gates) are generated with the `sdet-automation-docs` skill and live under `docs/automation/`; product rules
and acceptance criteria with `project-docs`; test cases with `test-case-design`.
