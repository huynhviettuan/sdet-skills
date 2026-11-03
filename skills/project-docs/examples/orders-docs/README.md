# Orders — a complete `project-docs` package (example)

A Level 2 documentation package for **Orders**, a small multi-tenant orders API, produced the way
[`project-docs`](../../SKILL.md) prescribes: modular files, one concern each, cross-linked by stable IDs, with the
open points listed instead of guessed. It is the shared example domain of the plugin — the test-design, security,
automation and knowledge-base examples reuse these IDs — and it is consistent with the runnable reference server
`skills/security-testing/examples/vuln-api/app.py` (secure configuration) wherever the server implements a rule.

## What the example shows

- **The package structure for Level 2** (`docs/product`, `business`, `architecture` + `ADR/`, `features`, `api`,
  `quality`, `security`, `delivery`, `specs/`), plus `AGENTS.md` and a `CLAUDE.md` that imports it with `@AGENTS.md`.
- **The ID scheme in use**: `FR-<AREA>-NNN`, `BR-<AREA>-NNN`, `AC-<AREA>-NNN` (areas `AUTH`, `ORD`, `SEC`, `AUD`,
  `ADM`), `ADR-NNN`, `OQ-NNN`, and the security skill's `AZ-NNN` matrix rows. Every AC is one quotable sentence
  (`Statement:`) so a test case can cite it as `Evidence:`.
- **Sources tagged, not blended**: every rule says `Source: S1` (the brief, restated in `02_PRD.md`), `S2` (the
  reference server), `ASSUMPTION (OQ-nnn)` or `MODEL RECOMMENDATION`. Where the brief and the server disagree
  (note length: reject vs shorten) the disagreement is OQ-002, and the rule carries the working assumption.
- **Rules beyond the API with real boundaries**, each an open question with `Basis: assumption`: the 24 h
  cancellation window after payment (OQ-001, BR-ORD-006, a decision table in `STATE_MACHINES.md`), rejecting a
  201-character note (OQ-002, BR-ORD-003), a cap of 5 open orders (OQ-003, BR-ORD-007). The lifecycle endpoints
  are a decided ADR (ADR-003).
- **A permission matrix that is the test source** (ADR-001): rows AZ-001..023 verbatim from the reference matrix,
  AZ-024..051 added for pay/ship/cancel, list and audit; every operation has an anonymous row and a deny row.
- **A dated requirement catalogue**, [`REQUIREMENTS_CATALOGUE.md`](REQUIREMENTS_CATALOGUE.md) (snapshot
  2026-11-03): every FR/BR/AC with its one-line text and basis, plus the ADRs and OQs. The `project-docs` skill
  does not fix where the catalogue lives; the test-design skill reads it with `check_cases.py --catalogue`, so it
  sits at the package root under that name.
- **Definition of Ready with the real readiness table**: four features ready, three partly blocked by their OQs.

## Files

```text
AGENTS.md  CLAUDE.md  CHANGELOG.md  README.md  REQUIREMENTS_CATALOGUE.md
docs/product/      00_PROJECT_OVERVIEW 01_SCOPE 02_PRD 03_BUSINESS_FLOW 04_GLOSSARY OPEN_QUESTIONS
docs/business/     BUSINESS_RULES STATE_MACHINES ROLES_PERMISSIONS CONFIGURATION_RULES
docs/architecture/ SYSTEM_ARCHITECTURE DATA_MODEL ADR/ADR-001..004
docs/features/     FR-AUTH-001 FR-ORD-001..005 FR-ADM-001
docs/api/          API_SPECIFICATION ERROR_CODES
docs/quality/      TEST_STRATEGY ACCEPTANCE_CRITERIA TRACEABILITY_MATRIX DEFINITION_OF_READY DEFINITION_OF_DONE
docs/security/     SECURITY AUDIT_LOGGING
docs/delivery/     IMPLEMENTATION_PLAN DEPLOYMENT ENVIRONMENTS
specs/             openapi.yaml seed-data.json
```

Counts (2026-11-03): 7 FR, 17 BR, 44 AC, 4 ADR, 6 OQ, 51 matrix rows.

## Verification

Both commands run from the repository root.

```bash
python skills/security-testing/scripts/authz_matrix.py generate skills/project-docs/examples/orders-docs/docs/business/ROLES_PERMISSIONS.md
```

Ran on 2026-11-03, and re-earned on every push by CI's `Skill examples` job (`scripts/check-examples.sh` asserts 51
cells, no `WARN`, no `ERROR`, exit 0). First line of the output, then the cells as JSON:

```text
matrix: skills\project-docs\examples\orders-docs\docs\business\ROLES_PERMISSIONS.md | cells=51 operations=10 actors=7
```

```bash
node scripts/check-repo.mjs
```

Checks every Markdown file here for balanced fences and resolving links and anchors. Ran on 2026-11-03: no
problem reported under `skills/project-docs/examples/orders-docs/`. CI's check job re-runs it on every push.

The catalogue was cross-checked the way `check_cases.py --catalogue` reads it (the `FR|BR|AC` ID regex): 44 AC,
17 BR, 7 FR; no ID in the package is missing from the catalogue and none in the catalogue is unused (ran once,
2026-11-03). `specs/openapi.yaml` parses (8 paths, 3 schemas) and `specs/seed-data.json` parses (6 users).

## Honest notes

- The reference server does not implement pay/ship/cancel, `paid_at`, the note-length rejection or the open-order
  cap; those are specified here (ADR-003, OQ-001..003) for the other examples to design tests against. A suite
  run against the reference server fails AC-ORD-004/006/007/024/030..036 — that is the point of the OQs.
- `GET /_audit`, `POST /_reset` and `GET /_boom` are the reference server's paths; the first is documented as the
  audit read, the other two are out of scope (`01_SCOPE.md`).
- Example values only: tenants, usernames, the `example.test` origin. The shared example password and the signing
  key live in the reference server, documented there as examples, and are not repeated here.
