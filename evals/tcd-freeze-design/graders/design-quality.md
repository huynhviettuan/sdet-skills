---
type: llm
weight: 2
---
You are grading a set of test cases designed from six requirements about freezing a gym contract (7–60 days, at most
2 freezes, end date moves, approval above 10 days, only Admin and Fitness Manager may end a freeze early, and a
reminder "after a reasonable time").

PASS only if ALL of the following hold:
1. There is a case (or decision-table column) for a freeze of 10 days or fewer that needs NO approval — the plain
   path — in addition to the approval path.
2. There is a negative permission case where a role other than Admin or Fitness Manager (for example Receptionist or
   PT) tries to end a freeze early and is refused, and the case says the refusal must also hold at the API or by
   direct URL, not only through a hidden button.
3. Expected results are concrete (an exact state, date shift, message or status) and at least most of them quote or
   closely paraphrase the requirement text they come from, naming the BR/AC ID.
4. The "reasonable time" clause (AC-FRZ-01) is NOT tested with an invented number of days; it is raised as a question
   for the owner (an open question / OQ) and, if a case exists for it, that case is marked as an assumption.
5. The boundary values of the 7–60 range include both an in-range edge (7 and 60) and an out-of-range neighbour
   (6 and 61), and the second freeze is allowed while a third is refused.

FAIL if any item is missing, if an expected result reads "works correctly" / "shows an error" without the exact
value, or if the answer invents a business rule the six requirements do not state (for example a maximum total of
frozen days).
