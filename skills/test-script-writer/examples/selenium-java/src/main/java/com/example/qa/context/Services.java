package com.example.qa.context;

import com.example.qa.api.services.PetService;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Supplier;

/**
 * API services for the current test — the registration point for services (like {@code service-fixtures.ts}). Each
 * accessor creates the service once per test with its credentials applied; credentials themselves are resolved once
 * per run (see {@code Credentials}):
 *
 * <pre>{@code
 * public PetService pet() {
 *     return get(PetService.class, () -> {
 *         PetService service = new PetService();
 *         service.setHeader("api_key", Credentials.apiKey());
 *         return service;
 *     });
 * }
 * }</pre>
 */
public final class Services {

    private final Map<Class<?>, Object> instances = new HashMap<>();

    Services() {
    }

    private <S> S get(Class<S> type, Supplier<S> factory) {
        return type.cast(instances.computeIfAbsent(type, key -> factory.get()));
    }

    // Register services below.

    /** The public Petstore declares petstore_auth / api_key but enforces neither, so no credentials are applied. */
    public PetService pet() {
        return get(PetService.class, PetService::new);
    }
}
