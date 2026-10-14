# sdet-skills

A collection of portable [Claude Code](https://claude.com/claude-code) skills for SDET / test-automation work —
from documenting what a product must do, through designing test cases and the automation framework, to performance
and security testing.

## Which skill when

```text
Product requirements unclear or undocumented
  └─► project-docs            business rules, state machines, AC, ADRs, AGENTS.md
        │
        ▼
What exactly do we test for this story / rule?
  └─► test-case-design        techniques → TC-<AREA>-NNN cases linked to AC/BR
        │
        ▼
How is automation organized, run, and governed?
  └─► sdet-automation-docs    strategy, risk, layers, data, flaky policy, CI, traceability
        │
        ▼
How is the framework code structured?
  └─► sdet-framework-architect   layers, scoping, fixtures, patterns, review checklist
        │
        ▼
Start a new repo with that architecture
  ├─► init-playwright-framework     Playwright / TypeScript
  └─► init-selenium-java-framework  Selenium + RestAssured / Java / TestNG / Maven
        │
        ├─► page-builder       explore screen + test cases → page objects, containers, sections (TS or Java)
        ├─► service-builder    OpenAPI spec → services 1:1 (operationId methods), types, schemas, coverage (TS or Java)
        │
        ▼
Turn the TC-… cases into automated tests
  └─► test-script-writer      one test per case / data row, factories + teardown, every expected result asserted

Non-functional, alongside any of the above:
  ├─► performance-testing     SLOs, workload model, scripts, runs, analysis, report
  └─► security-testing        threat model, authz/BOLA tests, pipeline scanners, triage

When tests go red:
  └─► debug-failed-tests      evidence → classify → reproduce → root cause → prove fix → route

An existing suite that doesn't follow these rules:
  └─► refactor-test-suite     baseline → audit (rule IDs) → plan → small verified steps → CI ratchet
```

| You want to… | Use |
|---|---|
| Turn a brief / stakeholder notes into a source-of-truth doc set | `project-docs` |
| Write or review test cases for a story, ticket, or rule | `test-case-design` |
| Decide what to automate and at which layer; document the automation project | `sdet-automation-docs` |
| Design or review page objects, services, fixtures, DI | `sdet-framework-architect` |
| Scaffold a new Playwright/TypeScript test repo | `init-playwright-framework` |
| Scaffold a new Selenium + RestAssured Java (TestNG, Maven) test repo | `init-selenium-java-framework` |
| Build page objects for a screen from the live app + test cases | `page-builder` |
| Generate API services from an OpenAPI/Swagger spec (or draft one) | `service-builder` |
| Implement documented test cases as automated tests | `test-script-writer` |
| Load, stress, soak, capacity testing; perf results analysis | `performance-testing` |
| Authorization/tenant isolation tests, security scans in CI, finding triage | `security-testing` |
| Investigate a failing, flaky, or CI-only test; triage a red run | `debug-failed-tests` |
| Audit / clean up / migrate an existing (legacy) test suite; enforce test coding rules | `refactor-test-suite` |

The documentation skills share one ID scheme so requirements trace through to tests:

| Prefix | Meaning | Defined by |
|---|---|---|
| `FR-<AREA>-NNN` | Functional requirement / feature | project-docs |
| `BR-<AREA>-NNN` | Business rule | project-docs |
| `AC-<AREA>-NNN` | Acceptance criterion | project-docs |
| `TC-<AREA>-NNN` | Test case (`TC-SEC-…` for security) | test-case-design / sdet-automation-docs |
| `OQ-NNN` | Open question | all |
| `ADR-NNN` | Architecture decision record | all |

## Skills

- [`sdet-framework-architect`](skills/sdet-framework-architect/SKILL.md) — framework-agnostic SOLID/clean-code/
  design-pattern guidance for building or reviewing test-automation frameworks (UI, API, or both) in any language
  or tool.
- [`init-playwright-framework`](skills/init-playwright-framework/SKILL.md) — scaffolds a new Playwright/TypeScript
  test-automation repo with the layered architecture and tooling from `sdet-framework-architect`.
- [`init-selenium-java-framework`](skills/init-selenium-java-framework/SKILL.md) — scaffolds a Java 17 / Maven /
  TestNG repo for Selenium 4 UI and RestAssured API tests (AssertJ, Allure, Jackson, Lombok): lazy strict
  parent-scoped locators, per-thread WebDriver and test context for parallel methods, teardown registry, retrying
  assertions, OpenAPI-ready `BaseService`, and failure evidence in Allure.
- [`page-builder`](skills/page-builder/SKILL.md) — explores the live app and the feature's test cases, decomposes the
  screen into containers, repeated-item sections, and shared components with parent-scoped locators, confirms an
  element inventory, then generates, registers, and smoke-tests the page objects.
- [`service-builder`](skills/service-builder/SKILL.md) — generates services 1:1 from an OpenAPI/Swagger spec: one
  class per tag, one method per operation named after its operationId, spec-derived types and response schemas,
  auth fixtures, and a coverage check (bundled dependency-free `openapi-tool.mjs`); drafts a spec from captured
  traffic when none exists.
- [`test-script-writer`](skills/test-script-writer/SKILL.md) — implements documented test cases as tests (Playwright
  or Selenium/RestAssured Java): prerequisite check, preconditions through data factories with automatic teardown,
  steps through page objects/services, every expected result asserted, data rows as separate tests, TC/AC
  traceability, and verification that each test passes repeatedly and can fail.
- [`project-docs`](skills/project-docs/SKILL.md) — turns briefs, notes, and legacy docs into a modular Markdown
  documentation package (business rules, state machines, ADRs, acceptance criteria, AGENTS.md/CLAUDE.md, open
  questions) that serves as source of truth for humans and AI coding agents.
- [`test-case-design`](skills/test-case-design/SKILL.md) — derives test cases with equivalence partitioning,
  boundary values, decision tables, state transitions, pairwise, scenarios, and CRUD × role matrices; writes them
  in a traceable format with priority, layer, and coverage summary.
- [`sdet-automation-docs`](skills/sdet-automation-docs/SKILL.md) — documents a test-automation project as a Senior
  SDET: risk-based scope, test-layer decisions, standards, data/account strategy, flaky/retry policy, CI stages,
  quality gates, and traceability.
- [`performance-testing`](skills/performance-testing/SKILL.md) — tool-agnostic performance testing: SLOs, workload
  modeling from production data, open vs closed models, script design (k6 examples + JMeter/Gatling/Locust
  mapping), environment and monitoring, CI gates, bottleneck analysis, and reporting.
- [`security-testing`](skills/security-testing/SKILL.md) — authorized, defensive security testing: threat modeling
  and ASVS scoping, automated authz/BOLA/session/header tests, SAST/SCA/secrets/IaC/DAST in CI with gating
  policies, and finding triage and reporting.
- [`debug-failed-tests`](skills/debug-failed-tests/SKILL.md) — systematic investigation of failing and flaky tests:
  evidence checklist, five cause categories, a reproduction ladder with flake-rate measurement and pollution
  bisecting, cause → fix → anti-fix tables, and templates for defect reports, environment tickets, and quarantine.

- [`refactor-test-suite`](skills/refactor-test-suite/SKILL.md) — audits and incrementally refactors an existing
  suite: rule catalogue with IDs, dependency-free audit script (TS/JS + Java) with suppressions and a CI ratchet,
  before/after recipes for both stacks, migration plan (baseline, ordering, strangler adoption, per-step
  verification, done criteria).

## Install

### As a plugin (all skills, with updates)

This repo is both a plugin and a single-plugin marketplace (`.claude-plugin/`). In a terminal:

```bash
claude plugin marketplace add huynhviettuan/sdet-skills
```

```bash
claude plugin install sdet-skills@sdet-skills
```

Or inside a session: `/plugin marketplace add huynhviettuan/sdet-skills`, then `/plugin install
sdet-skills@sdet-skills`. Plugin skills are namespaced, e.g. `/sdet-skills:test-case-design`. Pull updates with
`claude plugin marketplace update sdet-skills`.

### As standalone skills (pick and choose)

Copy a skill folder (the whole folder, including `references/` or `template/`) into one of:

- `~/.claude/skills/<skill-name>/` — available in every project on your machine
- `<project>/.claude/skills/<skill-name>/` — available to everyone working in that repository (commit it)

Skills cross-reference each other by name; if you copy only some, the references to missing ones are simply
skipped.

## Contributing

Each skill is a folder with a `SKILL.md` (YAML frontmatter `name` matching the folder, `description` ≤ 1024
characters) kept short, plus `references/*.md` for depth that loads only when needed.

`skills/service-builder/scripts/openapi-tool.mjs` is also shipped in both templates
(`skills/init-playwright-framework/template/scripts/` and `skills/init-selenium-java-framework/template/scripts/`) —
change all three together. Likewise `skills/refactor-test-suite/scripts/audit-suite.mjs` is shipped in both
templates' `scripts/`; both templates must audit clean (`node scripts/audit-suite.mjs . --fail-on block`). Before pushing, validate the
plugin:

```bash
claude plugin validate .
```
