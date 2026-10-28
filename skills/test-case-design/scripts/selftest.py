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

## TC-CON-005 — Over-limit approvals are refused

Verifies:   AC-CON-011
Basis:      assumption
Assumptions: the limit is not documented
Priority:   P2
Level:      api

Steps:
1. Approve 10 001.
2. Approve 10 002.

Expected results:
1. 403
2. Returns 403 Forbidden.

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
    "TC-CON-005: every expected result is a bare status code",
    "TC-CON-002: expected result 2 is vague",
    "catalogue: D-022 is named by no case",
]


def run(*args: str) -> tuple[int, str]:
    p = subprocess.run([sys.executable, *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
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

        kb = root / "kb"
        (kb / "_sources" / "text").mkdir(parents=True)
        source = ("<!-- S06: 05_BUSINESS_RULES.md -->\n# Business rules\n\n## Contracts\n\n"
                  "- **BR-CON-005** A manager may approve a pending contract whose amount is within their approval limit.\n"
                  "- **BR-CON-006** A contract of more than 1000 sessions is refused.\n"
                  "- AC-CON-010: Approval records who approved and when.\n")
        (kb / "_sources" / "text" / "S06-05-business-rules.md").write_text(source, encoding="utf-8")
        (kb / "_sources" / "manifest.json").write_text(json.dumps({"files": [
            {"id": "S06", "path": "05_BUSINESS_RULES.md", "status": "ok", "change": "unchanged",
             "text": "_sources/text/S06-05-business-rules.md"},
            {"id": "S50", "path": "price-list.xlsx", "status": "ok", "change": "removed", "text": None},
        ]}), encoding="utf-8")
        (root / "kbcases").mkdir()
        (root / "kbcases" / "kb.md").write_text("""# With a knowledge base

## TC-KB-001 — Manager approves within the limit

Verifies:   AC-CON-010, BR-CON-005 [S06 L6]
Basis:      specified
Priority:   P0
Level:      api

Steps:
1. Approve the contract.

Expected results:
1. Contract state is APPROVED.
   Evidence: "may approve a pending contract whose amount is within   their approval limit" — BR-CON-005 [S06 L6]
2. Approver and time are recorded.
   Evidence: "records who approved and when" — AC-CON-010
3. The audit log has an entry.
   Evidence: "every approval is written to the audit log" — BR-CON-005 [S06 L6]
4. Nothing else changes.
   Evidence: "unchanged" [S06 L99]
5. Prices are kept.
   Evidence: "price list" [S50 L2]
""", encoding="utf-8")
        code, out = run(str(HERE / "check_cases.py"), str(root / "kbcases"), "--kb", str(kb))
        for want in ("evidence 3 quote not found at S06 L6", "evidence 4: cites S06 L99, past the end (8 lines)",
                     "evidence 5: cites S50, which was removed", "catalogue from 2 knowledge-base sources"):
            if want not in out:
                failures.append(f"--kb missed: {want}")
        if "evidence 1 quote not found" in out:
            failures.append("--kb rejected a correct quote (normalisation)")
        if "evidence 2 has no [Sxx Lnn] citation" not in out:
            failures.append("--kb did not advise on the quote without a citation")
        if "verifies BR-CON-005, which is not in the catalogue" in out or "verifies AC-CON-010, which" in out:
            failures.append("--kb did not build the catalogue from the sources")
        if "1 other requirement IDs in the sources are named by no case" not in out:
            failures.append("--kb catalogue lacks BR-CON-006 from the source text")

        (kb / "testing-view.md").write_text(
            "# Testing view\n\n## Testable rules\n\n| Rule | Limit | Technique | Source |\n|---|---|---|---|\n"
            "| Approval limit (BR-CON-005) | within the limit | DT | [S06 L6] |\n"
            "| Session cap (BR-CON-006) | 1000 | BVA | [S06 L7] |\n| Colour of a badge | grey | — | [S06 L7] |\n\n"
            "## Not testable yet\n\n| Rule | Why | Finding |\n|---|---|---|\n"
            "| Reminder timing | \"a reasonable time\" | [A-1](analysis.md#ambiguities), KQ-01 |\n", encoding="utf-8")
        (kb / "analysis.md").write_text(
            "# Analysis\n\n## Conflicts\n\n| # | Severity | Topic | Source A says | Source B says | Likely current | KQ / OQ |\n"
            "|---|---|---|---|---|---|---|\n"
            "| C-1 | High | Approval | BR-CON-005 manager approves [S06 L6] | AC-CON-010 admin approves [S06 L8] | BR-CON-005 | KQ-02 |\n"
            "| C-2 | Low | Wording | BR-CON-006 says sessions [S06 L7] | AC-CON-010 says visits [S06 L8] | — | — |\n",
            encoding="utf-8")
        code, out = run(str(HERE / "check_cases.py"), str(root / "kbcases"), "--kb", str(kb))
        if "testable rules (testing-view.md): 1 of 2 with a case; 1 rows name no requirement ID" not in out:
            failures.append("--kb testable-rule coverage wrong:\n" + "\n".join(ln for ln in out.splitlines() if "testable" in ln))
        if "no case: Session cap (BR-CON-006)" not in out or "blocked: Reminder timing" not in out:
            failures.append("--kb did not list the uncovered rule or the blocked rule")
        if "TC-KB-001: Basis specified, but BR-CON-005 is disputed in C-1" not in out:
            failures.append("--kb accepted a specified case on a rule in a High conflict")
        if "disputed in C-2" in out:
            failures.append("--kb treated a Low (wording) conflict as blocking")

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
