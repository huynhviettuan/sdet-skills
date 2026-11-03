# Locator Strategy — Orders

Snapshot: 2026-11-03. Part of the minimum set (`document-package.md`). Orders has no UI (`01_SCOPE.md`), so there
are no element locators; this file records what "locating" means for an API suite and the rule that applies the day
a UI exists.

## API equivalent: locate through the owning scope

The global rule — scope every lookup through its owning parent, strict, an ambiguous match is inconclusive — applies
to response data:

| Rule | Orders example |
|---|---|
| Find a record by the id the test created, never by position | `order_factory` returns ids; a list assertion looks the created id up in `GET /orders`, never `body[0]` |
| Never match by broad text | do not find "my order" by note text; the note is a tag, not a key |
| A lookup that matches more than one record is inconclusive, not "take the first" | two audit entries matching actor + action + outcome is fine for "contains" (AC-AUD-001 asserts presence); for a lookup that must be unique, more than one match stops the step as INCONCLUSIVE |
| Assert scope properties over the whole list, membership over owned records | AC-ORD-010: every returned order has `owner == alice` (a property, true whatever other workers created); the created id is in the list |
| Endpoints come from one place | paths live in the service classes, never as string literals in a test |

## If a UI is added (OQ-A-008)

Then the skill's default applies unchanged (`standards.md`, "LOCATOR_STRATEGY.md"): resolve through the container
or component root, test id first (`testIdAttribute: 'data-testid'` in the Playwright template, or the pytest
template's equivalent), then role + name, label, stable text; no `nth-child`, generated classes or long XPath. A
deviation needs an ADR.
