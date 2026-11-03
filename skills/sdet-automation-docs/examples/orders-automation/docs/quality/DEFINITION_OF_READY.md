# Definition of Ready — Orders automation work

Snapshot: 2026-11-03. When a case may be automated. It adds the automation conditions to the product's
[DEFINITION_OF_READY.md](../../../../../project-docs/examples/orders-docs/docs/quality/DEFINITION_OF_READY.md),
whose readiness table (four features ready, three partly blocked) it inherits.

```text
[ ] The AC exists and is one quotable sentence (ACCEPTANCE_CRITERIA.md), or the case names the document it quotes
[ ] Risk is known (04_RISK_BASED_TESTING.md row)
[ ] Layer is known (01_AUTOMATION_STRATEGY.md, layer per requirement kind)
[ ] Basis is known: specified, or assumption naming its product OQ
[ ] The endpoint exists on the target build (the reference server has no pay/ship/cancel)
[ ] Test data is known: which actors, which tenant pair, which factory state
[ ] Any test hook it needs exists and is excluded from product builds (clock: OQ-A-002)
[ ] It can run in parallel, or its serial group and reason are recorded (TEST_DATA_STRATEGY.md)
[ ] No blocking OQ-A remains open for it
```

## Readiness as of 2026-11-03

| Cases | Ready | Blocked by |
|---|---|---|
| TC-AUTH-001..007, TC-ORD-001..003, 005, TC-ORD-010..015, 020..023, 040..042, TC-SEC-001..003, 005, TC-AUD-001..002, TC-ADM-001..002 | yes | — |
| TC-SEC-AUTHZ-001 rows AZ-001..023, 044..048, 050 | yes | — |
| TC-ORD-030..033, 035, 037; matrix rows AZ-024..043 | yes against the product build; not runnable on the reference server | endpoints absent in `app.py` |
| TC-ORD-004, 024 (OQ-002), 036 (OQ-004); AZ-030/036/043 (OQ-004), AZ-049/051 (OQ-006) | yes, as assumption | product OQ open; gating OQ-A-004 |
| TC-ORD-006, 007 | yes, as assumption, serial | OQ-003; OQ-A-003 for parallel |
| TC-ORD-034, TC-AUTH-008 | no | OQ-A-002 (clock); TC-ORD-034 also OQ-001 |
| TC-SEC-004 outside Local | no | OQ-A-011 |
| TC-AUTH-007 expired variant on Staging | no | OQ-A-010 |
