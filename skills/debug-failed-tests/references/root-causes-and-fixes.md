# Root Causes and Fixes

For each common cause: how it shows up, how to confirm it, the fix that removes it, and the tempting anti-fix that
only hides it. Examples are Playwright; the patterns are tool-agnostic.

Contents:

- [Synchronization](#synchronization)
- [Locators](#locators)
- [Test data and isolation](#test-data-and-isolation)
- [Assertions and expectations](#assertions-and-expectations)
- [Framework bugs](#framework-bugs)
- [Environment](#environment)
- [Time, locale, randomness](#time-locale-randomness)
- [Product races](#product-races)
- [Selenium / Java specifics](#selenium--java-specifics)

---

## Synchronization

| Cause | Evidence | Confirm | Fix | Anti-fix |
|---|---|---|---|---|
| Acting before the app is ready | Timeout or "element not attached"; trace shows action before a pending response/render | Trace timeline: action precedes the response that renders the target | Wait on the real signal: web-first assertion on the target state, or `waitForResponse` registered **before** the triggering action | `waitForTimeout`, longer timeouts |
| Waiting on the wrong signal | Network idle reached but UI still updating | Snapshot at failure shows spinner/skeleton | Wait for the loading indicator to disappear (shared skeleton component) or for the expected content | `networkidle` everywhere |
| Animation / transition | "Element is not stable", click intercepted mid-transition | Screenshot/video shows movement or overlay | Wait for the end state (dialog visible, overlay hidden); disable animations in the test env if the product allows | `force: true` clicks |
| Overlay intercepts click | "…intercepts pointer events" naming a toast/backdrop | Error names the intercepting element | Dismiss or wait for the overlay through its component; scroll target into view | `force: true` |
| Non-retrying read | `expect(await el.textContent()).toBe(...)` fails sometimes | Value correct a moment later in the trace | Use a retrying assertion (`await expect(locator).toHaveText(...)`) or `expect.poll(() => read())` | Sleep before reading |
| Detached element | "Element is not attached" after re-render | Trace shows list re-rendered between locate and act | Keep locators lazy (locate at action time); don't cache element handles | Retry loops around the action |

---

## Locators

| Cause | Evidence | Confirm | Fix | Anti-fix |
|---|---|---|---|---|
| Matches nothing | Timeout waiting for locator | Snapshot shows the element with a different name/text/role | Update the locator in the page object (one place), preferably to a test id / role+name | Loosen to a partial text match |
| Matches several | "strict mode violation: resolved to N elements" | Error lists the matches (often one in a modal or hidden tab) | Scope through the owning container/section; identify by business key | `.first()` / `nth(0)` |
| Text changed (copy, i18n) | Many tests fail after a content change | Diff of UI text | Locate by test id or role; keep copy assertions only where copy is the requirement | Update dozens of hard-coded strings in tests |
| Wrong state/page | Locator correct but element absent | Snapshot shows a different page or state | Fix the navigation/precondition (fixture or page method) | Add waits for an element that will never appear |

---

## Test data and isolation

| Cause | Evidence | Confirm | Fix | Anti-fix |
|---|---|---|---|---|
| Shared mutable data | Unexpected values/counts; fails in parallel only | Rung 3 reproduces; two tests touch the same record/account | Each test creates its own data via fixtures (unique names); per-worker accounts | `test.describe.serial`, `workers: 1` |
| Leftover state | "Already exists", unique constraint, dirty lists | Records from earlier runs present (tagged run IDs from old runs) | Teardown in the fixture that created the data (idempotent, runs on failure); orphan sweeper as safety net | Cleanup at the start of the test body |
| Teardown in test body | State leaks only after a failing test | Polluter's assertion failed before its cleanup line | Move cleanup to a fixture/after hook owned by the creator | try/finally scattered in tests |
| Order dependence | Passes alone, fails in suite | Bisect preceding tests (see `reproduction.md`) | Make the victim set up its own preconditions; fix the polluter | Ordering tests, serial mode |
| Expired / changed credentials | 401/403 in setup | Auth call fails in trace | Rotate secrets in the env store; fail fast with a clear message in the auth fixture | Retrying login |

---

## Assertions and expectations

| Cause | Evidence | Confirm | Fix | Anti-fix |
|---|---|---|---|---|
| Expectation wrong per requirement | Received value matches the AC/BR | Read the AC/BR | Correct the expectation and cite the AC | — |
| Requirement changed | App and test both "right" against different versions | Check story/AC history | Update AC, test case, and test together; note in CHANGELOG | Edit the test silently |
| App wrong per requirement | Expected matches AC, received doesn't | Reproduce by hand | Product defect (see `outcomes.md`); keep the test red or mark expected-to-fail with the defect ID | Change the expectation to the buggy value |
| Brittle exact match on volatile data | Fails on dates, IDs, ordering | Received differs only in volatile parts | Assert stable fields; control data/time; sort before comparing if order isn't the requirement | Remove the assertion |

---

## Framework bugs

Suspect the framework when many unrelated tests fail the same way, or the error contradicts the evidence.

| Cause | Evidence | Confirm | Fix |
|---|---|---|---|
| Custom matcher overrides a built-in and recurses / swallows errors | Assertion fails with a generic message while the snapshot shows the expected state; even plain `expect(locator)` fails after fixtures import | Minimal spec: extend `expect` with the same matcher name and call the base matcher | Never override built-in matcher names; unwrap custom objects before delegating; never swallow the underlying error |
| Fixture setup/teardown fails | Many tests error before the first step, or after the last | Error originates in the fixture file | Fix the fixture once; make teardown idempotent |
| Shared helper with a bug | Same wrong value across tests using it | Unit-check the helper directly | Fix and add a small test for the helper |
| Static/global state in the framework | Failures only with several tests per worker | Rung 4 with `--workers=1` | Move state to test-scoped fixtures (or thread-local where the runner is thread-based) |
| Version mismatch (runner, browser, runtime) | Loader/startup errors, type errors in helpers | Pin the documented versions (`.nvmrc`, lockfile) and re-run | Align versions; document the supported runtime |

---

## Environment

| Cause | Evidence | Fix (owner) |
|---|---|---|
| Service down / degraded | 5xx, connection refused, timeouts in setup calls across tests | Environment owner; add a fast health-check in global setup that fails the run with a clear message |
| Config drift (flags, settings) | Behavior differs from another env | Compare configs; pin flags in test env |
| Third-party dependency | Failures on calls to an external service | Stub at the external boundary in test env |
| Resource starvation in CI | Slow durations, timeouts only at high parallelism | Right-size runners / workers; don't raise timeouts globally |
| Shared environment used by others | Data changed mid-run | Dedicated or ephemeral environment; unique test data |
| Shared rate limit (sign-in, API quota per IP or key) | Passes alone, fails on repeat or at higher parallelism, often only in the last tests of a burst; the API returns 429 (`retry-after`) while the UI may show an unrelated message such as "wrong password" | Sign in once per role and reuse the session; run limit-hitting tests in their own project, last; ask the owner to raise the limit for test IPs. Never retry around it |

---

## Time, locale, randomness

| Cause | Evidence | Fix |
|---|---|---|
| Timezone | Off-by-one-day dates; fails near midnight or only in CI | Fix the TZ for test runs; assert against dates computed in the app's timezone |
| Clock-dependent logic | Fails at month end, on weekends, around DST | Control time (clock mocking where supported) or choose data relative to "now" deliberately |
| Locale formatting | Number/date format differs (1,000 vs 1.000) | Set locale explicitly in the test context |
| Random test data collides | Rare uniqueness failures | Unique, run-tagged IDs instead of short random strings |

---

## Product races

Sometimes the app itself has the race (double submit, stale cache, out-of-order responses). Confirm by reproducing
manually or with a minimal script against the API; then report it as a product defect with the timing evidence.
Don't make the test "gentler" to avoid it — the test found a real bug.

---

## Selenium / Java specifics

| Cause | Evidence | Confirm | Fix | Anti-fix |
|---|---|---|---|---|
| Static or instance-field WebDriver with parallel TestNG methods | Random `NoSuchSessionException`, actions landing in another test's browser | Fails only with `-Dthreads` > 1; stack shows a shared field | One driver per thread (`ThreadLocal`), resolved on every access; no driver/page fields in test classes | `-Dthreads=1`, `synchronized` |
| Instance fields in a test class | Values from one test appear in another | Same class, parallel methods | Local variables or per-test context; TestNG reuses one instance across threads | `@Test(singleThreaded = true)` |
| Mixed implicit and explicit waits | Waits take far longer than configured; negative checks slow | Implicit wait > 0 in driver setup | Implicit wait 0; explicit waits on conditions only | Raising both |
| Cached `WebElement` | `StaleElementReferenceException` after any re-render | Element stored in a field or reused after navigation | Lazy locators re-resolved per action | Catch-and-retry around the test step |
| `isDisplayed()` false on a clickable element | Wait "to be visible/clickable" times out; screenshot shows the control | Element styled `opacity: 0` or zero-size under a custom label/icon | Let WebDriver's interactability decide (attempt the action, retry on not-interactable); assert on the visible counterpart | `JavascriptExecutor` click, which skips the user-level check |
| Absolute XPath inside a scoped lookup | Element found in the wrong region (modal, other row) | XPath starts with `//` inside `findElement` from a parent | Relative XPath (`.//`), or CSS | Adding `[1]` |
| `Thread.sleep` in a page object or test | Slow and still flaky | grep for `Thread.sleep` | Wait on the real condition (`Waits.until`, `Eventually.verify`) | Longer sleep |
| Driver / browser version mismatch | `SessionNotCreatedException` | Versions in the error message | Let Selenium Manager resolve drivers, or pin the grid/browser image | Downloading drivers manually into the repo |

