---
description: Wait on real signals; never sleep or use implicit waits
globs: ['src/**/*.java']
---

# No Sleeps

- Never `Thread.sleep(...)` and never set an implicit wait. `DriverFactory` sets the implicit wait to zero.
- Actions already wait inside the element classes (`click`, `fill`, `check`).
- Assert UI state with `Eventually.verify(() -> assertThat(...))`, which passes as soon as the state is right.
- Wait for a specific condition with `Waits.until(() -> ..., "what you wait for")`.

The only sleep in the codebase is the poll interval inside `Eventually`.
