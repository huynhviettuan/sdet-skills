# Orders — a worked `test-case-design` example

Test cases designed with [`test-case-design`](../../SKILL.md) from the Orders requirements package
[`skills/project-docs/examples/orders-docs/`](../../../project-docs/examples/orders-docs/README.md), which this
example only reads. Design-time only: no case has run, so nothing here is a pass or a fail.

## What the example shows

- **A scoped slice, chosen to exercise the techniques**: note length (BR-ORD-003, boundaries 0 / 199 / 200 / 201),
  the order lifecycle (BR-ORD-005, the 24 h cancellation window of BR-ORD-006, all valid and invalid transitions),
  the login lockout (BR-AUTH-001/002, attempts 4 / 5 / 6), the open-order cap (BR-ORD-007) and one decision table —
  who may do which lifecycle action on which status — derived from `ROLES_PERMISSIONS.md`. 19 of the package's 44
  ACs; the selection is [slice-catalogue.md](slice-catalogue.md).
- **25 cases in the standard format** in [`cases/`](cases/): `Verifies`, `Basis`, a verbatim `Evidence:` quote per
  expected result, priority, level, concrete data naming its partition or boundary, `Exclusive` and `Smoke` where
  they apply. 17 specified, 8 assumption (OQ-001..006), 9 P0 / 12 P1 / 4 P2.
- **Design tables** in [design-tables.md](design-tables.md): partitions and boundaries, the state table, the
  decision table, the actor x action matrix, and a verified pairwise table with the argument for why pairwise is
  valid for the note rule and not for the lifecycle rule.
- **The workbook** [orders-cases.csv](orders-cases.csv): the same 25 cases in the 20-column CSV (UTF-8 with BOM),
  generated from the Markdown so the two cannot drift; execution columns read "Not Run".
- **Traceability, gaps, assumption cases, run order, smoke set and regression scope** in [coverage.md](coverage.md).
- **Open-question disagreements are not dressed up as bugs**: the reference server shortens a 201-character note
  (OQ-002); TC-ORD-002 and TC-ORD-005 assert the working assumption (reject) as `Basis: assumption` and carry no
  `Known bug` line, because there is no defect to bind.

## Files

```text
README.md            this page
slice-catalogue.md   the slice's 4 FR, 12 BR, 19 AC, rows copied from the package catalogue
design-tables.md     EP/BVA, state table, decision table, actor x action matrix, pairwise (with tool output)
factors.json         pairwise factors, reasons, forbidden and required rows
pairwise-rows.csv    the 13 rows pairwise.py generated (the data of TC-ORD-006)
cases/               auth-login-lockout.md (6), order-note-length.md (6), order-open-cap.md (2), order-lifecycle.md (11)
orders-cases.csv     the 25 cases as the 20-column workbook
coverage.md          AC -> TC, gaps with risk, out-of-slice ACs, assumption cases, order, smoke, regression scope
```

## Verification

All commands run from the repository root on 2026-11-03 (ran once on that date; no CI job re-runs this example).

**Cases against the slice** — every slice AC has a case:

```bash
python skills/test-case-design/scripts/check_cases.py skills/test-case-design/examples/orders/cases --catalogue skills/test-case-design/examples/orders/slice-catalogue.md
```

```text
25 cases in 4 file(s) | 35/35 requirement IDs named by a case
0 error(s), 0 advisory note(s)
```

Exit 0.

**Cases against the full package catalogue**:

```bash
python skills/test-case-design/scripts/check_cases.py skills/test-case-design/examples/orders/cases --catalogue skills/project-docs/examples/orders-docs/REQUIREMENTS_CATALOGUE.md
```

```text
25 cases in 4 file(s) | 35/68 requirement IDs named by a case
...
25 error(s), 8 advisory note(s)
```

Exit 1, expected for a slice: `check_cases.py` reports a catalogue AC with no case as an error, not as advice. All
25 errors are "verified by no case" for exactly the out-of-slice ACs (AC-ADM-001, 002; AC-AUD-001, 002;
AC-AUTH-006, 007; AC-ORD-001, 002, 010..015, 021..023, 040..042; AC-SEC-001..005), listed with their risk in
[coverage.md](coverage.md#out-of-slice). The 8 advisories are the out-of-slice BR/FR IDs (BR-AUD-001,
BR-SEC-003..006, FR-ADM-001, FR-ORD-002, FR-ORD-005). No error names a case.

**The workbook** (the checker reads the 20-column CSV):

```bash
python skills/test-case-design/scripts/check_cases.py skills/test-case-design/examples/orders/orders-cases.csv --catalogue skills/test-case-design/examples/orders/slice-catalogue.md
```

```text
25 cases in 1 file(s) | 35/35 requirement IDs named by a case
ADVICE 17 specified case(s) in the CSV carry no evidence quotes (the workbook has no Evidence column; quotes live in the Markdown records)
0 error(s), 1 advisory note(s)
```

Exit 0. Against the full catalogue the CSV gives the same 25 out-of-slice errors plus the same advisories (25
errors, 9 advisories). The CSV sits outside `cases/` on purpose: in one target directory its rows and the Markdown
would share IDs and fail as duplicates.

**Traceability CSV**:

```bash
python skills/test-case-design/scripts/check_cases.py skills/test-case-design/examples/orders/cases --catalogue skills/test-case-design/examples/orders/slice-catalogue.md --trace <scratch>/trace.csv
```

Exit 0; 35 requirement rows (UTF-8 with BOM), first rows `AC-AUTH-001,TC-AUTH-001` and
`AC-AUTH-004,"TC-AUTH-004\nTC-AUTH-006"`. The same mapping is the AC -> TC table of coverage.md.

**Pairwise** — generate, then verify the CSV it wrote:

```bash
python skills/test-case-design/scripts/pairwise.py generate skills/test-case-design/examples/orders/factors.json --csv skills/test-case-design/examples/orders/pairwise-rows.csv
python skills/test-case-design/scripts/pairwise.py verify skills/test-case-design/examples/orders/factors.json skills/test-case-design/examples/orders/pairwise-rows.csv
```

Both exit 0: `13 rows cover the pairs of 96 combinations.` and `Verified: every allowed pair is covered.` The full
output is in [design-tables.md](design-tables.md#pairwise-note-validation).

**Evidence quotes** — `check_cases.py` compares a quote with its source only under `--kb` with an `[Sxx Lnn]`
citation; this package is not a knowledge base, so the quotes were checked once by a scratch script (not in the
repo): every AC quote is a substring of that AC's `Statement:` line, every BR/FR quote a substring of its document,
whitespace collapsed. Result on 2026-11-03: `44 evidence quotes checked | 0 problem(s)`.

**Repository check**: `node scripts/check-repo.mjs` on 2026-11-03 ended `17 problem(s) | 19 skills | 375 Markdown
files` (exit 1; the script prints a middle dot where this page writes `|`); all 17 are broken links to `analysis.md` under `skills/project-knowledge-base/examples/orders-kb/`,
none under this folder. CI's check job re-runs it on every push.

## Not done

- **`analysis.md` (the requirement analysis with the OQ register and the techniques and why) is missing.** The
  Write of that file was refused by a tool policy on 2026-11-03; per the repository's rule a refusal is a stop, so it
  was not written another way. Its content went to the coordinator in the session report. Until it lands, the
  techniques per element are in the headers of the case files and in design-tables.md, and the OQ to case mapping is
  the assumption table of coverage.md.
