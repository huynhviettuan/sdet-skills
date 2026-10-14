# Spec Drift and the No-Spec Path

Contents:

- [When the spec changes](#when-the-spec-changes)
- [No spec](#no-spec)

---

## When the spec changes

Specs change: new endpoints, renamed fields, removed operations. Keep services in lockstep instead of patching by
hand.

1. **Replace** `specs/<api>.json` with the new version (commit it separately so the diff is reviewable).
2. **Diff the inventories**: regenerate `specs/<api>.inventory.json` and compare with the committed one
   (`git diff`). Classify each change:

| Change | Action |
|---|---|
| Operation added | Generate the method (and types/schemas it needs). |
| Operation removed | Do **not** delete silently: find tests calling the method (`grep` the method name), report them, then remove the method and those tests (or mark them obsolete) in the same change. |
| operationId renamed | The method is renamed by regeneration; update callers in the same change. Flag it — a renamed operationId is a breaking change for every client. |
| Params / body changed | Regenerate the signature; `tsc` shows every caller that must change. |
| Schema field added / removed / type changed | Regenerate types and schemas; failing tests show where behavior changed. |
| Tag changed | Method moves to another service class; update fixtures and callers. |

3. **Regenerate** only the affected services, types, and schemas (rerun `schemas` — it overwrites generated files
   only).
4. **Verify**: `tsc --noEmit`, `coverage` clean, smoke tests green. Note breaking changes in `CHANGELOG.md`.

Run `coverage` in CI against the committed spec so a spec update that isn't followed by regeneration fails the
build.

---

## No spec

When the API has no OpenAPI document, don't hand-write ad hoc services — produce a draft spec first, then generate
from it like any other spec. The draft becomes the contract the API team confirms.

1. **Ask first** whether a spec exists somewhere (backend repo, `/swagger.json`, `/v3/api-docs`, `/openapi.json`,
   API gateway export). Many frameworks expose one at runtime.
2. **Capture traffic** during UI exploration (`page-builder` records network calls per interaction) or by running
   the existing UI flows with network logging. For each distinct call record: method, path (with ids replaced by
   `{param}`), query params, request body, status, response body. Sanitize tokens and personal data.
3. **Write `specs/<api>.draft.json`** (OpenAPI 3.0):
   - `info.description`: `UNVERIFIED — drafted from captured traffic on <date>; confirm with the API team (OQ-…)`
   - one operation per distinct method + path, `operationId` = verb + resource in camelCase (`getOrderById`)
   - `tags` by resource
   - schemas generalized from responses (types only; mark fields `required` only when present in every capture)
   - responses only for statuses actually observed
4. **Raise an OQ** to the API team: confirm operations, operationIds, required fields, error formats — ideally they
   adopt and publish the spec.
5. **Generate** from the draft with the normal workflow. Tests built on an UNVERIFIED spec state that in their
   describe title or a tag (`@unverified-contract`) until the OQ is closed.
6. When an official spec arrives, treat it as a spec change (above).
