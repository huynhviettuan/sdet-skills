---
name: test-case-design
description: >
  Derive test cases systematically from user stories, acceptance criteria, business rules, and state machines using
  black-box design techniques — equivalence partitioning, boundary value analysis, decision tables, state
  transition testing, verified pairwise, scenario/use-case, permission matrix, account journeys, syntax,
  metamorphic relations, defect-based, error guessing, and exploratory charters — then write them in a traceable
  format (TC-<AREA>-NNN linked to catalogue IDs) with a basis, quoted evidence, priority, level, open questions,
  coverage, and regression scope. Use this skill whenever the user wants to write or generate test cases from a
  story, Jira ticket, spec, or AC; review test cases for gaps; decide how many tests a rule needs; build a
  regression suite; or prepare cases for a test management tool (Kiwi TCMS, TestRail, Xray). Trigger on "write
  test cases", "test scenarios", "boundary values", "decision table", "negative tests", "what should we test",
  "review these test cases". Tool-agnostic.
---

# Test Case Design

Turn a requirement into the **smallest set of test cases that covers its risk**, each traceable to the rule it
verifies. Systematic techniques find the cases intuition misses (boundaries, rule combinations, invalid
transitions) and prevent the duplicates intuition adds.

**How to use this skill:** follow the workflow below. Load a `references/*.md` file only when you need it:

- [`references/techniques.md`](references/techniques.md) — each technique with when to use it, how, a worked
  example, and the coverage it gives; permission matrix, account journeys, syntax, metamorphic relations,
  defect-based design; data-type heuristics; exploratory charters; where designs are thin.
- [`references/test-case-format.md`](references/test-case-format.md) — test case template and fields (basis,
  evidence, level, known bug), Gherkin variant, writing rules, good vs bad examples, assumption cases and open
  questions, file organization, mapping to test management tools and CSV.
- [`references/coverage-and-prioritization.md`](references/coverage-and-prioritization.md) — the requirement
  catalogue, coverage depth per risk level, case priority, suites, regression scope and known bugs, layer
  assignment, per-feature coverage summary, generated views, suite maintenance, review checklist.

Scripts (Python ≥ 3.10, no dependencies):

- `scripts/check_cases.py <cases> --catalogue <file>` — IDs unique, required fields, basis, catalogue references,
  every AC covered (errors); uncovered IDs, missing quotes, vague or status-only results (advisory); `--trace` CSV.
- `scripts/pairwise.py generate|verify <factors.json>` — builds an all-pairs table with the reason for each value,
  and proves every allowed pair is covered.

## Workflow

1. **Collect the source and catalogue it**: the story/feature spec, acceptance criteria, business rules, decisions,
   state machine, permissions, field validation. Build or refresh the **requirement catalogue** — a dated snapshot of
   the IDs by kind. If a source is missing or ambiguous, raise an **OPEN QUESTION** with the product's current
   behaviour labelled *observed, not a requirement* — never derive expected results from it.
2. **Split unclear criteria by clause**: a criterion with one unclear clause still has testable clauses. Quote those
   verbatim and design them now; only the unclear clause goes to an OQ.
3. **Model the requirement**: inputs and their stated constraints, conditions and their combinations, states and
   transitions, actors/roles and data scope, the entities touched, and the customer's own scripts or feedback.
