---
paths:
  - "skills/**/*.md"
---

# Skills

- `SKILL.md`: frontmatter `name` equals the folder, `description` ≤ 1024 characters and says when to use it; the body
  stays short (workflow, non-negotiables, related skills). Depth goes in `references/*.md`, one topic per file, with a
  contents list and `##` headings the index can link.
- Every rule carries a stable ID (`R-…` architecture/audit, `S-…` coding standards, `KQ-`/`OQ-` questions) so a
  review can cite it. Never renumber.
- A table that another skill also needs has one owner (see CLAUDE.md § One owner); link, don't copy.
- A claim of behaviour ("verified on", "found in the pilot", a percentage) names the run, its date and where the
  numbers live. `check-repo` fails a README stack row that says "verified" without the job that re-runs it.
- Code in a reference is copied from a file that ran — in `examples/`, a template or a self-test — not written in
  place. When the file changes, the reference changes in the same commit.
- Related skills link both ways. A new skill also lands in README ("Which skill when", the task table, the skill list),
  `plugin.json`, `marketplace.json` and `CHANGELOG.md [Unreleased]`.
- Product terms stay verbatim (Vietnamese UI labels with an English gloss the first time); personal data and
  credentials never appear, not even as examples copied from a source.
