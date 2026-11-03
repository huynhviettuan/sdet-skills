"""The guardrail layer: application code that sits between the model's plan and any side effect.

Everything a test needs to observe is here and deterministic: which tool calls were blocked, asked about or
allowed and under which policy; what the output contract removed. The model never touches a tool directly.

Policy IDs (GR-...) are the catalogue the tests trace to; see the README.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

CANARY = re.compile(r"CANARY-[A-Z0-9]{8}")          # a planted secret token; must never reach the user
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")       # synthetic addresses only in tests
MAX_ANSWER_CHARS = 2000


class GateBlocked(Exception):
    """The gate refused a tool call. Carries the policy ID so the test can cite it."""

    def __init__(self, tool: str, policy: str, reason: str) -> None:
        super().__init__(f"{policy}: {tool} blocked - {reason}")
        self.tool, self.policy, self.reason = tool, policy, reason


class ConfirmationRequired(Exception):
    """The gate wants a person to confirm before the call runs."""

    def __init__(self, tool: str, policy: str) -> None:
        super().__init__(f"{policy}: {tool} needs confirmation")
        self.tool, self.policy = tool, policy


@dataclass(frozen=True)
class ToolCall:
    name: str
    args: dict[str, str]
    # Where the instruction to make this call came from, as the agent tracked it: "user" or "tool:<name>".
    origin: str = "user"


@dataclass
class GateDecision:
    tool: str
    verdict: str          # allow | ask | block
    policy: str
    reason: str = ""


@dataclass
class ToolGate:
    """GR-TOOL-001: only allowlisted tools; GR-TOOL-002: destructive tools are never callable by the model;
    GR-TOOL-003: outward-facing tools need confirmation; GR-INJ-001: a call whose instruction came from tool output
    is blocked whatever the tool."""

    allowed: frozenset[str] = frozenset({"search", "send_email"})
    forbidden: frozenset[str] = frozenset({"delete_all"})
    confirm: frozenset[str] = frozenset({"send_email"})
    log: list[GateDecision] = field(default_factory=list)

    def check(self, call: ToolCall) -> None:
        if call.origin != "user":
            self._block(call, "GR-INJ-001", f"instruction originated in {call.origin}")
        if call.name in self.forbidden:
            self._block(call, "GR-TOOL-002", "destructive tool")
        if call.name not in self.allowed:
            self._block(call, "GR-TOOL-001", "not on the allowlist")
        if call.name in self.confirm:
            self.log.append(GateDecision(call.name, "ask", "GR-TOOL-003"))
            raise ConfirmationRequired(call.name, "GR-TOOL-003")
        self.log.append(GateDecision(call.name, "allow", "GR-TOOL-001"))

    def _block(self, call: ToolCall, policy: str, reason: str) -> None:
        self.log.append(GateDecision(call.name, "block", policy, reason))
        raise GateBlocked(call.name, policy, reason)


@dataclass
class ContractResult:
    text: str
    removed: list[str]    # policy IDs that fired


def apply_output_contract(text: str) -> ContractResult:
    """GR-OUT-001: no canary/secret tokens; GR-OUT-002: no e-mail addresses; GR-OUT-003: bounded length."""
    removed: list[str] = []
    if CANARY.search(text):
        text, removed = CANARY.sub("[redacted]", text), removed + ["GR-OUT-001"]
    if EMAIL.search(text):
        text, removed = EMAIL.sub("[redacted]", text), removed + ["GR-OUT-002"]
    if len(text) > MAX_ANSWER_CHARS:
        text, removed = text[:MAX_ANSWER_CHARS], removed + ["GR-OUT-003"]
    return ContractResult(text, removed)


def as_untrusted(tool: str, content: str) -> str:
    """GR-INJ-002: tool output enters the context labelled as data, never as a turn of its own."""
    return f"<tool_result name=\"{tool}\" trust=\"untrusted\">{content}</tool_result>"
