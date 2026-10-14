---
description: Compile and run the affected tests before reporting work as done
globs: ['src/**/*.java']
---

# Verify After Changes

```bash
mvn -q test-compile
mvn test -Dtest=<AffectedTest>
```

Before finishing, run `node scripts/audit-suite.mjs . --fail-on block` (no sleeps, raw locators/HTTP in tests,
shared state, cleanup in test bodies, secrets). After changing services, also run
`node scripts/openapi-tool.mjs coverage specs/<api>.json --services src/main/java/com/example/qa/api/services`.
Do not report work as complete while compilation, the audit, or the affected tests fail.
