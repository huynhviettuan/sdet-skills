package com.example.qa.ui.wait;

import com.example.qa.config.Config;
import com.example.qa.driver.DriverFactory;
import java.time.Duration;
import java.util.function.Supplier;
import org.openqa.selenium.ElementClickInterceptedException;
import org.openqa.selenium.ElementNotInteractableException;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.support.ui.FluentWait;

/**
 * Waiting on real signals. {@link #until} retries a condition until it returns a non-null, non-false value; transient
 * Selenium exceptions (element not there yet, re-rendered, covered, not interactable) count as "not yet".
 */
public final class Waits {

    private static final Duration POLL = Duration.ofMillis(100);

    private Waits() {
    }

    public static <T> T until(Supplier<T> condition, String what) {
        return until(condition, what, Config.timeout());
    }

    public static <T> T until(Supplier<T> condition, String what, Duration timeout) {
        return new FluentWait<>(DriverFactory.driver())
                .withTimeout(timeout)
                .pollingEvery(POLL)
                .withMessage("waiting for " + what)
                .ignoring(NoSuchElementException.class)
                .ignoring(StaleElementReferenceException.class)
                .ignoring(ElementClickInterceptedException.class)
                .ignoring(ElementNotInteractableException.class)
                .until(driver -> condition.get());
    }
}
