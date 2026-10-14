# Coverage and Prioritization

Deciding how much to test, in what order, and how to keep the suite lean as it grows.

Contents:

- [Coverage targets by risk](#coverage-targets-by-risk)
- [Priority](#priority)
- [Suite selection](#suite-selection)
- [Layer assignment](#layer-assignment)
- [Coverage summary per feature](#coverage-summary-per-feature)
- [Maintaining the suite](#maintaining-the-suite)
- [Review checklist](#review-checklist)

---

## Coverage targets by risk

Depth follows risk (P0–P3, see `sdet-automation-docs` → risk-based testing):

| Risk | Techniques expected | Negative coverage |
|---|---|---|
| P0 (money, security, core flow) | EP + 3-value BVA on every constrained input, full decision table, all valid **and** invalid state transitions, CRUD × role matrix, main + alternative + exception scenarios | Every rejection path |
| P1 | EP + 2-value BVA, decision table for rules with ≥ 3 conditions, all valid transitions + risky invalid ones, main + key alternative scenarios | Main rejection paths |
| P2 | EP, main scenario, key error cases | Representative |
| P3 | Main scenario or exploratory only | Optional |

Record any deliberate deviation ("invalid transitions for SUSPENDED skipped — state not reachable in v1") in the
feature file so the gap is visible, not accidental.

---

## Priority

Test-case priority = how bad it is if this specific behavior breaks, not how important the feature is overall:

```text
P0  breaks money, security, data integrity, or blocks the core flow for everyone
P1  breaks a significant flow or many users; workaround painful
P2  limited impact or easy workaround
P3  cosmetic / rare edge
```

A P0 feature has P2 test cases (a rarely used optional field) and a P2 feature can have a P0 case (an
authorization check).

---

## Suite selection

| Suite | Contains | Runs |
|---|---|---|
| Smoke | Is the build alive? Login, one P0 journey, health of key APIs | Every deploy, minutes |
| Sanity | P0 cases for the changed area | Every PR touching the area |
| Regression | All Ready automated cases, grouped by priority | Merge / nightly |
| Release | P0 + P1 automated + manual P0 cases not automated + exploratory charters for changed areas | Before release |

Tag cases (`@smoke`, `@P0`, `@area`) so suites are selections, not copies.

---

## Layer assignment

Assign every case a layer when it's designed, following "lowest reliable layer":

```text
Rule / calculation / validation / permission / invalid transition → API (or unit if pure logic)
Cross-service effect (event published, record synced)               → Integration
User journey, UI-only behavior (focus, messages, layout)             → UI E2E
Visual appearance                                                    → Visual
Judgement / usability / first look at a new area                     → Manual / exploratory
```

A decision table with 12 columns is 12 API tests and one UI journey, not 12 UI tests.

---

## Coverage summary per feature

At the top of each feature's test-case file:

```md
## Coverage — Contract approval (FR-CONTRACT-004)

| Source | Item | Covered by |
|---|---|---|
| AC | AC-CONTRACT-010 | TC-CONTRACT-021 |
| AC | AC-CONTRACT-011 | TC-CONTRACT-022, -024 |
| BR-CONTRACT-005 | Decision table R1–R5 | TC-CONTRACT-020..025 |
| Boundaries | approval limit 9 999 / 10 000 / 10 001 | TC-CONTRACT-023 (data-driven) |
| State machine | PENDING_APPROVAL → APPROVED; approve from other 4 states | TC-CONTRACT-021, -026 |
| Gaps | Self-approval rule unspecified | OQ-012 |
```

Every AC has at least one TC; a TC with no AC is either missing a requirement (raise it) or unnecessary.

---

## Maintaining the suite

- **Requirement change** → find TCs by the changed BR/AC ID, update or obsolete them in the same change.
- **Escaped defect** → add the missing case (and ask which technique would have found it).
- **Duplicates** → two cases with the same preconditions, action, and expected result: merge.
- **Never-failing, low-risk cases** at an expensive layer → move down a layer or retire.
- **Obsolete** cases are marked, then removed after the next release; IDs are never reused.

---

## Review checklist

```text
[ ] Every AC of the feature has ≥ 1 TC; every TC names the AC/BR it verifies
[ ] Techniques chosen per risk level; coverage summary filled
[ ] Boundaries tested on every constrained input (P0/P1)
[ ] Decision tables for multi-condition rules; gaps raised as OQs
[ ] Invalid state transitions covered for entities with a lifecycle
[ ] Negative cases assert rejection AND no state change
[ ] Expected results are concrete, observable, from the requirement
[ ] One behavior per case; cases independent
[ ] Priority and layer assigned; automation candidates flagged
[ ] No secrets or real personal data in test data
```
