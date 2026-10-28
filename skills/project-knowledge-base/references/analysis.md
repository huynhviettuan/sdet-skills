# Analysis

What to look for across the sources, how to grade it, and how to write it so someone can act on it. The analysis
is the part of the KB nobody else will produce: each document's author sees one document; the KB sees them all.

Contents:

- [What to look for](#what-to-look-for)
- [How to find it](#how-to-find-it)
- [Severity](#severity)
- [analysis.md template](#analysismd-template)
- [Testing view](#testing-view)

---

## What to look for

| Kind | Example | Evidence needed |
|---|---|---|
| **Conflict** | Overview says 4 roles, RBAC lists 8 | both citations, both dates |
| **Stale** | an old decision superseded by a newer one but still stated elsewhere as current | the superseding source and date |
| **Gap** | a flow with no failure path; a status with no way out; a role with no permissions listed; a rule with no number | the place the reader would expect it |
| **Ambiguity** | "multiple", "a reasonable time", "usually", "etc.", "as appropriate", "fast", undefined acronyms | the exact phrase and line |
| **Missing document** | "see brief §3", "per the pricing sheet", a link to a file not in the folder | the reference |
| **Duplicate** | the same rule restated in three places (risk of drift) | all places; whether they currently agree |
| **Unreadable** | scanned PDF, image-only slides, unsupported format | the inventory status |
| **Risk** | money, permissions, personal data, irreversible actions, concurrency described loosely | the rule and what is loose about it |

---

## How to find it

1. **Facts table while synthesizing.** For every number, limit, status, role and named rule, keep `fact → value →
   source` in the digests. Grouping by fact shows conflicts mechanically (same fact, different values).
2. **Search for weasel words** across `_sources/text/`: `multiple|several|some|usually|normally|reasonable|
   appropriate|as needed|etc\.|TBD|TODO|later|fast|quickly|soon`. Each hit in a rule or requirement is a candidate.
3. **Search for references** to other documents: `see |per |according to|brief|§|\.(docx|pdf|xlsx)`. Anything not in
   the manifest is a missing document.
4. **Walk each flow and lifecycle** for the missing branches: rejection, cancellation, timeout, failure, retry, undo,
   concurrent edit, partial payment.
5. **Cross the matrix:** every role × every flow step — who may do it? Undefined cells are gaps.
6. **Order by date:** where the same subject appears in several sources, the dates tell what superseded what. Use
   the dates stated **inside** the documents (decision dates, "built 2026-10-15", progress logs); file dates are
   often one export date for every file and say nothing about order.
7. **Check the IDs:** rule/requirement/AC IDs referenced but never defined, defined twice, or defined with gaps in
   numbering that a traceability matrix claims to cover.

---

## Severity

| Severity | Meaning |
|---|---|
| **High** | affects money, permissions, personal data, legal/contractual terms, or blocks building or testing a core flow |
| **Medium** | a reader would build or test the wrong thing in a non-core area, or a core flow lacks an alternative path |
| **Low** | wording, duplication that currently agrees, cosmetic inconsistencies |

---

## analysis.md template

```md
# Analysis

<n> findings: <h> high, <m> medium, <l> low. Questions this KB raises are numbered KQ-<n>; where the sources already
ask the question, their own ID (OQ-…) is used instead of a new one.

Authority used: <which entries bind (approved decisions, specs) and which are proposals (assumptions, drafts), as the
sources themselves say> [citations].

## Summary
The three things a decision-maker should know first, each saying what it changes (money owed, who may act, what
gets built) and naming the finding IDs.

## Conflicts
| # | Severity | Topic | Source A says | Source B says | Likely current | KQ / OQ |
|---|---|---|---|---|---|---|
| C-1 | High | Roles | 4 roles [S01 L20] (2026-09) | 8 roles [S10 L30] (2026-10) | S10 (newer, RBAC doc) | KQ-1 |

## Gaps
| # | Severity | Where | What is missing | KQ / OQ |

## Ambiguities
| # | Severity | Phrase | Where | Why it matters | KQ / OQ |

## Stale or superseded
| # | Statement | Where | Superseded by |

## Missing or unreadable documents
| Reference / file | Referenced from | Status |

## Duplicates
| Topic | Places | Agree today? |

## Risks
| # | Area | Risk | Sources |

## Open questions
| KQ / OQ | Question | For whom | Blocks | From finding |
```

Every row cites both sides. "Likely current" is a judgement with its reason (newer, more authoritative, more
specific, as built); the decision stays with the owner.

Use a prefix of the KB's own for its questions (KQ-) — the sources usually have an OQ- series already, and two
OQ-012s that mean different things are worse than none. When several people (or agents) wrote the pages, each
reports the conflicts and gaps it met; the analysis merges those reports with the digests' "Noticed" sections,
re-verifies every citation, de-duplicates, and lists what it dropped as unverifiable. In the Gym CRM pilot, 6 of
roughly 100 reported findings did not survive re-verification.

---

## Testing view

`testing-view.md` turns the KB into a starting point for testing (`test-case-design` picks it up):

| Section | Contents |
|---|---|
| Risk areas | high-severity findings and the flows touching money, permissions, personal data, approvals, concurrency |
| Testable rules | rules with a number, limit, state or role — each a boundary, decision table or permission-matrix candidate, with the technique to use |
| Flows to cover | each flow with its happy path, alternative and error paths, and which are stated vs gaps |
| Lifecycles | allowed and forbidden transitions (state-transition tests) |
| Data to prepare | entities and states a test needs, and which documents say how to create them |
| Not testable yet | rules that are ambiguous or conflicting (link the OQ) |

Two tables are read by code, so keep their shape: `test-case-design`'s `check_cases.py --kb` reports coverage from
them and refuses a case that encodes a disputed rule as settled.

- `testing-view.md` → `## Testable rules`: one row per rule, the **first column names the rule and its requirement
  IDs** (`Lead reclaim (D-052, A-101)`); a row with no ID cannot be matched to a case and is reported as uncounted.
  `## Not testable yet`: first column the rule, last column the finding and its question (`[C-6](…), KQ-05`).
- `analysis.md` → `## Conflicts`: first column `C-n`, second the severity (`High`, `Medium`, `Low`), then topic,
  source A, source B. Every requirement ID named in topic or either side counts as disputed: a High or Medium row
  blocks `Basis: specified` on cases verifying it; a Low row (wording) only advises. Name only the IDs actually in
  dispute in those three columns.
