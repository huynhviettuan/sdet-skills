# Definition of Done

A feature of Orders is DONE only when:

```text
[ ] Implementation matches approved requirements (the FR, its BRs; nothing marked ASSUMPTION built as if decided)
[ ] Server-side authorization exists (token -> object scope -> function, in that order; every new operation has matrix rows)
[ ] Validation exists (fields, lengths; unknown or read-only fields rejected and named)
[ ] State transitions are enforced (only the rows in STATE_MACHINES.md; everything else 409 and unchanged)
[ ] Transactions are used where required (id allocation, open-order count, transitions run under the store lock)
[ ] Audit events exist where required (every denial, BR-AUD-001)
[ ] Notifications exist where required (none in scope)
[ ] Error states are handled (exact messages from ERROR_CODES.md; 500 never leaks)
[ ] Unit / integration / API tests pass
[ ] Relevant E2E tests pass (none in scope)
[ ] Acceptance criteria pass (every AC of the feature has a case quoting it; authz_matrix.py verify is clean)
[ ] Traceability updated (TRACEABILITY_MATRIX.md Test column, REQUIREMENTS_CATALOGUE.md if an ID was added)
[ ] Documentation updated (FR, BR, AC, API spec, openapi.yaml, CHANGELOG entry)
[ ] No blocking OQ remains open for the behaviour shipped
```

A change that answers an OQ is not done until the decision is propagated through every layer
(`OPEN_QUESTIONS.md` header) and the assumption markers on the affected BR/AC/matrix rows are removed.
