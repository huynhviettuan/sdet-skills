#!/usr/bin/env python3
"""selftest - prove the security scripts and the vuln-api example still catch what they claim. Used by CI.

    python selftest.py

1. authz_matrix: malformed tables are errors, advice is advice, verify reads JUnit and names uncovered cells.
2. vuln-api secure: the suite is green with the sentinel red; authz_matrix verify covers every cell.
3. vuln-api per flaw: with VULN_API_INSECURE=<flaw> exactly the tests that claim that flaw turn red (and the
   sentinel XPASSes for bola) - every security test is shown to detect its flaw, nothing else moves.
4. headers_check: clean against the secure server, findings against headers+cors, refuses a non-test host.

Exit 0 when all hold; 1 on a failure; 2 when pytest is missing (INCONCLUSIVE, never a pass).
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).parent
EXAMPLE = HERE.parent / "examples" / "vuln-api"
MATRIX = EXAMPLE / "ROLES_PERMISSIONS.md"
failures: list[str] = []

# flaw -> the test names (substrings) that must fail, and nothing else
RED_FOR_FLAW: dict[str, set[str]] = {
    "bola": {"[AZ-003]", "[AZ-004]", "[AZ-006]", "[AZ-009]", "[AZ-010]", "[AZ-013]",
             "test_bola_attacker_cannot_change_another_tenants_order", "test_sentinel_other_tenant_reads_order"},
    "mass": {"test_mass_assignment_rejected"},
    "headers": {"test_security_headers_present"},
    "cors": {"test_cors_rejects_unknown_origin"},
    "errors": {"test_error_response_does_not_leak"},
    "ratelimit": {"test_login_rate_limited"},
    "enum": {"test_login_does_not_reveal_usernames"},
    "jwt-none": {"test_unsigned_token_rejected"},
    "jwt-nosig": {"test_tampered_token_rejected"},
    "jwt-noexp": {"test_expired_token_rejected"},
    "audit": {"test_denied_request_is_audited"},
}


def run(*args: str, env: dict[str, str] | None = None, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, *args], capture_output=True, text=True, encoding="utf-8",
                          errors="replace", cwd=cwd, env={**os.environ, **(env or {})})


def expect(cond: bool, what: str, out: str = "") -> None:
    if not cond:
        failures.append(what + ("\n" + out[-1500:] if out else ""))


def junit_outcomes(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for case in ET.parse(path).getroot().iter("testcase"):
        outcome = "passed"
        for child in case:
            if child.tag in {"failure", "error"}:
                outcome = "failed"
            elif child.tag == "skipped":
                outcome = "skipped"
        out[case.get("name", "")] = outcome
    return out


try:
    import pytest  # noqa: F401
except ImportError:
    print("INCONCLUSIVE: pytest is not installed; the vuln-api example did not run (pip install pytest)")
    sys.exit(2)

with tempfile.TemporaryDirectory() as tmp:
    d = Path(tmp)
    matrix_script = str(HERE / "authz_matrix.py")

    # 1. authz_matrix on fixtures
    bad = d / "bad.md"
    bad.write_text("| ID | Operation | Actor | Expected |\n|---|---|---|---|\n"
                   "| AZ-001 | GET /x | anonymous | 401 |\n| AZ-001 | GET /x | admin | 200 |\n"
                   "| nope | GET /y | admin | 200 |\n| AZ-002 | GET /y | admin | ok |\n", encoding="utf-8")
    r = run(matrix_script, "generate", str(bad))
    expect(r.returncode == 1 and "duplicate ID AZ-001" in r.stdout and "bad ID 'nope'" in r.stdout
           and "AZ-002 expected must be an HTTP status" in r.stdout, "generate reports malformed rows", r.stdout)
    allows = d / "allows.md"
    allows.write_text("| ID | Operation | Actor | Expected |\n|---|---|---|---|\n| AZ-001 | GET /x | admin | 200 |\n",
                      encoding="utf-8")
    r = run(matrix_script, "generate", str(allows))
    expect(r.returncode == 0 and "WARN GET /x: no deny row" in r.stdout and "WARN GET /x: no anonymous row" in r.stdout,
           "a matrix with only allows is advice, not an error", r.stdout)
    (d / "empty.md").write_text("no table\n", encoding="utf-8")
    r = run(matrix_script, "generate", str(d / "empty.md"))
    expect(r.returncode == 2, "no cells -> exit 2", r.stdout)

    # 2. secure run
    junit = d / "secure.xml"
    r = run("-m", "pytest", str(EXAMPLE), "-q", "-p", "no:cacheprovider", f"--junitxml={junit}",
            env={"VULN_API_INSECURE": ""})
    summary = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ""
    expect(r.returncode == 0 and "35 passed" in summary and "1 xfailed" in summary,
           f"secure suite: expected '35 passed, 1 xfailed', got '{summary}'", r.stdout + r.stderr)
    r = run(matrix_script, "verify", str(MATRIX), str(junit))
    expect(r.returncode == 0 and "23 cells, 23 verified, 0 findings" in r.stdout, "verify: every cell covered", r.stdout)
    # verify names a cell whose test is missing
    trimmed = d / "trimmed.xml"
    trimmed.write_text(junit.read_text(encoding="utf-8").replace("[AZ-007]", "[AZ-999]"), encoding="utf-8")
    r = run(matrix_script, "verify", str(MATRIX), str(trimmed))
    expect(r.returncode == 1 and "ERROR AZ-007 GET /orders/{id} as admin: no test ran" in r.stdout,
           "verify names the uncovered cell", r.stdout)

    # 3. one flaw at a time: exactly the claimed tests go red
    secure = junit_outcomes(junit)
    for flaw, must_fail in RED_FOR_FLAW.items():
        jx = d / f"{flaw}.xml"
        r = run("-m", "pytest", str(EXAMPLE), "-q", "-p", "no:cacheprovider", f"--junitxml={jx}",
                env={"VULN_API_INSECURE": flaw})
        outcomes = junit_outcomes(jx)
        red = {name for name, o in outcomes.items() if o == "failed"}
        expected_red = {name for name in outcomes if any(m in name for m in must_fail)}
        expect(len(expected_red) == len(must_fail), f"{flaw}: every claimed test exists ({must_fail - {m for m in must_fail if any(m in n for n in outcomes)}})")
        expect(red == expected_red, f"flaw {flaw}: red set differs\n  unexpected red: {sorted(red - expected_red)}\n"
                                    f"  expected red but green: {sorted(expected_red - red)}", r.stdout)
        expect(set(outcomes) == set(secure), f"{flaw}: same tests ran as in the secure run")

    # 4. headers_check against a live server
    headers_script = str(HERE / "headers_check.py")
    for flaws, want_exit, want in (("", 0, "total: 0 findings"), ("headers,cors", 1, "HDR-MISSING X-Content-Type-Options")):
        port = 8765 + (3 if flaws else 2)
        proc = subprocess.Popen([sys.executable, str(EXAMPLE / "app.py"), str(port)],
                                env={**os.environ, "VULN_API_INSECURE": flaws},
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        try:
            for _ in range(50):
                try:
                    urllib.request.urlopen(f"http://127.0.0.1:{port}/_boom", timeout=1)
                    break
                except urllib.error.HTTPError:
                    break
                except OSError:
                    time.sleep(0.1)
            r = run(headers_script, f"http://127.0.0.1:{port}/orders")
            expect(r.returncode == want_exit and want in r.stdout, f"headers_check with flaws={flaws!r}", r.stdout)
            if flaws:
                expect("CORS-GRANT origin https://evil.example.test" in r.stdout and "with credentials" in r.stdout,
                       "headers_check reports the CORS grant", r.stdout)
        finally:
            proc.kill()
            proc.wait()
    r = run(headers_script, "https://www.example.com/")
    expect(r.returncode == 2 and "REFUSED" in r.stdout, "headers_check refuses a host outside test_hosts", r.stdout)

if failures:
    print("FAILED:")
    for f in failures:
        print("  - " + f)
    sys.exit(1)
print(f"selftest ok: authz_matrix generate/verify; vuln-api 35 passed + 1 xfailed; {len(RED_FOR_FLAW)} flaws each "
      "turn exactly their tests red; headers_check clean/findings/refusal")
