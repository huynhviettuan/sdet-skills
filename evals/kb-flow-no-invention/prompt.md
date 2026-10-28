---
description: project-knowledge-base writes a flow page that cites lines, marks the missing step and shows the conflict
tags: [project-knowledge-base, behaviour]
runs: 2
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
expected_outcome: >
  A flow page for the freeze flow citing [S01 Lnn]/[S02 Lnn]; the missing "what if the manager rejects" path marked
  Not stated (not invented); the 7 vs 14 days minimum shown with both sources and no silent pick; inferred edges
  dashed in the diagram.
---
These are two extracted sources from a gym CRM's documents, with their line numbers. Write the knowledge-base flow
page for "Freeze a contract" (steps with citations, a Mermaid diagram, rules on the way, alternative and error
paths). Answer in the chat; don't ask me anything first.

S01 — 05_BUSINESS_RULES.md
```
L1  # Business rules
L2
L3  ## Freezing
L4  - BR-410: A receptionist requests a freeze on an active contract.
L5  - BR-411: A freeze lasts at least 7 days and at most 60 days.
L6  - BR-412: A freeze longer than 10 days needs a Fitness Manager's approval.
L7  - BR-413: While frozen, the contract cannot be booked and does not expire.
L8  - BR-414: When the freeze ends, the end date moves by the frozen days.
```

S02 — meeting-notes-2026-09-02.md
```
L1  # Meeting notes 2026-09-02
L2  - Freezes: minimum is 14 days from now on.
L3  - Approval for long freezes stays with the Fitness Manager.
```
