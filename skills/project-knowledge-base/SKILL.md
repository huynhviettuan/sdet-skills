---
name: project-knowledge-base
description: >
  Turn a folder of existing project documents (any mix of Markdown, Word, PDF, Excel, PowerPoint, HTML, CSV,
  screenshots, wireframes, meeting notes) into a navigable knowledge-base folder that is easy to read and easy to
  search: a start-here README with reading paths, an overview, a glossary, actors and permissions, the domain model
  and lifecycles, every business flow found in the documents with diagrams, business rules, requirements,
  integrations, decisions, an analysis of conflicts, gaps, ambiguities and stale content with open questions, a
  testing view, and an A–Z index — every statement cited back to its source document and line. Reads the sources
  without changing them, works map-then-reduce so large document sets fit, and updates incrementally when documents
  change. Use when the user hands over project documents to summarize, analyze, consolidate, or make searchable;
  wants to onboard onto a project; asks "what does this project do", "find all the flows", "where is X defined";
  or says "read all these docs".
---

# Project Knowledge Base

Take whatever documents a project has and produce one folder that a new joiner, a tester, a developer or the
product owner can read in an hour and search in seconds — without losing what the sources actually say.

**How to use this skill:** follow the workflow. Load a reference when you reach its step:

- [`references/kb-structure.md`](references/kb-structure.md) — the output folder, what each page contains, the
  page templates, the digest card, the citation format.
- [`references/flows-and-models.md`](references/flows-and-models.md) — extracting business flows, lifecycles,
  roles and data from prose; diagram conventions (Mermaid flowchart, sequence, state, ER); inferred vs stated.
- [`references/analysis.md`](references/analysis.md) — finding conflicts, gaps, ambiguities, duplicates and stale
  content across sources; severity; open questions; the testing view.

Scripts (Python ≥ 3.10):

- `scripts/ingest.py <sources> <kb>` — extracts every document to text with a manifest (ids `S01…`, outlines with
  line numbers, change status against the previous run). Optional parsers:
  `uv run --with pypdf --with python-docx --with openpyxl --with python-pptx python <skill-dir>/scripts/ingest.py …`
- `scripts/check_kb.py <kb>` — every citation resolves to a live source and an existing line, every readable source
  has a digest, links and #heading anchors resolve, diagrams are fenced; reports pages with too few citations.

## Workflow

1. **Intake.** Sources folder, output folder (default `<project>-kb/` beside it — never inside the sources), the
   audience (new joiner, QA, dev, PO, all), and the language to write in (default: the sources' main language; keep
   source terms verbatim and translate them in the glossary). Ask only if unclear.
2. **Ingest.** Run `ingest.py`. Report the inventory: readable, images, needs-OCR, unsupported. Images (screenshots,
   wireframes, diagrams) are viewed directly and described in their digest; an animated GIF shows only its first
   frame to an image reader, so extract the frames first (`python -c "from PIL import Image, ImageSequence; …"` or
   `ffmpeg -i flow.gif frame-%02d.png`) and describe each; scanned PDFs are listed as gaps, never guessed.
3. **Triage.** For each source: kind (requirements, design, decision log, meeting notes, API/tech, test, plan,
   reference data), stated date and version, authority (approved spec > draft > notes), and duplicates/versions.
   Build a **document map** of how the sources refer to each other ("doc 15", "brief §3", "see 09_RBAC") → source id,
   flagging references that are ambiguous (two files numbered 29) or missing. Note dates stated inside a document
   that are later than its file date — the text was edited after the export, or it is a plan written as done.
   Decide the reading order: overview and glossary first, then rules and flows, then the rest.
4. **Digest every source (map).** One card per source in `_digests/` (template in `kb-structure.md`), read section by
   section from the outline — never summarize a section you didn't read. Every fact carries `[Sxx Lnn]`. Large
   sources get one card with a section per heading. For more than ~20k words, digest in parallel batches balanced
   by word count (one very large source alone), each batch with the same card template.
5. **Synthesize (reduce).** Build the pages from the digests; go back to the source text for exact wording, numbers
   and IDs. Keep the documents' own IDs (`BR-107`, `AC-01`, `D-020`). Flows, lifecycles and roles per
   `flows-and-models.md`. A decision log usually overrides the specs it postdates: read it before writing rules,
   and mark every rule it supersedes. When pages are written in parallel, fix the file names and anchors first so
   cross-links resolve, and write the analysis last, from the other pages' reported conflicts and gaps.
6. **Analyze.** Compare across sources (`analysis.md`): conflicts, gaps, ambiguities, duplicates, stale statements,
   referenced-but-missing documents, risks. Each finding cites both sides and gets a `KQ-…` question (or the
   sources' own `OQ-…` when they already ask it) when someone must decide. Write the testing view.
7. **Navigate.** README (what it is in one paragraph, reading paths per audience, page map, freshness), the A–Z
   index, and "where do I find…" questions with links.
8. **Verify.** `check_kb.py` clean; then spot-check at least 10 random citations against the source lines and 3
   flows end to end; fix what doesn't match. Report coverage (sources digested, pages written, findings) honestly.
9. **Update** when documents change: re-run `ingest.py`; re-digest `changed`/`new` sources; update the pages that
   cite them; mark citations to `removed` sources; add an entry to `changelog.md`.

## Non-negotiable rules

- **Sources are read-only.** The skill never edits, moves or renames a source document.
- **Everything is cited.** A statement without `[Sxx Lnn]` is either an inference — marked *(inferred)* with what it
  is inferred from — or it is removed.
- **Never resolve a conflict silently.** Two sources that disagree are both shown, with dates and authority; the
  newer or more authoritative one may be marked "likely current", and the question goes to `analysis.md`.
- **No invented content.** A missing rule, step, number or role is a gap to report, not a blank to fill.
- **Diagrams show only what the text says;** steps the reader needs but the sources don't state are dashed and
  labelled inferred.
- **Personal data and secrets** found in sources are not copied into the KB (names of real customers, credentials,
  keys); note that they exist and where.
- **Scale honestly:** if a source was only partly read (time, size, OCR), its digest says which sections.

## Related skills

- **`project-docs`** — when the analysis shows the documentation itself must be rewritten as a source of truth, the
  KB is its input.
- **`test-case-design`** — the testing view and the flows/rules pages are where test design starts.
- **`manual-qa-agent`** — approved sources for the agent can be cut from the KB's rules and acceptance criteria.
- **`sdet-automation-docs`** — the automation strategy for the project builds on the KB's risk areas.
