# sdet-skills

A collection of portable [Claude Code](https://claude.com/claude-code) skills for SDET / test-automation work —
from documenting what a product must do, through designing test cases and the automation framework, to performance
and security testing.

**Stacks.** Every skill works the same way on each supported stack, and every stack is built by **composition**:
tests take their dependencies from one composition root, pages have containers, containers have elements, services
receive their client, and only the framework's thin bases are ever extended (enforced as `R-INHERIT`).

| Stack | Scaffold | Status |
|---|---|---|
| Playwright / TypeScript | `init-playwright-framework` | supported — verified on TodoMVC, Petstore and a 79-case Gym CRM pilot |
| Selenium + RestAssured / Java (TestNG, Maven) | `init-selenium-java-framework` | supported — verified on TodoMVC and Petstore |
| pytest + Playwright + httpx / Python | `init-pytest-playwright-framework` | supported — verified on TodoMVC and Petstore |
| C#/.NET, Cypress, WebdriverIO, Appium | — | planned; see the [stack contract](skills/sdet-framework-architect/references/stack-contract.md) for what support requires |

## Which skill when

```text
A pile of existing project documents to understand
  └─► project-knowledge-base  cited digests → overview, flows, rules, roles, analysis, index
        │
        ▼
Product requirements unclear or undocumented
  └─► project-docs            business rules, state machines, AC, ADRs, AGENTS.md
        │
        ▼
What exactly do we test for this story / rule?
  └─► test-case-design        techniques → TC-<AREA>-NNN cases with basis, quoted evidence, catalogue IDs
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
  ├─► init-playwright-framework        Playwright / TypeScript
  ├─► init-selenium-java-framework     Selenium + RestAssured / Java / TestNG / Maven
  └─► init-pytest-playwright-framework pytest + Playwright + httpx / Python
        │
        ├─► page-builder       explore screen + test cases → page objects, containers, sections (TS, Java, Python)
        ├─► service-builder    OpenAPI spec → services 1:1 (operationId methods), types, schemas, coverage (TS, Java, Python)
        │
        ▼
Turn the TC-… cases into automated tests
  └─► test-script-writer      one test per case / data row, factories + teardown, every expected result asserted
                              (framework code, or executable specs for the Manual QA Agent)

Governed runs in the Manual QA Agent (approved sources, human gates, evidence):
  └─► manual-qa-agent         stories → cited draft sets → executable specs → runs, suites, known bugs → triage;
                              routes the rest to frameworks

Non-functional, alongside any of the above:
  ├─► performance-testing     SLOs, workload model, scripts, runs, analysis, report
  └─► security-testing        threat model, authz/BOLA tests, pipeline scanners, triage

When tests go red:
  └─► debug-failed-tests      evidence → classify → reproduce → root cause → prove fix → route

An existing suite that doesn't follow these rules:
  └─► refactor-test-suite     baseline → audit (rule IDs) → plan → small verified steps → CI ratchet

Before merging any test code:
  └─► test-code-review        /review-tests — DRY / KISS / YAGNI standards (S- rules), consolidated checklist, verified findings

All of the above as one job, with human gates:
  └─► automation-pipeline     /automate <scope> · sdet-automation-agent — assess → document → [gate] → scaffold
                              → build → [gate] → implement → verify → branch + status report → [merge]
```

| You want to… | Use |
|---|---|
| Read, summarize and analyze all of a project's existing documents into a searchable, cited knowledge base (flows, rules, roles, conflicts, gaps) | `project-knowledge-base` |
| Turn a brief / stakeholder notes into a source-of-truth doc set | `project-docs` |
| Write or review test cases for a story, ticket, or rule; check cases against a requirement catalogue; verified pairwise | `test-case-design` |
| Decide what to automate and at which layer; document the automation project | `sdet-automation-docs` |
| Design or review page objects, services, fixtures, DI | `sdet-framework-architect` |
| Scaffold a new Playwright/TypeScript test repo | `init-playwright-framework` |
| Scaffold a new Selenium + RestAssured Java (TestNG, Maven) test repo | `init-selenium-java-framework` |
| Scaffold a new pytest + Playwright + httpx Python test repo | `init-pytest-playwright-framework` |
| Build page objects for a screen from the live app + test cases | `page-builder` |
| Generate API services from an OpenAPI/Swagger spec (or draft one) | `service-builder` |
| Implement documented test cases as automated tests | `test-script-writer` |
| Submit stories, propose executable specs, run cases and suites, read reports and triage in the Manual QA Agent | `manual-qa-agent` (+ `test-script-writer`) |
| Load, stress, soak, capacity testing; perf results analysis | `performance-testing` |
| Authorization/tenant isolation tests, security scans in CI, finding triage | `security-testing` |
| Investigate a failing, flaky, or CI-only test; triage a red run | `debug-failed-tests` |
| Audit / clean up / migrate an existing (legacy) test suite; enforce test coding rules | `refactor-test-suite` |
| Review a PR / diff of test code; DRY / KISS / YAGNI coding standards for test code | `/review-tests` → `test-code-review` |
| Automate a feature or product end to end, from docs to a verified branch | `/automate` → `automation-pipeline` |

The documentation skills share one ID scheme so requirements trace through to tests:

| Prefix | Meaning | Defined by |
|---|---|---|
| `FR-<AREA>-NNN` | Functional requirement / feature | project-docs |
| `BR-<AREA>-NNN` | Business rule | project-docs |
| `AC-<AREA>-NNN` | Acceptance criterion | project-docs |
| `TC-<AREA>-NNN` | Test case (`TC-SEC-…` for security) | test-case-design / sdet-automation-docs |
| `OQ-NNN` | Open question | all |
| `KQ-NNN` | Question a knowledge base raises about its sources (the sources keep their own `OQ-`) | project-knowledge-base |
| `S<NN> L<n>` | Citation: knowledge-base source and line (`[S07 L120]`), accepted in `Verifies`/`Evidence` | project-knowledge-base / test-case-design |
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
- [`init-pytest-playwright-framework`](skills/init-pytest-playwright-framework/SKILL.md) — scaffolds a Python repo
  (pytest, Playwright for Python, httpx, pydantic, jsonschema, pytest-xdist, uv): fixtures as the composition root,
  page objects composed of container regions and thin elements that hold a locator, services that receive a shared
  httpx client, factories with yield teardown, `expect` plus a bounded `eventually`, ruff banned-api rules and
  mypy strict.
- [`page-builder`](skills/page-builder/SKILL.md) — explores the live app and the feature's test cases, decomposes the
  screen into containers, repeated-item sections, and shared components with parent-scoped locators, confirms an
  element inventory, then generates, registers, and smoke-tests the page objects.
- [`service-builder`](skills/service-builder/SKILL.md) — generates services 1:1 from an OpenAPI/Swagger spec: one
  class per tag, one method per operation named after its operationId, spec-derived types and response schemas,
  auth fixtures, and a coverage check (bundled dependency-free `openapi-tool.mjs`); drafts a spec from captured
  traffic when none exists.
- [`test-script-writer`](skills/test-script-writer/SKILL.md) — implements documented test cases as tests (Playwright
  or Selenium/RestAssured Java): prerequisite check, preconditions through data factories with automatic teardown,
  steps through page objects/services, every expected result asserted with the case's evidence quote in the
  message, data rows as separate tests, known bugs failing expectedly only at the step they name, `@req:` tags for
  regression by requirement, and verification that each test passes repeatedly and can fail. Also writes executable
  specs for the Manual QA Agent (run-scoped values, API sessions and JSON checks, data rows, bounded waits).
- [`manual-qa-agent`](skills/manual-qa-agent/SKILL.md) — drives the Manual QA Agent (at its ADR-0026) as a
  propose-only participant: stories and clarifications, draft sets with quoted evidence, executable-spec proposals
  (its own or the agent's `propose_steps`, checked with a bundled checker that uses the agent's schema), runs and
  suite reports (preflight, detection, known bugs bound to steps, unstable, unproven), regression scope by
  requirement, triage and reproduction, and routing of what the agent can't run to the framework skills; stops at
  every human gate and never edits an expectation to make a run pass.
- [`project-knowledge-base`](skills/project-knowledge-base/SKILL.md) — turns a folder of existing documents (Markdown,
  Word, PDF, Excel, PowerPoint, HTML, screenshots) into a navigable knowledge base: overview, glossary, roles and
  permissions, domain model and lifecycles, every business flow with diagrams, rules, requirements, integrations,
  decisions, an analysis of conflicts, gaps and ambiguities with open questions, a testing view and an index — every
  statement cited to its source line; incremental when documents change.
- [`project-docs`](skills/project-docs/SKILL.md) — turns briefs, notes, and legacy docs into a modular Markdown
  documentation package (business rules, state machines, ADRs, acceptance criteria, AGENTS.md/CLAUDE.md, open
  questions) that serves as source of truth for humans and AI coding agents.
- [`test-case-design`](skills/test-case-design/SKILL.md) — derives test cases with equivalence partitioning,
  boundary values, decision tables, state transitions, verified pairwise, scenarios, permission matrices, account
  journeys, syntax and metamorphic testing; writes them traceable to a dated requirement catalogue, each with a
  basis (specified or assumption) and quoted evidence, priority, level, open questions and regression scope;
  `check_cases.py` and `pairwise.py` check the result.
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
- [`automation-pipeline`](skills/automation-pipeline/SKILL.md) — the orchestration layer: stage contract (what each
  stage consumes, produces, verifies, and which skill does it), gates, stop rules, and the status-file format that
  makes a run resumable; followed by the plugin's `sdet-automation-agent` and `/automate`.
- [`test-code-review`](skills/test-code-review/SKILL.md) — coding standards for test code grouped under DRY, KISS
  and YAGNI with the tie-breaks between them (`S-…` rules with before/after in both stacks, plus TypeScript/Playwright-only and Java-only rules), a review checklist that merges the architecture rules, the audit
  rules and the builders' checks, and a review workflow (deterministic checks first, every finding verified,
  severity by consequence); `/review-tests` runs it on a diff, branch or PR.
