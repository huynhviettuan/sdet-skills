# Response schemas

Generated from the OpenAPI spec — never edited by hand:

```bash
node scripts/openapi-tool.mjs schemas specs/<api>.json --out-dir src/test/resources/schemas
```

Layout: `<tag>/<operationId>_<status>_schema.json`, read by `SchemaValidator.assertMatches`.
