#!/usr/bin/env python3
"""selftest — prove check_cases.py and pairwise.py still catch what they claim to. Used by CI.

    python selftest.py

Builds fixtures in a temporary folder, runs both scripts, and checks every planted problem is reported (and
nothing else is an error). Exit 0 when all hold.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent

GOOD = """# Contracts

## TC-CON-001 — Manager approves a pending contract within the limit

Verifies:   AC-CON-010, BR-CON-005
Basis:      specified
Priority:   P0
Level:      api

Steps:
1. Approve the contract.

Expected results:
1. Contract state is APPROVED.
   Evidence: "A manager may approve a pending contract within their limit" — BR-CON-005

## TC-CON-003 — Unknown limit is answered with a client error

Verifies:   AC-CON-012
Basis:      assumption
Assumptions: No body size limit is documented; the case only requires a 4xx, never a 5xx
Open questions: OQ-4
Priority:   P2
Level:      manual — needs the operator console

Steps:
1. Send a 2 MB note.

Expected results:
1. Any 4xx in the error contract; never a 5xx, and no note is saved.

## TC-CON-004 — Obsolete cases are not checked

Status:     Obsolete — replaced by TC-CON-001
"""

BAD = """# Planted problems

## TC-CON-002 — Over-limit approval is refused

Verifies:   AC-CON-011, BR-CON-999
Basis:      assumption
Priority:   P1
Level:      manual

Steps:
1. Approve a contract of 10 001.

Expected results:
1. Returns 403.
2. The page works correctly.

## TC-CON-001 — Duplicate id

Verifies:   AC-CON-010
Priority:   P2
Basis:      guessed
Level:      ui
Status:     Pass

Steps:
1. Open the contract.

Expected results:
1. The contract shows status PENDING_APPROVAL.
"""

CATALOGUE = "Snapshot 2026-10-28: AC-CON-010, AC-CON-011, AC-CON-012, AC-CON-013, BR-CON-005, D-022\n"

EXPECTED_ERRORS = [
    "TC-CON-002: assumption case without an Assumptions line",
    "TC-CON-002: Level manual needs the reason",
    "TC-CON-002: verifies BR-CON-999, which is not in the catalogue",
    "TC-CON-001: ID already used",
    "TC-CON-001: Basis must be specified or assumption",
    "TC-CON-001: execution result in a design file",
    "catalogue: AC-CON-013 is verified by no case",
]
EXPECTED_ADVICE = [
    "TC-CON-002: expected result 1 checks only a status code",
    "TC-CON-002: expected result 2 is vague",
    "catalogue: D-022 is named by no case",
]


def run(*args: str) -> tuple[int, str]:
    p = subprocess.run([sys.executable, *args], capture_output=True, text=True, encoding="utf-8")
    return p.returncode, p.stdout + p.stderr


def main() -> int:
    failures: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "cases").mkdir()
        (root / "cases" / "good.md").write_text(GOOD, encoding="utf-8")
        (root / "catalogue.md").write_text(CATALOGUE, encoding="utf-8")

        code, out = run(str(HERE / "check_cases.py"), str(root / "cases" / "good.md"), "--catalogue",
                        str(root / "catalogue.md"))
        errors = [ln for ln in out.splitlines() if ln.startswith("ERROR")]
        unexpected = [e for e in errors if "AC-CON-011" not in e and "AC-CON-013" not in e]
        if unexpected:
            failures.append("good cases produced errors: " + "; ".join(unexpected))

        (root / "cases" / "bad.md").write_text(BAD, encoding="utf-8")
        code, out = run(str(HERE / "check_cases.py"), str(root / "cases"), "--catalogue", str(root / "catalogue.md"),
                        "--trace", str(root / "trace.csv"))
        if code != 1:
            failures.append(f"check_cases exit code {code} on planted problems, expected 1")
        errors = [ln for ln in out.splitlines() if ln.startswith("ERROR")]
        for want in EXPECTED_ERRORS:
            if not any(want in e for e in errors):
                failures.append(f"missing error: {want}")
        if len(errors) != len(EXPECTED_ERRORS):
            failures.append(f"{len(errors)} errors, expected {len(EXPECTED_ERRORS)}:\n  " + "\n  ".join(errors))
        for want in EXPECTED_ADVICE:
            if want not in out:
                failures.append(f"missing advice: {want}")
        trace = (root / "trace.csv").read_bytes()
        if not trace.startswith(b"\xef\xbb\xbf") or b"BR-CON-005" not in trace:
            failures.append("trace.csv lacks the BOM or the BR-CON-005 row")

        factors = {
            "factors": {
                "role": {"Consultant": "lowest allowed", "Manager": "limit applies", "Admin": "no limit"},
                "sessions": {"1": "lower edge", "17": "any", "1000": "upper edge"},
                "discount": ["0", "10", "50"],
                "payment": ["full", "partial", "none"],
                "type": ["NEW", "RENEW"],
            },
            "forbidden": [{"role": "Consultant", "discount": "50"}],
        }
        (root / "factors.json").write_text(json.dumps(factors), encoding="utf-8")
        code, out = run(str(HERE / "pairwise.py"), "generate", str(root / "factors.json"), "--csv",
                        str(root / "rows.csv"))
        if code != 0 or "Verified" not in out:
            failures.append("pairwise generate did not verify:\n" + out)
        if "Consultant | " in out and "| Consultant | 1 | 50 |" in out:
            failures.append("pairwise produced a forbidden row")
        rows = (root / "rows.csv").read_text(encoding="utf-8").splitlines()
        if len(rows) - 1 > 15:
            failures.append(f"pairwise used {len(rows) - 1} rows for 162 combinations (expected at most 15)")
        (root / "rows.csv").write_text("\n".join(rows[:-1]) + "\n", encoding="utf-8")
        code, out = run(str(HERE / "pairwise.py"), "verify", str(root / "factors.json"), str(root / "rows.csv"))
        if code != 1 or "pair not covered" not in out:
            failures.append("pairwise verify accepted a table with a row removed")

    for f in failures:
        print(f"FAIL {f}")
    print("selftest: ok" if not failures else f"selftest: {len(failures)} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
