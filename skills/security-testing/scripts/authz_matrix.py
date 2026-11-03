#!/usr/bin/env python3
"""authz_matrix - the documented permission model as the single source of authorization tests.

    python authz_matrix.py generate ROLES_PERMISSIONS.md            # cells as JSON (what the suite must cover)
    python authz_matrix.py verify ROLES_PERMISSIONS.md junit.xml     # every cell has a test and it passed

The matrix is a Markdown table with the columns ID | Operation | Actor | Expected (any heading order; extra
columns are ignored):

    | ID     | Operation        | Actor         | Expected |
    | AZ-001 | GET /orders/{id} | anonymous     | 401      |

generate: errors for a malformed table (duplicate ID, non-numeric status, missing columns); WARN for an operation
with no deny row or no anonymous row (advice - a matrix with only allows proves nothing). verify: reads a JUnit
XML (pytest --junitxml) and matches each cell ID against test names; a cell with no test, or whose test failed,
is an error. Exit 0 clean, 1 findings, 2 nothing to check.
"""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ID_RE = re.compile(r"^[A-Z]{2,}-\d{3,}$")
DENY = {401, 403, 404}


@dataclass(frozen=True)
class Cell:
    id: str
    operation: str
    actor: str
    expected: int


def load_matrix(path: Path) -> list[Cell]:
    cells, errors = parse_matrix(path)
    if errors:
        raise ValueError("; ".join(errors))
    return cells


def parse_matrix(path: Path) -> tuple[list[Cell], list[str]]:
    cells: list[Cell] = []
    errors: list[str] = []
    header: list[str] | None = None
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip().startswith("|"):
            header = None
            continue
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        if header is None:
            lowered = [c.lower() for c in cols]
            if {"id", "operation", "actor", "expected"} <= set(lowered):
                header = lowered
            continue
        if set("".join(cols)) <= set("-: "):
            continue
        row = dict(zip(header, cols))
        cid, op, actor, exp = row.get("id", ""), row.get("operation", ""), row.get("actor", ""), row.get("expected", "")
        if not ID_RE.match(cid):
            errors.append(f"line {n}: bad ID {cid!r}")
            continue
        if not re.fullmatch(r"\d{3}", exp):
            errors.append(f"line {n}: {cid} expected must be an HTTP status, got {exp!r}")
            continue
        if not op or not actor:
            errors.append(f"line {n}: {cid} needs operation and actor")
            continue
        cells.append(Cell(cid, op, actor, int(exp)))
    ids = [c.id for c in cells]
    for dup in sorted({i for i in ids if ids.count(i) > 1}):
        errors.append(f"duplicate ID {dup}")
    return cells, errors


def advice(cells: list[Cell]) -> list[str]:
    out: list[str] = []
    ops = sorted({c.operation for c in cells})
    for op in ops:
        rows = [c for c in cells if c.operation == op]
        if not any(c.expected in DENY for c in rows):
            out.append(f"{op}: no deny row - every operation needs at least one actor that is refused")
        if not any(c.actor == "anonymous" for c in rows):
            out.append(f"{op}: no anonymous row - unauthenticated access is undecided")
    return out


def generate(path: Path) -> int:
    cells, errors = parse_matrix(path)
    print(f"matrix: {path} | cells={len(cells)} operations={len({c.operation for c in cells})} "
          f"actors={len({c.actor for c in cells})}")
    for a in advice(cells):
        print(f"WARN {a}")
    for e in errors:
        print(f"ERROR {e}")
    print(json.dumps([c.__dict__ for c in cells], indent=1))
    if errors:
        return 1
    return 0 if cells else 2


def verify(path: Path, junit: Path) -> int:
    cells, errors = parse_matrix(path)
    if errors:
        for e in errors:
            print(f"ERROR {e}")
        return 1
    if not cells:
        print("nothing to verify: matrix has no cells")
        return 2
    results: dict[str, str] = {}
    for case in ET.parse(junit).getroot().iter("testcase"):
        name = case.get("name", "")
        outcome = "passed"
        for child in case:
            if child.tag in {"failure", "error"}:
                outcome = "failed"
            elif child.tag == "skipped":
                outcome = "skipped"
        for cell in cells:
            if cell.id in name:
                results[cell.id] = outcome
    covered = sum(1 for c in cells if results.get(c.id) == "passed")
    print(f"matrix: {path} | junit: {junit} | cells={len(cells)} passed={covered}")
    findings = 0
    for c in cells:
        outcome = results.get(c.id)
        if outcome is None:
            print(f"ERROR {c.id} {c.operation} as {c.actor}: no test ran for this cell")
            findings += 1
        elif outcome != "passed":
            print(f"ERROR {c.id} {c.operation} as {c.actor}: test {outcome}")
            findings += 1
    print(f"total: {len(cells)} cells, {covered} verified, {findings} findings")
    return 1 if findings else 0


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[0] == "generate":
        return generate(Path(argv[1]))
    if len(argv) >= 3 and argv[0] == "verify":
        return verify(Path(argv[1]), Path(argv[2]))
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
