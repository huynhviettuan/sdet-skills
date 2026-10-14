package com.example.qa.context;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Per-test state for the current thread — the composition root tests draw from (the TestNG counterpart of Playwright
 * fixtures). Holds the page, service, and test-data registries for this test and a teardown stack: whoever creates
 * data, a mock, or a session registers its cleanup here, and {@link #finish()} runs it after the test even when an
 * assertion failed.
 */
public final class TestContext {

    private static final ThreadLocal<TestContext> CURRENT = new ThreadLocal<>();

    private final Pages pages = new Pages();
    private final Services services = new Services();
    private final TestData data = new TestData(this);
    private final Deque<Teardown> teardowns = new ArrayDeque<>();

    private TestContext() {
    }

    public static void start() {
        if (CURRENT.get() != null) {
            throw new IllegalStateException("A TestContext is already active on this thread");
        }
        CURRENT.set(new TestContext());
    }

    public static TestContext current() {
        TestContext context = CURRENT.get();
        if (context == null) {
            throw new IllegalStateException("No TestContext on this thread: tests must extend BaseTest or BaseUiTest");
        }
        return context;
    }

    /** Runs every registered teardown (last registered first), then clears the context. Errors are collected. */
    public static void finish() {
        TestContext context = CURRENT.get();
        if (context == null) {
            return;
        }
        CURRENT.remove();
        List<Throwable> failures = new ArrayList<>();
        while (!context.teardowns.isEmpty()) {
            Teardown teardown = context.teardowns.pop();
            try {
                teardown.action().run();
            } catch (RuntimeException | AssertionError e) {
                failures.add(new IllegalStateException("Teardown failed: " + teardown.description(), e));
            }
        }
        if (!failures.isEmpty()) {
            IllegalStateException error = new IllegalStateException(failures.size() + " teardown step(s) failed");
            failures.forEach(error::addSuppressed);
            throw error;
        }
    }

    public Pages pages() {
        return pages;
    }

    public Services services() {
        return services;
    }

    public TestData data() {
        return data;
    }

    /** Registers cleanup for something this test created. Make it idempotent: it may run after a partial setup. */
    public void onTeardown(String description, Runnable action) {
        teardowns.push(new Teardown(description, action));
    }

    private record Teardown(String description, Runnable action) {
    }
}
