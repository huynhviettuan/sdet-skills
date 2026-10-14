package com.example.qa.ui.locator;

import com.example.qa.driver.DriverFactory;
import com.example.qa.ui.wait.Waits;
import java.util.List;
import java.util.function.Predicate;
import org.openqa.selenium.By;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebElement;

/**
 * A lazy, parent-scoped, strict element lookup.
 *
 * <ul>
 *   <li><b>Lazy</b> — nothing is located until an action or read; every call re-resolves, so re-renders never leave a
 *       stale element behind.</li>
 *   <li><b>Scoped</b> — {@link #find(By)} searches inside the parent's single match. {@link #root(By)} is the only
 *       page-level lookup and is meant for container roots.</li>
 *   <li><b>Strict</b> — {@link #resolve()} requires exactly one match; several matches fail with a
 *       {@link StrictLocatorException} instead of silently picking the first.</li>
 * </ul>
 */
public final class Locator {

    private final Locator parent;
    private final By by;
    private final Predicate<WebElement> filter;
    private final String description;

    private Locator(Locator parent, By by, Predicate<WebElement> filter, String description) {
        this.parent = parent;
        this.by = by;
        this.filter = filter;
        this.description = description;
    }

    /** Page-level lookup — use only for a container's root. */
    public static Locator root(By by) {
        return new Locator(null, by, element -> true, by.toString());
    }

    /** Child lookup inside this locator's single match. XPath must be relative (start with {@code .//}). */
    public Locator find(By childBy) {
        return new Locator(this, childBy, element -> true, description + " >> " + childBy);
    }

    /** Keeps only matches satisfying {@code predicate}, e.g. the row containing a given title. */
    public Locator filter(Predicate<WebElement> predicate, String what) {
        return new Locator(parent, by, filter.and(predicate), description + " [" + what + "]");
    }

    /** Keeps only matches containing a descendant {@code childBy} whose visible text equals {@code text}. */
    public Locator withDescendantText(By childBy, String text) {
        return filter(element -> element.findElements(childBy).stream().anyMatch(child -> text.equals(child.getText().trim())),
                "has " + childBy + " = '" + text + "'");
    }

    /** All current matches, without waiting. */
    public List<WebElement> all() {
        List<WebElement> candidates = parent == null
                ? DriverFactory.driver().findElements(by)
                : parent.resolveNow().findElements(by);
        return candidates.stream().filter(filter).toList();
    }

    /** Number of current matches, without waiting (0 when the parent is absent). */
    public int count() {
        try {
            return all().size();
        } catch (NoSuchElementException | StaleElementReferenceException e) {
            return 0;
        }
    }

    /** The single match right now; throws if there are none or several. */
    public WebElement resolveNow() {
        List<WebElement> matches = all();
        if (matches.isEmpty()) {
            throw new NoSuchElementException("No element matches " + description);
        }
        if (matches.size() > 1) {
            throw new StrictLocatorException(description, matches.size());
        }
        return matches.get(0);
    }

    /** Waits until exactly one element matches, then returns it. */
    public WebElement resolve() {
        return Waits.until(this::resolveNow, "exactly one element matching " + description);
    }

    @Override
    public String toString() {
        return description;
    }
}
