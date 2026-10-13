# Pipeline Scanning

Automated scanners in CI/CD: what each finds, where it runs, how to gate on it, and how to keep noise low enough
that people keep reading the results.

Contents:

- [Scanner types](#scanner-types)
- [Pipeline placement](#pipeline-placement)
- [Gating policy](#gating-policy)
- [DAST in practice](#dast-in-practice)
- [Tuning and suppressions](#tuning-and-suppressions)
- [Tool mapping](#tool-mapping)

---

## Scanner types

| Type | Finds | Doesn't find | Input |
|---|---|---|---|
| **SAST** (static analysis) | Injection sinks, unsafe APIs, hard-coded crypto, taint flows in your code | Runtime config, authz logic, business logic | Source code |
| **SCA** (dependency scanning) | Known CVEs in third-party packages, license issues | Vulnerabilities in your own code | Lockfiles / manifests |
| **Secrets scanning** | API keys, tokens, private keys, passwords committed | Secrets outside the repo | Source + git history |
| **IaC scanning** | Misconfigured cloud resources, open security groups, public buckets, missing encryption | Running-environment drift | Terraform, CloudFormation, Kubernetes, Helm |
| **Container scanning** | OS-package CVEs, root user, bad base images | App-level logic | Built images |
| **DAST** (dynamic) | Missing headers, reflected input, misconfigurations, some injection, exposed endpoints | Most authz/BOLA, business logic, unauthenticated-only blind spots | Running app |
| **SBOM** | Inventory of what you ship (for later CVE matching and audits) | — | Build output |

None of these replace the automated security tests (your authz rules) or human review for higher ASVS levels.

---

## Pipeline placement

| Stage | Run | Why there |
|---|---|---|
| Pre-commit (developer machine) | Secrets scan (fast mode) | Stop a secret before it enters history |
| Pull request | SAST (diff), SCA (new dependencies), secrets, IaC, fast security API tests | Feedback on the change that introduced it |
| Build | Container scan, SBOM generation | Scans exactly what will ship |
| Deploy to ephemeral/test env | DAST baseline (passive), authenticated API DAST, full security test suite | Needs a running app |
| Nightly / weekly | Full SAST, full SCA against new CVE data, active DAST on test env | New CVEs appear for unchanged code |
| Pre-release / periodic | Manual review / pentest per ASVS level | Finds what tools can't |

SCA must also run on a schedule against the **deployed** versions — a dependency that was clean at merge can get a
critical CVE next week.

---

## Gating policy

Gate on **new** findings, not the whole backlog, or the gate is permanently red and gets disabled.

```text
Block merge:
  - any secret detected
  - new Critical/High SAST finding in changed code
  - new dependency with Critical/High CVE that has a fixed version
  - IaC: public data store, wildcard IAM, open admin ports
  - failing security API test (access matrix, authn, headers)

Warn (ticket created, merge allowed):
  - Medium findings
  - existing (baseline) findings touched by the change
  - CVE with no fix available (track, add compensating control)

Never:
  - "allow failure: true" on the whole security stage
```

Thresholds and exceptions live in one policy file in the repo, reviewed like code.

---

## DAST in practice

- Run against an **ephemeral or dedicated test environment** you're authorized to scan, never a shared one other
  teams depend on without notice, never production without explicit approval.
- Start with a **passive/baseline** scan (spider + passive rules) in every deploy pipeline; schedule **active**
  scans (which send attack probes) separately, on an isolated environment.
- **Authenticate** the scanner (per role) or it only tests the login page. Feed it the OpenAPI spec for APIs so it
  reaches every endpoint.
- Exclude destructive endpoints (delete account, send email/SMS, payments) or point them at stubs.
- Seed data before the scan; reset the environment after an active scan.
- Correlate with the security API tests: DAST finds generic issues, your tests cover authz.

---

## Tuning and suppressions

- Every suppression has: the finding id, the reason (false positive / risk accepted / compensating control), an
  owner, and an **expiry date**. Expired suppressions fail the build.
- Suppress narrowly (one rule at one location), never by disabling a rule globally.
- Track the false-positive rate per rule; tune or replace rules that are mostly noise — trust in the tool is the
  real asset.
- Re-verify accepted risks when the surrounding code changes.

Example entry:

```yaml
- id: semgrep:python.lang.security.audit.formatted-sql-query
  path: app/reports/query_builder.py:88
  reason: false positive — table name from fixed enum, values parameterized
  owner: team-reports
  expires: 2027-01-31
```

---

## Tool mapping

Examples, not endorsements — choose by language coverage, CI integration, and noise level, and record the choice as
an ADR.

| Type | Open-source examples | Commercial / platform examples |
|---|---|---|
| SAST | Semgrep, CodeQL, Bandit (Python), SpotBugs + FindSecBugs (Java), ESLint security plugins | SonarQube, Checkmarx, Snyk Code, Veracode |
| SCA | OWASP Dependency-Check, Trivy, OSV-Scanner, npm/pip audit | Dependabot, Snyk Open Source, Mend |
| Secrets | gitleaks, TruffleHog, detect-secrets | GitHub secret scanning / push protection |
| IaC | Checkov, tfsec / Trivy config, KICS | Snyk IaC, Prisma Cloud |
| Container | Trivy, Grype | Snyk Container, registry-native scanners |
| DAST | OWASP ZAP (baseline / API / full scan) | Burp Suite Enterprise/DAST, Invicti |
| SBOM | Syft, CycloneDX tools | Platform-native |
