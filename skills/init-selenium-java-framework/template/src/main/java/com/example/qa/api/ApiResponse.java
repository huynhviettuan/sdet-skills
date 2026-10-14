package com.example.qa.api;

import io.restassured.response.Response;
import java.util.function.Function;

/**
 * Status, typed body, and raw response of one call. Services never assert — tests assert on this. The body is parsed
 * on first access, so a 4xx with an error body doesn't fail when only the status is checked; read error bodies with
 * {@link #bodyAs(Class)}.
 */
public final class ApiResponse<T> {

    private final Response raw;
    private final Function<String, T> reader;
    private T body;
    private boolean parsed;

    ApiResponse(Response raw, Function<String, T> reader) {
        this.raw = raw;
        this.reader = reader;
    }

    public int statusCode() {
        return raw.statusCode();
    }

    /** Body as the operation's declared 2xx type, or null when the response has no body. */
    public T body() {
        if (!parsed) {
            String text = raw.asString();
            body = text == null || text.isBlank() ? null : reader.apply(text);
            parsed = true;
        }
        return body;
    }

    /** Body as another type, e.g. an error model on a 4xx. */
    public <E> E bodyAs(Class<E> type) {
        return JsonMapper.read(raw.asString(), type);
    }

    public String bodyText() {
        return raw.asString();
    }

    public String header(String name) {
        return raw.header(name);
    }

    public Response raw() {
        return raw;
    }
}
