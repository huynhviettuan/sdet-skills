package com.example.qa.ui.elements;

import com.example.qa.ui.locator.Locator;

/**
 * A native {@code <input type="checkbox">} (or radio). For custom-styled toggles whose checked state is not the
 * input's {@code selected} property, create a dedicated element class instead of bending this one.
 */
public class CheckBox extends Clickable {

    public CheckBox(Locator locator) {
        super(locator);
    }

    public boolean isChecked() {
        return element().isSelected();
    }

    public void check() {
        if (!isChecked()) {
            click();
        }
    }

    public void uncheck() {
        if (isChecked()) {
            click();
        }
    }
}
