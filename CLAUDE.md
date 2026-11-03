# sdet-skills — working rules

This repo teaches testing discipline, so it is held to it. These rules are for anyone working here — a person, this
session, or a subagent it spawns. Path-scoped detail is in `.claude/rules/`; the definition of done is in
[CONTRIBUTING.md](CONTRIBUTING.md); decisions already made are in [docs/decisions.md](docs/decisions.md) — read it
before re-opening one.

## Rules

1. **A refusal is a stop, not a detour.** When a tool call is denied (permission, classifier, policy), report it and
   stop that step. Copying through another tool, another path or another process to get the same effect is a defect
   in the run, however good the output looks.
2. **Green is earned, never arranged.** No skipping a test, loosening an assertion, adding a retry or editing an
   expectation to match the app. A baseline that does not pass is *inconclusive* and is reported as such. A suite
   keeps a sentinel; new assertions pass `can-fail`.
3. **No "verified" without a run that CI repeats.** A verified claim names the command, the date, the counts and the
   job that re-earns it (`Nightly examples`, a self-test, a CI job). Anything else is "ran once on <date>".
4. **A heuristic ships measured or advisory.** A check that judges text (vague, status-only, personal data) is
   measured on a set it was not tuned on before it may fail a run; until then it prints advice. Numbers from planted
   fixtures do not count as measurement.
5. **One owner per shared table.** The ID scheme (README), the executable-spec format's limits
   (`test-script-writer/references/executable-spec.md`), the `@AGENTS.md` import mechanic (`project-docs`), the
   stack contract (`sdet-framework-architect`). Everyone else links.
6. **Sources are read-only; outputs are cited.** Nothing under a user's documents, a pilot repo or a test catalogue
   is edited by a skill run; every statement a skill produces from them carries a citation or is marked inferred.
7. **Shared scripts are one file.** `audit-suite.mjs`, `openapi-tool.mjs`, `can-fail.mjs`, `guard-hooks.mjs`, `status.mjs` and the
   status schema: change the skill's copy,
   copy to every template, `check-repo` proves they match.
8. **Write `[Unreleased]` as you go, one bullet group per commit.** A commit that mixes two release-note groups has
   to be split by hand later; it was, twice.
9. **Windows first.** Edits through Edit/Write, never through a heredoc script (apostrophes and `\d` break it);
   Python writes UTF-8 explicitly; console output uses ASCII separators (`|`, `-`), not `·` or `→`.
10. **No personal data or credentials in the repo**, including in examples, digests, fixtures and commit messages.
    Example values are documented as examples.

## Checks before a commit

```bash
node scripts/check-repo.mjs
python skills/test-case-design/scripts/selftest.py
python skills/project-knowledge-base/scripts/selftest.py
node skills/test-script-writer/scripts/selftest.mjs
node skills/automation-pipeline/scripts/selftest.mjs
node skills/service-builder/scripts/selftest.mjs
```

```bash
npx -y @anthropic-ai/claude-code@2.1.287 plugin validate --strict .
```

Evals (`claude plugin eval . --trust-plugin --no-publish`) and the example suites (`skills/test-script-writer/examples/*/run-examples.sh`)
run on demand; CI runs the examples nightly.

## Shared files

Only the coordinating session edits these; a subagent that needs a change in one stops and reports it:
`README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `.claude/**`, `.claude-plugin/**`, `.github/**`,
`scripts/**`, `docs/decisions.md`, and every copy of a shared script.

## Delegating to a subagent

Copy this into the brief; an agent cannot follow a rule it was not given.

```text
Repo: D:/sdet-skills. Read CLAUDE.md first and follow it.
You may write ONLY: <explicit paths>. Everything else — including README, CHANGELOG, .github, scripts/ and the
other stacks — is someone else's; if you need a change there, stop and say what and why.
Done means: <the exact outcome: tests pass 3x in parallel, checker clean, N files with line counts>.
Verify for real: run the commands; never skip, loosen, retry or edit an expectation to go green; a failing
baseline is INCONCLUSIVE, report it as such.
If a tool call is refused, stop that step and report the refusal; do not route around it.
Reply with: files changed (line counts), the exact commands you ran and their output counts, what you changed
outside the brief (should be nothing), what failed, and anything in the sources that contradicts itself.
```

Agents working in parallel get disjoint write paths; shared-file edits, the changelog entry and the commit are the
coordinator's. Re-verify at least one claim from every report before relying on it (a citation, a count, a run).
