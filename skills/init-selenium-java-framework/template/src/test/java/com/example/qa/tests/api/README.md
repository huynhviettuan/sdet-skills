# API tests

API test classes extend `BaseTest`. Use `services().<tag>()`, assert on `ApiResponse` with AssertJ, and validate
contracts with `SchemaValidator.assertMatches(response, "<tag>", "<operationId>_<status>")`.
