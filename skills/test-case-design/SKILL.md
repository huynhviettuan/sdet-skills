---
name: test-case-design
description: >
  Derive test cases systematically from user stories, acceptance criteria, business rules, and state machines using
  black-box design techniques — equivalence partitioning, boundary value analysis, decision tables, state
  transition testing, pairwise/combinatorial, scenario/use-case, CRUD × role matrices, error guessing, and
  exploratory charters — then write them in a traceable format (TC-<AREA>-NNN linked to AC/BR IDs) with priority,
  test layer, and coverage summary. Use this skill whenever the user wants to write or generate test cases from a
  story, Jira ticket, spec, or AC; review test cases for gaps; decide how many tests a rule needs; build a
  regression suite; or prepare cases for a test management tool (Kiwi TCMS, TestRail, Xray). Trigger on phrases
  like "write test cases", "generate test scenarios", "test cases for this story", "boundary values", "decision
  table", "negative tests", "what should we test", "review these test cases". Tool-agnostic.
---

# Test Case Design

Turn a requirement into the **smallest set of test cases that covers its risk**, each traceable to the rule it
verifies. Systematic techniques find the cases intuition misses (boundaries, rule combinations, invalid
transitions) and prevent the duplicates intuition adds.

**How to use this skill:** follow the workflow below. Load a `references/*.md` file only when you need it:

- [`references/techniques.md`](references/techniques.md) — each technique with when to use it, how, a worked
  example, and the coverage it gives; data-type heuristics; exploratory charters.
- [`references/test-case-format.md`](references/test-case-format.md) — test case template, Gherkin variant,
  writing rules, good vs bad examples, file organization, mapping to test management tools.
- [`references/coverage-and-prioritization.md`](references/coverage-and-prioritization.md) — coverage depth per
  risk level, case priority, smoke/sanity/regression/release suites, layer assignment, per-feature coverage
  summary, suite maintenance, review checklist.

## Workflow

1. **Collect the source**: the story/feature spec, its acceptance criteria (AC IDs), business rules (BR IDs),
   state machine, permissions, and field validation. If a source is missing or ambiguous, raise an **OPEN
   QUESTION** — never derive expected results from what the application currently does.
2. **Model the requirement**: list inputs and their constraints, conditions and their combinations, states and
   transitions, actors/roles, and the entities touched.
3. **Choose techniques** per element (table below) at the depth the feature's risk requires.
4. **Derive cases**: partitions → boundaries → rule columns → transitions (valid and invalid) → role/CRUD matrix →
   scenarios → heuristics. Gaps or contradictions found while deriving (a decision-table column the rules don't
   cover) become OQs.
5. **Write the cases** in the standard format: one behavior each, concrete data, observable expected results,
   priority, layer, `Verifies:` AC/BR.
6. **Assign layers and suites**: lowest reliable layer per case; tag smoke/sanity/regression.
7. **Summarize coverage** per feature (AC → TC, techniques, known gaps) and run the review checklist.

When reviewing existing test cases, run steps 2–4 against the requirement and report what's missing, duplicated,
or untraceable.

## Choosing a technique

| The requirement has… | Technique |
|---|---|
| Input ranges or classes treated alike | Equivalence partitioning |
| Ordered limits (min/max, lengths, dates, counts) | Boundary value analysis |
| Outcome depending on a combination of conditions | Decision table |
| An entity with a lifecycle / statuses | State transition (valid + invalid transitions) |
| Many independent configuration parameters | Pairwise / combinatorial |
| A multi-step business flow or multiple actors | Scenario / use-case (main, alternative, exception flows) |
| Records managed by different roles | CRUD × role matrix |
| Free text, money, dates, identifiers, concurrency | Error guessing with data-type heuristics |
| A new or poorly specified area | Exploratory charter first, then script what matters |

Most features need several: e.g. a discount rule = partitions + boundaries + a decision table; an approval flow =
decision table + state transitions + role matrix + one scenario.

## Non-negotiable rules

- **Expected results come from the requirement**, never from observed application behavior. Silence in the
  requirement is an OPEN QUESTION.
- **Every test case verifies a named AC or BR**, and every AC has at least one test case.
- **One behavior per test case**; independent of other cases' execution.
- **Negative cases assert the rejection and that nothing changed.**
- **Concrete, observable expected results** — values, states, messages; never "works correctly".
- **Depth follows risk**: full boundaries, decision tables, and invalid transitions for P0; lighter for lower risk,
  with deliberate gaps recorded.
- **Design for the lowest reliable layer**: rules and permissions at API level; the UI gets the journeys.

## ID scheme

Shared with `project-docs` and `sdet-automation-docs`: test cases are `TC-<AREA>-NNN` (security cases
`TC-SEC-<AREA>-NNN`), each listing the `AC-`/`BR-` IDs it verifies. IDs are never reused.

## Related skills

- **`project-docs`** — source of AC, BR, state machines, and permissions; gaps found here go back as OQs.
- **`test-script-writer`** — implements the cases designed here as automated tests (one per case / data row).
- **`sdet-automation-docs`** — risk classification (P0–P3), traceability matrix, and CI suites that consume these
  cases.
- **`security-testing`** — abuse cases and the access-control matrix extend the negative cases designed here.
- **`sdet-framework-architect`** — how automated versions of these cases are structured (fixtures, data-driven
  tests, when Gherkin is worth it).
