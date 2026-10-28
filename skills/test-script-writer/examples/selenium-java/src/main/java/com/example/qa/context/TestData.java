package com.example.qa.context;

import com.example.qa.data.PetFactory;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Test-data factories for the current test — the registration point for factories (like a data fixture). A factory
 * creates data through a service and registers its own cleanup on the {@link TestContext}, so tests never clean up by
 * hand:
 *
 * <pre>{@code
 * public PetFactory pets() {
 *     return get(PetFactory.class, () -> new PetFactory(context.services().pet(), context));
 * }
 * }</pre>
 */
public final class TestData {

    private final TestContext context;
    private final Map<Class<?>, Object> instances = new HashMap<>();

    TestData(TestContext context) {
        this.context = context;
    }

    private <F> F get(Class<F> type, Supplier<F> factory) {
        return type.cast(instances.computeIfAbsent(type, key -> factory.get()));
    }

    // Register data factories below.

    public PetFactory pets() {
        return get(PetFactory.class, () -> new PetFactory(context.services().pet(), context));
    }
}
