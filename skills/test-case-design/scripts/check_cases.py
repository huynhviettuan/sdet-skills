#!/usr/bin/env python3
"""check_cases — check test-case files written in this skill's format against a requirement catalogue.

    python check_cases.py <cases-dir-or-file> [--catalogue <file> ...] [--trace out.csv]

Cases are Markdown sections "## TC-<AREA>-NNN — Title" with the fields of references/test-case-format.md.
The catalogue is any set of files listing requirement IDs (FR-, BR-, AC-, NFR-, D-, A-, API-); every ID found in them
is in the catalogue. Without --catalogue only the cases themselves are checked.

Errors (exit 1):
  - a case ID is used twice
  - a case has no Verifies, Priority, Basis or Expected results
  - Basis is not "specified" or "assumption"; an assumption case states no Assumptions
  - Level is manual with no reason
  - a case verifies an ID that is not in the catalogue (a typo or a stale reference, never a reason to edit the catalogue)
  - an acceptance criterion (AC-) in the catalogue is verified by no case
  - an execution result (Actual result, or a Pass/Fail status) is written into a design file
Advisory (printed, never fails; lexical checks are not measured against your product, so read them as hints):
  - catalogue IDs of other kinds that no case names (coverage gaps to list with their risk)
  - a specified case whose expected result has no Evidence quote
  - an expected result that is vague ("works correctly", "properly", "shows an error", "as expected")
  - an expected result that checks only a status code
--trace writes requirement ID -> case IDs as CSV (UTF-8 with BOM, so spreadsheets read accented text).
"""

from __future__ import annotations

import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

REQ_ID = re.compile(r"\b(?:FR|BR|AC|NFR|API|D|A)-(?:[A-Z][A-Z0-9]*-)*\d+[a-z]?\b")
CASE_HEAD = re.compile(r"^##\s+(TC-[A-Z0-9-]*\d+)\s+[—–-]\s+(.+)$", re.M)
FIELD = re.compile(r"^([A-Z][A-Za-z ]+?):[ \t]*(.*)$", re.M)
VAGUE = re.compile(r"works (correctly|fine|as expected)|properly|shows an error|as expected|successfully\.?$|is correct\.?$", re.I)
STATUS_ONLY = re.compile(r"^(returns?|responds?( with)?|status( code)?( is)?)?\s*(HTTP\s*)?\d{3}( [A-Z][A-Za-z ]+)?\.?$", re.I)


def parse(files: list[Path]):
    cases = []
    for f in files:
        text = f.read_text(encoding="utf-8")
        heads = list(CASE_HEAD.finditer(text))
        for i, h in enumerate(heads):
            body = text[h.end(): heads[i + 1].start() if i + 1 < len(heads) else len(text)]
            body = re.split(r"^##\s", body, maxsplit=1, flags=re.M)[0]
            fields = {m.group(1).strip().lower(): m.group(2).strip() for m in FIELD.finditer(body)}
            expected = []
            block = re.search(r"^Expected results?:\s*\n(.*?)(?=^\S[^\n]*:\s*$|\Z)", body, re.M | re.S)
            if block:
                current = None
                for line in block.group(1).splitlines():
                    if re.match(r"^\s*\d+\.\s+", line):
                        current = {"text": re.sub(r"^\s*\d+\.\s+", "", line).strip(), "evidence": ""}
                        expected.append(current)
                    elif current is not None and re.match(r"^\s+Evidence:", line):
                        current["evidence"] = line.split(":", 1)[1].strip()
            cases.append({"id": h.group(1), "title": h.group(2).strip(), "file": f, "fields": fields,
                          "expected": expected, "body": body})
    return cases


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    target = Path(args[0])
    files = sorted(target.rglob("*.md")) if target.is_dir() else [target]
    catalogue: set[str] = set()
    i = 1
    while i < len(args):
        if args[i] == "--catalogue":
            catalogue |= set(REQ_ID.findall(Path(args[i + 1]).read_text(encoding="utf-8")))
            i += 2
        else:
            i += 1
    trace_out = args[args.index("--trace") + 1] if "--trace" in args else None

    cases = parse(files)
    errors: list[str] = []
    advice: list[str] = []
    seen: dict[str, Path] = {}
    trace: dict[str, list[str]] = defaultdict(list)

    for c in cases:
        cid, f = c["id"], c["fields"]
        where = f"{c['file'].name} {cid}"
        if cid in seen:
            errors.append(f"{where}: ID already used in {seen[cid].name}")
        seen.setdefault(cid, c["file"])
        if f.get("status", "").lower().startswith("obsolete"):
            continue
        for name in ("verifies", "priority", "basis"):
            if not f.get(name):
                errors.append(f"{where}: no {name.capitalize()}")
        if not c["expected"]:
            errors.append(f"{where}: no numbered Expected results")
        basis = f.get("basis", "").split()[0].lower() if f.get("basis") else ""
        if basis and basis not in ("specified", "assumption"):
            errors.append(f"{where}: Basis must be specified or assumption, not '{f['basis']}'")
        if basis == "assumption" and not f.get("assumptions"):
            errors.append(f"{where}: assumption case without an Assumptions line saying which result is assumed")
        level = f.get("level", "").lower()
        if level.startswith("manual") and not re.search(r"manual\s*[—–(:-]\s*\S", level):
            errors.append(f"{where}: Level manual needs the reason (\"manual - <why it cannot be automated>\")")
        if f.get("actual result") or re.match(r"(pass|fail)", f.get("status", ""), re.I):
            errors.append(f"{where}: execution result in a design file; results come only from a real run")
        ids = REQ_ID.findall(f.get("verifies", ""))
        for rid in ids:
            trace[rid].append(cid)
            if catalogue and rid not in catalogue:
                errors.append(f"{where}: verifies {rid}, which is not in the catalogue")
        for n, e in enumerate(c["expected"], 1):
            if VAGUE.search(e["text"]):
                advice.append(f"{where}: expected result {n} is vague: \"{e['text'][:70]}\"")
            if STATUS_ONLY.match(e["text"]):
                advice.append(f"{where}: expected result {n} checks only a status code; add what changed or didn't")
            if basis == "specified" and not e["evidence"]:
                advice.append(f"{where}: expected result {n} has no Evidence quote")

    if catalogue:
        for rid in sorted(catalogue - set(trace)):
            if rid.startswith("AC-"):
                errors.append(f"catalogue: {rid} is verified by no case")
            else:
                advice.append(f"catalogue: {rid} is named by no case (list it as a gap with its risk)")

    if trace_out:
        with open(trace_out, "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.writer(fh)
            w.writerow(["Requirement ID", "Test Case IDs"])
            for rid in sorted(set(trace) | catalogue):
                w.writerow([rid, "\n".join(trace.get(rid, []))])

    covered = len(set(trace) & catalogue) if catalogue else len(trace)
    total = len(catalogue) if catalogue else len(trace)
    print(f"{len(cases)} cases in {len(files)} file(s) | {covered}/{total} requirement IDs named by a case")
    for a in advice:
        print(f"ADVICE {a}")
    for e in errors:
        print(f"ERROR  {e}")
    print(f"{len(errors)} error(s), {len(advice)} advisory note(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
