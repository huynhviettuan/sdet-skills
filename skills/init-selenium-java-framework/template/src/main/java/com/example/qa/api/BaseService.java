package com.example.qa.api;

import com.example.qa.config.Config;
import com.fasterxml.jackson.core.type.TypeReference;
import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.http.Method;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * The request lifecycle every service shares: base URI from API_DOMAIN, auth and default headers, path/query/body,
 * Allure logging, and typed responses. Concrete services only declare operations, passing the spec path verbatim:
 *
 * <pre>{@code
 * public ApiResponse<Pet> getPetById(long petId) {
 *     return send(Method.GET, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId), Pet.class);
 * }
 * }</pre>
 *
 * A child service passes its parent to share the parent's token and headers.
 */
public abstract class BaseService {

    private final BaseService parent;
    private final Map<String, String> headers = new LinkedHashMap<>();
    private String token;

    protected BaseService() {
        this(null);
    }

    protected BaseService(BaseService parent) {
        this.parent = parent;
    }

    /** Bearer token sent as {@code Authorization: Bearer <token>}; shared with child services. */
    public void setToken(String token) {
        if (parent != null) {
            parent.setToken(token);
        } else {
            this.token = token;
        }
    }

    /** Header sent on every call (e.g. an API key); shared with child services. */
    public void setHeader(String name, String value) {
        if (parent != null) {
            parent.setHeader(name, value);
        } else {
            headers.put(name, value);
        }
    }

    protected String token() {
        return parent != null ? parent.token() : token;
    }

    protected Map<String, String> headers() {
        return parent != null ? parent.headers() : headers;
    }

    /** Headers every call of this service needs (e.g. Accept); override when the API requires them. */
    protected Map<String, String> defaultHeaders() {
        return Map.of("Accept", "application/json");
    }

    protected <T> ApiResponse<T> send(Method method, String path, ApiRequest request, Class<T> type) {
        return new ApiResponse<>(execute(method, path, request), text -> JsonMapper.read(text, type));
    }

    protected <T> ApiResponse<T> send(Method method, String path, ApiRequest request, TypeReference<T> type) {
        return new ApiResponse<>(execute(method, path, request), text -> JsonMapper.read(text, type));
    }

    /** For operations without a JSON response body. */
    protected ApiResponse<Void> send(Method method, String path, ApiRequest request) {
        Function<String, Void> ignoreBody = text -> null;
        return new ApiResponse<>(execute(method, path, request), ignoreBody);
    }

    private Response execute(Method method, String path, ApiRequest request) {
        URI domain = URI.create(Config.apiDomain());
        RequestSpecification spec = RestAssured.given()
                .baseUri(domain.getScheme() + "://" + domain.getAuthority())
                .basePath(domain.getPath() == null ? "" : domain.getPath())
                .relaxedHTTPSValidation()
                .filter(new AllureRestAssured())
                .headers(defaultHeaders())
                .headers(headers())
                .headers(request.headers)
                .pathParams(request.pathParams)
                .queryParams(request.query);
        if (token() != null) {
            spec.header("Authorization", "Bearer " + token());
        }
        if (request.body != null) {
            spec.contentType(ContentType.JSON).body(JsonMapper.toJson(request.body));
        }
        return spec.request(method, path);
    }
}
