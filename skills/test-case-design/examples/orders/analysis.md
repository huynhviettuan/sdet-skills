# Requirement analysis — Orders slice

Step 1–5 of the [`test-case-design`](../../SKILL.md) workflow for the slice in [slice-catalogue.md](slice-catalogue.md),
from the Orders package [`skills/project-docs/examples/orders-docs/`](../../../project-docs/examples/orders-docs/README.md)
(read-only), 2026-11-03. The design tables are in [design-tables.md](design-tables.md), the cases in
[`cases/`](cases/), traceability in [coverage.md](coverage.md).

The agent that designed this example could not write this page (a tool policy refused the file on 2026-11-03, and it
stopped as the repository's rule requires); it returned the content in its report, and the coordinating session
placed it here after the maintainer approved.

Contents:

- [Slice and sources](#slice-and-sources)
- [Clauses split](#clauses-split)
- [Open questions that apply](#open-questions-that-apply)
- [Proposed new questions](#proposed-new-questions)
- [Techniques and why](#techniques-and-why)

---

## Slice and sources

19 of the package's 44 acceptance criteria, chosen because together they need every technique the skill names:

| Element | Requirement IDs | Source documents |
|---|---|---|
| Login and lockout | FR-AUTH-001, BR-AUTH-001, BR-AUTH-002, AC-AUTH-001..005 | `docs/business/BUSINESS_RULES.md`, `docs/business/STATE_MACHINES.md`, `docs/quality/ACCEPTANCE_CRITERIA.md` |
| Note length | FR-ORD-001, FR-ORD-003, BR-ORD-003, BR-ORD-004, AC-ORD-003, 004, 005, 020, 024 | `BUSINESS_RULES.md`, `ACCEPTANCE_CRITERIA.md` |
| Open-order cap | BR-ORD-007, AC-ORD-006, 007 | `BUSINESS_RULES.md`, `ACCEPTANCE_CRITERIA.md` |
| Lifecycle and cancellation window | FR-ORD-004, BR-ORD-005, BR-ORD-006, AC-ORD-030..036 | `STATE_MACHINES.md`, `BUSINESS_RULES.md`, `ACCEPTANCE_CRITERIA.md` |
| Who may act | BR-ORD-002, BR-SEC-001, BR-SEC-002 (the lifecycle rows AZ-024..043) | `docs/business/ROLES_PERMISSIONS.md` (Permission Model, Actors), the cancel table in `STATE_MACHINES.md` |

The other 25 ACs (reads and lists, delete, admin, audit, security headers, CORS, errors) are outside the slice and
are reported by `check_cases.py` as uncovered when it is run against the full catalogue — by design.

## Clauses split

A criterion with one unclear clause still has testable clauses (workflow step 2). Where a rule mixes a stated part
and an assumed part, the stated part is designed as `Basis: specified` and only the assumed part waits on its OQ:

| Rule | Specified (designed now) | Assumption (waits on) |
|---|---|---|
| BR-ORD-003 note length | the 200-character limit; 200 is stored whole | rejection at 201 (OQ-002 — the reference server shortens instead) |
| BR-ORD-005 / BR-ORD-006 lifecycle | `paid` → `cancelled` is a legal transition | the 24-hour window (OQ-001) |
| BR-ORD-002 who may act | the customer, manager and same-/other-tenant rows | the admin rows (OQ-004) and the manager create/edit rows (OQ-006) |
| BR-ORD-004 note is the only editable field | `note` only, via PATCH | "editable in every status" (OQ-005) |

## Open questions that apply

The package's own register (`docs/product/OPEN_QUESTIONS.md`); no new numbering is introduced for these. The cases
that are `Basis: assumption` because of each:

| OQ | Question (package) | Working assumption | Assumption cases |
|---|---|---|---|
| OQ-001 | cancellation window after payment | 24 hours | TC-ORD-025, TC-ORD-026 |
| OQ-002 | a note over 200 characters: reject or shorten | reject with 400 | TC-ORD-002, TC-ORD-005, TC-ORD-006 |
| OQ-003 | open-order cap | 5 orders in `new` per customer | TC-ORD-010, TC-ORD-011 |
| OQ-004 | may an admin pay, ship or cancel | no (403) | TC-ORD-029 |
| OQ-005 | note editable after a terminal status | yes | the matching pairwise rows of TC-ORD-006 |
| OQ-006 | may a manager create and edit a note | yes, as the reference server | the matching pairwise rows of TC-ORD-006 |

## Proposed new questions

Found while deriving the design tables. The numbers continue the package's sequence, but these are **proposals**:
they are not in the package's `OPEN_QUESTIONS.md` (its owner decides), and no case asserts an answer to them.

| OQ | Question | Why it matters |
|---|---|---|
| OQ-007 | Is a "character" an NFC code point, a code point as sent, or a grapheme? | an NFD "ệ" is 3 code points, so a 200-character Vietnamese note can be 200 or 600 "characters" |
| OQ-008 | What does a non-string `note` (null, number, array) answer? | the rule speaks of length only |
| OQ-009 | Is a failure exactly 60 s old still inside the lockout window, and does a successful login reset the counter? | BR-AUTH-002 says "sliding window of 60 seconds", STATE_MACHINES says "oldest failure older than 60 s"; today a success does not reset (reference server), and the package's MODEL RECOMMENDATION says it should |

## Techniques and why

| Element | Techniques | Why |
|---|---|---|
| Note length | equivalence partitioning, 3-value boundary analysis (0 / 199 / 200 / 201), syntax testing with multi-byte characters | an ordered limit with a stated unit ("characters, not bytes"), where the unit itself is the likeliest defect |
| Lifecycle | state transition: all 4 valid transitions, all 8 invalid cells, plus the time guard | a fixed transition table where invalid moves (409, unchanged) matter as much as valid ones |
| Cancellation window | boundary analysis at 23:59:59 / 24:00:00 / 24:00:01 with a controllable clock | a time limit; the boundary is the requirement |
| Login | equivalence partitioning plus boundary analysis on attempts 4 / 5 / 6, and the counter's state table | a count limit with a state (locked / not locked) and a time reset |
| Open-order cap | boundary analysis on the count (4 → 5, 5 → 6) plus partitions of the actions that free a slot (pay, cancel) | a count limit whose inverse (freeing a slot) is the easy-to-miss half |
| Permissions | a decision table (7 columns, including the "other" column) plus the actor x action matrix | the outcome depends on role, tenant relation, status and action together |

Pairwise is used for the note rule, not the lifecycle: every note rule involves at most two factors, while the
lifecycle outcome depends on all four at once, so pairwise would miss combinations the rule distinguishes. The
argument and the verified table are in [design-tables.md](design-tables.md#pairwise-note-validation).
