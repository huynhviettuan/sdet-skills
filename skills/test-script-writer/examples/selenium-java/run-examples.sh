#!/usr/bin/env bash
# run-examples.sh: re-verify the Selenium + RestAssured / Java examples against the live TodoMVC demo and the public
# Swagger Petstore, on a fresh copy of the init-selenium-java-framework template. Meant for a nightly job.
#
#   bash run-examples.sh            # RUNS=3, the template's thread count (pom <threads>)
#   RUNS=5 THREADS=8 bash run-examples.sh
#   KEEP=1 bash run-examples.sh     # keep the temp project for debugging (path printed)
#
# Steps, each must pass (the script exits non-zero on the first failing step):
#   1. copy template/ to a temp dir and the examples (src/, docs/, specs/) over it
#   2. mvn test-compile
#   3. ArchitectureRulesTest (ArchUnit: composition, no raw Selenium/HTTP in tests, extendOnly, no sleeps, ...)
#   4. the example suite RUNS times, parallel methods, headless Chrome; every test must pass in every run, and the
#      sentinel must pass, which it does only when its known-false assertion threw the expected AssertionError
#   5. can-fail on every non-sentinel test class: every mutated expected value must make the class fail
#   6. audit-suite --fail-on block, and the service coverage check against specs/petstore.json (tag pet)
# Needs: bash (Git Bash on Windows), JDK 17, Maven, Node >= 18, Chrome, network.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS="$(cd "$HERE/../../.." && pwd)"
TEMPLATE="$SKILLS/init-selenium-java-framework/template"
CAN_FAIL_FALLBACK="$SKILLS/test-script-writer/scripts/can-fail.mjs"
RUNS="${RUNS:-3}"
THREADS_ARG=()
if [[ -n "${THREADS:-}" ]]; then THREADS_ARG=("-Dthreads=$THREADS"); fi
SUITE_TESTS='com/example/qa/tests/**/*Test'
EXPECTED_TESTS=14 # TodoTest 4, TodoMetamorphicTest 2, SentinelTest 1, PetTest 5, PetMetamorphicTest 2

WORK="$(mktemp -d "${TMPDIR:-/tmp}/sdet-examples-selenium-java.XXXXXX")"
cleanup() {
  if [[ "${KEEP:-0}" == "1" ]]; then echo "kept: $WORK"; else rm -rf "$WORK"; fi
}
trap cleanup EXIT

SECONDS=0
step() { printf '\n==> [%3ss] %s\n' "$SECONDS" "$*"; }
fail() { printf '\nFAILED: %s\n' "$*" >&2; exit 1; }

step "1. scaffold: template + examples -> $WORK"
cp -r "$TEMPLATE/." "$WORK/"
cp -r "$HERE/src" "$HERE/docs" "$HERE/specs" "$WORK/"
sed -i 's/__PROJECT_NAME__/selenium-java-examples/g' "$WORK/pom.xml"
[[ -f "$WORK/scripts/can-fail.mjs" ]] || cp "$CAN_FAIL_FALLBACK" "$WORK/scripts/can-fail.mjs"
cd "$WORK"

step "2. mvn test-compile"
mvn -B -q test-compile || fail "compilation"

step "3. ArchitectureRulesTest"
mvn -B -q test -Dtest=ArchitectureRulesTest || fail "architecture rules"

results="target/surefire-reports/testng-results.xml"
for run in $(seq 1 "$RUNS"); do
  step "4. example suite, run $run/$RUNS"
  mvn -B test "-Dtest=$SUITE_TESTS" -Dsurefire.failIfNoSpecifiedTests=false "${THREADS_ARG[@]}" \
    > "suite-run-$run.log" 2>&1 || { grep -E 'Tests run:|FAIL|ERROR' "suite-run-$run.log" | head -40; fail "suite run $run"; }
  totals="$(grep -o '<testng-results[^>]*>' "$results")"
  echo "    $totals"
  total="$(sed -E 's/.*total="([0-9]+)".*/\1/' <<<"$totals")"
  passed="$(sed -E 's/.*passed="([0-9]+)".*/\1/' <<<"$totals")"
  [[ "$total" == "$EXPECTED_TESTS" && "$passed" == "$EXPECTED_TESTS" ]] \
    || fail "run $run: expected $EXPECTED_TESTS passed, got $passed of $total"
  grep -q 'status="PASS"[^>]*name="knownFalseExpectationFails"\|name="knownFalseExpectationFails"[^>]*status="PASS"' "$results" \
    || fail "run $run: the sentinel did not pass (its known-false assertion did not throw the expected AssertionError)"
done

step "5. can-fail on every non-sentinel test class"
mapfile -t classes < <(find src/test/java/com/example/qa/tests -name '*Test.java' ! -name 'SentinelTest.java' | sort)
node scripts/can-fail.mjs --max 100 \
  --run "mvn -q test -Dtest={class} -Dsurefire.failIfNoSpecifiedTests=false" "${classes[@]}" \
  || fail "can-fail (a surviving mutant, or a class whose unmutated run did not pass)"

step "6. audit and service coverage"
node scripts/audit-suite.mjs . --fail-on block || fail "audit-suite"
node scripts/openapi-tool.mjs coverage specs/petstore.json --services src/main/java/com/example/qa/api/services --tags pet \
  || fail "service coverage"

step "all steps passed in ${SECONDS}s"
