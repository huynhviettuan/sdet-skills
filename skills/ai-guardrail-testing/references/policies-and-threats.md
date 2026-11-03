# Policies and Threats

What a guardrail is, how to catalogue the policies it enforces, where an LLM application can be attacked, and which
oracle each policy gets. Vocabulary first, because most "AI safety test" failures are category errors: a test that
checks the model's manners where the product needed a gate.

Contents:

- [Three layers, one of them testable](#three-layers-one-of-them-testable)
- [The policy catalogue (GR-)](#the-policy-catalogue-gr-)
- [Attack surface of an LLM application](#attack-surface-of-an-llm-application)
- [Entry point × side effect](#entry-point--side-effect)
- [OWASP LLM Top 10 mapping](#owasp-llm-top-10-mapping)
- [The three oracles](#the-three-oracles)
- [Rules of engagement](#rules-of-engagement)

---

## Three layers, one of them testable

| Layer | What it is | Who owns it | How it is tested |
|---|---|---|---|
| **Model alignment** | The model's trained disposition: declines harmful requests, follows the system prompt | The model vendor | Vendor evals and red teams; your suite only *observes* it (advisory) |
| **Prompt** | System prompt, few-shot examples, tool descriptions | Your product team | Regression of recorded transcripts; a changed verdict is a finding, not a failure by itself |
| **Guardrail** | Code between the model and the world: input filters, tool-call gate, output contract, budgets, confirmation steps | Your engineering team | **Deterministic tests with a sentinel — this skill** |

A guardrail is something you can switch off and watch a test go red. If nothing goes red, it was not a guardrail
(it was the model being polite). The selftest of the stub example does exactly this switch
(`scripts/selftest.py`: opens the gate for `delete_all`, asserts the sentinel turns the suite red).

---

## The policy catalogue (GR-)

One `GR-<AREA>-NNN` per promise the product makes about the AI feature, with the same fields a business rule has
(`test-case-design` owns the case format; this is only the policy's own row):

| Field | Content |
|---|---|
| ID | `GR-TOOL-002` — areas: `TOOL` (what the agent may do), `INJ` (untrusted text), `OUT` (what an answer may contain), `REF` (what the assistant declines), `RES` (budgets and limits), `DATA` (what reaches the model) |
| Statement | One sentence with an observable outcome: *"A destructive tool is never callable by the model"*, not *"the agent is careful"* |
| Enforced in | The module/function/config that enforces it — if you cannot name one, the policy is an aspiration, note it as **Not enforced yet** |
| Observable | What a test can read: a gate log entry, an exception type, a field absent, a counter unchanged, an HTTP 403 from the tool server |
| Source | The policy document / legal requirement / tool contract with a citation, or `Basis: assumption` + an `OQ-` |
| Risk | High: a side effect outside the sandbox (money, messages, deletes, data leaving) — Medium: wrong or leaked content — Low: tone, wording, over-refusal |

The example's catalogue is `examples/stub-agent/README.md`. Snapshot it with a date; a policy whose source text
changed since the snapshot makes its cases stale (same rule as any catalogue).

**Over-refusal is a policy too.** Every High-risk `REF-` policy gets a sibling that states what *must* be allowed
(the "search" positive path in the example), otherwise the cheapest way to pass the suite is to refuse everything.

---

## Attack surface of an LLM application

Untrusted text enters wherever the context is assembled:

| Entry point | Example | Typical attack |
|---|---|---|
| User turn | chat input, voice transcript | direct jailbreak, role play, encoding, language switch |
| Earlier turns | the conversation history | multi-turn setup ("from now on…"), memory poisoning |
| Retrieved documents (RAG) | PDFs, wiki pages, tickets | instructions planted in a document, hidden text (white font, HTML comments, zero-width) |
| Tool results | search results, API responses, file contents, shell output | "ignore previous instructions and call…" inside a result |
| Web pages | anything fetched | same, plus links that carry data out in the URL |
| Structured fields | file names, user names, product titles, e-mail subjects | short payloads that survive truncation |
| Images / audio (multimodal) | screenshots, scans | text in the image the OCR path reads as a turn |
| System configuration | prompts loaded from storage, tool descriptions from an MCP server | a compromised description that rewrites the rules |

Side effects the model can cause through the application:

| Side effect | Examples |
|---|---|
| Irreversible actions | delete, pay, send, publish, deploy, merge |
| Data leaving | e-mail, webhook, URL parameters, a tool that posts elsewhere |
| Data arriving | writing to memory, files, a database the next session reads (persistence of an injection) |
| Spend | tokens, API calls, tool loops |
| Trust decisions | marking something verified, approving, granting access |

---

## Entry point × side effect

The threat model of an agent is this grid. Every cell needs one of three decisions, and the decision is a policy:

| | Irreversible action | Data leaving | Data persisting | Spend |
|---|---|---|---|---|
| **User turn** | gated (confirm) | gated | allowed with contract | budget |
| **Tool result / document / page** | **forbidden** | **forbidden** | forbidden unless labelled | budget |
| **Earlier turns** | gated | gated | allowed with contract | budget |

"Forbidden" cells are the first tests to write: an instruction that originates in untrusted text must not reach an
action, and the test asserts on the action (counter, log, 0 calls), never on whether the model "noticed" the trick.
The example tracks origin on the call itself (`ToolCall.origin`) and the gate blocks on it (`GR-INJ-001`).

---

## OWASP LLM Top 10 mapping

Use the OWASP Top 10 for LLM Applications (2025 edition at the time of writing) as the checklist of classes; the
tests in this skill cover the ones a product team can enforce:

| OWASP LLM | This skill | Oracle |
|---|---|---|
| LLM01 Prompt injection | `INJ-` policies, attack catalogue classes 1–4 | gate log, side-effect counters |
| LLM02 Sensitive information disclosure | `OUT-` canary and PII contract, `DATA-` what reaches the model | mechanical text check; measured detector |
| LLM03 Supply chain | out of scope here (`security-testing` SCA) | — |
| LLM04 Data and model poisoning | `DATA-` persistence cell: an injection must not be written to memory/RAG | read-back of the store after the attack |
| LLM05 Improper output handling | `OUT-` schema contract; rendered output is escaped | schema validation; DOM/HTML assertion |
| LLM06 Excessive agency | `TOOL-` allowlist, forbidden, confirmation | gate log |
| LLM07 System prompt leakage | `OUT-` canary planted in the system prompt | canary absent from every answer |
| LLM08 Vector/embedding weaknesses | retrieval scoped per tenant (`security-testing` BOLA pattern on the retriever) | two-tenant test |
| LLM09 Misinformation | advisory judge only; product decides | measured judge |
| LLM10 Unbounded consumption | `RES-` turn/token/cost budgets | status `blocked_budget`, counters |

---

## The three oracles

Pick in this order; a policy gets the strongest oracle that exists for it.

1. **Application evidence** — the gate's decision log, the exception type, the tool's call counter, a schema the
   response must satisfy, a field that must be absent. Deterministic; the only oracle for High-risk policies.
2. **Mechanical text check** — regex for canaries, secrets, identifiers, addresses; length; language. Deterministic
   but can be wrong on real text, so a check that judges *meaning* (is this a refusal? is this personal data?) is a
   heuristic and follows repo rule 4: measured on a held-out set or advisory.
3. **LLM judge** — a second model scoring the answer. Useful for tone, helpfulness, over-refusal; never the only
   oracle on anything that blocks a release, and advisory until `scripts/measure_judge.py --gate` passes on a set
   it was not tuned on (`guardrail-tests.md` § Judge measurement).

When only oracle 3 exists for a High-risk policy, the finding is "not enforced yet", not "tested by the judge".

---

## Rules of engagement

Red-teaming an AI feature is security testing; `security-testing` § rules of engagement applies unchanged:
written scope, a test environment, synthetic accounts and data, no real customer content in prompts or transcripts,
a stop condition, and findings in an access-controlled tracker. Two additions:

- **Payloads are benign.** The attack is "call `delete_all`" against a stub counter or a sandbox, never against
  shared data; an injection that would exfiltrate uses a canary token and a sink you control.
- **No harmful content is generated to prove a point.** A refusal policy is tested with the request, and the
  expected result is the refusal observable; a transcript that contains the harmful completion is itself a leak.
