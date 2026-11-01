---
paths:
  - "evals/**"
---

# Evals

- One case = one folder with `prompt.md` and `graders/*.md`. Name it `<skill>-<what>`, `trigger-<skill>-<what>` or
  `no-trigger-<what>`; the name is the `--case` filter.
- Prompts read like a person asking, never naming the skill. State the expected outcome in `expected_outcome` so a
  failing run says what is missing.
- `regex` graders for anything with an exact form (an ID, a number, a field, a citation); `tool_used` on `Skill` for
  triggering (`arm: both` with `min: 0, max: 0` for must-not-trigger); at most one `llm` grader per case, with a
  numbered PASS/FAIL rubric and `weight: 2`. Long outputs are graded by regex, not by the judge.
- `runs: 2`, read-only `allowed_tools` unless the case needs Bash/Write (then it only runs on Linux/macOS runners).
- A case is added when a skill gains a rule a model could skip; a case is changed only together with the skill text
  that made it fail.
- `evals/results/` is never committed. A score is quoted with its Claude version, model and date; "the eval exists"
  is not a score.
