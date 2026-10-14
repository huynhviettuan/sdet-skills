package com.example.qa.ui.wait;

import com.example.qa.config.Config;
import java.time.Duration;
import java.time.Instant;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.StaleElementReferenceException;

/**
 * Retrying assertions for UI state: re-runs an AssertJ assertion until it passes or the timeout expires, then rethrows
 * the last failure (with its real message). Use it for anything read from the page:
 *
 * <pre>{@code
 * Eventually.verify(() -> assertThat(todo.main().titles()).containsExactly("buy milk"));
 * }</pre>
 *
 * The poll interval is not a fixed wait: the assertion passes as soon as the state is right.
 */
public final class Eventually {

    private static final long POLL_MILLIS = 100;

    private Eventually() {
    }

    public static void verify(Runnable assertion) {
        verify(assertion, Config.timeout());
    }

    public static void verify(Runnable assertion, Duration timeout) {
        Instant deadline = Instant.now().plus(timeout);
        while (true) {
            try {
                assertion.run();
                return;
            } catch (AssertionError | NoSuchElementException | StaleElementReferenceException e) {
                if (Instant.now().isAfter(deadline)) {
                    if (e instanceof AssertionError assertionError) {
                        throw assertionError;
                    }
                    throw new AssertionError("Still failing after " + timeout + ": " + e.getMessage(), e);
                }
            }
            try {
                Thread.sleep(POLL_MILLIS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while polling an assertion", e);
            }
        }
    }
}
