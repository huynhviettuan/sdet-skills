# Automation Strategy

Content for the `docs/strategy/` documents: why automate, what, at which layer, in what order, and how coverage is
measured.

Contents:

- [AUTOMATION_OVERVIEW.md](#automation_overviewmd)
- [AUTOMATION_STRATEGY.md — layer selection](#automation_strategymd--layer-selection)
- [TEST_PYRAMID.md](#test_pyramidmd)
- [RISK_BASED_TESTING.md](#risk_based_testingmd)
- [AUTOMATION_DECISION_MATRIX.md](#automation_decision_matrixmd)
- [SCOPE_AND_COVERAGE.md](#scope_and_coveragemd)
- [Metrics](#metrics)
- [Framework / tool selection questions](#framework--tool-selection-questions)

---

## AUTOMATION_OVERVIEW.md

Answers: why automation, which risks are covered, which environments exist, which layers are automated, who owns
failures, when suites run.

```md
# Automation Overview

## Objective
Provide fast and trustworthy feedback for critical product risks.

## Goals
- reduce regression time
- detect critical defects before release
- support continuous delivery
- provide reproducible failure evidence
- reduce repetitive manual verification

## Non-Goals
Automation does not replace exploratory testing, usability testing, one-time validation, or product discovery.

## Primary Layers
- API
- Integration
- UI E2E

## Ownership
SDET: framework, automation strategy, flaky analysis
Developers: testability, API contracts, stable test ids
Product/QA: expected behavior, risk priority
```

---

## AUTOMATION_STRATEGY.md — layer selection

Pick the cheapest layer that gives reliable confidence for each behavior:

| Behavior | Layer |
|---|---|
| Pure calculation | Unit |
| Business rule | API / service / integration |
| Large input combinations | API, data-driven |
| Cross-service contract | Contract / integration |
| Critical end-to-end journey | UI E2E |
| Visual layout | Visual regression |
| One-time exploratory scenario | Manual |

Do not test every rule through the UI. A typical critical flow is "rules at API level + one UI journey".

---

## TEST_PYRAMID.md

Document the intended balance: many tests at unit/component, fewer at integration/API, fewest at UI E2E. Do not
enforce percentages mechanically — derive the balance from business risk and the system architecture, and record the
reasoning.

---

## RISK_BASED_TESTING.md

Classify features by risk; automate in priority order.

| Risk | Meaning | Example | Automation priority |
|---|---|---|---|
| P0 | Revenue / security / core flow | Payment, login | First |
| P1 | High operational impact | Contract creation | After P0 |
| P2 | Medium impact | Search / filter | Selectively |
| P3 | Low impact | Tooltip / cosmetic | Manual or low priority |

Risk dimensions: business impact, failure frequency, change frequency, data sensitivity, revenue impact, security
impact, user volume, integration complexity.

---

## AUTOMATION_DECISION_MATRIX.md

Before automating a case, ask in order: Is it repetitive? Is expected behavior clear? Is the feature stable? Is it
deterministic? Does automation provide value? Which layer is cheapest and still reliable?

| Scenario | Automate? | Layer |
|---|:---:|---|
| Login | Yes | API + UI smoke |
| Payment calculation | Yes | API |
| Complex checkout journey | Yes | UI |
| Temporary experimental UI | No | Manual |
| Large validation combinations | Yes | API |
| Visual spacing | Maybe | Visual regression |

---

## SCOPE_AND_COVERAGE.md

Never use a single vague number ("automation coverage = 90%"). Define coverage by risk and capability:

| Feature | Risk | AC IDs | API | UI | Automated | CI stage |
|---|:---:|---|:---:|:---:|:---:|---|
| Login | P0 | AC-AUTH-001..004 | Yes | Yes | Yes | PR |
| Payment | P0 | AC-PAYMENT-001..009 | Yes | Yes | Yes | PR |
| Export | P1 | AC-REPORT-010 | Yes | Yes | Yes | Nightly |
| Tooltip | P3 | — | No | No | No | — |

---

## Metrics

Track quality, not vanity:

```text
P0 / P1 automated coverage
Critical journey coverage
API contract coverage
Flaky rate
Average suite duration
PR feedback duration
Failure triage time
Escaped critical defects
Top unstable areas
```

Treat "number of automated tests" and "overall pass %" with suspicion — both are misleading without context (a high
pass rate can be produced by retries).

---

## Framework / tool selection questions

Answer before choosing tools, and record the choice as an ADR:

```text
Web, mobile, API, desktop?
Languages used by the team?
Browser / device coverage?
Parallel requirements?
CI platform?
Reporting requirements?
Database access?
API availability for setup?
Existing team skills?
```

Do not choose a framework only because it is popular.
