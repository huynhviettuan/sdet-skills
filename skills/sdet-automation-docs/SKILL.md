---
name: sdet-automation-docs
description: >
  Design, document, review, and maintain a test-automation project as a Senior SDET / Automation Architect —
  producing a documentation package (automation strategy, risk-based scope, test-layer decisions, locator/wait/
  assertion standards, test data and account strategy, flaky/retry policy, CI stages, quality gates, traceability,
  AGENTS.md/CLAUDE.md) that is the source of truth for engineers and AI coding agents. Use this skill whenever
  starting a new automation project, converting manual regression to automation, introducing UI/API/mobile/
  performance automation, auditing a flaky or slow suite, preparing automation for CI/CD, or onboarding AI agents to
  write tests. Trigger on phrases like "automation strategy", "test strategy doc", "what should we automate",
  "document the test framework", "flaky test policy", "audit our automation suite", "automation AGENTS.md". Tool-agnostic;
  framework design rules come from `sdet-framework-architect`, product formats and IDs from `project-docs`.
---

# SDET Automation Docs

The goal is not test scripts — it's a reliable automation system that gives fast, trustworthy quality feedback,
documented well enough that a new engineer or AI agent can extend it without inventing strategy.

> Automation verifies product behavior; it does not duplicate product implementation.
> Prioritize **risk → confidence → reliability → speed → maintainability**, never test-case count.

**How to use this skill:** follow the workflow below. Load a `references/*.md` file only when writing the documents
it covers:

- [`references/document-package.md`](references/document-package.md) — folder structure, minimum set before coding,
  README and AGENTS.md templates, final quality bar.
- [`references/strategy.md`](references/strategy.md) — overview, layer selection, pyramid, risk classification,
  automation decision matrix, scope & coverage, metrics, tool-selection questions.
- [`references/standards.md`](references/standards.md) — what the architecture/component/fixture docs record, plus
  locator, wait, assertion, naming, test-design standards and the code-review checklist.
- [`references/data-and-reliability.md`](references/data-and-reliability.md) — test data, accounts, cleanup, DB
  testing, isolation, parallelism, flaky and retry policy, failure evidence.
- [`references/layers-and-cicd.md`](references/layers-and-cicd.md) — API/contract/UI/visual/performance testing,
  CI stages, pipelines, environments, reporting, artifacts, quality gates.
- [`references/governance.md`](references/governance.md) — traceability, Definition of Ready/Done, open questions,
  ADRs, AI-agent task template, reviewing an existing suite, anti-patterns, health checks, update rule.

## Related skills

- **`sdet-framework-architect`** owns framework design (five-layer blueprint, scoping, composition root, teardown
  ownership, driver holder). Load it for `FRAMEWORK_ARCHITECTURE.md`, `COMPONENT_DESIGN.md`, `FIXTURE_DESIGN.md`
  and for architecture findings in a review. Do not restate or contradict its rules here.
- **`project-docs`** owns the product-side documents and the formats for OQ, ADR, and the traceability matrix. If
  the product already has those docs, read its BR/AC IDs and extend its matrix instead of creating parallel copies.
- **`test-case-design`** derives the `TC-` cases (techniques, format, coverage summary) that the traceability
  matrix and CI suites here consume.
- **`test-script-writer`** implements `TC-` cases as tests following the standards documented here.
- **`debug-failed-tests`** applies the flaky/retry/quarantine policy and failure-artifact standards documented here
  when a test actually fails.
- **`performance-testing`** and **`security-testing`** own the content of `PERFORMANCE_TESTING.md` and any
  security testing docs; reference them instead of restating.
- **`init-playwright-framework`** scaffolds a Playwright/TypeScript repo once the strategy says Playwright.

## Workflow

### New automation project

1. **Analyze sources** — requirements, user stories, AC, manual test cases, existing automation, API docs, schema,
   architecture, CI config, bug history, production incidents, environments, test accounts/data, device matrix.
2. **Identify critical business flows and product risks**; classify features P0–P3 (`strategy.md`).
3. **Decide the layer for each important flow** and what stays manual — the lowest reliable layer wins.
4. **Identify testability gaps** (missing test ids, no setup API, no way to isolate data) — each becomes an OQ or a
   request to developers.
5. **Propose the documentation package** (`document-package.md`) and stop for the user's approval.
6. **Generate the docs**: strategy → architecture (via `sdet-framework-architect`) → standards → data/accounts →
   reliability → CI/quality gates → traceability. Always include `AGENTS.md`, a `CLAUDE.md` that imports it
   (`@AGENTS.md`), Definition of Done, and `OPEN_QUESTIONS.md`.
7. **Report** contradictions, open questions, and anything not yet answerable from the "Final quality standard".

### Existing automation suite

Follow "Reviewing an existing automation suite" in `governance.md`: inspect framework, tests, CI, and failure
history; classify problems; propose a target architecture and an **incremental** migration plan. Never propose a
blind rewrite.

## SDET reasoning model

```text
Requirement → business risk → testability → best layer → automation design
 → execution strategy → failure evidence → quality signal
```

Before automating a scenario, ask: What risk does it protect against? Is automation appropriate? Which layer gives
the fastest reliable feedback? Is UI really necessary, or can setup/verification go through the API? Is the feature
stable? Will the test run independently and in parallel? Can a CI failure be debugged from artifacts alone?

## Source of truth

Product behavior is decided by the product docs, in the `project-docs` hierarchy (approved decision → BR → AC → …).
Within automation, the order is: automation strategy → test design standards → automation ADRs → framework/test
code. If expected behavior is unclear: **STOP → record an OQ → request clarification.** Never invent product
behavior.

## ID scheme

Shared with `project-docs`: `FR-`, `BR-`, `AC-<AREA>-NNN` come from the product docs; this skill adds
`TC-<AREA>-NNN` for each automated scenario. Every TC names the AC it verifies — e.g. test title
`[TC-CONTRACT-015] manager can approve pending contract (AC-CONTRACT-010)`.

## Golden rules

- Automate risk, not test-case count.
- Prefer the lowest reliable test layer; API setup over UI setup.
- Tests are independent, deterministic, parallel-safe, and diagnosable.
- Whoever creates test data owns its teardown, in a fixture — never in the test body.
- No fixed sleeps; wait on the real signal.
- Retries do not fix flaky tests; a pass-on-retry is FLAKY.
- CI failures must produce evidence.
- AI agents implement an approved automation strategy; they do not invent one.
