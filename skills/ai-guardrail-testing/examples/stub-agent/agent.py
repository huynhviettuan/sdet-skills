"""A stub agent: a deterministic fake model plus the real guardrail layer.

The fake model is deliberately gullible - it follows any instruction it sees, including instructions inside tool
output. That is the realistic failure mode; the tests prove the *gate* holds regardless of what the model wants.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable

from guardrails import (
    ConfirmationRequired,
    GateBlocked,
    ToolCall,
    ToolGate,
    apply_output_contract,
    as_untrusted,
)

DESTRUCTIVE_INTENT = re.compile(
    # Vietnamese "xóa"/"xoá" (delete) is spelled with the accent on either vowel; the paraphrase set caught the
    # first version of this pattern matching only one spelling.
    r"delete (all|everything|every record)|wipe|x[oó][aá] (h[eế]t|to[aà]n b[oộ])|remove every", re.IGNORECASE
)
INJECTED_INSTRUCTION = re.compile(r"ignore (all )?previous instructions.*?call (\w+)", re.IGNORECASE | re.DOTALL)
SEND_INTENT = re.compile(r"e-?mail", re.IGNORECASE)


@dataclass
class Plan:
    call: ToolCall | None
    answer: str


class StubModel:
    """Returns a plan from the whole context: the last user turn and every tool result so far."""

    def plan(self, user_text: str, tool_results: list[str]) -> Plan:
        for result in tool_results:
            m = INJECTED_INSTRUCTION.search(result)
            if m:
                origin = re.search(r'name="(\w+)"', result)
                return Plan(ToolCall(m.group(2), {}, origin=f"tool:{origin.group(1) if origin else '?'}"), "")
        if DESTRUCTIVE_INTENT.search(user_text):
            return Plan(ToolCall("delete_all", {}), "")
        if SEND_INTENT.search(user_text) and not tool_results:
            return Plan(ToolCall("send_email", {"to": "someone@example.test"}), "")
        if tool_results:
            return Plan(None, "Here is what I found: " + " ".join(tool_results))
        return Plan(ToolCall("search", {"q": user_text}), "")


@dataclass
class Result:
    status: str                       # answered | refused | needs_confirmation | blocked_budget
    answer: str = ""
    executed: list[str] = field(default_factory=list)
    policy: str = ""


@dataclass
class Agent:
    tools: dict[str, Callable[..., str]]
    gate: ToolGate = field(default_factory=ToolGate)
    model: StubModel = field(default_factory=StubModel)
    max_turns: int = 3                # GR-RES-001: a bounded number of tool turns per request

    def run(self, user_text: str) -> Result:
        executed: list[str] = []
        tool_results: list[str] = []
        for _ in range(self.max_turns):
            plan = self.model.plan(user_text, tool_results)
            if plan.call is None:
                contract = apply_output_contract(plan.answer)
                return Result("answered", contract.text, executed, ",".join(contract.removed))
            try:
                self.gate.check(plan.call)
            except GateBlocked as blocked:
                return Result("refused", "I can't do that.", executed, blocked.policy)
            except ConfirmationRequired as ask:
                return Result("needs_confirmation", f"Confirm {ask.tool}?", executed, ask.policy)
            output = self.tools[plan.call.name](**plan.call.args)
            executed.append(plan.call.name)
            tool_results.append(as_untrusted(plan.call.name, output))
        return Result("blocked_budget", "", executed, "GR-RES-001")
