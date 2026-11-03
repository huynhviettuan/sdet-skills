#!/usr/bin/env bash
# Re-earns the numbers the skill examples claim in their READMEs. Run from anywhere; CI runs it in the
# "Skill examples" job. Each check asserts the exact count its README states, so a README that drifts from the
# example fails here. Examples with their own selftest (security-testing, ai-guardrail-testing) run in the
# skill-scripts job instead; examples that need the network or a second repo (page/service builders, the Manual QA
# Agent spec, the load run) are "ran once" in their README and are not repeated here.
set -uo pipefail
cd "$(dirname "$0")/.."
# A dot-folder in the repo, not mktemp: on Windows, Git Bash's /tmp is not a path Node can open.
OUT=.check-examples-out
trap 'rm -rf "$OUT"' EXIT
mkdir -p "$OUT"
fail=0
ok() { echo "ok   | $1"; }
bad() { echo "FAIL | $1"; fail=1; }

# test-code-review: the review example's before/ has 7 mechanical findings, after/ has 0.
AUDIT=skills/refactor-test-suite/scripts/audit-suite.mjs
R=skills/test-code-review/examples/review-01
node "$AUDIT" "$R/before" --json "$OUT/rv-before.json" > /dev/null
node "$AUDIT" "$R/after" --json "$OUT/rv-after.json" > /dev/null
counts=$(OUT="$OUT" node -e "
const path = require('node:path'), dir = path.resolve(process.env.OUT);
const f = (n) => require(path.join(dir, n)).findings.length;
console.log(f('rv-before.json') + ' ' + f('rv-after.json'));")
[ "$counts" = "7 0" ] && ok "test-code-review review-01: audit before 7, after 0" || bad "test-code-review review-01: expected '7 0', got '$counts'"

# refactor-test-suite: step-0..step-3 strictly decreasing, ending at 0 (the example's own script).
if bash skills/refactor-test-suite/examples/legacy-orders/verify.sh > "$OUT/refactor.txt" 2>&1; then
    ok "refactor-test-suite legacy-orders: $(tail -1 "$OUT/refactor.txt")"
else
    bad "refactor-test-suite legacy-orders:"; cat "$OUT/refactor.txt"
fi

# automation-pipeline: the pilot's status file validates against the shipped schema.
S=skills/automation-pipeline/examples/pilot-todo-petstore/automation-status.json
if node skills/automation-pipeline/scripts/status.mjs validate "$S" > "$OUT/status.txt" 2>&1; then
    ok "automation-pipeline pilot status: valid"
else
    bad "automation-pipeline pilot status:"; cat "$OUT/status.txt"
fi

# project-docs: the Orders permission matrix parses with 0 errors and 0 warnings (51 cells).
M=skills/project-docs/examples/orders-docs/docs/business/ROLES_PERMISSIONS.md
python skills/security-testing/scripts/authz_matrix.py generate "$M" > "$OUT/matrix.txt"
rc=$?
if [ $rc -eq 0 ] && ! grep -q "^WARN\|^ERROR" "$OUT/matrix.txt" && grep -q "cells=51 " "$OUT/matrix.txt"; then
    ok "project-docs orders-docs: matrix 51 cells, 0 warnings"
else
    bad "project-docs orders-docs: matrix (exit $rc)"; head -5 "$OUT/matrix.txt"
fi

# test-case-design: the 25 Orders cases cover their slice catalogue with 0 errors (Markdown and the CSV workbook).
T=skills/test-case-design/examples/orders
for target in "$T/cases" "$T/orders-cases.csv"; do
    if python skills/test-case-design/scripts/check_cases.py "$target" --catalogue "$T/slice-catalogue.md" \
            --sources skills/project-docs/examples/orders-docs > "$OUT/tcd.txt" 2>&1 \
        && grep -q "^25 cases" "$OUT/tcd.txt" && grep -q "^0 error(s)" "$OUT/tcd.txt"; then
        ok "test-case-design orders: $(basename "$target") 25 cases, 0 errors against the slice ($(grep '^evidence quotes' "$OUT/tcd.txt"))"
    else
        bad "test-case-design orders: $target"; tail -5 "$OUT/tcd.txt"
    fi
done

if [ "$fail" -ne 0 ]; then echo "FAIL"; exit 1; fi
echo "OK | every example check passed"
