package com.example.qa.api;

import java.util.LinkedHashMap;
import java.util.Map;

/** The variable parts of one call: path parameters, query, extra headers, and body. */
public final class ApiRequest {

    final Map<String, Object> pathParams = new LinkedHashMap<>();
    final Map<String, Object> query = new LinkedHashMap<>();
    final Map<String, String> headers = new LinkedHashMap<>();
    Object body;

    private ApiRequest() {
    }

    public static ApiRequest with() {
        return new ApiRequest();
    }

    /** Fills {@code {name}} in the spec path template. */
    public ApiRequest pathParam(String name, Object value) {
        pathParams.put(name, value);
        return this;
    }

    /** Adds every non-null field of a query object (a generated {@code <OperationId>Query}). */
    public ApiRequest query(Object queryObject) {
        if (queryObject != null) {
            query.putAll(JsonMapper.toMap(queryObject));
        }
        return this;
    }

    public ApiRequest query(String name, Object value) {
        if (value != null) {
            query.put(name, value);
        }
        return this;
    }

    public ApiRequest header(String name, String value) {
        if (value != null) {
            headers.put(name, value);
        }
        return this;
    }

    /** JSON body, serialized by {@link JsonMapper}. */
    public ApiRequest body(Object body) {
        this.body = body;
        return this;
    }
}
