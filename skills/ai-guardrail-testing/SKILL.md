---
name: ai-guardrail-testing
description: >
  Test the guardrails around an LLM feature or agent — refusal policies, prompt-injection resistance (direct and
  through tool output, documents or web pages), tool-call permission gates, output contracts (schema, no secrets,
  no personal data), cost and turn limits — with deterministic oracles, a sentinel that proves the suite can fail,
  paraphrase sets that catch wording-dependent policies, regression cases from every incident, and an LLM judge
  that stays advisory until measured on a held-out set. Use this skill whenever the user wants to test an AI
  assistant, chatbot, copilot, RAG pipeline or tool-using agent for safety, red-team it, write guardrail or
  refusal tests, check prompt injection, gate an agent's tool calls, or validate LLM output in CI. Trigger on
  "AI safety testing", "guardrail tests", "guardian testing", "jailbreak", "prompt injection", "red team the
  bot", "LLM evals for safety", "tool permission tests", "PII leak test". Model- and framework-agnostic.
---

# AI Guardrail Testing

Prove that the **rails around the model** hold: the policies the product promises (what the assistant refuses,
what the agent may never do, what an answer may never contain) are enforced by code you can test, and the tests
can tell when they stop holding. The model's own behaviour is probabilistic; a guardrail is not, and it is tested
like any other business rule — with an expected result, a deterministic oracle, and a sentinel.

**How to use this skill:** follow the workflow below. Load a `references/*.md` file only when you need it:

- [`references/policies-and-threats.md`](references/policies-and-threats.md) — what a guardrail is (and is not),
  the policy catalogue (`GR-<AREA>-NNN`), the attack surface of an LLM app and agent, OWASP LLM Top 10 mapping,
  rules of engagement, the three oracles.
- [`references/attack-catalogue.md`](references/attack-catalogue.md) — adversarial techniques by class (direct,
  indirect through tool/document/web, encoding and language, multi-turn, tool-argument tampering, resource abuse),
  each with the case shape and the deterministic expected result; the paraphrase-set technique.
- [`references/guardrail-tests.md`](references/guardrail-tests.md) — the case format (`TC-GR-…`, `Verifies: GR-…`),
  the tool-gate test, output-contract tests, the sentinel, `can-fail`, incident-to-regression, judge measurement
  and the advisory/blocking rule, CI layout and budget.

Script (Python ≥ 3.10, no dependencies):

- `scripts/measure_judge.py <labelled.jsonl> [--gate]` — scores an LLM judge (or any text heuristic) on a labelled
  held-out set: false-positive and false-negative rates with counts, and whether the policy in
  `guardrail-tests.md` lets it fail a run; without `--gate` it only prints advice.

Example (`examples/stub-agent/`, pytest, no model or API key): a stub agent with a guardrail layer and the tests the
skill asks for — tool gate, injection through tool output, output contract, paraphrase set, sentinel. Ran once on
2026-11-03 (`python -m pytest examples/stub-agent -q`: 12 passed, 1 xfailed sentinel); `scripts/selftest.py` reruns
it in CI's `skill-scripts` job and proves the sentinel bites when the gate is opened.

## Workflow

