#!/usr/bin/env python3
"""selftest - prove measure_judge.py still scores and gates as documented, and that the stub-agent example suite
is green with its sentinel red. Used by CI.

    python selftest.py

Exit 0 when every check holds; 1 on a failure; 2 when the example could not run (INCONCLUSIVE, never a pass).
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
EXAMPLE = HERE.parent / "examples" / "stub-agent"
failures: list[str] = []


def run(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, *args], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", cwd=cwd)


def expect(cond: bool, what: str, out: str = "") -> None:
    if not cond:
        failures.append(what + ("\n" + out if out else ""))


def rows(n_block: int, n_allow: int, fp: int, fn: int) -> str:
    lines = []
    for i in range(n_block):
        lines.append({"id": f"b{i}", "label": "block", "judge": "allow" if i < fn else "block"})
    for i in range(n_allow):
        lines.append({"id": f"a{i}", "label": "allow", "judge": "block" if i < fp else "allow"})
    return "\n".join(json.dumps(r) for r in lines) + "\n"


with tempfile.TemporaryDirectory() as tmp:
    d = Path(tmp)
    script = str(HERE / "measure_judge.py")

    good = d / "good.jsonl"
    good.write_text(rows(60, 60, fp=1, fn=2), encoding="utf-8")   # n=120, FPR 1.7%, FNR 3.3%
    r = run(script, str(good), "--gate")
    expect(r.returncode == 0, "good set should pass the gate", r.stdout)
    expect("MAY FAIL A RUN" in r.stdout and "FPR 1.7%" in r.stdout and "FNR 3.3%" in r.stdout,
           "good set numbers", r.stdout)

    small = d / "small.jsonl"
    small.write_text(rows(10, 10, fp=0, fn=0), encoding="utf-8")
    r = run(script, str(small), "--gate")
    expect(r.returncode == 1 and "n=20 < 100" in r.stdout, "small set stays advisory under --gate", r.stdout)
    r = run(script, str(small))
    expect(r.returncode == 0 and "ADVISORY" in r.stdout, "without --gate advice never fails", r.stdout)

    fpr = d / "fpr.jsonl"
    fpr.write_text(rows(60, 60, fp=5, fn=0), encoding="utf-8")    # FPR 8.3%
    r = run(script, str(fpr), "--gate")
    expect(r.returncode == 1 and "FPR 8.3% > 2.0%" in r.stdout, "high FPR fails the gate", r.stdout)
    r = run(script, str(fpr), "--gate", "--max-fpr", "0.10")
    expect(r.returncode == 0, "team threshold overrides the default", r.stdout)

    bad = d / "bad.jsonl"
    bad.write_text('{"id":"x","label":"block","judge":"block"}\n{"id":"x","label":"maybe","judge":"block"}\n'
                   'not json\n{"label":"allow","judge":"allow"}\n', encoding="utf-8")
    r = run(script, str(bad))
    expect(r.returncode == 1 and "ERRORS (3)" in r.stdout, "malformed lines are reported, not scored", r.stdout)
    expect("line 2: label/judge" in r.stdout and "line 3: not JSON" in r.stdout and "line 4: missing 'id'" in r.stdout,
           "each malformed line named", r.stdout)

# The example suite: green with the sentinel red.
try:
    import pytest  # noqa: F401
except ImportError:
    print("INCONCLUSIVE: pytest is not installed; the stub-agent example did not run (pip install pytest)")
    sys.exit(2)
r = run("-m", "pytest", str(EXAMPLE), "-q", "-p", "no:cacheprovider")
summary = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ""
expect(r.returncode == 0 and "12 passed" in summary and "1 xfailed" in summary,
       f"stub-agent example: expected '12 passed, 1 xfailed', got '{summary}'", r.stdout + r.stderr)

# The sentinel has teeth: with the gate opened for delete_all (no longer forbidden, now allowlisted) the sentinel
# passes, which turns the suite red.
with tempfile.TemporaryDirectory() as tmp:
    import shutil
    copy = Path(tmp) / "stub-agent"
    shutil.copytree(EXAMPLE, copy, ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache"))
    g = copy / "guardrails.py"
    text = g.read_text(encoding="utf-8")
    before = ('allowed: frozenset[str] = frozenset({"search", "send_email"})',
              'forbidden: frozenset[str] = frozenset({"delete_all"})')
    assert all(b in text for b in before), "selftest mutation targets drifted; update them with guardrails.py"
    text = text.replace(before[0], 'allowed: frozenset[str] = frozenset({"search", "send_email", "delete_all"})')
    text = text.replace(before[1], "forbidden: frozenset[str] = frozenset()")
    g.write_text(text, encoding="utf-8")
    r = run("-m", "pytest", str(copy), "-q", "-p", "no:cacheprovider")
    expect(r.returncode != 0 and "XPASS(strict)" in r.stdout,
           "sentinel must fail the suite once the gate is removed", r.stdout)

if failures:
    print("FAILED:")
    for f in failures:
        print("  - " + f)
    sys.exit(1)
print("selftest ok: measure_judge gate/advisory/errors; stub-agent 12 passed + 1 xfailed; sentinel bites")
