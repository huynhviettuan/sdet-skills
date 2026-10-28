---
description: test-case-design on a story with a range, an approval threshold, a permission and one vague clause
tags: [test-case-design, behaviour]
runs: 2
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
expected_outcome: >
  Cases with boundaries beyond the stated range (6 and 61 days), the decision-table column where no approval is
  needed, a permission case for the role that must be refused, every expected result quoting the requirement, and
  the "reasonable time" clause raised as an open question instead of tested with an invented number.
---
Here is the approved story for contract freezing (FF-412). Design the test cases for it, with the techniques you used
and traceability to the requirement IDs. Answer in the chat; don't ask me questions first.

- BR-FRZ-001: A receptionist can freeze an active contract for 7 to 60 days.
- BR-FRZ-002: A contract can be frozen at most 2 times.
- BR-FRZ-003: The contract end date moves by the number of frozen days.
- BR-FRZ-004: A freeze longer than 10 days must be approved by a Fitness Manager before it takes effect.
- BR-FRZ-005: Only Admin and Fitness Manager may end a freeze early.
- AC-FRZ-01: After a reasonable time, a reminder about the freeze is sent to the managers.
