package com.example.qa.ui.elements;

import com.example.qa.ui.locator.Locator;
import java.util.List;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.Select;

/**
 * A native {@code <select>}. Custom dropdowns (div-based menus) are composed of a trigger and option elements in their
 * own component class — don't force them through this one.
 */
public class Dropdown extends BaseControl {

    public Dropdown(Locator locator) {
        super(locator);
    }

    public void selectByText(String visibleText) {
        select().selectByVisibleText(visibleText);
    }

    public void selectByValue(String value) {
        select().selectByValue(value);
    }

    public String selected() {
        return select().getFirstSelectedOption().getText().trim();
    }

    public List<String> options() {
        return select().getOptions().stream().map(WebElement::getText).map(String::trim).toList();
    }

    private Select select() {
        return new Select(element());
    }
}
