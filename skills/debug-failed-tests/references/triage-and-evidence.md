# Triage and Evidence

What to collect, how to read it, and how to decide which kind of failure you are looking at.

Contents:

- [Evidence checklist](#evidence-checklist)
- [Reading Playwright artifacts](#reading-playwright-artifacts)
- [Reading Selenium / TestNG artifacts](#reading-selenium--testng-artifacts)
- [Signals per category](#signals-per-category)
- [Many failures at once](#many-failures-at-once)
- [Hypothesis log](#hypothesis-log)

---

## Evidence checklist

Collect before re-running. If any item is missing for CI failures, that's a gap to fix in the artifact policy
(`sdet-automation-docs` → failure analysis).

```text
[ ] Error message and full stack (first frame in test code, first frame in framework code)
[ ] Failing line and the step it belongs to
[ ] Expected vs received values
[ ] Page snapshot / DOM at failure, screenshot, video
[ ] Trace (actions, network, console, timing)
[ ] Console errors and failed network requests around the failure
[ ] Test data IDs created by the test and its fixtures
[ ] Environment, base URL, commit SHA of app and tests, browser + version
[ ] Worker index, retry number, test duration vs usual duration
[ ] History: first failure date, failure rate over recent runs, what changed around then
```

---

## Reading Playwright artifacts

| Artifact | Where | Read it for |
|---|---|---|
| Error + stack | Reporter output, `test-results/<test>/` | Which line, which assertion, expected vs received; is the top frame in your code or a helper/fixture? |
| `error-context.md` | `test-results/<test>/` | The accessibility snapshot of the page at failure — is the element there, with what name/role, in which state? |
| Trace | `trace.zip` → `npx playwright show-trace <file>` | Action timeline, DOM before/after each action, network requests and responses, console messages, timing gaps |
| Screenshot / video | `test-results/<test>/` | Overlays, spinners, modals, wrong page, layout shifted mid-action |
| HTML report | `npx playwright show-report` | Retries side by side; attachments; which projects/browsers failed |

Questions to answer from them, in order:

1. **Where was the app** at the moment of failure — right page, right state, logged in as the right user?
2. **Was the target there?** If the snapshot shows it with a different name/role/text, it's the locator or the
   expectation; if it isn't there, it's state or timing.
3. **What did the network do?** A 4xx/5xx or a slow response before the failure points at environment, data, or the
   product.
4. **Does the error text make sense** for what the snapshot shows? If the element is visibly correct and the
   assertion still says it isn't, suspect the assertion machinery (custom matcher, wrapper, fixture) — see
   "Framework bugs" in `root-causes-and-fixes.md`.

---

## Reading Selenium / TestNG artifacts

| Artifact | Where | Read it for |
|---|---|---|
| Surefire report | `target/surefire-reports/` (`*.txt`, `testng-results.xml`) | Exception type, message, and the first stack frame in your code vs framework code |
| Allure result | `target/allure-results/` → `allure serve target/allure-results` | Steps, attachments, history across runs |
| Screenshot, page source, URL | Allure attachments added by `BaseUiTest` on failure | Was the app on the right page/state? Is the element in the page source, with what attributes? |
| Request / response | Allure attachments from `AllureRestAssured` | Status, body, headers of every API call before the failure |
| Wait message | `TimeoutException: waiting for <locator chain> to …` | The exact locator chain (`root >> child [filter]`) and the condition that never became true |
| Browser console | `driver.manage().logs().get(LogType.BROWSER)` (Chromium) — add as an attachment when investigating | JavaScript errors around the failure |

Selenium exceptions and what they usually mean:

| Exception | Usually |
|---|---|
| `NoSuchElementException` / timeout waiting for a locator | Wrong locator, wrong page/state, or the element renders later than the wait allows |
| `StrictLocatorException` (Java scaffold) | Locator matches several elements — scope it through its container |
| `StaleElementReferenceException` | A `WebElement` was kept across a re-render — keep locators lazy, never store elements |
| `ElementClickInterceptedException` | Overlay, toast, spinner, or sticky header on top — wait for it to go away |
| `ElementNotInteractableException` | Hidden, zero-size, or disabled at the moment of the action |
| `SessionNotCreatedException` | Browser / driver / grid version or capability mismatch — environment |
| `NoSuchSessionException` / `WebDriverException: session deleted` | Driver quit by another test (shared driver across threads) or browser crash |

---

## Signals per category

| Signal | Points to |
|---|---|
| Fails every run, also by hand, app changed recently | Product bug (or requirement change — check the AC) |
| Fails every run, app unchanged, test or page object changed recently | Test bug |
| Received value is correct per the requirement, expected value isn't | Test bug (wrong expectation) |
| Many unrelated tests fail with the same message from a shared helper/fixture/matcher | Framework bug |
| Error message contradicts the snapshot (element visibly correct, assertion says otherwise) | Framework bug hiding the real error |
| Failures cluster on one environment, one time window, or begin with 5xx / connection errors | Environment |
| "Already exists", unique-constraint, unexpected counts, missing records | Data (shared or leftover state) |
| Passes alone, fails in the suite or in parallel | Isolation / order dependence |
| Passes on retry, fails more on slow machines or under load | Timing / race |
| Only in CI | Environment difference (headless, viewport, timezone, locale, resources, secrets, parallelism) |
| Only in one browser | Browser difference or browser-specific product bug |

---

## Many failures at once

Don't open tests one by one. Cluster first:

1. **Group by normalized error signature** (error type + message with IDs/numbers stripped + top framework frame).
2. **Group by area** (spec folder, page, service, tag) and by **project/browser**.
3. **Line up start times**: when did each cluster first fail, and what deployed or merged just before?
4. Pick **one representative** per cluster, debug it fully, then re-run the cluster to confirm the shared cause.

Typical outcomes: one environment outage (setup calls 5xx), one framework change (a fixture or matcher), one product
change (a renamed label breaking many locators), plus a small tail of individual failures.

---

## Hypothesis log

Keep a short log while debugging; it prevents going in circles and becomes the explanation in the fix/defect:

```text
Observation: lblTitle assertion fails; snapshot shows heading "todos" present
H1: wrong locator            → refuted: locator count = 1 in the same state
H2: page not ready           → refuted: failure persists with a manual wait (diagnostic only)
H3: assertion machinery      → confirmed: plain expect(locator).toHaveText also fails after fixtures import;
                               custom matcher overrides the built-in globally and recurses
Root cause: custom expect.extend overrides built-in matcher names; wrapper swallows the real error
```

Diagnostic waits, extra logging, and `--repeat-each` are fine **while investigating**; none of them belong in the
final fix.
