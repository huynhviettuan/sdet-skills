# Documentation

Welcome to the project documentation. Pick the right entry point for what you're doing.

## I want to…

| Goal                                               | Read                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Understand the project at a glance                 | [Architecture Diagram](./diagrams/framework-architecture.svg)                           |
| Know **why** the framework is shaped the way it is | [decisions/](./decisions/) — Architecture Decision Records                              |
| Use a specific pattern correctly                   | [guidance/](./guidance/) — practical guides per pattern                                 |
| Build a new page object, service, element, or test | [`../.claude/skills/`](../.claude/skills/README.md)                                     |
| Run tests in CI                                    | [ci/](./ci/) — GitHub Actions and GitLab CI templates                                   |
| See all pages and services at a glance             | [registry/](./registry/) — living inventory of pages & services                         |
| Debug a failing test or unclear error              | [troubleshooting/](./troubleshooting/)                                                  |
| Document a user story                              | [user-stories/](./user-stories/) — one file per feature                                 |
| Document a manual test case                        | [test-cases/](./test-cases/) — one file per feature, traces back to AC IDs              |
| Automate with an agent                             | [`../.claude/agents/`](../.claude/agents/) — test-writer, page-builder, api-service-gen |
| See enforced rules                                 | [`../.claude/rules/`](../.claude/rules/) — auto-applied per file glob                   |

## Map

```
docs/
├── README.md              # this file
├── diagrams/              # visual diagrams and architecture overviews
│   └── framework-architecture.svg/png
├── decisions/             # Architecture Decision Records (immutable) — empty until your first one
├── guidance/              # one-topic-per-file practical guidance
│   ├── behavior-testing.md# behavior-style Given/When/Then DSL
│   ├── bdd.md             # BDD/Gherkin via playwright-bdd
│   ├── cascading-dropdown.md # multi-level cascading menu element
│   ├── expect.md          # custom expect matchers
│   ├── health-locator-rag.md # locator health check RAG
│   ├── messages.md        # NotificationMessages constants
│   ├── notifications.md   # centralized notification fixture
│   ├── notifications-ci.md# CI result notifications (Observer)
│   ├── pdf-testing.md     # PDF download, text, tables, forms, snapshots
│   ├── sections.md        # multi-section container pattern
│   ├── skeleton.md        # skeleton loading element
│   └── word-testing.md    # Word document text, tables, templates
├── registry/              # living inventory of pages, services, elements, helpers
│   ├── pages.md           # all page objects
│   ├── services.md        # all API services
│   ├── elements.md        # all UI elements
│   └── helpers.md         # all helper classes
├── user-stories/          # user stories (AC tables); source for generate-test-cases
├── test-cases/            # manual test cases (one .md per feature, traces to AC IDs)
├── ci/                    # CI pipeline templates
└── troubleshooting/       # errors, debugging, FAQ

.claude/
├── skills/                # step-by-step how-to guides
├── agents/                # custom automation agents
│   ├── test-writer.md     # generate specs from page objects + test cases
│   ├── page-builder.md    # discover locators, scaffold page objects
│   └── api-service-gen.md # generate service layer from Swagger
└── rules/                 # auto-enforced rules (by file glob)
    ├── 01-read-skill-first.md
    ├── 02-verify-after-changes.md
    ├── 03-register-everything.md
    ├── 04-parent-scoping.md
    ├── 05-imports.md
    └── 06-no-raw-locators-in-tests.md
```

## Conventions

-   **`decisions/`** — append-only ADRs. Never edit an accepted ADR; supersede with a new one.
-   **`guidance/`** — one file per pattern. Keep files focused; link sibling files in a `## Related` section instead of
    duplicating.
-   **Skills vs guidance** — skills (`.claude/skills/*.md`) tell you _how_ to build something step-by-step; guidance
    explains _what_ a pattern is and _when_ to use it.
-   **Path references** — when a doc cites code, use the path alias (`@elements/common/input`) so search and tooling
    resolve it.
-   **IDs** — acceptance criteria are `AC-<AREA>-NNN`, test cases `TC-<AREA>-NNN` (security: `TC-SEC-<AREA>-NNN`);
    never reused or renumbered.

## Beyond this scaffold

This folder documents the **framework**. Strategy-level documents — automation strategy, risk-based scope, test-data
and account strategy, flaky/retry policy, CI stages, quality gates, traceability — are not scaffolded here. Generate
them when needed with these skills (from the `sdet-skills` collection), which use the same ID scheme:

| Need                                                       | Skill                  |
| ---------------------------------------------------------- | ---------------------- |
| Product rules, state machines, acceptance criteria, ADRs   | `project-docs`         |
| Systematic test cases (boundaries, decision tables, …)     | `test-case-design`     |
| Automation strategy, standards, CI, quality gates          | `sdet-automation-docs` |
| Load / stress / soak testing                               | `performance-testing`  |
| Authorization tests, security scanning, finding triage     | `security-testing`     |

When they are added, place the automation documents under `docs/automation/` and reuse this repo's `decisions/`
for ADRs rather than creating a second ADR folder.