4. **Choose techniques** per element (table below) at the depth the feature's risk requires, and say why.
5. **Derive the conditions and the coverage model**: partition and boundary tables, decision tables, state tables,
   the permission matrix, the verified pairwise table. Check [where designs are thin](references/techniques.md#where-designs-are-thin).
   Gaps or contradictions found while deriving become OQs.
6. **Write the cases** in the standard format: one behavior each, `Verifies:` catalogue IDs, `Basis:` specified or
   assumption, an `Evidence:` quote per expected result, concrete data naming its partition or boundary, priority,
   level (`api`, `ui`, `manual — why`).
7. **Check and summarize**: run `check_cases.py`; coverage per ID (AC → TC; other IDs as gaps with risk); the
   assumption cases with their assumptions; risk-based order with the smoke set; the regression scope; then the
   review checklist.

When reviewing existing test cases, run steps 3–5 against the requirement and `check_cases.py` against the files, and
report what's missing, duplicated, untraceable, stale (the text behind a cited ID changed), or asserted without
support.

**Output**, unless the user asks for less: the requirement analysis with the OQ register; the techniques and why;
the design tables; the cases; traceability; gaps and assumption cases; the risk-based order and smoke set; the
regression scope. For a small change, a few well-chosen cases plus traceability and gaps are enough.

## Choosing a technique

| The requirement has… | Technique |
|---|---|
| Input ranges or classes treated alike | Equivalence partitioning |
| Ordered limits (min/max, lengths, dates, counts) | Boundary value analysis, including beyond the range |
| Structured input (email, phone, date, identifiers) | Syntax testing + equivalence partitioning |
| Outcome depending on a combination of conditions | Decision table (cause–effect graph first when complex) |
| An entity with a lifecycle / statuses | State transition (valid + invalid transitions) |
| Many independent configuration parameters | Pairwise, verified by program / combinatorial |
| A multi-step business flow or multiple actors | Scenario / use-case (main, alternative, exception flows) |
| Roles and permissions | Permission matrix: privilege boundary, every layer, signed-out, data scope |
| Several kinds of user | Account journeys: each role's real day, then what it must be refused |
| Records managed by different roles | CRUD × role matrix |
| Outputs hard to compute by hand (totals, reports, search) | Metamorphic relations |
| Past defects, known weak spots | Defect-based sweeps, error guessing with data-type heuristics |
| A new or poorly specified area | Exploratory charter first, then script what matters |

Most features need several: e.g. a discount rule = partitions + boundaries + a decision table; an approval flow =
decision table + state transitions + permission matrix + one scenario.

## Non-negotiable rules

- **Expected results come from the requirement**, never from observed application behavior. Silence in the
  requirement is an OPEN QUESTION.
- **Every case has a basis.** `specified`: each expected result follows from a cited requirement and quotes it
  verbatim — quotes are taken while writing, they do not retrofit. `assumption`: the case says which result is
  assumed and links the OQ; an assumption is never presented as a requirement.
- **Don't test a limit the documents don't state**; record the question instead.
- **Every test case verifies catalogue IDs**, and every AC has at least one test case. A case citing an unknown ID
  is wrong, not the catalogue.
- **Design-time cases are not executed tests.** Actual results and Pass/Fail come only from a real run; a known
  bug is bound to the steps it breaks and labels a failure beside the verdict, never instead of it.
- **One behavior per test case**; independent of other cases' execution.
- **Negative cases assert the rejection and that nothing changed.**
- **Concrete, observable expected results** — values, states, messages; never "works correctly".
- **Depth follows risk**: full boundaries, decision tables, and invalid transitions for P0; lighter for lower risk,
  with deliberate gaps recorded.
- **Design for the lowest reliable layer**: rules and permissions at API level; the UI gets the journeys.
- **Pairwise is a claim to prove**: verify every pair by program and state why pairs are enough.
- **No real personal data or credentials** in test data.

## ID scheme

Shared with `project-docs` and `sdet-automation-docs`: test cases are `TC-<AREA>-NNN` (security cases
`TC-SEC-<AREA>-NNN`), each listing the `AC-`/`BR-` IDs it verifies. IDs are never reused.

## Related skills

- **`project-docs`** — source of AC, BR, state machines, and permissions; gaps found here go back as OQs.
- **`project-knowledge-base`** — when the inputs are a pile of existing documents: its testing view, flow pages and
  analysis (testable rules, lifecycles, conflicts) are where case design starts.
- **`test-script-writer`** — implements the cases designed here as automated tests (one per case / data row).
- **`manual-qa-agent`** — submits these cases as stories and runs the approved ones in the Manual QA Agent, whose
  case schema (basis, quoted evidence, level, known bugs bound to steps, regression scope) matches this format.
- **`sdet-automation-docs`** — risk classification (P0–P3), traceability matrix, and CI suites that consume these
  cases.
- **`security-testing`** — abuse cases and the access-control matrix extend the negative cases designed here.
- **`sdet-framework-architect`** — how automated versions of these cases are structured (fixtures, data-driven
  tests, when Gherkin is worth it).
