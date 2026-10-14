package com.example.qa.ui.elements;

import com.example.qa.ui.locator.Locator;
import com.example.qa.ui.wait.Waits;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;

/** An element the user types into. */
public class Editable extends BaseControl {

    public Editable(Locator locator) {
        super(locator);
    }

    /** Replaces the current value. Retries until WebDriver accepts the input (attached, enabled, interactable). */
    public void fill(String value) {
        Waits.until(() -> {
            WebElement element = locator.resolveNow();
            element.clear();
            element.sendKeys(value);
            return true;
        }, locator + " to accept input");
    }

    public void clear() {
        Waits.until(() -> {
            locator.resolveNow().clear();
            return true;
        }, locator + " to be cleared");
    }

    public void press(CharSequence... keys) {
        Waits.until(() -> {
            locator.resolveNow().sendKeys(keys);
            return true;
        }, locator + " to accept keys");
    }

    /** Fills the value and presses Enter (search boxes, quick-add inputs). */
    public void submit(String value) {
        fill(value);
        press(Keys.ENTER);
    }

    public String value() {
        return element().getDomProperty("value");
    }
}
