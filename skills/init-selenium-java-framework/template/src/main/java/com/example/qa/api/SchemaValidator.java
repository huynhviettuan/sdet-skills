package com.example.qa.api;

import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Validates response bodies against JSON Schemas extracted from the OpenAPI spec (draft-07), stored under
 * {@code src/test/resources/schemas/<folder>/<name>_schema.json} by {@code openapi-tool.mjs schemas}.
 */
public final class SchemaValidator {

    private static final JsonSchemaFactory FACTORY = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
    private static final Map<String, JsonSchema> CACHE = new ConcurrentHashMap<>();

    private SchemaValidator() {
    }

    /** e.g. {@code assertMatches(response, "pet", "findPetsByStatus_200")}. */
    public static void assertMatches(ApiResponse<?> response, String folder, String name) {
        Set<ValidationMessage> errors = schema(folder, name).validate(JsonMapper.tree(response.bodyText()));
        if (!errors.isEmpty()) {
            throw new AssertionError("Response does not match schema " + folder + "/" + name + ":\n  "
                    + errors.stream().map(ValidationMessage::getMessage).collect(Collectors.joining("\n  "))
                    + "\nBody: " + response.bodyText());
        }
    }

    private static JsonSchema schema(String folder, String name) {
        String resource = "/schemas/" + folder + "/" + name + "_schema.json";
        return CACHE.computeIfAbsent(resource, path -> {
            try (InputStream in = SchemaValidator.class.getResourceAsStream(path)) {
                if (in == null) {
                    throw new IllegalStateException("Schema not found on classpath: " + path
                            + " (generate it with openapi-tool.mjs schemas --out-dir src/test/resources/schemas)");
                }
                return FACTORY.getSchema(in);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        });
    }
}
