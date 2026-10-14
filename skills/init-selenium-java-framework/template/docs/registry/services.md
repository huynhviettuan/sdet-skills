# Service Registry

One row per service. Services are generated 1:1 from the OpenAPI spec in `specs/` — check coverage with
`node scripts/openapi-tool.mjs coverage specs/<api>.json --services src/main/java/com/example/qa/api/services`.

| Service | Class | Accessor | Spec tag | Operations | Models |
| --- | --- | --- | --- | --- | --- |
