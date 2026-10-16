---
description: Compile and run the affected tests before reporting work as done
globs: ['src/**/*.java']
---

# Verify After Changes

```bash
mvn -q test-compile
mvn test -Dtest=<AffectedTest>
mvn test -Dtest=ArchitectureRulesTest
```

`ArchitectureRulesTest` (ArchUnit) enforces the audit's rule IDs on compiled code: no Selenium or RestAssured in
tests, no constructing pages/services/drivers in tests, no `Thread.sleep` outside `ui.wait`, no static `WebDriver`,
no mutable fields in test classes.

Before finishing, run `node scripts/audit-suite.mjs . --fail-on block` (no sleeps, raw locators/HTTP in tests,
shared state, cleanup in test bodies, secrets). After changing services, also run
`node scripts/openapi-tool.mjs coverage specs/<api>.json --services src/main/java/com/example/qa/api/services`.
Do not report work as complete while compilation, the audit, or the affected tests fail.
