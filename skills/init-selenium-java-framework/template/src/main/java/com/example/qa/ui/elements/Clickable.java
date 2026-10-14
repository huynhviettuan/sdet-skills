package com.example.qa.ui.elements;

import com.example.qa.driver.DriverFactory;
import com.example.qa.ui.locator.Locator;
import com.example.qa.ui.wait.Waits;
import org.openqa.selenium.interactions.Actions;

/**
 * An element the user clicks. A click retries until WebDriver accepts it: transient "not interactable", "click
 * intercepted" (overlay), and "stale" errors mean not yet. WebDriver's own interactability check decides — not
 * {@code isDisplayed()}, which reports styled-but-clickable inputs (e.g. opacity 0 under a custom checkbox) as hidden.
 */
public class Clickable extends BaseControl {

    public Clickable(Locator locator) {
        super(locator);
    }

    public void click() {
        Waits.until(() -> {
            locator.resolveNow().click();
            return true;
        }, locator + " to accept a click");
    }

    public void hover() {
        new Actions(DriverFactory.driver()).moveToElement(element()).perform();
    }

    public void doubleClick() {
        new Actions(DriverFactory.driver()).doubleClick(element()).perform();
    }
}
