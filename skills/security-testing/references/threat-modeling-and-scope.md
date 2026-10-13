# Threat Modeling and Scope

Deciding what to test, how deep, and under what authorization — before any tool runs.

Contents:

- [Rules of engagement](#rules-of-engagement)
- [Choosing the depth (ASVS levels)](#choosing-the-depth-asvs-levels)
- [Lightweight threat modeling](#lightweight-threat-modeling)
- [Abuse cases](#abuse-cases)
- [Security requirements as acceptance criteria](#security-requirements-as-acceptance-criteria)
- [Coverage map](#coverage-map)
- [Security test plan template](#security-test-plan-template)

---

## Rules of engagement

Security testing is only legitimate against systems you are authorized to test. Before any active test (DAST,
fuzzing, auth brute-force checks, anything beyond reading your own code):

- **Written authorization** from the system owner naming the targets, the time window, and the techniques allowed.
- **Scope list**: hostnames/URLs/APIs/repos in scope; everything else is out — especially third-party services
  (payment providers, identity providers, SaaS APIs, CDNs). Testing those requires *their* program/permission.
- **Environment**: prefer an ephemeral or dedicated test environment. Production only with explicit approval,
  non-destructive techniques, rate limits, and someone on call.
- **Test accounts** created for testing, per role and per tenant. Never real customer accounts or real PII.
- **Stop conditions**: data corruption, service degradation, access to real customer data — stop, record, report.
- **Handling of findings**: where they're stored (access-controlled tracker, not public issues/chat), who is told,
  disclosure timeline.

If any of these is missing, record it as an OPEN QUESTION and limit work to passive/static techniques until it's
resolved.

---

## Choosing the depth (ASVS levels)

Use the OWASP Application Security Verification Standard (ASVS) level as the depth dial:

| Level | For | Means |
|---|---|---|
| L1 | Low-risk apps, baseline for everything | Automatable checks: dependencies, secrets, headers, basic authz/authn, common injection |
| L2 | Apps handling personal or business-sensitive data (most business apps) | L1 + full access-control matrix, session management, input validation per field, logging/audit, threat model |
| L3 | High-value: financial, health, critical infrastructure | L2 + deep manual review, architecture review, crypto review, external pentest |

Pick the lowest level that matches the data and business impact; record the choice and its reason.

---

## Lightweight threat modeling

A threat model answers four questions (Shostack): *What are we building? What can go wrong? What are we doing about
it? Did we do a good job?* Keep it small and alive — a one-page model updated per feature beats a 50-page document
nobody reads.

1. **Draw the data flow**: actors, processes, data stores, external systems, and **trust boundaries** (browser ↔
   API, API ↔ DB, service ↔ third party, tenant ↔ tenant).
2. **Walk each boundary with STRIDE**:

| Threat | Question | Typical control | Typical test |
|---|---|---|---|
| **S**poofing | Can someone pretend to be another user/service? | AuthN, MFA, signed tokens, mTLS | Token tampering, expired/forged tokens rejected |
| **T**ampering | Can data be changed in transit/at rest or via the client? | Server-side validation, integrity checks | Modified IDs/prices/roles in requests rejected |
| **R**epudiation | Can someone deny an action? | Audit log with actor + timestamp | Sensitive actions produce audit events |
| **I**nformation disclosure | Can data leak? | AuthZ, field-level filtering, error handling, TLS | Other tenant's data not returned; no stack traces |
| **D**enial of service | Can someone exhaust resources? | Rate limits, quotas, size limits, timeouts | Limits enforced; large payload rejected |
| **E**levation of privilege | Can someone gain rights they shouldn't have? | RBAC enforced server-side, deny by default | Lower role calling admin endpoints gets 403 |

3. **Rank** each threat by likelihood × impact (High / Medium / Low is enough).
4. **Map** each High/Medium threat to a control and to a test (automated where possible). Unmitigated threats are
   risks with an owner, not silent gaps.

---

## Abuse cases

For each critical user story, write the attacker's version next to it:

```text
Story:      As a customer, I can view my order.
Abuse case: As a customer, I change the order id in the URL to view someone else's order.
Control:    Ownership check on every order read (BOLA protection).
Test:       TC-SEC-ORDER-003 — customer B gets 404/403 for customer A's order id.
```

Business-logic abuse (negative quantities, coupon reuse, skipping a workflow step, racing two requests) is invisible
to scanners — it only gets tested if someone writes the abuse case.

---

## Security requirements as acceptance criteria

Security requirements belong in the product docs as rules and acceptance criteria (`project-docs` ID scheme), so
they're traceable like any other behavior:

```md
## BR-AUTH-004 — Users can only access orders they own
Enforcement: server-side ownership check on every order endpoint.
Verified by: AC-AUTH-010, AC-AUTH-011

## AC-AUTH-010
Given customer A owns order 123 and customer B does not
When customer B requests GET /orders/123
Then the response is 404 (not 403 — do not confirm existence)
And no order data is returned
```

---

## Coverage map

Map where each risk category is covered, so gaps are visible (categories from OWASP Top 10 / API Security Top 10):

| Risk | Threat model | Pipeline scan | Automated test | Manual / pentest |
|---|:---:|:---:|:---:|:---:|
| Broken access control / BOLA / BFLA | ✓ | — | ✓ access matrix | ✓ |
| Authentication / session | ✓ | partial (DAST) | ✓ | ✓ |
| Injection | ✓ | SAST, DAST | ✓ per input class | |
| Mass assignment / property-level authz | ✓ | — | ✓ | |
| Security misconfiguration (headers, CORS, TLS) | | DAST, IaC | ✓ | |
| Vulnerable dependencies | | SCA | | |
| Secrets in code | | Secrets scan | | |
| SSRF | ✓ | SAST | ✓ if URL inputs exist | ✓ |
| Unrestricted resource consumption | ✓ | | ✓ limits | |
| Business-logic abuse | ✓ | — | ✓ abuse cases | ✓ |
| Logging & monitoring failures | ✓ | | ✓ audit events | |

---

## Security test plan template

```md
# Security Test Plan — <system> <release>

## Authorization
Owner approval: <name, date, link>
Window: <dates/times>
In scope: <hosts, APIs, repos>
Out of scope: <third parties, prod, …>
Allowed techniques: <static, DAST baseline, authenticated DAST, manual, …>
Stop conditions: <…>

## Depth
ASVS level: L1 | L2 | L3 — reason

## Threat Model
<link> — last updated <date>

## Coverage
<coverage map>

## Test Accounts
Roles × tenants: <list; credentials in secret store>

## Findings Handling
Tracker: <access-controlled location>
SLA: see triage policy

## Open Questions
- OQ-…
```
