# Documentation Package

The full folder structure, which files belong to which documentation level, and the review checklist used before a
package is declared ready.

---

## Full structure (Level 3 superset)

Do not create every file blindly — pick the level (below) and create only what it lists. Files a project doesn't
need are simply absent, not empty.

```text
project/
│
├── README.md
├── AGENTS.md
├── CLAUDE.md                 # one line: @AGENTS.md
├── CHANGELOG.md
│
├── docs/
│   ├── product/
│   │   ├── 00_PROJECT_OVERVIEW.md
│   │   ├── 01_SCOPE.md
│   │   ├── 02_PRD.md
│   │   ├── 03_BUSINESS_FLOW.md
│   │   ├── 04_GLOSSARY.md
│   │   └── OPEN_QUESTIONS.md
│   │
│   ├── business/
│   │   ├── BUSINESS_RULES.md
│   │   ├── STATE_MACHINES.md
│   │   ├── ROLES_PERMISSIONS.md
│   │   ├── APPROVAL_RULES.md
│   │   └── CONFIGURATION_RULES.md
│   │
│   ├── architecture/
│   │   ├── SYSTEM_ARCHITECTURE.md
│   │   ├── MODULE_ARCHITECTURE.md
│   │   ├── DATA_MODEL.md          # includes the ERD
│   │   ├── API_ARCHITECTURE.md
│   │   └── ADR/
│   │       └── ADR-001-<slug>.md
│   │
│   ├── features/
│   │   └── FR-<AREA>-NNN-<slug>.md
│   │
│   ├── api/
│   │   ├── API_SPECIFICATION.md
│   │   ├── ERROR_CODES.md
│   │   ├── WEBHOOKS.md
│   │   └── INTEGRATIONS.md
│   │
│   ├── ui/
│   │   ├── UI_UX_GUIDELINES.md
│   │   ├── SCREEN_SPECIFICATIONS.md
│   │   └── RESPONSIVE_RULES.md
│   │
│   ├── quality/
│   │   ├── TEST_STRATEGY.md        # product-level; automation detail lives in sdet-automation-docs
│   │   ├── ACCEPTANCE_CRITERIA.md
│   │   ├── UAT.md
│   │   ├── TRACEABILITY_MATRIX.md
│   │   ├── DEFINITION_OF_READY.md
│   │   └── DEFINITION_OF_DONE.md
│   │
│   ├── security/
│   │   ├── SECURITY.md
│   │   ├── DATA_PRIVACY.md
│   │   └── AUDIT_LOGGING.md
│   │
│   └── delivery/
│       ├── IMPLEMENTATION_PLAN.md
│       ├── BACKLOG.md
│       ├── DEPLOYMENT.md
│       ├── ENVIRONMENTS.md
│       ├── DATA_MIGRATION.md
│       ├── OPERATIONS_RUNBOOK.md
│       └── ROADMAP.md
│
└── specs/                    # machine-readable contracts, in whatever format the stack uses
    ├── openapi.yaml
    ├── <schema file>         # e.g. schema.prisma, schema.sql, migrations/
    ├── seed-data.json
    └── .env.example
```

---

## Documentation levels

Choose the smallest level that still controls project risk. Each level includes everything from the levels before it.

### Level 1 — Small MVP (minimum before any coding)

```text
README.md
AGENTS.md + CLAUDE.md
00_PROJECT_OVERVIEW.md
01_SCOPE.md                 # including explicit out-of-scope
03_BUSINESS_FLOW.md
BUSINESS_RULES.md
SYSTEM_ARCHITECTURE.md
DATA_MODEL.md
OPEN_QUESTIONS.md
IMPLEMENTATION_PLAN.md
```

A feature must not start while a critical business rule it depends on is still ambiguous.

### Level 2 — Production application

Add:

```text
Feature specs (FR-*)
STATE_MACHINES.md
ROLES_PERMISSIONS.md
API_SPECIFICATION.md (+ openapi.yaml)
TEST_STRATEGY.md
ACCEPTANCE_CRITERIA.md
DEFINITION_OF_READY.md / DEFINITION_OF_DONE.md
SECURITY.md
DEPLOYMENT.md / ENVIRONMENTS.md
TRACEABILITY_MATRIX.md
ADR/ (once the first real decision is taken)
```

### Level 3 — Business-critical / ERP / financial

Add:

```text
APPROVAL_RULES.md
CONFIGURATION_RULES.md
AUDIT_LOGGING.md
DATA_PRIVACY.md
DATA_MIGRATION.md
OPERATIONS_RUNBOOK.md
INTEGRATIONS.md / WEBHOOKS.md
UAT.md
Backup / restore procedure (in OPERATIONS_RUNBOOK.md)
```

---

## Documentation review checklist

Run before declaring the package ready for implementation:

```text
[ ] Project goal is clear
[ ] Scope is explicit
[ ] Out-of-scope items are explicit
[ ] Actors are defined
[ ] Business entities are defined
[ ] End-to-end flows are documented
[ ] Critical business rules have BR IDs
[ ] Every BR states its source (or is marked MODEL RECOMMENDATION)
[ ] State machines exist where needed, with transition tables
[ ] Permissions are defined and enforced server-side
[ ] Configurable values are separated from fixed workflow
[ ] Architecture is approved (ADR where a real choice was made)
[ ] Data model matches business concepts
[ ] API boundaries are clear
[ ] Critical calculations have a single source of truth
[ ] Audit requirements exist
[ ] Error behavior is documented
[ ] Open questions are tracked with owners
[ ] Acceptance criteria exist, including negative cases for critical flows
[ ] Test strategy exists
[ ] Implementation phases are defined
[ ] Deployment environments are defined
[ ] Security requirements are captured
[ ] Data migration is planned when required
[ ] AGENTS.md + CLAUDE.md exist
```

---

## Final quality standard

A strong package lets a new developer or AI coding agent answer, from the docs alone:

```text
What should I build?
Why?
Who can use it?
What are the states?
What transitions are legal?
What must happen after each action?
What values are configurable?
Where does business logic live?
Which data is the source of truth?
Which actions need audit?
What errors should occur?
What should be tested?
How do I know the feature is done?
What is still undecided?
```

If the package cannot answer these questions, it is not ready for autonomous implementation.
