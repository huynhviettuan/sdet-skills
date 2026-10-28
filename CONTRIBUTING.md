# Contributing

This collection holds itself to the standard it teaches: every claim is backed by something that ran, every rule
has an ID and a gate, and every stack is built by composition. A change is done when it meets the definition below
for what it touches.

## Definition of done — a skill

```text
[ ] skills/<name>/SKILL.md: frontmatter name = folder, description <= 1024 characters, says when to use it
[ ] SKILL.md stays short (workflow, non-negotiables, related skills); depth lives in references/*.md
[ ] Every example that claims "verified" was run, on the date it states, against the app it names
[ ] Rules carry stable IDs (R-… architecture/audit, S-… coding standards) that reviews can cite
[ ] Related skills link both ways; README "Which skill when", task table and skill list updated
[ ] CHANGELOG.md entry under [Unreleased] (CI fails a PR that changes skills/, agents/ or commands/ without one)
[ ] node scripts/check-repo.mjs clean; claude plugin validate --strict passes
[ ] A skill script that checks or generates something ships a scripts/selftest.py (fixtures built in a temp
    folder, every planted problem asserted) and a step in the CI skill-scripts job; break the check once to see
    the self-test fail
```

## Definition of done — a supported stack

A language/framework is supported only when it meets the contract in
[`skills/sdet-framework-architect/references/stack-contract.md`](skills/sdet-framework-architect/references/stack-contract.md):

```text
[ ] Composition at every layer: tests take dependencies from the composition root; pages have containers, containers
    have elements, services receive their client; only the thin bases are extended (R-INHERIT clean)
[ ] init-<stack>-framework scaffold installs, compiles/type-checks, lints and audits clean on a fresh copy
[ ] audit-suite.mjs has the language's rules and was shown to fire on a deliberately bad sample
[ ] Editor/build enforcement for the block rules (lint rules or architecture tests)
[ ] openapi-tool coverage reads the language's doc comments
[ ] page-builder, service-builder and test-script-writer each have code-templates-<stack>.md generated from the
    verified files (not hand-copied)
[ ] Sample cases (TodoMVC UI, Petstore API): green with retries off, x3 repeat, parallel, each new test shown to fail
    when its expectation is broken
[ ] A CI job for the scaffold; the stack's row in stack-contract.md; the detection signal in the builders
```

A stack that doesn't meet every line is listed as **planned** in the contract, with no templates.

## Shared scripts

`skills/refactor-test-suite/scripts/audit-suite.mjs` and `skills/service-builder/scripts/openapi-tool.mjs` are
copied into every scaffold's `scripts/`. Change the skill's copy, then copy it to each template; the repo check fails
when copies differ. Every template must still audit clean (`node scripts/audit-suite.mjs . --fail-on block`).

## Before pushing

```bash
node scripts/check-repo.mjs
```

```bash
claude plugin validate --strict .
```

CI also installs, lints, type-checks and audits all three scaffolds, and runs every skill's `scripts/selftest.py`.
Behavioural evals (`evals/`, see its README) run a real model and are started by hand: the `Skill evals` workflow, or
`claude plugin eval . --trust-plugin --no-publish` locally. Add a case when a skill gains a rule a model could skip.

## Releasing

Move [Unreleased] to a version in `CHANGELOG.md`, bump `version` in `.claude-plugin/plugin.json` and
`marketplace.json`, and record anything verified for the release with its date.
