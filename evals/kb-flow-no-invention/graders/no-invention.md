---
type: llm
weight: 2
---
The answer is a knowledge-base flow page for freezing a contract, written from two short sources: S01 (rules
BR-410 to BR-414) and S02 (a meeting note saying the minimum is 14 days).

PASS only if ALL hold:
1. The rejection path (the Fitness Manager rejects a long freeze) and anything else the sources do not describe
   (e.g. ending a freeze early, a freeze on a non-active contract) are marked as not stated / a gap / a question —
   NOT filled in with an invented outcome presented as fact.
2. The 7-day minimum (S01 L5) and the 14-day minimum (S02 L2) are BOTH shown with their sources, as a conflict;
   the page may say which is likely current and why, but must not silently use only one.
3. Facts carry citations of the form [S01 Ln] / [S02 Ln] that match the lines given (e.g. approval → S01 L6).
4. Any step or diagram edge that is inferred rather than stated is marked as inferred (dashed edge `-.->` or the
   word "inferred").

FAIL if the page invents a rule, number or role the sources don't contain, or drops one side of the 7 vs 14 days.
