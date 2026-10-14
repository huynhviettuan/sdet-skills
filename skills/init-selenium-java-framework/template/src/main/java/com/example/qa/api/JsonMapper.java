package com.example.qa.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

/**
 * The one JSON mapper for requests and responses. Unknown response fields don't fail deserialization (the response
 * JSON Schema checks the contract); null fields are not sent, so optional model fields left unset stay out of bodies.
 */
public final class JsonMapper {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .setSerializationInclusion(JsonInclude.Include.NON_NULL);

    private JsonMapper() {
    }

    public static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot serialize " + value.getClass().getSimpleName(), e);
        }
    }

    public static <T> T read(String json, Class<T> type) {
        try {
            return MAPPER.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Response is not a valid " + type.getSimpleName() + ": " + json, e);
        }
    }

    public static <T> T read(String json, TypeReference<T> type) {
        try {
            return MAPPER.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Response is not a valid " + type.getType() + ": " + json, e);
        }
    }

    public static JsonNode tree(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Response is not JSON: " + json, e);
        }
    }

    /** A query/params object as a flat map (enums via {@code @JsonValue}, nulls dropped). */
    public static Map<String, Object> toMap(Object value) {
        return MAPPER.convertValue(value, new TypeReference<>() {
        });
    }
}
