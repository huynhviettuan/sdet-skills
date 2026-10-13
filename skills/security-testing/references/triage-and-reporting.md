# Triage and Reporting

Turning raw findings into prioritized, owned, fixed issues — and reporting security status without leaking it.

Contents:

- [Triage flow](#triage-flow)
- [Severity](#severity)
- [Remediation SLAs](#remediation-slas)
- [Finding template](#finding-template)
- [Verification and regression](#verification-and-regression)
- [Report template](#report-template)
- [Metrics](#metrics)
- [Handling sensitive findings](#handling-sensitive-findings)
- [Anti-patterns](#anti-patterns)
- [Security testing review checklist](#security-testing-review-checklist)

---

## Triage flow

```text
Raw finding
 → Deduplicate (same root cause across tools/endpoints = one finding)
 → Reproduce / confirm (true positive?)
     false positive → narrow suppression with reason + expiry
 → Assess exploitability in context (reachable? authenticated? which data?)
 → Assign severity
 → Assign owner + due date from SLA
 → Fix → verify → add regression test
```

---

## Severity

Start from CVSS (base score) when one exists, then adjust for **context** — the same CVE is critical on an
internet-facing service and low in an unreachable build-time tool.

| Severity | Typical meaning |
|---|---|
| Critical | Remote, unauthenticated compromise or mass data exposure; secret with production access leaked |
| High | Authenticated user can access other users'/tenants' data (BOLA), privilege escalation, injection in reachable code |
| Medium | Exploitable with significant preconditions; missing hardening with realistic impact |
| Low | Defense-in-depth gaps, information disclosure with little impact |
| Info | Best-practice notes; no direct risk |

Context factors: exposure (internet / internal / build-only), authentication required, data sensitivity, exploit
availability (e.g. listed in CISA KEV, EPSS score), compensating controls.

---

## Remediation SLAs

Set with the system owner; example:

| Severity | Fix within |
|---|---|
| Critical | 24–72 h (or immediate mitigation) |
| High | 7–14 days |
| Medium | 30–60 days |
| Low | 90 days / next planned work |

A missed SLA needs an explicit **risk acceptance** by an accountable owner, with an expiry date — not silence.

---

## Finding template

```md
## SEC-FIND-NNN — <short title>

Severity: High (CVSS 8.1, adjusted: internet-facing, PII)
Status: OPEN | IN PROGRESS | FIXED | VERIFIED | RISK ACCEPTED (until YYYY-MM-DD, by <owner>)
Category: Broken object-level authorization (OWASP API1)
Found by: automated test TC-SEC-ORDER-003 | SAST rule <id> | DAST | manual review
Component: orders-service, GET /orders/:id
Owner: <team>
Due: <date from SLA>

### Description
What is wrong, in one paragraph.

### Impact
What an attacker could do, which data, how many users.

### Reproduction (test environment only)
Steps using test accounts. No real customer data, no live secrets.

### Recommendation
The fix and, if relevant, an interim mitigation.

### Verification
Regression test that now passes: TC-SEC-…
```

---

## Verification and regression

- A finding is closed only after the fix is **verified** (re-run the original reproduction) **and** a regression
  test exists where automatable (access-control row, header assertion, input-handling test, SCA policy).
- For dependency CVEs, verification is the scanner showing the fixed version deployed — not merely merged.
- Re-test related endpoints: one BOLA usually means the same pattern exists elsewhere.

---

## Report template

Lead with risk, not tool output. Raw scanner exports are appendices, never the report.

```md
# Security Test Report — <system> <release> — <date>

## Summary
Overall risk: High / Medium / Low — one paragraph a decision-maker can act on.
Release recommendation: GO / GO WITH ACCEPTED RISKS / NO-GO

## Scope and Method
Authorization: <link>   Window: <dates>   ASVS level: <n>
In scope / out of scope: <…>
Techniques: threat model, SAST, SCA, secrets, IaC, DAST (baseline/active), automated security tests, manual review
Limitations: <what was not tested and why>

## Findings Overview
| Severity | New | Open total | Fixed this cycle | Risk accepted |
|---|---|---|---|---|

## Key Findings
1. SEC-FIND-… — <title> — <severity> — <owner> — <due>

## Coverage
<coverage map from the test plan, marking what was actually exercised>

## Risk Acceptances
| Finding | Accepted by | Reason | Expires |
|---|---|---|---|

## Appendices
Tool reports (access-controlled links), run ids, environment versions
```

---

## Metrics

Track trends, not totals:

```text
Open findings by severity (and age)
Mean time to remediate, by severity
SLA breach count
New findings per release (introduced vs discovered in old code)
False-positive rate per scanner/rule
Coverage: % endpoints in the access-control matrix, % repos with all pipeline scans
Expired / expiring risk acceptances
```

"Zero findings" usually means "scanner not configured" — check coverage before celebrating.

---

## Handling sensitive findings

- Store details in an access-controlled tracker; don't post reproduction steps in public issues, open chat
  channels, or PR descriptions of public repos.
- Never include live secrets, real tokens, or real customer data in a finding, report, screenshot, or test fixture.
  If a real secret was found, rotate it first, then report that it was rotated.
- Follow the organization's disclosure and incident process if a finding indicates active exploitation or real data
  exposure — that's an incident, not a test finding.

---

## Anti-patterns

| Anti-pattern | Instead |
|---|---|
| "We ran a scanner, we're secure" | Scanners + authz tests + threat model + manual review per ASVS level |
| Gating on the full backlog | Gate on new findings; burn down the baseline separately |
| Disabling a noisy rule globally | Narrow, expiring suppressions; tune rules |
| Authz tested only through the UI | API-level access matrix + BOLA tests per object endpoint |
| Unauthenticated DAST only | Authenticated, per-role, fed with the API spec |
| Findings without owners or dates | Owner + SLA due date on every finding |
| Risk acceptance with no expiry | Expiring acceptance, re-reviewed |
| Security tests marked flaky and skipped | Fix or formally accept; never silently quarantine |
| Real credentials or customer data in tests | Per-role test accounts from the secret store, synthetic data |
| Testing out-of-scope or third-party systems | Written scope; third parties only through their own program |

---

## Security testing review checklist

```text
[ ] Written authorization and scope exist for active testing
[ ] ASVS level chosen with a reason
[ ] Threat model exists for the changed area and is current
[ ] Abuse cases written for critical stories
[ ] Security rules exist as BR/AC and are traceable to TC-SEC tests
[ ] Access-control matrix covers every endpoint × role; default deny
[ ] BOLA tests for every object-id endpoint (two owners/tenants)
[ ] Mass-assignment and excessive-exposure checks on write/read models
[ ] Authn/session tests (expired, tampered, logout invalidation)
[ ] Headers, cookies, CORS, error leakage asserted
[ ] SAST, SCA, secrets, IaC, container scans in the pipeline with a gating policy
[ ] Authenticated DAST against an authorized test environment
[ ] Suppressions narrow, reasoned, owned, expiring
[ ] Findings have severity, owner, SLA, and a regression test after fix
[ ] No real secrets / customer data anywhere in tests or reports
```
