#!/usr/bin/env bash
# Re-earns the counts in README.md: audits step-0..step-3, requires a strictly decreasing total ending at 0,
# the ratchet to pass on every step and --fail-on warn to pass on step-3. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")"
AUDIT=../../scripts/audit-suite.mjs
OUT=.verify-out # a dot-folder: audit-suite skips it; removed on exit
trap 'rm -rf "$OUT"' EXIT
mkdir -p "$OUT"
prev=-1
fail=0
for s in 0 1 2 3; do
    node "$AUDIT" "step-$s" --json "$OUT/step-$s.json" --baseline audit-baseline.json > "$OUT/step-$s.txt" || { echo "step-$s | ratchet FAILED"; fail=1; }
    total=$(STEP="$s" node -e "console.log(require('./$OUT/step-' + process.env.STEP + '.json').findings.length)")
    if [ "$prev" -ge 0 ] && [ "$total" -ge "$prev" ]; then echo "step-$s | total $total not below step-$((s-1)) ($prev)"; fail=1; fi
    echo "step-$s | findings $total"
    prev=$total
done
[ "$prev" -eq 0 ] || { echo "step-3 | expected 0 findings, got $prev"; fail=1; }
node "$AUDIT" step-3 --fail-on warn > /dev/null || { echo "step-3 | --fail-on warn FAILED"; fail=1; }
# The committed baseline is the step-0 report: same counts.
node -e "
const a = require('./audit-baseline.json').counts, b = require('./$OUT/step-0.json').counts;
for (const k of Object.keys(a)) if (a[k] !== b[k]) { console.log('audit-baseline.json | ' + k + ' ' + a[k] + ' != ' + b[k]); process.exit(1); }
" || fail=1
if [ "$fail" -ne 0 ]; then echo "FAIL"; exit 1; fi
echo "OK | step-0..step-3 strictly decreasing, step-3 clean at --fail-on warn"
