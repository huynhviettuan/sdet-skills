#!/usr/bin/env bash
# run-examples.sh — re-verify the pytest + Playwright example suite against a fresh scaffold.
#
#   bash skills/test-script-writer/examples/pytest-playwright/run-examples.sh
#
# Copies init-pytest-playwright-framework/template to a temp dir (replacing __PROJECT_NAME__), copies this examples
# folder over it, installs, and runs: ruff check, ruff format --check, mypy, openapi coverage, the suite 3x with
# 4 workers, can-fail on every non-sentinel test file, and the audit. Exits non-zero if any step fails.
#
# Environment (defaults are the public demo apps the examples were written for):
#   BASE_URL    https://demo.playwright.dev            (TodoMVC under /todomvc)
#   API_DOMAIN  https://petstore3.swagger.io/api/v3    (Swagger Petstore; the suite writes, see fixtures/data.py)
#   KEEP_TMP=1  keep the temp project for debugging (its path is printed)
# Needs: bash (Git Bash on Windows), uv, node >= 18, network.

set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../../../.." && pwd)"
template="$repo/skills/init-pytest-playwright-framework/template"
export BASE_URL="${BASE_URL:-https://demo.playwright.dev}"
export API_DOMAIN="${API_DOMAIN:-https://petstore3.swagger.io/api/v3}"

work="$(mktemp -d "${TMPDIR:-/tmp}/pytest-examples.XXXXXX")"
cleanup() {
  if [ "${KEEP_TMP:-0}" = "1" ]; then echo "kept: $work"; else rm -rf "$work"; fi
}
trap cleanup EXIT

failed=()
step() { # step <name> <command...>: run, time and record a step; never aborts the script
  local name="$1"; shift
  local start=$SECONDS
  echo
  echo "=== $name"
  if "$@"; then
    echo "--- ok: $name ($((SECONDS - start))s)"
  else
    echo "--- FAILED: $name ($((SECONDS - start))s)"
    failed+=("$name")
  fi
}

scaffold() {
  cp -R "$template/." "$work/" &&
    for f in pyproject.toml README.md CLAUDE.md; do sed -i 's/__PROJECT_NAME__/examples-pytest-playwright/g' "$work/$f"; done &&
    # The examples' own README and this script are documentation, not part of the project.
    (cd "$here" && tar --exclude=./README.md --exclude=./run-examples.sh --exclude=__pycache__ -cf - .) |
    (cd "$work" && tar -xf -) &&
    ! grep -rl "__PROJECT_NAME__" "$work" --include='*.toml' --include='*.md'
}

suite() {
  # Retries off; 3 repeats x 4 workers. A skip is a failure here: an unset BASE_URL/API_DOMAIN must not pass quietly.
  # Outside test-results/: pytest-playwright empties that folder when the session starts.
  local log="$work/suite.log"
  uv run pytest -q -p no:cacheprovider --count=3 -n 4 -rsxX | tee "$log"
  local status=${PIPESTATUS[0]}
  [ "$status" -eq 0 ] || return "$status"
  if grep -Eq '[0-9]+ (skipped|xpassed|failed|errors?)' "$log"; then
    echo "suite summary contains skipped/xpassed/failed/error results"; return 1
  fi
  grep -Eq '[0-9]+ xfailed' "$log" || { echo "the sentinel did not report XFAIL"; return 1; }
}

can_fail() {
  # Every non-sentinel test file on its own, so each file must have assertions that can be broken and caught.
  local status=0 file
  while IFS= read -r file; do
    node scripts/can-fail.mjs --max 50 --run "uv run pytest {file} -q -p no:cacheprovider" "$file" || status=1
  done < <(find tests -name 'test_*.py' ! -name 'test_sentinel.py' | sort)
  return "$status"
}

total=$SECONDS
echo "template: $template"
echo "project:  $work"
echo "BASE_URL=$BASE_URL API_DOMAIN=$API_DOMAIN"

step "scaffold (template + examples)" scaffold || true
cd "$work" || exit 1
step "uv sync" uv sync
if [ ${#failed[@]} -gt 0 ]; then echo "setup failed: ${failed[*]}"; exit 1; fi
step "playwright install chromium" uv run playwright install chromium
step "ruff check" uv run ruff check .
step "ruff format --check" uv run ruff format --check .
step "mypy (strict)" uv run mypy
step "openapi coverage (tag pet)" node scripts/openapi-tool.mjs coverage specs/petstore.json --services src/qa/api/services --tags pet
step "suite --count=3 -n 4" suite
step "can-fail (non-sentinel test files)" can_fail
step "audit --fail-on block" node scripts/audit-suite.mjs . --fail-on block

echo
echo "=== total $((SECONDS - total))s"
if [ ${#failed[@]} -gt 0 ]; then
  printf 'FAILED steps:\n'; printf '  - %s\n' "${failed[@]}"
  exit 1
fi
echo "ALL STEPS PASSED"
