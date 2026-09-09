---
name: init-playwright-framework
description: >
  Scaffold a brand-new Playwright/TypeScript test-automation repository from scratch, matching the layered
  architecture (element/container/service/composition-root/driver-holder) and tooling of the
  huynhviettuan/playwright-poc reference framework. Use this skill whenever the user wants to initialize a new
  Playwright test repo, bootstrap a QA automation framework, start a new test-automation project "like
  playwright-poc", or set up the standard SDET project structure for a new codebase. Trigger on phrases like
  "init a new playwright repo", "bootstrap a test framework", "create a new QA automation project", "scaffold
  playwright framework".
---

# Init Playwright Framework

Scaffolds a new repo from the bundled [`template/`](template/) tree — the reusable parts of playwright-poc's
structure: tooling/config, the 5-layer architecture skeleton (element/control, container/page, service,
composition-root fixtures, `BrowserInstance` driver holder), and its full `.claude/` knowledge base (23 skills,
6 commands, 6 rules, 3 agents) that teaches how to add the first real page object, service, and test correctly.

**What's deliberately NOT included:** a concrete example feature. The source repo's one worked example
("sign-in": a page object, containers, an API service, tests) was left out on purpose — every new project's
first real screen differs, and it would just need deleting. Login/role-switching helpers
(`Commands`/`ApiCommands`/`role-fixtures.ts`) were dropped for the same reason — they existed only to support
that example. `.claude/skills/use-auth-state.md` is the bundled recipe for wiring real auth once the target
app's actual sign-in flow exists.

## Steps

1. **Get the basics.** If not already provided, ask the user for:
   - Project name (kebab-case) — used for `package.json`'s `name` field and a couple of doc titles.
   - Target directory — must be new or empty. Confirm before writing into an existing non-empty directory.

2. **Copy the scaffold.** Copy the entire [`template/`](template/) tree — including dotfiles/dotdirs
   (`.claude/`, `.gitignore`, `.env.example`, `.vscode/`, `.nvmrc`, `.npmrc`, `.prettierrc`,
   `.prettierignore`) — into the target directory. On Windows, a plain recursive copy can silently skip
   dotfiles/dotdirs — verify `.claude/`, `.gitignore`, and `.nvmrc` actually landed in the target before
   continuing.

3. **Fill in the project name.** Replace every occurrence of the literal placeholder `__PROJECT_NAME__` in the
   copied files (currently in `package.json`, `README.md`, and `CLAUDE.md`) with the real project name.

4. **Report and hand off.** Tell the user what was created, then list the manual follow-ups:
   - Copy `.env.example` → `.env` (and `.env.<environment>` as needed) and fill in real values.
   - Run `npm install && npx playwright install`.
   - Review [`docs/ci/README.md`](template/docs/ci/README.md) when ready to activate CI — it's inert until
     copied into `.github/workflows/` or `.gitlab-ci.yml`.
   - Use the bundled `/new-page`, `/new-service`, `/new-test` commands (or the matching `.claude/skills/*.md`
     files) to scaffold the first real page object, API service, and test once the target app's screens and
     endpoints are known.

5. **Only with explicit confirmation**, actually run `npm install` and/or `git init` in the new directory —
   don't run them unprompted, and never `git add`/`commit`/`push` without being asked.

## Reference

See [`template/CLAUDE.md`](template/CLAUDE.md) and [`template/docs/README.md`](template/docs/README.md) for the
full architecture/documentation map that ships with every scaffolded repo — they're the best single overview of
what's in `template/` and why.
