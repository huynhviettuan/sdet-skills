#!/usr/bin/env python3
"""pairwise — build an all-pairs table and prove that it covers every pair.

    python pairwise.py generate <factors.json> [--csv out.csv] [--seed 1]
    python pairwise.py verify   <factors.json> <rows.csv>

factors.json:
    {
      "factors": {
        "role":     {"Consultant": "lowest role allowed", "Manager": "approval limit applies", "Admin": "no limit"},
        "sessions": {"1": "lower tier edge", "17": "any count", "1000": "upper tier edge"},
        "discount": ["0", "10", "50"]
      },
      "forbidden": [{"role": "Consultant", "discount": "50"}],
      "required":  [{"role": "Admin", "sessions": "1000", "discount": "50"}]
    }

A factor's values are a list, or an object value -> why the value was chosen (the reason is printed with the table,
so the design shows why each value is there). "forbidden" lists partial combinations that cannot occur; a pair
inside one is not required. "required" rows are always included (high-risk combinations added on top).

generate prints the table as Markdown (or writes CSV) and verifies it; verify checks a table you already have, for
example one from PICT or written by hand. Both exit 1 when a required pair is missing. Pairwise is only valid when
each rule depends on at most two of the factors; cover any three-factor rule exhaustively.
"""

from __future__ import annotations

import csv
import itertools
import json
import random
import sys
from pathlib import Path


def load(path: str):
    spec = json.loads(Path(path).read_text(encoding="utf-8"))
    factors: dict[str, list[str]] = {}
    reasons: dict[str, dict[str, str]] = {}
    for name, values in spec["factors"].items():
        if isinstance(values, dict):
            factors[name] = [str(v) for v in values]
            reasons[name] = {str(k): str(r) for k, r in values.items()}
        else:
            factors[name] = [str(v) for v in values]
            reasons[name] = {}
    forbidden = [{k: str(v) for k, v in f.items()} for f in spec.get("forbidden", [])]
    required = [{k: str(v) for k, v in r.items()} for r in spec.get("required", [])]
    return factors, reasons, forbidden, required


def violates(row: dict[str, str], forbidden: list[dict[str, str]]) -> bool:
    return any(all(row.get(k) == v for k, v in f.items()) for f in forbidden)


def all_pairs(factors, forbidden):
    names = list(factors)
    pairs = set()
    for a, b in itertools.combinations(names, 2):
        for va in factors[a]:
            for vb in factors[b]:
                if not violates({a: va, b: vb}, [f for f in forbidden if set(f) <= {a, b}]):
                    pairs.add(((a, va), (b, vb)))
    return pairs


def pairs_of(row: dict[str, str], names: list[str]):
    return {((a, row[a]), (b, row[b])) for a, b in itertools.combinations(names, 2) if a in row and b in row}


def generate(factors, forbidden, required, seed: int):
    names = list(factors)
    rng = random.Random(seed)
    uncovered = all_pairs(factors, forbidden)
    rows: list[dict[str, str]] = []
    for r in required:
        rows.append(r)
        uncovered -= pairs_of(r, names)
    while uncovered:
        best, best_gain = None, -1
        for _ in range(40):
            (a, va), (b, vb) = rng.choice(sorted(uncovered))
            row = {a: va, b: vb}
            for name in rng.sample(names, len(names)):
                if name in row:
                    continue
                options = [v for v in factors[name] if not violates({**row, name: v}, forbidden)]
                if not options:
                    break
                row[name] = max(options, key=lambda v: (len(pairs_of({**row, name: v}, names) & uncovered), rng.random()))
            if len(row) < len(names) or violates(row, forbidden):
                continue
            gain = len(pairs_of(row, names) & uncovered)
            if gain > best_gain:
                best, best_gain = row, gain
        if best is None or best_gain == 0:
            break
        rows.append(best)
        uncovered -= pairs_of(best, names)
    return rows


def verify(factors, forbidden, rows) -> tuple[list, list]:
    names = list(factors)
    covered = set()
    bad_rows = []
    for i, row in enumerate(rows, 1):
        if violates(row, forbidden):
            bad_rows.append(i)
        covered |= pairs_of(row, names)
    missing = sorted(all_pairs(factors, forbidden) - covered)
    return missing, bad_rows


def report(factors, reasons, rows, missing, bad_rows) -> int:
    names = list(factors)
    total = 1
    for v in factors.values():
        total *= len(v)
    print("Factors (value: why it was chosen):")
    for n in names:
        print(f"- {n}: " + ", ".join(f"{v}" + (f" ({reasons[n][v]})" if reasons[n].get(v) else "") for v in factors[n]))
    print(f"\n{len(rows)} rows cover the pairs of {total} combinations.\n")
    print("| # | " + " | ".join(names) + " |")
    print("|---|" + "---|" * len(names))
    for i, row in enumerate(rows, 1):
        print(f"| {i} | " + " | ".join(row.get(n, "") for n in names) + " |")
    for i in bad_rows:
        print(f"ERROR row {i} is a forbidden combination")
    for (a, va), (b, vb) in missing:
        print(f"ERROR pair not covered: {a}={va} with {b}={vb}")
    ok = not missing and not bad_rows
    print("\nVerified: every allowed pair is covered." if ok else f"\n{len(missing)} pair(s) missing.")
    return 0 if ok else 1


def main() -> int:
    args = sys.argv[1:]
    if len(args) < 2 or args[0] not in ("generate", "verify"):
        print(__doc__)
        return 2
    factors, reasons, forbidden, required = load(args[1])
    if args[0] == "generate":
        seed = int(args[args.index("--seed") + 1]) if "--seed" in args else 1
        rows = generate(factors, forbidden, required, seed)
        if "--csv" in args:
            out = Path(args[args.index("--csv") + 1])
            with out.open("w", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=list(factors))
                w.writeheader()
                w.writerows(rows)
    else:
        with Path(args[2]).open(encoding="utf-8-sig") as fh:
            rows = [{k: (v or "").strip() for k, v in r.items()} for r in csv.DictReader(fh)]
    missing, bad_rows = verify(factors, forbidden, rows)
    return report(factors, reasons, rows, missing, bad_rows)


if __name__ == "__main__":
    sys.exit(main())
