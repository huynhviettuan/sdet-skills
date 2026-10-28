---
name: project-docs
description: >
  Turn a project brief, stakeholder notes, screenshots, legacy documents, and technical constraints into a modular
  Markdown documentation package (overview, scope, business flow, business rules, state machines, permissions,
  architecture/ADRs, data model, API spec, acceptance criteria, traceability, AGENTS.md/CLAUDE.md, open questions)
  that becomes the source of truth for humans and AI coding agents. Use this skill whenever starting a software
  project, documenting an existing project before further development, writing a PRD or business-rules document,
  setting up AGENTS.md/CLAUDE.md for AI-agent development, or propagating a changed requirement through existing
  docs. Trigger on phrases like "document this project", "write the PRD", "set up docs before coding", "business
  rules doc", "spec this feature", "create AGENTS.md", "source of truth docs". Stack-agnostic. For a
  test-automation project use `sdet-automation-docs`; to digest existing documents as-is, `project-knowledge-base`.
---

# Project Docs

Convert stakeholder intent into an explicit, testable, traceable specification **before** AI agents make
significant code changes. The package must answer: **WHAT** are we building, **WHY**, **HOW** it is designed,
which **RULES** must never be violated, and when a feature is **DONE**.

> **Golden rule: AI should implement decisions, not invent them.**

**How to use this skill:** follow the workflow below. Load a `references/*.md` file only when you need it:

- [`references/document-package.md`](references/document-package.md) — full folder structure, which files belong to
  each documentation level, the review checklist, and the final quality bar.
- [`references/templates.md`](references/templates.md) — copy-ready templates: AGENTS.md + CLAUDE.md, open question,
  business rule, state machine, feature spec, ADR, data-model entity, API endpoint, roles/permissions, acceptance
  criteria, traceability matrix, Definition of Ready/Done.
- [`references/topic-guidance.md`](references/topic-guidance.md) — inputs to analyze, the requirement-analysis
  sequence, configurable values, product-level test strategy, security, deployment, data migration, implementation
  planning, sizing AI-agent tasks, and how to propagate a requirement change.

## Workflow

### New project (or undocumented existing project)

1. **Analyze every source first** — briefs, notes, docs, spreadsheets, screenshots, existing app/code, schemas, API
   docs. Tag each extracted statement SOURCE REQUIREMENT / MODEL RECOMMENDATION / ASSUMPTION / OPEN QUESTION (see
   `topic-guidance.md`). For a large or messy document set, build a `project-knowledge-base` first: its cited
   digests, flows and analysis (conflicts, gaps, open questions) are the input this step needs.
2. **Summarize and analyze** — actors, business entities, end-to-end flows, business rules, state machines,
   permissions, fixed workflow vs configurable values, integrations, security/data concerns.
3. **Surface contradictions and gaps** — every one becomes an `OQ-NNN` entry; never resolve it by guessing.
4. **Recommend a documentation level** (1 MVP / 2 production / 3 business-critical) and **propose the file
   structure**. Stop and get the user's approval before generating everything.
5. **Generate the approved package** using `templates.md`. Always include `AGENTS.md`, a `CLAUDE.md` that imports it
   (`@AGENTS.md`), `OPEN_QUESTIONS.md` when anything is incomplete, the source-of-truth hierarchy, and Definition of
   Ready/Done. Add traceability for business-critical features.
6. **Run the review checklist** in `document-package.md` and report what is still open.

### Requirement change on an already-documented project

Follow "Requirement changes" in `topic-guidance.md`: find every document the change touches, update all of them,
then add a CHANGELOG entry. Never update just one layer.

## Core principles

- **Never invent business rules, APIs, roles, or states** unsupported by the sources. Missing → `OQ-NNN` with the
  agent instruction "DO NOT IMPLEMENT until resolved."
- **Mark recommendations separately from approved requirements.** Preserve stakeholder terminology unless there is a
  stated reason to normalize it (record the mapping in the glossary).
- **Separate fixed workflow (code) from configurable values (data/config UI)** when the business expects the value
  to change.
- **Business logic belongs in backend/domain code**, never only in the frontend — authorization, state transitions,
  pricing, payments, inventory, counters, approvals, calculations, audit.
- **Critical mutations must be idempotent** — anything touching money, balances, counters, inventory, credits, or
  workflow state must not apply twice on a repeated request.
- **Keep docs modular** — one concern per file, cross-linked by ID; never one giant project document.
- **If architecture is undecided, present options** and record the accepted choice as an ADR.

## Source-of-truth hierarchy

When documents conflict, the higher item wins. The same order is used by `sdet-automation-docs` for the product
side of any conflict.

1. Latest approved stakeholder decision (resolved OQ / ADR / CHANGELOG entry)
2. Business rules (BR)
3. Acceptance criteria (AC)
4. Feature specification (FR)
5. API contract
6. Architecture decisions (ADR)
7. Backlog
8. Existing implementation

If two items **at the same level** conflict, do not guess: record an OQ and request a decision.

## ID scheme

Shared with `sdet-automation-docs` so requirements trace straight through to automated tests. `<AREA>` is an
uppercase domain noun (`CONTRACT`, `SESSION`, `AUTH`, `PAYMENT`…), numbered per area, never reused.

| Prefix | Meaning | Owned by |
|---|---|---|
| `FR-<AREA>-NNN` | Functional requirement / feature | project-docs |
| `BR-<AREA>-NNN` | Business rule | project-docs |
| `AC-<AREA>-NNN` | Acceptance criterion | project-docs |
| `TC-<AREA>-NNN` | Test case / automated scenario | sdet-automation-docs |
| `OQ-NNN` | Open question | both |
| `ADR-NNN` | Architecture decision record | both (separate ADR folders) |

## Readiness

A feature must not start while a business rule it depends on is ambiguous (see Definition of Ready in
`templates.md`). If the package cannot answer the questions in "Final quality standard" (`document-package.md`), it
is not ready for autonomous implementation — say so explicitly rather than generating code on top of it.
