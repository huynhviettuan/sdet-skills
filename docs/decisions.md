# Decisions

Calls made about this repo that are not visible in the code. Append; never edit an entry — supersede it with a new
one. Format: date, decision, why, what it rules out.

| # | Date | Decision | Why | Rules out |
|---|---|---|---|---|
| D-01 | 2026-10-28 | Three supported stacks (Playwright/TS, Selenium+RestAssured/Java, pytest+Playwright/Python); C#, Cypress, WebdriverIO, Appium are *planned* | The stack contract makes adding one mechanical; three prove the composition design | Adding a stack without meeting every line of the contract |
| D-02 | 2026-10-28 | Composition over inheritance at every layer, enforced (`R-INHERIT` in audit, ESLint, ArchUnit) | Deep page/service hierarchies were the main rot in the pilots | Any `extends` beyond the thin bases; anonymous classes are exempt (`TypeReference<>() {}`) |
| D-03 | 2026-10-28 | A knowledge base raises `KQ-` questions; the sources' own `OQ-` IDs are reused verbatim when they already ask it | Two `OQ-012`s meaning different things are worse than none | Inventing an OQ for a question a source already numbers |
| D-04 | 2026-10-28 | Conflicts in a KB's analysis are graded High/Medium/Low; `check_cases.py --kb` refuses `Basis: specified` only for High and Medium | Low is wording/cosmetic by definition; blocking on it would make every case an assumption | Treating a Low conflict as a blocker |
| D-05 | 2026-10-28 | `can-fail.mjs` mutates literals only (strings, numbers), skips assertion messages, flags polling helpers | A mutated expression often fails to compile, and a compile error would count as a false "killed" | Operator or expression mutation (candidate: swap `toBe`/`not.toBe`, which always compiles) |
| D-06 | 2026-10-28 | Heuristic checks (vague, status-only, personal data) are advisory until measured on a held-out set; the status-only rule is judged per case, not per line | Per line it flagged 10 % of a real catalogue, mostly falsely | Failing a run on a lexical hint |
| D-07 | 2026-10-28 | The two `document-package.md` references (product docs vs automation docs) stay separate | Different audiences, folder trees and quality questions; merging saves lines and costs clarity | A single "documentation package" reference |
| D-08 | 2026-10-28 | Evals run on demand (manual workflow, local command), never on push | A real model per run costs money and needs credentials; self-tests cover what can be deterministic | Blocking CI on an eval score |
| D-09 | 2026-10-28 | Example suites run nightly against the public demo apps, not on every push | They take 6 minutes per stack and depend on third-party hosts | Making the README's "verified" claim without the nightly job |
| D-10 | 2026-10-28 | `OQ-13` (a Gym CRM business question) stays human-only; the pipeline never answers a clarification | The user's call during the pilot; an answer becomes a trusted source and must come from its owner | Any skill answering a product owner's question |
| D-11 | 2026-10-28 | The Manual QA Agent repo's docs are fixed when our sync finds them wrong, but committed by the user | It is a separate repo with its own history; we edit what we verified against code | Pushing or committing there from this repo's sessions unasked |
| D-12 | 2026-11-01 | A denied tool call stops the step; a subagent that routed around a refusal produced a defective run even when its output was correct | Happened once (analysis page copied through the shell); the output was re-verified by hand | Treating a workaround as acceptable because the result checked out |
