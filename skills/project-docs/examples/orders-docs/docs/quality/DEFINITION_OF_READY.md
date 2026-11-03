# Definition of Ready

A development task on Orders is READY only when:

```text
[ ] Purpose is clear (the FR's "Purpose")
[ ] Actor is identified (the FR's "Actors" and the matrix rows it names)
[ ] Business rules are documented (BR IDs listed in the FR)
[ ] Permissions are known (matrix rows exist for every operation the task adds, with an anonymous and a deny row)
[ ] Fields and validation are known (the FR's "Fields" / "Validation"; ERROR_CODES.md has the messages)
[ ] Relevant states are defined (STATE_MACHINES.md has every transition the task touches)
[ ] Acceptance criteria exist (AC IDs listed in the FR, one sentence each)
[ ] No blocking OQ remains open for the rules the task implements
```

Otherwise keep the task blocked.

## Readiness as of 2026-11-03

| Task | Ready | Blocked by |
|---|---|---|
| FR-AUTH-001 Login | yes | — |
| FR-ORD-002 Read orders | yes | — |
| FR-ORD-005 Delete | yes | — |
| FR-ADM-001 Admin reads | yes | — |
| FR-ORD-001 Create | partly | OQ-002 (note > 200), OQ-003 (cap), OQ-006 (manager create) — the main flow and AC-ORD-001/002/003/005 are ready |
| FR-ORD-003 Edit note | partly | OQ-002, OQ-005, OQ-006 — AC-ORD-020..023 are ready |
| FR-ORD-004 Lifecycle | partly | OQ-001 (window), OQ-004 (admin rows) — transitions and AC-ORD-030..033/035 are ready |
