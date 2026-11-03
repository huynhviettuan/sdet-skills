# Security in the SDLC

Security QA as a process rather than a one-off assessment: what "done" means for a story, what a reviewer checks
in the test code itself, how the suite is prevented from touching production, what reruns per release, how test
data and secrets are handled, how the test framework's own supply chain is kept clean, how external reports enter
triage, and which metrics mean something. Technique lives in the other references; this file is the routine around
them. Scope and authorization are unchanged from
[`threat-modeling-and-scope.md`](threat-modeling-and-scope.md#rules-of-engagement).

Contents:

- [Definition of done for a story](#definition-of-done-for-a-story)
- [PR checklist for test code](#pr-checklist-for-test-code)
- [The environment guard](#the-environment-guard)
- [Security regression per release](#security-regression-per-release)
- [Test data: synthetic identities](#test-data-synthetic-identities)
- [Secrets in CI logs and reports](#secrets-in-ci-logs-and-reports)
- [Supply chain of the test framework](#supply-chain-of-the-test-framework)
- [External report intake](#external-report-intake)
- [Metrics that are not vanity](#metrics-that-are-not-vanity)
- [Feature security review template](#feature-security-review-template)
- [Rules](#rules)

---

## Definition of done for a story

Added to the team's general definition of done
([`sdet-automation-docs` DEFINITION_OF_DONE](../../sdet-automation-docs/references/governance.md#definition_of_donemd)),
not kept in a separate security document nobody opens:

| Item | Evidence that it is done | ID |
|---|---|---|
| Security acceptance criteria present | the story has at least one `AC-` that names a denial or a limit (who may not, how much at most), or an explicit "no security impact" with a reason | SEC-SDLC-01 |
| Authorization matrix row updated | every new or changed operation has rows in `ROLES_PERMISSIONS.md` for each actor, including a deny row and an anonymous row (`authz_matrix.py generate` warns when either is missing) | SEC-SDLC-02 |
| Negative cases present | the operation's request schema has its [schema-derived cases](schema-driven-negative-tests.md#where-the-cases-sit-in-the-suite); object endpoints have a BOLA case with two owners | SEC-SDLC-03 |
| Secrets check | the PR's secrets scan is green; new configuration keys are in the example config with example values, not in code | SEC-SDLC-04 |
| Threat model touched | the feature's data flow is in the model or the model says why not; new trust boundary means a STRIDE pass ([threat modeling](threat-modeling-and-scope.md#lightweight-threat-modeling)) | SEC-SDLC-05 |
| AI feature | an LLM surface in the story gets its `GR-` policies and gate cases from [`ai-guardrail-testing`](../../ai-guardrail-testing/SKILL.md) | SEC-SDLC-06 |

A story that ships with a security AC and no test for it is not done; a story with a test that was never seen red
is done "once" (the selftest or `can-fail` evidence is part of the item).

---

## PR checklist for test code

The test code is reviewed as code that can itself leak or damage. Each line is a blocker.

| Check | What the reviewer looks for | ID |
|---|---|---|
| No credentials | no password, token, key or cookie value in tests, fixtures, recorded traffic, snapshots or comments; example values are named as examples (`example-password`, `example-signing-key-not-a-secret` in vuln-api) | SEC-SDLC-10 |
| No production hosts | every base URL comes from configuration; the write guard ([below](#the-environment-guard)) is present and its allowlist contains no production name | SEC-SDLC-11 |
| Synthetic identities | names, e-mails, phone numbers and addresses are generated or from a documented synthetic set on `example.test`-style domains; nothing copied from a real export | SEC-SDLC-12 |
| Test data lifecycle | whoever creates data tears it down in a teardown hook, judged by a re-read (the record is gone), not by the delete's status; nothing depends on pre-existing records | SEC-SDLC-13 |
| Benign payloads | markers carry the case ID; no payload exfiltrates, deletes outside the test's own data, or targets another tenant of a shared environment | SEC-SDLC-14 |
| Deterministic oracle | every assertion reads a status, a header, a stored state or a log entry; no retry, no sleep, no "contains error" | SEC-SDLC-15 |
| Sentinel kept | the suite's strict expected-fail sentinel is still there and still through the real client | SEC-SDLC-16 |
| Traceability | each test name carries its `TC-SEC-` or `AZ-` ID; new matrix rows have tests (`authz_matrix.py verify` against the PR's JUnit) | SEC-SDLC-17 |
| No skipped security test | a `skip`/`xfail` on a security test has an open finding ID and an expiry; a silent quarantine is a blocker | SEC-SDLC-18 |

---

## The environment guard

A suite that writes data, or probes with attack-shaped input, decides **in code** where it may run: a local server,
or a host allowlisted by name as a test environment; never production, and never "whatever `BASE_URL` says". The
pattern in this skill's `scripts/headers_check.py` (its selftest asserts the refusal, run 2026-11-03):

```python
    "allowed_origins": ["https://app.example.test"],
    "test_hosts": ["127.0.0.1", "localhost", "*.localhost", "*.test"],
}
```

```python
    host = urlparse(args.url).hostname or ""
    if not any(fnmatch.fnmatch(host, pat) for pat in policy.get("test_hosts", [])):
        print(f"REFUSED: host {host!r} is not in test_hosts {policy.get('test_hosts')} - this check only runs "
              "against a test environment")
        return 2
```

| Property | Rule | ID |
|---|---|---|
| Where | in the fixture or script that performs the first write or probe, before it; not in CI configuration alone | SEC-SDLC-20 |
| What | an allowlist of hostnames or patterns; a production host is never on it, and a staging host is on it only by its explicit name | SEC-SDLC-20 |
| Outcome | a refusal is exit 2 / a raised error, reported as blocked; it is never a skipped test that leaves the run green | SEC-SDLC-21 |
| Review | the allowlist is a reviewed file; adding a host is a PR with the environment owner's approval | SEC-SDLC-22 |

The same guard in a data factory is in
[`test-script-writer` code-templates-pytest](../../test-script-writer/references/code-templates-pytest.md#data-factory)
(`WRITABLE_API_HOSTS`), and the repo-wide rule is "never write to a host outside the allowlist".

---

## Security regression per release

| Layer | What reruns | When | What is sampled instead |
|---|---|---|---|
| Access-control matrix | every cell (`authz_matrix.py verify` must cover all) | every PR and the release candidate | nothing: a sampled matrix is a hole |
| BOLA, mass assignment, authn/session, headers, CORS, errors | the full `TC-SEC-` family | every PR | nothing |
| Schema-derived negative cases | per operation, the fast rows | every PR; Unicode and size rows nightly | nothing is sampled, slow rows move to nightly |
| Regression tests from fixed findings | all | every PR | nothing: a fixed finding without its test rerunning is reopened silently |
| SCA against deployed versions | full | nightly and on the release candidate | nothing |
| DAST | baseline on each deploy to test; active scan | release candidate, scheduled | active scan scoped to changed areas when the full scan exceeds the window, and the scope is written in the report |
| Manual review / pentest | per ASVS level ([decision table](../SKILL.md#decision-framework)) | major release, auth/payment/tenant-model change | the sampled surface is named in the report's Limitations |

The release report ([template](triage-and-reporting.md#report-template)) lists what did **not** rerun and why; a
line "all security tests passed" with a sampled matrix is a false claim.

---

## Test data: synthetic identities

| Rule | Detail | ID |
|---|---|---|
| Generated, not copied | identities are produced by a factory (name, e-mail on `example.test`, phone in a reserved range, address that does not exist); production exports are never the seed, masked or not | SEC-SDLC-30 |
| Per role, per tenant | at least two tenants and every role of the matrix; the actor names in vuln-api's `ROLES_PERMISSIONS.md` (`customer-own`, `customer-other-tenant`, ...) are the shape | SEC-SDLC-31 |
| PII-free fixtures | a fixture that needs a "realistic" value uses a documented synthetic one; a reviewer who cannot tell whether a value is real treats it as real and blocks | SEC-SDLC-32 |
| Lifecycle | created by the fixture that needs it, deleted in teardown, re-read to confirm; shared accounts are an `OQ-` with an owner, not a convention | SEC-SDLC-33 |
| Findings and reports | reproduction steps use the synthetic accounts; a finding that needs real data to reproduce is an incident, not a test finding | SEC-SDLC-34 |

---

## Secrets in CI logs and reports

| Rule | Detail | ID |
|---|---|---|
| Masked at the source | CI secrets are registered as masked; a value printed by a test is replaced in the log, and the pipeline fails when a known secret appears unmasked (secrets scan on the job log) | SEC-SDLC-40 |
| Never in artifacts | HAR files, traces, screenshots and JUnit messages are scrubbed of `Authorization`, `Cookie`, `Set-Cookie` and token-shaped strings before upload; a scrubber that is itself tested with an example token | SEC-SDLC-41 |
| Never in assertions | an assertion message prints the status and the field, not the request headers; a failing login test says which account by role name, not by credential | SEC-SDLC-42 |
| Rotate first | a real secret found in a log, a fixture or a finding is rotated, then reported as rotated ([sensitive findings](triage-and-reporting.md#handling-sensitive-findings)) | SEC-SDLC-43 |
| Reports | the security report links tool output in an access-controlled location; the report body carries finding IDs, not payloads or tokens | SEC-SDLC-44 |

---

## Supply chain of the test framework

The suite runs with credentials for every role and writes to a test environment; a compromised dependency in the
suite has those powers.

| Control | Detail | ID |
|---|---|---|
| Lockfile committed | `package-lock.json` / `poetry.lock` / `pom.xml` versions pinned; CI installs from the lockfile (`npm ci`), never a floating install | SEC-SDLC-50 |
| SCA on dev dependencies | the SCA scan ([pipeline-scanning](pipeline-scanning.md#scanner-types)) includes `devDependencies` and test-only requirement files; the gate applies to them as to production code | SEC-SDLC-51 |
| Pinned CI actions and images | third-party actions by commit SHA, container images by digest; a tag is a floating reference | SEC-SDLC-52 |
| Minimal install | no network-fetching plugins added to the runner without review; a dependency that phones home is a finding | SEC-SDLC-53 |
| Scoped credentials | the suite's accounts exist only in the test environment and hold only the matrix roles; a CI token that can read production secrets is a finding against the pipeline | SEC-SDLC-54 |
| Scripts without dependencies | checks that run before the install step (`authz_matrix.py`, `headers_check.py`, `openapi-tool.mjs`) use the runtime only, so they cannot be compromised through a package | SEC-SDLC-55 |

---

## External report intake

A bug-bounty submission, a customer's pentest result or an e-mail from a researcher enters the same flow as an
internal finding ([triage flow](triage-and-reporting.md#triage-flow)), with these additions:

| Step | Detail |
|---|---|
| Acknowledge | within the published window, to the reporter, without confirming or denying validity |
| Isolate the evidence | reproduction material goes to the access-controlled tracker; a real customer record in the report triggers the incident process, not triage |
| Reproduce as a test | the first thing written is a `TC-SEC-` case against the test environment with synthetic data; if it cannot be reproduced there, the gap in the test environment is itself a finding |
| Severity in context | the reporter's severity is an input; the contextual severity ([severity](triage-and-reporting.md#severity)) is the team's |
| Regression | the case stays in the suite after the fix; the finding closes only when it is green and has been seen red |
| Pattern sweep | one BOLA from outside usually means siblings inside: the matrix and the schema-derived families are rerun on neighbouring operations |
| Disclosure | per the published policy; the report names the fix version, never the payload |

---

## Metrics that are not vanity

| Metric | How it is computed | Why it is not vanity |
|---|---|---|
| Time-to-fix by severity | finding opened to fix verified, per severity, against the SLA ([SLAs](triage-and-reporting.md#remediation-slas)) | a count of findings rewards not looking; time-to-fix rewards fixing |
| Escaped-defect class | for each finding found outside the suite (DAST, pentest, external report): which family would have caught it (matrix, BOLA, schema row, header) and why that family did not exist or did not cover the operation | turns every escape into a named gap in a table, not a number |
| Matrix coverage | `authz_matrix.py verify ROLES_PERMISSIONS.md junit.xml` exit 0; the number is cells without a test or with a failing test | a cell count is checkable by anyone with the JUnit file |
| Operations with negative families | operations in `openapi-tool.mjs inventory` with a `TC-SEC-INPUT-` parametrized test, as a fraction | a fraction with a denominator from the spec, not from the suite |
| Seen-red ratio | security tests with selftest or `can-fail` evidence over all security tests | a green test never seen red counts as zero |
| Expiring acceptances | risk acceptances and suppressions expiring in the next 30 days | an acceptance with no expiry is not counted as accepted |

Not tracked: total findings, scanner alerts per week, tests written. They rise with activity, not with safety.

---

## Feature security review template

One page, filled before the feature's first PR merges; fields map to the definition of done above.

| Section | Contents |
|---|---|
| Feature and owner | story IDs, the team, the reviewer, the date |
| Data | which data classes the feature reads or writes (personal, financial, credentials, tenant-scoped); the ASVS level that implies |
| Data flow and boundaries | the one-paragraph flow and every trust boundary crossed; link to the threat model entry |
| STRIDE findings | one row per boundary with the threat, the control, the test ID or the gap with its risk |
| Authorization | new operations with their `ROLES_PERMISSIONS.md` rows (actor x expected), including deny and anonymous rows |
| Input | request schemas touched, the negative families derived, the injection field kinds present |
| Secrets and configuration | new keys, where they live, the example values documented |
| Dependencies | new packages with their SCA result; new external calls with their SSRF control |
| AI surface | present or not; if present, the `GR-` policies and the gate cases |
| Tests | the `TC-SEC-` IDs added, the selftest or `can-fail` evidence, what moved to nightly |
| Open questions | `OQ-` entries with owners; a silent requirement is an OQ, not an assumption |
| Verdict | ready / ready with accepted risks (each with owner and expiry) / not ready |

---

## Rules

- **SEC-SDLC-R1** Security is in the team's definition of done, not in a parallel process; a story without a
  security AC says why.
- **SEC-SDLC-R2** The suite decides in code where it may write; a refusal is a blocked run, never a green one.
- **SEC-SDLC-R3** No credential, production host or real identity in test code, fixtures, logs, artifacts or
  reports; example values are documented as examples.
- **SEC-SDLC-R4** Every fixed finding, internal or external, keeps its regression test; the finding closes when the
  test is green and has been seen red.
- **SEC-SDLC-R5** The test framework's dependencies are gated like the product's; lockfiles, pinned actions and
  SCA on dev dependencies are the minimum.
- **SEC-SDLC-R6** Metrics have a denominator from a source outside the suite (the matrix, the spec, the SLA); a
  metric that only counts activity is not reported.
