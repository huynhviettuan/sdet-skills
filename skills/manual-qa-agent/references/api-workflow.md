# API Workflow

The calls Claude makes, what comes back, and what each result means. Shapes are from the agent's API (Fastify + zod,
JSON) and were exercised end to end against its demo app. The agent's own README and `docs/07-data-contracts.md` are
the source of truth when they differ from this page.

Contents:

- [Connection](#connection)
- [Calls Claude makes](#calls-claude-makes)
- [Calls that belong to people](#calls-that-belong-to-people)
- [Story outcomes](#story-outcomes)
- [Case revisions](#case-revisions)
- [Proposing an executable](#proposing-an-executable)
- [Runs: statuses and reasons](#runs-statuses-and-reasons)
- [Triage and reproduction](#triage-and-reproduction)
- [Suites](#suites)
- [Errors](#errors)

---

## Connection

```bash
export API=http://127.0.0.1:3000          # from the user
export QA_KEY=...                          # from the user; never written to a file or echoed
curl -s $API/healthz                       # {"ok":true}
```

Send the key as `x-api-key: $QA_KEY` (or `Authorization: Bearer`). Roles come from the server-side key lookup only.
Write-type calls accept an `idempotency-key` header (≤ 200 chars); send one derived from the work item
(`story:TC-LOGIN-002`, `run:<caseId>:<date>`) so a retried call doesn't duplicate work.

On Windows PowerShell 5.1 use `curl.exe` (plain `curl` is a different command) or Git Bash.

## Calls Claude makes

With the agent tool server (`pnpm -s mcp`, agent ADR-0011) each row has a tool: `whoami` (`GET /api/me`),
`get_test_case`, `check_executable` (local schema + approved-revision + traceability check), `propose_executable`
(runs that check first), `request_run`, `get_run` (`waitSeconds` ≤ 120 polls for you), `get_triage`,
`get_reproduction`. Story submission and suites have no tool: the `AI_AGENT` role can't use them (story submission
stays with people by decision, agent ADR-0012). Over HTTP (`pnpm -s mcp --http`, ADR-0013) the same tools are served
at `POST /mcp`, with the caller's key on every request.

| Purpose | Call | Body | Success |
|---|---|---|---|
| Who the key belongs to | `GET /api/me` | — | `{ actorId, tenantId, projectId, roles }` |
| Submit a story (people only with an `AI_AGENT` key) | `POST /api/stories` | `{ externalId, title, description?, acceptanceCriteria: [{ id, text }], targetRelease?, environmentId? }` | `201` (`200` if deduplicated) |
| Re-draft a stored story (people only, as above) | `POST /api/test-cases/draft` | `{ storyId, environmentId? }` | `201` / `200` |
| Read a case | `GET /api/test-cases/:caseId` | — | `{ caseId, storyId, revisions[] }` |
| Propose an executable | `POST /api/test-cases/:caseId/executables` | `{ spec }` | `201` executable row |
| Request a run | `POST /api/test-runs` | `{ caseId, environmentId, approvalId? }` | `202` queued, `200` when it ended at policy (e.g. `BLOCKED`) |
| Read a run | `GET /api/test-runs/:runId` | — | run report |
| Read triage | `GET /api/test-runs/:runId/triage` | — | latest triage (`404` until it exists) |
| Read reproduction | `GET /api/test-runs/:runId/reproduction` | — | markdown |
| Suites (QA roles; not `AI_AGENT`) | `POST /api/suites`, `POST /api/suites/:id/cases`, `POST /api/suites/:id/runs`, `GET /api/suite-runs/:id` | see [Suites](#suites) | |

## Calls that belong to people

Never make these, whatever the key allows — report that they are waiting, for whom, and with which id:

| Call | Who |
|---|---|
| `POST /api/test-cases/:id/review` (`APPROVE` / `REJECT` / `EDIT`) | QA engineer |
| `POST /api/executables/:id/review` | a person other than the proposer |
| `POST /api/reviews/:id/resolve` (clarifications, source conflicts, action approvals, security triage) | product owner / QA lead |
| `POST /api/test-runs/:id/bugs`, `POST /api/bugs/:id/publish`, `/revert` | QA engineer drafts, QA lead approves, a person publishes |
| `POST /api/knowledge/ingestions`, `/revocations` | product owner (source owner) |
| `GET /api/reviews` (queue), `GET /api/evidence/:id` (screenshots) | people; the AI agent role is refused both |

## Story outcomes

`POST /api/stories` returns `{ workflowId, correlationId, storyId, storyVersion, deduplicated, outcome }`:

| `outcome.route` | Fields | Claude reports |
|---|---|---|
| `DRAFT_CREATED` | `caseId`, `revision`, `sourceRefs`, `missingRequirements` | the case id, the sources it cites, and any missing requirements (each is a question for the owner) |
| `REVIEW_REQUESTED` | `kind`, `reason`, `question`, `reviewId`, `sourceRefs` | the question **verbatim**, its sources and `reviewId`, and who answers it (`routing.md`) |

Common `reason` values: `UNSUPPORTED_ACCEPTANCE_CRITERIA` (the AC isn't measurable — e.g. "multiple failed
logins"), `SOURCE_CONTRADICTION` (two approved sources disagree; `kind: SOURCE_CONFLICT`), `NO_TRUSTED_SOURCES`,
`LOW_CONFIDENCE`, `UNGROUNDED_CLASSIFICATION`. When the owner resolves the review, the answer is published as a new
approved source (for example `CLAR-LOCKOUT@v1`) and the story re-runs; the new draft cites it.

Write ACs as one testable behavior each, in the requirement's words. Don't pad or reword an AC to get past readiness:
a question the agent asks is a real gap.

## Case revisions

`GET /api/test-cases/:caseId` → `revisions[]`, newest last, each:

```json
{
  "revision": 2,
  "status": "APPROVED",
  "content": {
    "title": "…", "priority": "P1",
    "preconditions": ["…"], "testData": ["…"], "assumptions": [], "missingRequirements": [],
    "steps": [{ "action": "…", "expected": "…", "sourceRefs": ["AC-LOGIN@v1"] }],
    "requirementRefs": ["story:AC-LOGIN-02", "AC-LOGIN@v1"],
    "techniques": ["equivalence_partitioning", "error_guessing"],
    "testTypes": ["negative", "security"],
    "testConditions": ["unknown email", "known email, wrong password"]
  },
  "sourceRefs": ["AC-LOGIN@v1"],
  "authorId": "…"
}
```

Design fields (agent ADR-0014, prompt `draft-v2`):

| Field | Contents |
|---|---|
| `requirementRefs` | What the case verifies: `story:<AC id>` or `sourceId@version` |
| `techniques` | From a fixed list: `specification_based`, `equivalence_partitioning`, `boundary_value_analysis`, `decision_table`, `cause_effect`, `state_transition`, `use_case`, `permission_matrix`, `pairwise`, `classification_tree`, `syntax`, `error_guessing` |
| `testTypes` | `positive`, `negative`, `boundary`, `security`, `regression` |
| `testConditions` | The partitions, boundaries, rule columns and transitions the case was derived from |

The agent checks drafts in code: a draft naming no technique is `MALFORMED`, a `requirementRefs` entry that is
neither a retrieved source nor a story criterion is `UNGROUNDED`, and every acceptance criterion the draft neither
traces nor lists as missing is appended to `missingRequirements` as `"<AC id>: not covered by this draft (coverage
check)"`. Revisions drafted before ADR-0014 (and reviewer edits without these fields) read with them empty. The
keyless stand-in model claims only `specification_based` / `positive` — expect thin design fields in demos without a
live model.

Statuses: `DRAFT → IN_REVIEW → APPROVED → RETIRED`, `NEEDS_CLARIFICATION`, `REJECTED`. `APPROVED` means the
definition was approved by a person — not that the product passes. Only an `APPROVED` latest revision can receive an
executable; editing the case later invalidates pending proposals.

## Proposing an executable

1. Write the spec (`test-script-writer` → `references/executable-spec.md`).
2. Check it from the agent checkout:
   `pnpm --dir <agent-repo> exec tsx <skill-dir>/scripts/check-spec.mjs spec.json --refs <revision sourceRefs, comma-separated>`
3. `POST /api/test-cases/:caseId/executables` with `{ "spec": … }`.

The response row carries `id`, `version`, `specHash`, `destructiveSteps`, `proposedBy`, status `PROPOSED`. The API
rejects (`400 VALIDATION`) schema errors and `sourceRefs` outside the approved case, and (`409`) a case that isn't
`APPROVED`. Approval binds to the spec hash and the case revision — after approval, any change is a new proposal.

## Runs: statuses and reasons

`GET /api/test-runs/:runId` → `{ id, status, reason, assertions[], evidence[], … }`. Lifecycle:
`QUEUED → POLICY_CHECK → RUNNING → PASSED | FAILED | INCONCLUSIVE`, or `BLOCKED` at policy. Poll every 2–5 s, up to
about 2 minutes, then report it as still running with its id.

| Status | `reason` examples | Meaning |
|---|---|---|
| `PASSED` | `ALL_ASSERTIONS_PASSED` | every assertion observed the expected value |
| `FAILED` | `ASSERTION_FAILED:<stepId>` | an assertion observed a different value; `assertions[]` holds `expected` and `actual` |
| `INCONCLUSIVE` | `STEP_ERROR:<stepId>`, `SETUP_ERROR:<stepId>`, `ASSERTION_NOT_EVALUATED:<stepId>`, `MISSING_SECRET:<NAME>`, `BASE_URL_NOT_ALLOWLISTED`, `EVIDENCE_UNAVAILABLE`, `EXECUTOR_ERROR`, `LEASE_LOST` | the behavior was never observed — not a pass, not a product failure |
| `BLOCKED` | `DESTRUCTIVE_STEPS` (an `ACTION_APPROVAL` review was opened), `DENIED:<policy reasons>`, `DENIED:SPEC_CHANGED`, `DENIED:REQUESTER_NOT_FOUND`, `REVIEW_REQUIRED:…` | policy didn't allow the run |

A run `BLOCKED` on `DESTRUCTIVE_STEPS` opens an `ACTION_APPROVAL` review for a QA lead. Once the lead approves it,
request the run again with the `approvalId` they give you. The worker re-checks the approval (expiry, revocation, spec hash, environment)
immediately before executing.

## Triage and reproduction

On `FAILED` / `INCONCLUSIVE` the worker triages automatically when a triage provider is configured.
`GET /api/test-runs/:runId/triage` (retry briefly on `404`):

```json
{
  "suspectedCause": "PRODUCT_DEFECT",
  "securitySensitive": true,
  "confidence": null,
  "rationale": "…",
  "reviewId": "review_…",
  "verifiedCause": null
}
```

`suspectedCause` is one of `PRODUCT_DEFECT`, `TEST_ISSUE`, `ENVIRONMENT`, `UNKNOWN` — a suggestion that never changes
the run's status. `securitySensitive: true` sends it to a QA lead (`SECURITY_TRIAGE` review). `verifiedCause` stays
`null` until a person confirms it.

`GET /api/test-runs/:runId/reproduction` returns markdown: run, case revision, executable version and spec hash,
environment, triage, then setup / steps / cleanup with the failing step marked
(`<- FAILED: expected "…" but was "…"`) and the steps after it marked skipped. Secrets and emails are redacted.
Hand both to `debug-failed-tests` for deeper analysis.

## Suites

Group approved cases and run them together:

```text
POST /api/suites                 { name, description? }                      → suite id
POST /api/suites/:id/cases       { cases: [{ caseId, section? }] }           (≤ 500 per call)
POST /api/suites/:id/runs        { environmentId }                           → 202, suite run id
GET  /api/suite-runs/:id                                                     → per-case status report
```

A suite run is terminal when every case is `PASSED`, `FAILED`, `INCONCLUSIVE` or `BLOCKED`.

## Errors

Errors are `{ error, message }` with HTTP status: `VALIDATION` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403,
`NOT_FOUND` 404, `CONFLICT` / `IMMUTABLE` / `ILLEGAL_TRANSITION` 409, rate limit 429 (120 requests/minute per key;
wait for `retry-after`). Report `FORBIDDEN` as a permission boundary — never retry it with a different key.
