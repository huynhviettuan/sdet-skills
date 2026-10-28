#!/usr/bin/env bash
# run-examples.sh — re-verify the Playwright/TypeScript example suite against the live demo apps.
#
#   bash skills/test-script-writer/examples/playwright-ts/run-examples.sh
#
# Scaffolds skills/init-playwright-framework/template into a temp dir (as the init skill does), copies this folder
# over it, installs, and runs the gates in order; exits non-zero on the first that fails:
#   1. npx tsc --noEmit, npx eslint ., node scripts/audit-suite.mjs . --fail-on block   (the template's own gates)
#   2. the whole suite, 3 repeats x 4 workers, no retries; the @sentinel test must be expected-to-fail and fail
#      with its known-false value, on every repeat
#   3. scripts/can-fail.mjs on every non-sentinel spec: every assertion mutant must be killed
# Needs Node >= 20, npm, network (npm registry, demo.playwright.dev, petstore3.swagger.io). Runs in Git Bash too.
# KEEP_WORK_DIR=1 keeps the temp scaffold for debugging; it is deleted otherwise, also on failure.
set -euo pipefail

EXAMPLES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$EXAMPLES_DIR/../../../.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/skills/init-playwright-framework/template"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pw-ts-examples.XXXXXX")"
PW_CONFIG="playwright.examples.config.ts"

cleanup() {
    if [[ "${KEEP_WORK_DIR:-0}" == "1" ]]; then echo "kept: $WORK_DIR"; else rm -rf "$WORK_DIR"; fi
}
trap cleanup EXIT

step() { printf '\n=== %s (%s)\n' "$1" "$(date -u +%H:%M:%SZ)"; }

# Playwright 1.61 registers synchronous module hooks when Node has them; on Node 22.15 those hooks receive
# `conditions` as a Set and the config fails to load (TypeError: context.conditions?.includes is not a function).
# The async loader works on every supported Node.
export PLAYWRIGHT_FORCE_ASYNC_LOADER="${PLAYWRIGHT_FORCE_ASYNC_LOADER:-1}"
# The examples' config owns the reporter and headless mode; CI=true would switch the scaffold's config to ReportPortal.
unset CI

step "Scaffold template into $WORK_DIR"
# tar keeps dotfiles and dotdirs (.claude/, .gitignore, .nvmrc) and skips any local node_modules.
tar -C "$TEMPLATE_DIR" --exclude=node_modules -cf - . | tar -C "$WORK_DIR" -xf -
for f in package.json README.md CLAUDE.md; do
    sed -i.bak 's/__PROJECT_NAME__/playwright-ts-examples/g' "$WORK_DIR/$f" && rm "$WORK_DIR/$f.bak"
done
tar -C "$EXAMPLES_DIR" --exclude=node_modules --exclude=run-examples.sh --exclude=README.md -cf - . | tar -C "$WORK_DIR" -xf -
cat > "$WORK_DIR/.env" <<'ENV'
BASE_URL=https://demo.playwright.dev
API_DOMAIN=https://petstore3.swagger.io/api/v3
ENV
cd "$WORK_DIR"

step "npm install"
npm install --no-audit --no-fund
step "playwright install chromium"
npx playwright install chromium

step "Static gates: tsc, eslint, audit"
npx tsc --noEmit
npx eslint .
node scripts/audit-suite.mjs . --fail-on block

step "Suite: --repeat-each=3 --workers=4 --retries=0"
REPEAT=3
suite_status=0
npx playwright test --config="$PW_CONFIG" --repeat-each=$REPEAT --workers=4 --retries=0 || suite_status=$?

# Playwright already fails the run if the sentinel passes (an unexpected pass). This also checks it failed for the
# right reason: every repeat expected-to-fail, failed, and the message names the known-false value.
sentinel_status=0
REPEAT=$REPEAT node --input-type=module - <<'NODE' || sentinel_status=$?
import { readFileSync } from 'node:fs';
const report = JSON.parse(readFileSync('test-results/examples-report.json', 'utf8'));
const tests = [];
const walk = (suite) => {
    for (const spec of suite.specs ?? []) for (const t of spec.tests) tests.push({ title: spec.title, ...t });
    for (const child of suite.suites ?? []) walk(child);
};
report.suites.forEach(walk);
// --repeat-each lists each repeat as its own test entry; group them by title.
const byTitle = new Map();
for (const t of tests.filter((t) => t.annotations.some((a) => a.type === 'sentinel'))) {
    byTitle.set(t.title, [...(byTitle.get(t.title) ?? []), t]);
}
const plain = (s) => (s ?? '').replace(/\x1b\[[0-9;]*m/g, ''); // the message carries ANSI diff highlighting
let ok = byTitle.size > 0;
for (const [title, entries] of byTitle) {
    const knownFalse = entries[0].annotations.find((a) => a.type === 'sentinel').description;
    const runs = entries.flatMap((t) => t.results.map((r) => ({ expected: t.expectedStatus, status: r.status,
        reason: !r.error ? 'no error' : plain(r.error.message).includes(`Expected: "${knownFalse}"`) ? 'known-false value' : 'OTHER ERROR' })));
    const good = runs.length === Number(process.env.REPEAT)
        && runs.every((r) => r.expected === 'failed' && r.status === 'failed' && r.reason === 'known-false value');
    ok &&= good;
    console.log(`${good ? 'OK ' : 'BAD'} sentinel "${title}" (${knownFalse}): ` +
        runs.map((r) => `expected ${r.expected} / got ${r.status} / ${r.reason}`).join('; '));
}
const { expected, unexpected, flaky, skipped } = report.stats;
console.log(`stats: expected=${expected} unexpected=${unexpected} flaky=${flaky} skipped=${skipped}`);
process.exit(ok ? 0 : 1);
NODE

step "can-fail on every non-sentinel spec"
mapfile -t SPECS < <(find tests -name '*.spec.ts' ! -name 'sentinel.spec.ts' | sort)
can_fail_status=0
node scripts/can-fail.mjs --max 100 \
    --run "npx playwright test {file} --config=$PW_CONFIG --workers=1 --retries=0 --reporter=dot" \
    "${SPECS[@]}" || can_fail_status=$?

step "Result"
echo "suite exit=$suite_status, sentinel check exit=$sentinel_status, can-fail exit=$can_fail_status"
if (( suite_status || sentinel_status || can_fail_status )); then echo "RED"; exit 1; fi
echo "GREEN"
