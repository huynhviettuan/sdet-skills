package com.example.qa.context;

import com.example.qa.pages.todo.TodoPage;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Page objects for the current test — the registration point for pages (like {@code page-fixtures.ts}). Add one
 * accessor per page; tests call {@code pages().todo()} and never construct page objects themselves:
 *
 * <pre>{@code
 * public TodoPage todo() {
 *     return get(TodoPage.class, TodoPage::new);
 * }
 * }</pre>
 */
public final class Pages {

    private final Map<Class<?>, Object> instances = new HashMap<>();

    Pages() {
    }

    private <P> P get(Class<P> type, Supplier<P> factory) {
        return type.cast(instances.computeIfAbsent(type, key -> factory.get()));
    }

    // Register page objects below.

    public TodoPage todo() {
        return get(TodoPage.class, TodoPage::new);
    }
}
