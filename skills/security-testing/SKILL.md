---
name: security-testing
description: >
  Plan and run authorized, defensive security testing of your own web apps and APIs as an SDET — threat modeling
  (STRIDE, abuse cases), choosing depth with OWASP ASVS, automated security tests in the existing suite (access-
  control matrix, BOLA/IDOR, mass assignment, authn/session, headers/CORS, input handling, business-logic abuse),
  pipeline scanning (SAST, SCA, secrets, IaC, container, DAST) with gating policies, and finding triage, SLAs, and
  reporting. Use this skill whenever the user wants to add security testing to a project, test authorization or
  tenant isolation, set up security scans in CI, map coverage to OWASP Top 10 / API Security Top 10, triage scanner
  findings, or write a security test report. Trigger on phrases like "security testing", "OWASP", "IDOR", "BOLA",
  "authz tests", "DAST", "ZAP scan", "SAST in CI", "dependency vulnerabilities", "threat model", "pentest prep".
  Tool- and language-agnostic.
---

# Security Testing

Find and prevent security defects in systems you are authorized to test — and keep them from coming back. Scanners
find generic flaws; **your** rules (who may do what to which data) are only verified by tests you write. Effective
security testing combines both, driven by a threat model and scoped by an explicit authorization.

**How to use this skill:** follow the workflow below. Load a `references/*.md` file only when you need it:

- [`references/threat-modeling-and-scope.md`](references/threat-modeling-and-scope.md) — rules of engagement and
  authorization, ASVS depth levels, lightweight STRIDE threat modeling, abuse cases, security requirements as
  BR/AC, coverage map against OWASP categories, test plan template.
- [`references/automated-security-tests.md`](references/automated-security-tests.md) — security checks as ordinary
  automation tests: fixtures, access-control matrix, BOLA/IDOR, mass assignment, authn/session, input handling,
  headers/cookies/CORS, error leakage, limits, file upload, business-logic abuse, audit logging (Playwright
  examples).
- [`references/pipeline-scanning.md`](references/pipeline-scanning.md) — SAST/SCA/secrets/IaC/container/DAST/SBOM:
  what each finds, where it runs in the pipeline, gating on new findings, running DAST safely, suppressions with
  expiry, tool mapping.
- [`references/triage-and-reporting.md`](references/triage-and-reporting.md) — triage flow, contextual severity,
  remediation SLAs, finding and report templates, verification, metrics, handling sensitive findings,
  anti-patterns, review checklist.

## Workflow

### Adding security testing to a project

1. **Confirm authorization and scope** — written approval, in/out-of-scope targets, environment, allowed
   techniques, stop conditions. Missing → OPEN QUESTION; limit work to static analysis of the user's own code until
   resolved.
2. **Choose the depth** (ASVS L1/L2/L3) from data sensitivity and business impact.
3. **Threat-model the system or the changed feature**: data flow, trust boundaries, STRIDE per boundary, abuse
   cases. Rank threats; map each High/Medium one to a control and a test.
4. **Record security rules as BR/AC** in the product docs so they trace to tests (`TC-SEC-<AREA>-NNN`).
5. **Write automated security tests** in the existing suite — access-control matrix and BOLA first; they catch the
   most serious API flaws and no scanner covers them.
6. **Add pipeline scanning** (secrets, SCA, SAST, IaC, container at build; DAST against an authorized test
   environment) with a gating policy on *new* findings.
7. **Triage, fix, verify, add a regression test**; report risk with the template.

### Reviewing an existing setup or a batch of findings

Run the review checklist in `triage-and-reporting.md`, fill the coverage map, and report the gaps (typically:
no BOLA tests, unauthenticated DAST, gate disabled because of backlog, suppressions without expiry).

## Non-negotiable rules

- **Only test what you're authorized to test.** Written scope, test environment by default, production only with
  explicit approval. Third-party services are out of scope unless *they* authorize it.
- **Authorization is tested at the API, per object and per role, with default deny.** Hiding a button is not access
  control; a UUID is not access control.
- **Every isolation test has two legitimate users** (owner and attacker) and asserts both the denial and that the
  object is unchanged.
- **Benign payloads, synthetic data, test accounts.** No destructive probes, no real customer data, no real
  credentials — in tests, fixtures, findings, or reports.
- **Gate on new findings**, and keep the gate on. A permanently red or `allow_failure` security stage is no stage.
- **Every suppression and risk acceptance has a reason, an owner, and an expiry.**
- **A fixed finding gets a regression test** wherever it can be automated.
- **Sensitive findings go to an access-controlled tracker**, not public issues or open chat. A leaked real secret is
  rotated first, reported second.

## Decision framework

| Question | Rule of thumb |
|---|---|
| Which ASVS level? | L1 baseline for everything; L2 for any personal/business-sensitive data (most business apps); L3 for financial, health, critical systems. |
| Scanner or written test? | Generic flaw classes (known CVEs, missing headers, secrets, unsafe sinks) → scanner. Your permission model, tenant isolation, workflow rules → written tests. |
| Where to start with limited time? | Secrets scan + SCA (cheap, high yield) → access-control matrix + BOLA tests → passive DAST → SAST tuning. |
| 403 or 404 for someone else's object? | 404 unless the product docs say otherwise — don't confirm existence. Make it a BR so tests and code agree. |
| Passive or active DAST? | Passive/baseline on every deploy to test env; active only on an isolated authorized environment, scheduled. |
| Block the merge? | Secrets, new Critical/High in changed code or new dependencies, failing security tests → block. Medium/baseline → ticket. |
| When to bring in a manual pentest? | ASVS L2+ before major releases, after significant auth/payment/tenant-model changes, or as required by compliance. |

## Related skills

- **`project-docs`** — security requirements live as `BR-`/`AC-` IDs; `ROLES_PERMISSIONS.md` is the source for the
  access-control matrix; `SECURITY.md` captures policy.
- **`sdet-automation-docs`** — security tests use its ID scheme (`TC-SEC-…`), traceability, CI stages, and quality
  gates.
- **`sdet-framework-architect`** — role-scoped API clients and two-tenant data fixtures follow its
  composition-root and teardown-ownership rules.
- **`performance-testing`** — load and denial-of-service resilience at scale; this skill only checks that limits
  exist and are enforced.
