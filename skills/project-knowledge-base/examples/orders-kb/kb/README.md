# Orders — knowledge base

The Orders service lets a customer of a tenant place an order with a short note, pay for it and follow it until it
ships; managers oversee their tenant's orders and a platform admin reads everything for support [S01 L9-L10]. The
requirements are a draft of 2026-10-20 [S01 L4]; a sync on 2026-10-28 changed the cancellation rule and the PRD has
not caught up [S02 L25-L31].

Built on 2026-11-03 from 4 documents (1,792 words) in `../sources/`; 16 findings in [analysis](analysis.md).

## Start here

| If you are… | Read, in order |
|---|---|
| new to the project | [overview](overview.md) → [glossary](glossary.md) → [flows](flows/README.md) → [domain model](domain-model.md) |
| testing it | [testing view](testing-view.md) → [flows](flows/README.md) → [business rules](business-rules.md) → [analysis](analysis.md) |
| building it | [overview](overview.md) → [domain model](domain-model.md) → [requirements](requirements.md) → [decisions](decisions.md) |
| deciding things | [analysis — open questions](analysis.md#open-questions) → [decisions](decisions.md) |

## Pages

| Page | What's in it |
|---|---|
| [overview.md](overview.md) | what the service is, project status, scope, users, key numbers |
| [glossary.md](glossary.md) | terms, the FAQ's synonyms (company = tenant), where each is defined |
| [actors-and-permissions.md](actors-and-permissions.md) | roles, example users, the permission matrix, denial codes, the roles sheet's worked examples |
| [domain-model.md](domain-model.md) | entities, ER diagram, the order lifecycle with every stated and disputed transition |
| [flows/README.md](flows/README.md) | flow catalogue: place and ship, cancel, sign in with lockout |
| [business-rules.md](business-rules.md) | FR-, BR-, NFR- and D- rules with their status (current, superseded, proposed) |
| [requirements.md](requirements.md) | functional and non-functional requirements, draft acceptance statements, OQ list |
| [decisions.md](decisions.md) | D-01..D-05 with dates, what each supersedes, what is still open |
| [analysis.md](analysis.md) | conflicts C-1..C-3, gaps, ambiguities, stale statements, missing documents, duplicates, risks, KQ-1..KQ-6 |
| [testing-view.md](testing-view.md) | risk areas, testable rules, not-testable-yet rules, flows to cover, data to prepare |
| [index.md](index.md) | A–Z topics and "where do I find…" |
| [changelog.md](changelog.md) | each build of this KB |

Omitted: `integrations.md` — the only external system is a payment provider that is not chosen yet [S01 L63];
it is covered as OQ-01 in [requirements](requirements.md#open-in-the-sources) and G-2 in the analysis.

## Coverage

4 of 4 sources digested (`_digests/`); 0 images; 0 need OCR. Every source was read in full.
Citations `[S01 L25]` point to `_sources/text/` — see the [inventory](_sources/inventory.md); the line is the line
of the extracted text, whose first line is a header, so it is the source's own line plus one.

## Freshness

Sources carry these dates: roles sheet 2026-10-15 [S04 L2], PRD v0.3 2026-10-20 [S01 L4], sync 2026-10-28
[S02 L2], FAQ undated [S03 L5]. The next sync was planned for 2026-11-04 [S02 L56]; re-run `ingest.py` after it.
