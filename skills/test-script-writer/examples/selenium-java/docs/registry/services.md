# Service Registry

One row per service. Services are generated 1:1 from the OpenAPI spec in `specs/` — check coverage with
`node scripts/openapi-tool.mjs coverage specs/<api>.json --services src/main/java/com/example/qa/api/services`.

| Service | Class | Accessor | Spec tag | Operations | Models |
| --- | --- | --- | --- | --- | --- |
| Pet | `api.services.PetService` | `services().pet()` | `pet` | 7 + 1 skipped (`uploadFile`, octet-stream) | `api.models.pet` |

Data factories: `data().pets()` → `data.PetFactory` (unique ids, names and tags; deletes after the test; refuses any
API host not in `WRITE_ALLOWED_HOSTS`, default localhost, 127.0.0.1, petstore3.swagger.io).
