# Pilot of the team runner — TodoMVC + Petstore (2026-11-02)

The real `automation-status.json` of the first run of the pipeline as a team (`sdet-automation-coordinator` with
one subagent per stage), on a fresh `init-playwright-framework` scaffold: 5 TodoMVC UI cases and 5 Petstore API
cases, three gates with a person, two build agents and two implement agents in parallel over disjoint paths,
verify and an independent reviewer in parallel.

| File | What it is |
|---|---|
| `automation-status.json` | the status file as the coordinator left it after Gate C — every stage, agent, model, stop and gate decision; the schema is `../../schemas/automation-status.schema.json` |
| `automation-status.md` | rendered from the JSON with `status.mjs render` (never edited by hand) |
| `stage-brief.build-service.json` | the brief the coordinator sent to the `sdet-build-service` agent (the shape in `references/stages.md` § Stage brief) |
| `stage-report.build-service.json` | that agent's report back — including the brief error it caught (a flag that did not exist) |

```bash
node skills/automation-pipeline/scripts/status.mjs validate skills/automation-pipeline/examples/pilot-todo-petstore/automation-status.json
node skills/automation-pipeline/scripts/status.mjs summary  skills/automation-pipeline/examples/pilot-todo-petstore/automation-status.json
```

Ran on 2026-11-03: `valid` — `stage done | automated 10 | in progress 0 | blocked 0 | routed 0 | manual 0 | gates
A:passed B:passed C:passed | stops 5 | next: -`. CI's `Skill examples` job validates this file against the shipped schema
on every push (`scripts/check-examples.sh`), so a schema change that breaks a real status file fails there.

## What to read it for

- **Stops are data.** Five `stops` entries: the implement agent refusing to loosen a red test caused by other
  users' data on the shared Petstore (became decision D-18), the reviewer seeing a `can-fail` mutant in the shared
  tree (D-19), two coordinator brief errors caught by agents, one missing precondition check. None was "fixed" by
  editing an expectation.
- **Models per stage** are recorded (`agents[].model`), so a later run that changes a model is a comparable run,
  not an anecdote.
- **Gates carry the person's answer verbatim** (`gates[].decision`), including "Validate our own pet" for the
  TC-PET-003 restatement.

The suite itself (`tests/`, `src/pages/todo`, `src/services/pet.service.ts`) is not repeated here; the page objects
are in `page-builder/examples/playwright-ts/` and the service in `service-builder/examples/playwright-ts/`. The run
numbers (42 passed x3 on 4 workers, sentinel held, can-fail 20 killed / 0 survived) are "ran once on 2026-11-02";
the nightly `Nightly examples` job repeats the sample cases on the three scaffolds, not this pilot repo.
