# Executable spec example — login lockout at the API level

One approved case of the Orders domain, written as the ExecutableSpec the Manual QA Agent runs
(`test-script-writer/references/executable-spec.md` owns the format): the fifth failed sign-in is allowed, the
sixth is refused with `429` and the documented error.

| File | What it is |
|---|---|
| `TC-ORD-AUTHN-001.spec.json` | the API body for `POST /api/test-cases/<caseId>/executables` (`{ "spec": … }`) |

The case it implements (test-case-design format; the `BR-` ID is the Orders package's rule for lockout):

```md
### TC-ORD-AUTHN-001 — The sixth consecutive failed sign-in is refused
Verifies: BR-ORD-AUTHN-001 · Basis: specified · Priority: P1 · Technique: BVA (one past the limit) · Level: api
Preconditions: account nobody-rl has 5 consecutive failed sign-ins within the last minute
Steps: 1. POST /auth/login with username nobody-rl and a wrong password.
Expected results: 1. Status 429 and body error "too many attempts".
```

What the spec shows:

- the precondition (five failures) is `setup` through the API, so a problem there reads `INCONCLUSIVE`, not as a
  failed lockout;
- the assertion cites the rule revision the approved case cites (`sourceRefs: ["BR-ORD-AUTHN-001@v1"]`);
- `expectJson` on the same `apiRequest` checks the body, no browser step;
- `teardown` resets the store so the next run starts clean (the example server's `/_reset` test hook; a real product
  has a test hook or the data factory's delete).

## Check before proposing

```bash
pnpm --dir D:/manual-qa-agent exec tsx skills/manual-qa-agent/scripts/check-spec.mjs skills/manual-qa-agent/examples/lockout-spec/TC-ORD-AUTHN-001.spec.json --refs BR-ORD-AUTHN-001@v1
```

Ran on 2026-11-03 from the agent checkout (ADR-0026):

```text
INFO  (spec)             a failing setup step makes the run INCONCLUSIVE, not FAILED
TC-ORD-AUTHN-001.spec.json: 0 error(s), 0 warning(s) - ready to propose
```

The check needs the agent repo because it validates with the agent's own zod schema; it is not repeated by this
repo's CI.
