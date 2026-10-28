---
description: a plain unit-test request must not trigger test-case-design
tags: [test-case-design, no-trigger]
runs: 2
max_turns: 4
allowed_tools: [Read, Glob, Grep, Skill]
---
Can you write Jest unit tests for this function? It strips spaces and converts a leading +84 to 0.

```ts
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\s+/g, '');
  return digits.startsWith('+84') ? '0' + digits.slice(3) : digits;
}
```
