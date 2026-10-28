#!/usr/bin/env python3
"""selftest — prove ingest.py and check_kb.py still do what the skill relies on. Used by CI.

    python selftest.py

Uses only formats the standard library reads (Markdown, text, CSV), in a temporary folder: ingest, a clean KB,
planted citation and link errors, an incremental re-run (changed, new, removed), and the refusal to write the KB
inside the sources. Exit 0 when all hold.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent

RULES = "# Business rules\n\n## Contracts\n\n" + "".join(f"- BR-{300 + i}: rule number {i}.\n" for i in range(1, 21))
FLOW = "# Business flow\n\n1. A lead arrives.\n2. The consultant calls within 60 minutes.\n3. The lead visits.\n"
PRICES = "package,sessions,price\nPT 12,12,6000000\nPT 24,24,11000000\n"


def run(*args: str) -> tuple[int, str]:
    p = subprocess.run([sys.executable, *args], capture_output=True, text=True, encoding="utf-8")
    return p.returncode, p.stdout + p.stderr


def manifest(kb: Path) -> dict[str, dict]:
    data = json.loads((kb / "_sources" / "manifest.json").read_text(encoding="utf-8"))
    return {f["path"]: f for f in data["files"]}


def main() -> int:
    failures: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        src, kb = root / "docs", root / "docs-kb"
        src.mkdir()
        (src / "rules.md").write_text(RULES, encoding="utf-8")
        (src / "flow.txt").write_text(FLOW, encoding="utf-8")
        (src / "prices.csv").write_text(PRICES, encoding="utf-8")

        code, out = run(str(HERE / "ingest.py"), str(src), str(src / "kb"))
        if code == 0 or (src / "kb" / "_sources").exists():
            failures.append("ingest wrote a KB inside the sources folder")

        code, out = run(str(HERE / "ingest.py"), str(src), str(kb))
        if code != 0:
            failures.append("ingest failed:\n" + out)
            return report(failures)
        m = manifest(kb)
        ids = {p: f["id"] for p, f in m.items()}
        if set(m) != {"rules.md", "flow.txt", "prices.csv"} or any(f["status"] != "ok" for f in m.values()):
            failures.append(f"manifest wrong after first run: {[(p, f['status']) for p, f in m.items()]}")
        rules = ids["rules.md"]
        flow = ids["flow.txt"]
        rules_text = (kb / m["rules.md"]["text"]).read_text(encoding="utf-8").splitlines()
        line = next(i for i, ln in enumerate(rules_text, 1) if "BR-305" in ln)

        (kb / "_digests").mkdir()
        for path, doc_id in ids.items():
            (kb / "_digests" / f"{doc_id}-{Path(path).stem}.md").write_text(
                f"# {doc_id}\n\n- read: all [{doc_id} L1]\n", encoding="utf-8")
        (kb / "business-rules.md").write_text(
            f"# Business rules\n\n## Contracts\n\n| ID | Rule | Source |\n|---|---|---|\n"
            f"| BR-305 | rule number 5 applies to contracts | [{rules} L{line}] |\n"
            f"| Flow | the consultant calls within 60 minutes of assignment | [{flow} L3] |\n", encoding="utf-8")
        (kb / "README.md").write_text(
            "# KB\n\nSee [rules](business-rules.md), [their contracts part](business-rules.md#contracts) and\n"
            "[below](#contracts-sessions).\n\n## Contracts, sessions!\n\nBack to [the top](#kb).\n", encoding="utf-8")

        code, out = run(str(HERE / "check_kb.py"), str(kb))
        if code != 0 or "0 error(s)" not in out:
            failures.append("clean KB reported errors:\n" + out)

        (kb / "bad.md").write_text(
            "# Bad\n\n"
            f"- cites a line past the end of the rules document, which does not exist [{rules} L9999]\n"
            "- cites a source id that the manifest has never had [S99 L1]\n"
            "- links a page that is not there: [missing](nowhere.md)\n"
            "- links a heading that is not there: [rules](business-rules.md#pricing)\n\n"
            "```mermaid\nflowchart TD\n  A --> B\n", encoding="utf-8")
        code, out = run(str(HERE / "check_kb.py"), str(kb))
        for want in (f"cites {rules} L9999, past the end", "cites unknown source S99", "broken link nowhere.md",
                     "link business-rules.md#pricing names no heading", "unbalanced code fence"):
            if want not in out:
                failures.append(f"check_kb missed: {want}")
        if code != 1:
            failures.append(f"check_kb exit code {code} with planted errors, expected 1")
        (kb / "bad.md").unlink()

        (src / "flow.txt").write_text(FLOW + "4. The lead signs a contract.\n", encoding="utf-8")
        (src / "notes.md").write_text("# Meeting notes\n\nWe decided nothing.\n", encoding="utf-8")
        (src / "prices.csv").unlink()
        code, out = run(str(HERE / "ingest.py"), str(src), str(kb))
        m2 = manifest(kb)
        changes = {p: f.get("change") for p, f in m2.items()}
        want = {"rules.md": "unchanged", "flow.txt": "changed", "notes.md": "new", "prices.csv": "removed"}
        if changes != want:
            failures.append(f"incremental changes {changes}, expected {want}")
        if {p: f["id"] for p, f in m2.items() if p in ids} != ids:
            failures.append("source ids are not stable across runs")

        (kb / "prices.md").write_text(f"# Prices\n\n- PT 12 costs 6000000 [{ids['prices.csv']} L2]\n"
                                      "- ask sales@example.com or call 0909 123 456\n", encoding="utf-8")
        code, out = run(str(HERE / "check_kb.py"), str(kb))
        if f"cites {ids['prices.csv']}, which was removed" not in out:
            failures.append("check_kb accepted a citation to a removed source")
        for pii in ("sales@example.com", "0909 123 456"):
            if f"personal data or a credential, check it is a documented example: {pii}" not in out:
                failures.append(f"check_kb did not flag {pii}")
        if "6000000" in "".join(ln for ln in out.splitlines() if "personal data" in ln):
            failures.append("check_kb flagged a price as personal data")
        if f"no digest for {m2['notes.md']['id']}" not in out:
            failures.append("check_kb did not warn about the new source without a digest")

    return report(failures)


def report(failures: list[str]) -> int:
    for f in failures:
        print(f"FAIL {f}")
    print("selftest: ok" if not failures else f"selftest: {len(failures)} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