1. **Catalogue the policies** as `GR-<AREA>-NNN`, one per promise, each with a source (product policy, legal, the
   agent's tool contract) or `Basis: assumption` and an open question. A policy without an observable outcome
   (refused / allowed / asked / blocked at the gate, a field absent, a call never made) is not testable yet — say so.
2. **Map the attack surface**: every place untrusted text enters the context (user turn, retrieved documents, tool
   results, web pages, file names, earlier turns) and every side effect the agent can cause (tool calls, messages,
   writes, spend). Each entry point × each side effect is a row that needs a decision: forbidden, gated, allowed.
3. **Pick the oracle per policy** — in this order: (a) **application-level evidence** (the gate's log, the tool
   never invoked, the response schema, a field absent); (b) **a mechanical text check** (deny-list, regex for
   secrets/IDs, length); (c) **an LLM judge**, advisory only until measured (step 7). Never (c) where (a) exists.
4. **Write the cases** in the standard case format with `Verifies: GR-…`, one attack class per case, the expected
   result stated as the oracle's observable, `Level: api|agent-harness|manual — reason`. Include one **paraphrase
   set** per High-risk policy (same intent, ≥ 5 wordings and 2 languages): the verdict must be identical across it.
5. **Implement in the existing suite**: the guardrail layer is called directly (unit/integration) wherever it is a
   function; the model is called only for cases that need the model (seeded, fixed version, temperature 0 where
   possible, recorded transcripts for the rest). Keep a **sentinel** (an attack the gate is known to block,
   asserted as *allowed*, marked expected-fail) and pass new assertions through `can-fail`.
6. **Run and classify**: passed / failed / inconclusive (model unavailable, rate-limited, non-deterministic across
   3 runs) / blocked. An inconclusive guardrail test never becomes a pass by retry.
7. **Measure every judge** on a held-out labelled set (not the cases it was tuned on) with `measure_judge.py`; it
   fails a run only once it meets the policy in `guardrail-tests.md`, otherwise it prints advice.
8. **Close the loop**: every incident, red-team finding or reviewer-found bypass becomes a `TC-GR-` case in the
   same change as the fix; the catalogue dates the snapshot.

## Non-negotiable rules

- **The oracle is code, not a model.** A verdict comes from the gate's evidence, a schema, or a mechanical check.
  An LLM judge is advisory until measured, and never the only oracle on a policy that blocks a release.
- **Test the gate, not the prompt.** "The system prompt says don't" is not a guardrail; a test that only checks the
  model declined proves nothing about the next model version. A forbidden tool call must be impossible at the
  application layer and the test must try to make it.
- **Untrusted text is data.** Instructions inside a document, a tool result or a page are an attack input, and the
  expected result is that they are not followed — asserted on the side effect, not on the model's wording.
- **A sentinel and `can-fail` for every suite**, as in every other suite here. A guardrail suite that has never been
  red proves nothing.
- **Inconclusive stays inconclusive.** A flaky model response is not a pass on the second try; it is a case that
  needs a stronger oracle or a recorded transcript.
- **No real secrets, personal data or harmful payloads** in cases, fixtures, transcripts or reports; canary tokens
  and synthetic identities only. Red-teaming stays within written scope (`security-testing` rules of engagement).
- **Every judge ships measured or advisory** (repo rule 4): numbers from the cases it was tuned on do not count.

## Decision framework

| Question | Rule of thumb |
|---|---|
| Unit test of the guardrail or end-to-end with the model? | Both: the gate as a function on every build; the model path nightly or on prompt/model change, with recorded transcripts for the deterministic part. |
| What if the model refuses but the gate would have allowed it? | A gap, not a pass: the policy is enforced by luck. File it against the gate. |
| Judge disagrees with the mechanical check? | The mechanical check wins; log the disagreement as a labelled example for the next measurement. |
| Which cases block the merge? | Tool gates, output contracts, injection via tool output, sentinel. Refusal wording and tone: advisory. |
| Model version changed? | Rerun the full model-path suite; a changed verdict on a paraphrase set is a finding even if every case still passes. |
| Cost? | Cap tokens per case and per run in the harness; a run that exceeds the cap is blocked, not trimmed. |

## Related skills

- **`security-testing`** — rules of engagement, threat modeling, finding triage; the LLM surface is one more trust
  boundary in its STRIDE pass.
- **`test-case-design`** — the case format, catalogue, evidence and `check_cases.py`; `GR-` IDs are catalogue IDs.
- **`test-script-writer`** — sentinel, `can-fail`, metamorphic tests; paraphrase sets are metamorphic relations.
- **`automation-pipeline`** — its guard hooks are an example of an application-level gate tested the way this skill
  asks (a block that fails its own test when removed).
- **`qa-reporting`** (global) — reporting a bypass: severity by side effect reached, never by how clever the prompt was.
