#!/usr/bin/env python3
"""check_cases — check test-case files written in this skill's format against a requirement catalogue.

    python check_cases.py <cases-dir-or-file> [--catalogue <file> ...] [--kb <knowledge-base-dir>] [--trace out.csv]

Cases are Markdown sections "## TC-<AREA>-NNN — Title" with the fields of references/test-case-format.md, or rows of
the 20-column CSV workbook described there (any .csv in the target; its execution columns are allowed).
The catalogue is any set of files listing requirement IDs (FR-, BR-, AC-, NFR-, D-, A-, API-); every ID found in them
is in the catalogue. Without --catalogue only the cases themselves are checked.

--kb points at a knowledge base built by the project-knowledge-base skill. Then:
  - every requirement ID found in its sources (_sources/text/) joins the catalogue, so --catalogue may be omitted;
  - a citation [S07 L120] in a case (Verifies or an Evidence line) must name a live source and a line that exists;
  - an Evidence quote that carries a citation is checked against that line (whitespace and quote marks normalised,
    case ignored): a quote that is not there is an error — it is the one claim a reviewer would otherwise take on trust.

Errors (exit 1):
  - a case ID is used twice
  - a case has no Verifies, Priority, Basis or Expected results
  - Basis is not "specified" or "assumption"; an assumption case states no Assumptions
  - Level is manual with no reason
  - a case verifies an ID that is not in the catalogue (a typo or a stale reference, never a reason to edit the catalogue)
  - an acceptance criterion (AC-) in the catalogue is verified by no case
  - an execution result (Actual result, or a Pass/Fail status) is written into a design file
  - with --kb: a citation to an unknown or removed source or a line past its end; an evidence quote not found at its line
  - with --kb: Basis specified on a case that verifies a requirement disputed in a High or Medium conflict of the KB's
    analysis.md — it encodes a guess; it must be an assumption naming the C-n row or its KQ-/OQ- question
Advisory (printed, never fails; lexical checks are not measured against your product, so read them as hints):
  - catalogue IDs of other kinds that no case names (coverage gaps to list with their risk)
  - a specified case whose expected result has no Evidence quote, or (with --kb) a quote with no citation to check it by
  - an expected result that is vague ("works correctly", "properly", "shows an error", "as expected")
  - a case whose every expected result is a bare status code (measured: 3 % of a held-out catalogue, ~half weak)
With --kb it also reports testable-rule coverage from testing-view.md (rows of "Testable rules" whose first column
names requirement IDs, and which of them have a case) and lists the "Not testable yet" rows as blocked.
--trace writes requirement ID -> case IDs as CSV (UTF-8 with BOM, so spreadsheets read accented text).
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REQ_ID = re.compile(r"\b(?:FR|BR|AC|NFR|API|D|A)-(?:[A-Z][A-Z0-9]*-)*\d+[a-z]?\b")
CASE_HEAD = re.compile(r"^##\s+(TC-[A-Z0-9-]*\d+)\s+[—–-]\s+(.+)$", re.M)
FIELD = re.compile(r"^([A-Z][A-Za-z ]+?):[ \t]*(.*)$", re.M)
CITE = re.compile(r"\[(S\d{2,3})\s+L(\d+)(?:\s*[-–]\s*L?(\d+))?\]")
QUOTE = re.compile(r"[\"“”']([^\"“”']{3,})[\"“”']")
VAGUE = re.compile(r"works (correctly|fine|as expected)|properly|shows an error|as expected|successfully\.?$|is correct\.?$", re.I)
# A bare status: the code alone, or with a standard reason phrase. Case-sensitive on purpose: "201 with group FOREIGN"
# checks a value and is not bare. Judged per CASE (every result bare), not per line: a "403" step next to a step that
# checks the state is fine. Measured on a held-out 376-case catalogue: per line it flagged 98 of 983 results, mostly
# falsely; per case it flags 11 cases (3 %), about half genuinely weak — see coverage-and-prioritization.md.
STATUS_ONLY = re.compile(r"^(?:[Rr]eturns?\s+|[Ss]tatus\s+)?(?:HTTP\s*)?\d{3}(?:\s+(?:both|OK|Created|Accepted|No Content|"
                         r"Not Found|Forbidden|Unauthorized|Bad Request|Conflict))?\.?$")


def normalise(text: str) -> str:
    text = text.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'").replace("…", "...")
    text = re.sub(r"[\*_`]", "", text)
    return re.sub(r"\s+", " ", text).strip().lower()


class KnowledgeBase:
    """The sources of a knowledge base: ids, extracted lines, and every requirement ID they mention."""

    def __init__(self, root: Path):
        self.root = root
        manifest = json.loads((root / "_sources" / "manifest.json").read_text(encoding="utf-8"))
        self.sources = {f["id"]: f for f in manifest["files"]}
        self._lines: dict[str, list[str]] = {}
        self.ids: set[str] = set()
        for f in self.sources.values():
            if f.get("change") != "removed" and f.get("text") and (root / f["text"]).exists():
                self.ids |= set(REQ_ID.findall((root / f["text"]).read_text(encoding="utf-8")))

    def lines(self, source_id: str) -> list[str] | None:
        if source_id not in self._lines:
            f = self.sources.get(source_id)
            if not f or f.get("change") == "removed" or not f.get("text") or not (self.root / f["text"]).exists():
                return None
            self._lines[source_id] = (self.root / f["text"]).read_text(encoding="utf-8").splitlines()
        return self._lines[source_id]

    def check_citation(self, source_id: str, start: int, end: int) -> str | None:
        f = self.sources.get(source_id)
        if f is None:
            return f"cites unknown source {source_id}"
        if f.get("change") == "removed":
            return f"cites {source_id}, which was removed from the sources"
        lines = self.lines(source_id)
        if lines is not None and end > len(lines):
            return f"cites {source_id} L{end}, past the end ({len(lines)} lines)"
        return None

    def table(self, page: str, heading: str) -> list[list[str]]:
        """Rows of the first table under `## heading` in a KB page, header and separator dropped."""
        path = self.root / page
        if not path.exists():
            return []
        text = path.read_text(encoding="utf-8")
        m = re.search(rf"^##\s+{re.escape(heading)}\s*$(.*?)(?=^##\s|\Z)", text, re.M | re.S)
        if not m:
            return []
        rows = [ln for ln in m.group(1).splitlines() if ln.strip().startswith("|")]
        return [[cell.strip() for cell in r.strip().strip("|").split("|")] for r in rows[2:]]

    def testable_rules(self) -> list[tuple[str, set[str]]]:
        """testing-view.md → Testable rules: (rule label, requirement IDs named in its first column)."""
        return [(r[0], set(REQ_ID.findall(r[0]))) for r in self.table("testing-view.md", "Testable rules") if r]

    def not_testable(self) -> list[tuple[str, str]]:
        return [(r[0], r[-1]) for r in self.table("testing-view.md", "Not testable yet") if r]

    def conflicts(self) -> dict[str, list[tuple[str, str]]]:
        """analysis.md → Conflicts: requirement ID → (C-n, severity) of the rows that dispute it."""
        disputed: dict[str, list[tuple[str, str]]] = defaultdict(list)
        for row in self.table("analysis.md", "Conflicts"):
            if len(row) > 4 and re.match(r"C-\d+$", row[0]):
                for rid in set(REQ_ID.findall(" | ".join(row[2:5]))):
                    disputed[rid].append((row[0], row[1].strip("* ").lower()))
        return disputed

    def quote_at(self, quote: str, source_id: str, start: int, end: int) -> bool:
        lines = self.lines(source_id)
        if lines is None:
            return True
        return normalise(quote) in normalise(" ".join(lines[start - 1:end]))


CSV_FIELDS = {"Requirement ID(s)": "verifies", "Priority": "priority", "Basis": "basis", "Assumptions": "assumptions",
              "Open Questions": "open questions", "Feature/Module": "module", "Technique(s)": "technique",
              "Status": "run status", "Actual Result": "run actual result", "Automation Candidate": "automation"}


def parse_csv(f: Path):
    """The 20-column workbook (test-case-format.md): one row per case. Execution columns are allowed there."""
    cases = []
    with f.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            fields = {name: (row.get(col) or "").strip() for col, name in CSV_FIELDS.items()}
            expected = []
            for line in (row.get("Expected Results") or "").splitlines():
                m = re.match(r"^\s*(\d+)[.)]\s+(.*)$", line)
                if m:
                    expected.append({"text": m.group(2).strip(), "evidence": ""})
                elif line.strip() and expected:
                    expected[-1]["text"] += " " + line.strip()
                elif line.strip():
                    expected.append({"text": line.strip(), "evidence": ""})
            cases.append({"id": (row.get("Test Case ID") or "").strip(), "title": (row.get("Title") or "").strip(),
                          "file": f, "fields": fields, "expected": expected, "body": "", "csv": True})
    return cases


def parse(files: list[Path]):
    cases = []
    for f in files:
        if f.suffix.lower() == ".csv":
            cases.extend(parse_csv(f))
            continue
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
    files = sorted([*target.rglob("*.md"), *target.rglob("*.csv")]) if target.is_dir() else [target]
    catalogue: set[str] = set()
    kb: KnowledgeBase | None = None
    i = 1
    while i < len(args):
        if args[i] == "--catalogue":
            catalogue |= set(REQ_ID.findall(Path(args[i + 1]).read_text(encoding="utf-8")))
            i += 2
        elif args[i] == "--kb":
            kb = KnowledgeBase(Path(args[i + 1]).resolve())
            catalogue |= kb.ids
            i += 2
        else:
            i += 1
    trace_out = args[args.index("--trace") + 1] if "--trace" in args else None

    cases = parse(files)
    disputed = kb.conflicts() if kb else {}
    errors: list[str] = []
    advice: list[str] = []
    seen: dict[str, Path] = {}
    trace: dict[str, list[str]] = defaultdict(list)
    csv_unquoted = 0

    def cite_errors(where: str, text: str) -> list[tuple[str, int, int]]:
        cites = []
        for source_id, start, end in CITE.findall(text):
            start_n, end_n = int(start), int(end or start)
            if kb is not None:
                problem = kb.check_citation(source_id, start_n, end_n)
                if problem:
                    errors.append(f"{where}: {problem}")
                    continue
            cites.append((source_id, start_n, end_n))
        return cites

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
        if not c.get("csv") and (f.get("actual result") or re.match(r"(pass|fail)", f.get("status", ""), re.I)):
            errors.append(f"{where}: execution result in a design file; results come only from a real run")
        cite_errors(where, f.get("verifies", ""))
        ids = REQ_ID.findall(f.get("verifies", ""))
        for rid in ids:
            trace[rid].append(cid)
            if catalogue and rid not in catalogue:
                errors.append(f"{where}: verifies {rid}, which is not in the catalogue")
        for rid in ids:
            for conflict, severity in disputed.get(rid, []):
                named = re.search(rf"\b({re.escape(conflict)}|KQ-\d+|OQ-\d+)\b", c["body"] + " ".join(f.values()))
                if severity == "low":
                    if not named:
                        advice.append(f"{where}: {rid} is in low-severity conflict {conflict} (wording); check the case "
                                      "follows the likely-current side")
                elif basis == "specified":
                    errors.append(f"{where}: Basis specified, but {rid} is disputed in {conflict} (analysis.md); "
                                  f"write it as an assumption naming {conflict} or its question until the owner decides")
                elif basis == "assumption" and not named:
                    advice.append(f"{where}: {rid} is disputed in {conflict}; name {conflict} or its KQ-/OQ- in the case")
        if c["expected"] and all(STATUS_ONLY.match(e["text"]) for e in c["expected"]):
            advice.append(f"{where}: every expected result is a bare status code; say what changed or didn't, and which "
                          "error")
        unquoted = [n for n, e in enumerate(c["expected"], 1) if not e["evidence"]]
        if basis == "specified" and unquoted and not c.get("csv"):
            advice.append(f"{where}: {len(unquoted)} of {len(c['expected'])} expected results have no Evidence quote "
                          f"({', '.join(map(str, unquoted))})")
        if c.get("csv") and basis == "specified":
            csv_unquoted += 1
        for n, e in enumerate(c["expected"], 1):
            if VAGUE.search(e["text"]):
                advice.append(f"{where}: expected result {n} is vague: \"{e['text'][:70]}\"")
            if e["evidence"]:
                cites = cite_errors(f"{where} evidence {n}", e["evidence"])
                quote = QUOTE.search(e["evidence"])
                if kb is not None and quote and not cites and not CITE.search(e["evidence"]):
                    advice.append(f"{where}: evidence {n} has no [Sxx Lnn] citation, so the quote cannot be checked")
                for source_id, start, end in cites:
                    if quote and not kb.quote_at(quote.group(1), source_id, start, end):
                        errors.append(f"{where}: evidence {n} quote not found at {source_id} L{start}"
                                      + (f"-L{end}" if end != start else "") + f": \"{quote.group(1)[:60]}\"")

    if csv_unquoted:
        advice.append(f"{csv_unquoted} specified case(s) in the CSV carry no evidence quotes (the workbook has no "
                      "Evidence column; quotes live in the Markdown records)")
    if catalogue:
        unnamed = sorted(catalogue - set(trace))
        for rid in unnamed:
            if rid.startswith("AC-"):
                errors.append(f"catalogue: {rid} is verified by no case")
            elif not kb:
                advice.append(f"catalogue: {rid} is named by no case (list it as a gap with its risk)")
        others = [r for r in unnamed if not r.startswith("AC-")]
        if kb and others:
            advice.append(f"catalogue: {len(others)} other requirement IDs in the sources are named by no case — the "
                          "testable-rule coverage above is the risk-weighted view of them")

    if trace_out:
        with open(trace_out, "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.writer(fh)
            w.writerow(["Requirement ID", "Test Case IDs"])
            for rid in sorted(set(trace) | catalogue):
                w.writerow([rid, "\n".join(trace.get(rid, []))])

    covered = len(set(trace) & catalogue) if catalogue else len(trace)
    total = len(catalogue) if catalogue else len(trace)
    print(f"{len(cases)} cases in {len(files)} file(s) | {covered}/{total} requirement IDs named by a case"
          + (f" | catalogue from {len(kb.sources)} knowledge-base sources" if kb else ""))
    if kb:
        rules = kb.testable_rules()
        with_ids = [(label, rids) for label, rids in rules if rids]
        done = [(label, rids) for label, rids in with_ids if rids & set(trace)]
        if rules:
            print(f"testable rules (testing-view.md): {len(done)} of {len(with_ids)} with a case"
                  + (f"; {len(rules) - len(with_ids)} rows name no requirement ID and are not counted"
                     if len(rules) > len(with_ids) else ""))
            for label, _ in with_ids:
                if (label, _) not in done:
                    print(f"  no case: {label}")
        blocked = kb.not_testable()
        if blocked:
            print(f"not testable yet (testing-view.md): {len(blocked)} rules wait for an answer")
            for label, finding in blocked:
                print(f"  blocked: {label} — {re.sub(r'\\]\\([^)]*\\)', ']', finding)}")
    for a in advice:
        print(f"ADVICE {a}")
    for e in errors:
        print(f"ERROR  {e}")
    print(f"{len(errors)} error(s), {len(advice)} advisory note(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    # Windows consoles default to a legacy code page; the reports carry Vietnamese text and dashes.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
