---
paths:
  - "skills/**/scripts/**"
  - "scripts/**"
---

# Scripts

- No dependencies beyond the runtime (Node ≥ 18, Python ≥ 3.10 stdlib); optional parsers behind `uv run --with …`.
- A script that checks or generates something has a self-test beside it (`selftest.py` / `selftest.mjs`): fixtures
  built in a temp folder, every planted problem asserted, every exit code asserted; it runs in the CI
  `skill-scripts` job. Break the check once and watch the self-test fail before committing.
- Errors fail the run; heuristics print advice. A heuristic becomes an error only after a held-out measurement
  (a catalogue it was never tuned on) is written into the skill with the numbers and the date.
- Output is UTF-8 (`sys.stdout.reconfigure(encoding="utf-8", errors="replace")`) with ASCII separators; counts first,
  then WARN/ADVICE lines, then ERROR lines, then the totals line.
- Exit codes: 0 clean, 1 findings, 2 nothing to check or a baseline that proves nothing (never 0 for "skipped").
- A shared script (`audit-suite.mjs`, `openapi-tool.mjs`, `can-fail.mjs`) is edited in the skill, then copied to every
  template in the same commit; `check-repo` proves the copies match.
- Mutating or writing scripts restore what they touched on every exit path (`finally`, signal handlers) and refuse to
  write inside their own input (a KB inside its sources, a catalogue inside its cases).