- [`refactor-test-suite`](skills/refactor-test-suite/SKILL.md) — audits and incrementally refactors an existing
  suite: rule catalogue with IDs, dependency-free audit script (TS/JS + Java) with suppressions and a CI ratchet,
  before/after recipes for both stacks, migration plan (baseline, ordering, strangler adoption, per-step
  verification, done criteria).

## The automation agent

`/automate <feature> [--stack playwright|selenium-java|qa-agent] [--url <app>] [--spec <openapi>]` runs the whole
pipeline as one job, and `sdet-automation-agent` is the same job as a subagent. Both follow the
[`automation-pipeline`](skills/automation-pipeline/SKILL.md) skill: the other skills do each stage's work; the
pipeline adds the order, three human gates (approve the test cases, confirm the element/API inventory, merge the
PR), stop rules (missing requirement, unreachable app, ambiguous locator, red baseline, anything destructive), and
a resumable `docs/automation-status.md`. It works on a branch and never merges.

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

## What a green run has to earn

Every check in this plugin is either repeated or measured, not run once:

| Claim | How it is kept true |
|---|---|
| The suite can detect a failure | a **sentinel** test with a known-false expectation; the run is red if it passes |
| Each new assertion can fail | `scripts/can-fail.mjs` (in every scaffold) mutates expected values one at a time and requires red |
| "Verified on TodoMVC and Petstore" | `test-script-writer/examples/<stack>/` run nightly against the live demo apps, 3× in parallel |
| Coverage means risk covered | `check_cases.py --kb` reports cases against the knowledge base's testable rules, not only ACs |
| No guess is tested as a requirement | `check_cases.py --kb` refuses `Basis: specified` on a rule in an open High/Medium conflict |
| The checkers' advice is worth reading | measured on a held-out 376-case catalogue; the numbers are in the skill |
| The skills change what a model does | `evals/` for `claude plugin eval`, with and without the plugin ([evals/README.md](evals/README.md)) |

## Evals

`evals/` holds behavioural checks for `claude plugin eval` (a real model, with and without the plugin): does
`test-case-design` produce the boundaries, columns and permission cases the pilot found missing; does
`test-script-writer` write a negative test that waits on a signal and proves nothing changed; does
`project-knowledge-base` mark what the sources don't say instead of inventing it; do the skills trigger on how people
phrase the request; does `manual-qa-agent` refuse to edit an expectation. See [evals/README.md](evals/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the definition of done for a skill and for a supported stack. In short: each
skill is a folder with a short `SKILL.md` (frontmatter `name` = folder, `description` ≤ 1024 characters) plus
`references/*.md`; `openapi-tool.mjs` and `audit-suite.mjs` are copied into every scaffold and must stay identical;
every scaffold must audit clean.

Before pushing, run the checks CI runs (`.github/workflows/ci.yml` also installs, lints, type-checks and audits all
three scaffolds, and fails a PR that changes skills without a changelog entry):

```bash
node scripts/check-repo.mjs
```

```bash
claude plugin validate --strict .
```

Record user-visible changes in [CHANGELOG.md](CHANGELOG.md) and bump `version` in `.claude-plugin/plugin.json` when
releasing. Licensed under [MIT](LICENSE).
