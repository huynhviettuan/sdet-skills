# Evals

Behavioural checks for the skills, run with `claude plugin eval` (Claude Code ≥ 2.1.269). Each case is a folder with a
`prompt.md` and `graders/*.md`; the docs are at <https://code.claude.com/docs/en/plugin-evals>.

These are not the scripts' self-tests (`skills/*/scripts/selftest.py`, run by CI on every push). An eval runs a real
model against the plugin, costs money, and measures whether the skill changes what the model does — so it is run on
demand, not on every commit.

| Case | Checks |
|---|---|
| `tcd-freeze-design` | `test-case-design` on a six-rule story: boundaries beyond the range (6, 61), a third freeze refused, the no-approval column, a refused-role permission case at API level, quoted evidence with `Basis`, the vague clause raised as a question |
| `trigger-kb-document-pile` | a pile of mixed documents triggers `project-knowledge-base`, and the answer talks about citations and conflicts |
| `trigger-agent-run-approved-case` | an approved agent case triggers `manual-qa-agent`, and the answer refuses to edit an expectation to make a failed run pass |
| `no-trigger-unit-tests` | a unit-test request does not trigger `test-case-design` |
| `tsw-negative-case` | `test-script-writer` on a negative UI case: no fixed waits, titled with the case ID, through the page object, a sync point before the absence check, both expected results asserted |
| `kb-flow-no-invention` | `project-knowledge-base` on two tiny sources: line citations, a Mermaid diagram, the unstated rejection path marked as a gap, the 7 vs 14 days conflict shown both ways |

The `tcd-freeze-design` graders are the three places the Manual QA Agent pilot found designs thin (boundaries beyond
the stated range, the decision-table column that needs no special handling, adjacent permission layers), plus the
rules the skill states as non-negotiable.

## Run

```bash
claude plugin eval . --trust-plugin --no-publish
```

One case while editing a skill (one arm, one run):

```bash
claude plugin eval . --case tcd-freeze-design --runs 1 --ablation none --trust-plugin --no-publish
```

Pin models for comparable numbers (`--model`, `--judge-model`). `evals/results/` is written by every run and
ignored by git. The `Δ` column is the with-plugin score minus the no-plugin baseline: a trigger case with a `Δ` near
zero and a failing `skill-fired` grader means the skill's description does not match how people phrase the request.

## Adding a case

- Name it `<skill>-<what>` or `trigger-<skill>-<what>` / `no-trigger-<what>`; the name is the `--case` filter.
- Prefer `regex` graders on `last_message` for things that have an exact form (an ID, a number, a field), `tool_used`
  on `Skill` for triggering, and one `llm` grader with a numbered PASS/FAIL rubric for judgement. Keep `runs` at 2.
- A grader that needs `Bash` or `Write` needs `--allow-tools` and a Linux/macOS/WSL2 runner; native Windows has no
  sandbox backend for them.
- Write what you expect in `expected_outcome` so a reader knows what a failing run is missing.
