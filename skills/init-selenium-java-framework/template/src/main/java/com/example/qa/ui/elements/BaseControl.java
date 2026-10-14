package com.example.qa.ui.elements;

import com.example.qa.ui.locator.Locator;
import com.example.qa.ui.wait.Waits;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebElement;

/**
 * Base of every UI element: wraps a scoped {@link Locator}. Reads re-resolve on every call; waits use real element
 * state. Elements are built from a container or section root — never from the page.
 */
public class BaseControl {

    protected final Locator locator;

    public BaseControl(Locator locator) {
        this.locator = locator;
    }

    public Locator locator() {
        return locator;
    }

    /** The single matching element, waiting until exactly one exists. */
    protected WebElement element() {
        return locator.resolve();
    }

    /** Visible right now (no waiting) — false when absent. For assertions, wrap in {@code Eventually.verify}. */
    public boolean isDisplayed() {
        try {
            return locator.resolveNow().isDisplayed();
        } catch (NoSuchElementException | StaleElementReferenceException e) {
            return false;
        }
    }

    public boolean isEnabled() {
        return element().isEnabled();
    }

    /** Visible text, trimmed. */
    public String text() {
        return element().getText().trim();
    }

    public String attribute(String name) {
        return element().getDomAttribute(name);
    }

    public void waitUntilVisible() {
        Waits.until(() -> locator.resolveNow().isDisplayed(), locator + " to be visible");
    }

    public void waitUntilHidden() {
        Waits.until(() -> locator.count() == 0 || !locator.resolveNow().isDisplayed(), locator + " to be hidden");
    }

    @Override
    public String toString() {
        return getClass().getSimpleName() + "(" + locator + ")";
    }
}
