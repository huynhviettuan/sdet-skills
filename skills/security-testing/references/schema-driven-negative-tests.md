# Schema-Driven Negative Tests

Deterministic negative API cases derived from the OpenAPI spec: every field type has a known set of invalid inputs
and a known expected answer (a 4xx that names the field), so the cases are generated from the schema, not invented
per endpoint, and a 500 anywhere is a finding by construction. The schema files come from `service-builder`'s
`openapi-tool.mjs`; the authorization side of the same spec (who may set which field) joins
[`automated-security-tests.md`](automated-security-tests.md#property-level-authorization-and-mass-assignment).

Contents:

- [Where the schema comes from](#where-the-schema-comes-from)
- [Invalid inputs per field type](#invalid-inputs-per-field-type)
- [Injection-shaped strings per field kind](#injection-shaped-strings-per-field-kind)
- [From required, readOnly and enum to cases](#from-required-readonly-and-enum-to-cases)
- [Property-level authorization](#property-level-authorization)
- [Response schema as a leak detector](#response-schema-as-a-leak-detector)
- [Where the cases sit in the suite](#where-the-cases-sit-in-the-suite)
- [What not to do](#what-not-to-do)
- [Rules](#rules)

---

## Where the schema comes from

`service-builder/scripts/openapi-tool.mjs` (Node 18+, no dependencies; in a scaffolded repo `npm run api:inventory`
etc.) has three subcommands, read from its header:

| Command | Produces | Used here for |
|---|---|---|
| `node openapi-tool.mjs inventory <spec> [--out inventory.json]` | every operation with its method name, request type, response types, flags | the list of operations to parametrize, and which `components.schemas` entry is each request body |
| `node openapi-tool.mjs schemas <spec> [--out-dir src/data/schemas] [--tags pet,store]` | one draft-07 JSON Schema per JSON 2xx response, `<methodName>_<status>_schema.json` | the response-side oracle ([leak detector](#response-schema-as-a-leak-detector)) |
| `node openapi-tool.mjs coverage <spec> [--services src/services] [--tags pet,store]` | 0 missing / 0 extra operations vs service files, exit 1 on a gap | proving every operation has a service, so every operation can have negative cases |

Request-body schemas are not written by `schemas` (it covers responses). Read them from `components.schemas` in the
stored spec (`specs/<api>.json`, kept in the repo per `service-builder`), following the `requestSchema` name the
inventory prints. The spec is the source; a schema is never edited to match the API
([`mapping-rules.md`](../../service-builder/references/mapping-rules.md#response-schemas)).

---

## Invalid inputs per field type

One row per (schema keyword, violation). `Expected` is the documented validation answer; the product docs decide
400 vs 422, the test only requires that it is the same code everywhere and that the body names the offending field.

| Schema says | Invalid input | Expected (oracle) | ID |
|---|---|---|---|
| `type: string` | number, boolean, object, array | 400/422, body names the field | SEC-INPUT-01 |
| `type: integer` / `number` | string `"12"`, `12.5` for integer, `NaN`, `1e309`, `-0`, leading `+` | 400/422; a numeric string is **not** coerced unless the spec says `format` allows it | SEC-INPUT-02 |
| `type: boolean` | `"true"`, `1`, `null` | 400/422 | SEC-INPUT-01 |
| any type, not `nullable` | `null` | 400/422 naming the field | SEC-INPUT-03 |
| `minLength` / `maxLength` | length min-1, max+1; empty string when `minLength` >= 1 | 400/422; length min and max are the positive cases | SEC-INPUT-04 |
| `minimum` / `maximum` (and exclusive) | min-1, max+1, the bound itself when exclusive | 400/422 | SEC-INPUT-04 |
| `minItems` / `maxItems` | max+1 items; empty array when `minItems` >= 1 | 400/422 | SEC-INPUT-04 |
| `enum` | a value outside the list; the right value in another case (`PAID` vs `paid`); an empty string | 400/422; the message does not list the enum unless documented (enumeration aid) | SEC-INPUT-05 |
| `pattern` / `format` | one character outside the pattern; `format: email` without `@`; `format: uuid` with 35 characters; `format: date` as `2026-02-30` | 400/422 | SEC-INPUT-06 |
| `additionalProperties: false` (or absent) | one unknown key `{"x-extra": 1}`; a `readOnly` key | 400/422 naming the key (see [Property-level authorization](#property-level-authorization)); silently dropping is a finding when the key is privileged | SEC-INPUT-07 |
| `required` | each required field absent, one case per field | 400/422 naming exactly that field | SEC-INPUT-08 |
| `requestBody.content` | `Content-Type: text/plain` with a JSON body; `application/xml` where only JSON is listed; missing `Content-Type` | 415 (or the documented code); never parsed as JSON | SEC-INPUT-09 |
| body size | the documented limit + 1 byte; a 10 MB body when no limit is documented | 413; an undocumented limit is an OQ, the case still requires a 4xx, never a 5xx | SEC-INPUT-10 |
| JSON syntax | duplicate keys `{"a":1,"a":2}`; trailing comma; truncated body; a BOM | 400; for duplicate keys the documented policy (reject, or last-wins stated in the docs) | SEC-INPUT-11 |
| Unicode | zero-width joiner inside an identifier; right-to-left override; NFC vs NFD forms of the same name; an astral-plane character against `maxLength` | stored and echoed unchanged **or** rejected, per the docs; `maxLength` counted in the documented unit (code points, not bytes) | SEC-INPUT-12 |
| depth | an object nested one past the documented depth; an array of 100 000 empty arrays | 400/413; the parser does not hang (timeout in the client is the oracle) | SEC-INPUT-10 |

Every row has a sibling positive case at the boundary (min, max, the enum value) so a rejection is proven to be the
rule, not an outage ([boundary value analysis](../../test-case-design/references/techniques.md#boundary-value-analysis)).

---

## Injection-shaped strings per field kind

The field's kind (what the server does with it) decides which marker goes in. The oracle is never "the attack
worked": it is that the value is rejected by validation or stored and returned as data, and that the response is
not a 500. Discovery of exploitable sinks belongs to SAST/DAST
([`pipeline-scanning.md`](pipeline-scanning.md#scanner-types)); these cases pin the handling.

| Field kind | Marker (benign) | Expected (oracle) | ID |
|---|---|---|---|
| Free text stored and displayed | `sec-<caseid>'"<>&{{7*7}}${7*7}` | echoed back byte-identical in JSON; in HTML responses encoded (`&lt;`); `49` never appears | SEC-INPUT-20 |
| Identifier used in a SQL query | `1 OR 1=1`, `1; SELECT 1`, `' --`, `1) UNION SELECT NULL--` | 400/404; the list endpoint's count is unchanged; no 500 | SEC-INPUT-21 |
| Filter / query object (NoSQL) | `{"$gt": ""}`, `{"$where": "1"}`, key starting with `$` | 400 naming the field (operators are not accepted from the client) | SEC-INPUT-22 |
| Username / search sent to a directory | `*`, `*)(uid=*`, `admin)(&)` | 400 or zero results; never more results than the literal | SEC-INPUT-23 |
| File name / path | `../../etc/hostname`, `..\\..\\x`, `%2e%2e%2f`, `C:\\x`, a null byte `%00` | 400; stored name is server-generated ([file upload](automated-security-tests.md#file-upload)) | SEC-INPUT-24 |
| Template / expression input | `{{7*7}}`, `${7*7}`, `<%= 7*7 %>`, `#{7*7}` | echoed literally; `49` never appears | SEC-INPUT-25 |
| Value passed to a shell or process | `; id`, `$(id)`, `` `id` ``, `| cat x` | 400; a canary command (`touch` a path you check) never executes | SEC-INPUT-26 |
| URL-taking field | see [`api-security.md`](api-security.md#ssrf) | 400 for internal targets; the canary sink logs nothing | SEC-INPUT-27 |
| Header value | CR/LF in a value that is reflected into a response header (`x\r\nSet-Cookie: a=b`) | 400 or the value stripped; no second header in the response | SEC-INPUT-28 |

`<caseid>` is the `TC-SEC-INPUT-NNN` ID, so a marker found in a log or a database later is attributable.

---

## From required, readOnly and enum to cases

| Keyword in the request schema | Cases it yields | Count |
|---|---|---|
| `required: [a, b, c]` | each field absent, one case each; all absent, one case; an empty object | n + 2 |
| `readOnly: true` on a property | the field present with a plausible value, as the lowest role that may call the operation | 1 per field, see below |
| `enum: [x, y]` | one value outside; one case-variant; the empty string; each listed value as a positive case | 3 + n |
| `nullable: true` absent | `null` | 1 per field |
| `default` present | the field absent, assert the response shows the default (positive); the field present with the default (positive) | 2 |
| `oneOf` / `anyOf` | a body matching none; a body matching two branches when `oneOf` | 2 |
| `deprecated: true` | the field present | per docs: accepted with a warning header, or 400 |

The count column is what the parametrized test must enumerate; the review compares it with the number of cases the
suite actually runs for that operation.

---

## Property-level authorization

A `readOnly` or privileged field in the request is a mass-assignment target; the expected result is a rejection
naming the fields **and** an unchanged object. Copied from `examples/vuln-api/test_security.py` (flaw `mass`,
seen red by `scripts/selftest.py` on 2026-11-03):

```python
# TC-SEC-MASS-001 - read-only fields are rejected, not silently ignored (flaw: mass)
def test_mass_assignment_rejected(api: Api, tokens, alice_order: dict) -> None:
    r = api.request("PATCH", f"/orders/{alice_order['id']}", token=tokens["customer-own"],
                    json_body={"note": "ok", "status": "paid", "tenant": "tenant-b"})
    after = api.request("GET", f"/orders/{alice_order['id']}", token=tokens["customer-own"])

    assert r.status == 400
    assert r.body["fields"] == ["status", "tenant"]
    assert (after.body["status"], after.body["tenant"]) == ("new", "tenant-a")
```

The target fields come from the schema: `status` and `tenant` are `readOnly` on the order (or absent from the
PATCH body schema), and `tenant` is also the isolation key, which makes this row High in the threat model. Which
roles may set a writable-but-privileged field (`status` by a manager) is a row in `ROLES_PERMISSIONS.md`, verified
through `authz_matrix.py`, not a second test here.

---

## Response schema as a leak detector

The generated response schema (`openapi-tool.mjs schemas`) says what a 2xx body contains. Validated with
`additionalProperties: false` applied at every object level, it also says what the body must **not** contain, which
turns schema validation into an excessive-data-exposure check (OWASP API3) per role.

| Check | Case shape | Expected (oracle) | ID |
|---|---|---|---|
| Undocumented field | call each read operation as each role, validate against the generated schema with additional properties forbidden | validation passes; a field outside the schema (`passwordHash`, `internalNotes`, `tenant` for a customer) is a failure naming the path | SEC-INPUT-30 |
| Role-specific projection | the spec has one schema per role (`OrderCustomerView`, `OrderAdminView`) | each role's response validates against its own view and fails against the richer one | SEC-INPUT-31 |
| Error body | provoke each documented 4xx and the 500 | validates against the documented error schema; no extra keys (`trace`, `sql`, `path`) | SEC-INPUT-32 |
| List vs item | the list endpoint's item schema vs the item endpoint's schema | the list exposes no field the item does not | SEC-INPUT-30 |

A failure here is a finding against either the API (leak) or the spec (stale); the schema is not loosened to pass.
The `schemas` output has `additionalProperties` only where the spec declares it, so the suite applies the strict
setting itself and records that it does.

---

## Where the cases sit in the suite

| Aspect | Rule |
|---|---|
| Granularity | one parametrized test per operation; the parameter set is derived from that operation's request schema at collection time, never typed per field |
| Data | the stored spec in the repo is the input; the cases change when the spec changes and the diff shows which rows appeared |
| IDs | `TC-SEC-INPUT-NNN` per (operation, row); the ID is in the test's display name so a JUnit report can be matched back, the same way `authz_matrix.py verify` matches `AZ-` IDs |
| Role | the lowest role allowed to call the operation; a validation answer that differs by role is itself a finding |
| State | each case uses a fixture-owned object; a negative case still asserts the object is unchanged afterwards |
| Placement | fast (no login per case, one object per operation): the PR suite; the Unicode and size rows may go to nightly when slow |
| Sentinel | one known-false expectation in the family (a valid body expected to be rejected), strict expected-fail |

A case written out in the standard format ([`test-case-format.md`](../../test-case-design/references/test-case-format.md#template)):

| Field | Value |
|---|---|
| ID, title | TC-SEC-INPUT-014 - PATCH /orders/{id} rejects a read-only field and leaves the order unchanged |
| Verifies | AC-ORD-021 (`status` is read-only on PATCH), BR-SEC-003 (unknown or read-only fields are rejected, not ignored) |
| Basis | specified |
| Technique | Syntax testing, row SEC-INPUT-07; property-level authorization |
| Priority | P0; Smoke: yes |
| Level | api |
| Preconditions | an order owned by the calling customer with `status` `new` |
| Test data | body `{"note": "ok", "status": "paid"}`; `status` is the read-only partition |
| Steps | 1. PATCH the order with the body as the owner. 2. GET the order as the owner. |
| Expected results | 1. 400 and `fields` equals `["status"]`. Evidence: "unknown or read-only fields are rejected with 400 naming them" - BR-SEC-003. 2. `status` is still `new`. Evidence: "a rejected request changes nothing" - BR-SEC-003 |

---

## What not to do

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Random fuzzing in the functional suite | no oracle: a run is green because nothing crashed, red for reasons nobody can reproduce | schema-derived rows with an expected code; fuzzing runs in the DAST stage with crash and 500 as its only oracle |
| Asserting on error wording | the message changes with a library upgrade; the test turns red with no defect | assert the status and the field path; wording only where the docs quote it |
| One giant payload with every attack string | one rejection hides nine missing checks | one row per case, one field per case |
| Treating a 500 as "rejected" | the request was not validated; it crashed | a 5xx is always a finding, whatever the input |
| Accepting silent drops of unknown fields | a privileged field dropped today is written tomorrow | 400 naming the field, or a documented and tested allowlist |
| Loosening the schema when validation fails | hides a leak or a stale spec | report; the API or the spec changes |
| Tuning cases to the current behaviour | expectations copied from the app are the app's bugs restated | expectations from the spec and the product docs; silent docs are an OQ |

---

## Rules

- **SEC-INPUT-R1** A 5xx in response to any input in this file is a finding, whatever the input and whatever the
  endpoint.
- **SEC-INPUT-R2** Expected codes come from the product docs or the spec; the suite asserts the code and the named
  field, never the message text.
- **SEC-INPUT-R3** Cases are enumerated from the stored spec at collection time; the count per keyword matches the
  table above and the review checks it.
- **SEC-INPUT-R4** Every negative row has its positive boundary sibling; a family that is all rejections proves
  nothing about availability.
- **SEC-INPUT-R5** Markers carry the case ID and are benign; no payload in this file exfiltrates, deletes, or
  targets another user of a shared environment.
- **SEC-INPUT-R6** Response validation runs strict (`additionalProperties: false`) per role; a schema is generated
  by `openapi-tool.mjs schemas` and never edited.
