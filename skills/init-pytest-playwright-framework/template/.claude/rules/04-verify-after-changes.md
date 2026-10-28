# Verify After Changes

```bash
uv run ruff check . && uv run ruff format --check . && uv run mypy
uv run pytest <changed tests> -q
node scripts/audit-suite.mjs . --fail-on block
```

Do not report work as complete while lint, types, the audit or the affected tests fail.
