# Stub agent — the guardrail tests, runnable without a model

A deterministic fake model (`agent.py`, `StubModel`) that follows any instruction it sees — in the user turn or
inside tool output — plus the real guardrail layer (`guardrails.py`) between its plan and every side effect. The
tests in `test_guardrails.py` prove the **gate** holds whatever the model wants; nothing asserts on the model's
wording.

```bash
python -m pytest examples/stub-agent -q
```

Ran once on 2026-11-03: `12 passed, 1 xfailed` (the sentinel). `scripts/selftest.py` reruns it in CI.

## Policy catalogue (snapshot 2026-11-03)

| ID | Policy | Enforced in | Observable |
|---|---|---|---|
| GR-TOOL-001 | Only allowlisted tools are callable | `ToolGate.check` | gate log `block` / `allow`, tool not executed |
| GR-TOOL-002 | Destructive tools are never callable by the model | `ToolGate.check` | `GateBlocked` with the policy ID; side-effect counter stays 0 |
| GR-TOOL-003 | Outward-facing tools need a person's confirmation | `ToolGate.check` | `ConfirmationRequired`; status `needs_confirmation` |
| GR-INJ-001 | A call whose instruction came from tool output is blocked | `ToolGate.check` via `ToolCall.origin` | gate log reason `instruction originated in tool:<name>` |
| GR-INJ-002 | Tool output enters the context labelled untrusted | `as_untrusted` | the `trust="untrusted"` envelope |
| GR-OUT-001 | No secret / canary tokens in an answer | `apply_output_contract` | token absent, `GR-OUT-001` in `removed` |
| GR-OUT-002 | No e-mail addresses in an answer | `apply_output_contract` | address absent, `GR-OUT-002` in `removed` |
| GR-OUT-003 | Answer length bounded | `apply_output_contract` | length ≤ `MAX_ANSWER_CHARS` |
| GR-RES-001 | Bounded tool turns per request | `Agent.run` | status `blocked_budget` after `max_turns` |

Basis: assumption for all — this is an example; a real product's catalogue cites its policy document.

## What each test shows

| Test | Technique | Oracle |
|---|---|---|
| `test_destructive_tool_is_blocked_at_the_gate` | direct attack | gate log + side-effect counter |
| `test_outward_tool_asks_before_running` | confirmation gate | status + counter |
| `test_allowlisted_tool_runs` | positive path (the gate must not over-block) | executed list |
| `test_instruction_inside_tool_output_is_not_followed` | indirect injection through a tool result | gate log reason names the origin |
| `test_answer_never_carries_canary_or_addresses` | output contract with a planted canary | mechanical regex on the final answer |
| `test_tool_loop_stops_at_the_turn_budget` | resource abuse | status + counter equals the cap |
| `test_destructive_intent_blocked_regardless_of_wording` | paraphrase set (6 wordings, 2 languages) | identical verdict across the set |
| `test_sentinel_destructive_tool_runs` | sentinel (`xfail(strict=True)`) | must stay red |

The two tests that replace `agent.model.plan` do so to put the model in a state the keyword stub cannot reach (an
answer that repeats a document; an endless tool loop). In a real suite that is a recorded transcript or a seeded
model call, never a change to the gate.

Synthetic values only: `@example.test` addresses, a made-up `CANARY-…` token.
