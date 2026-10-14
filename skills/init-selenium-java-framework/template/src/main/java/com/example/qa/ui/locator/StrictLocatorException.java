package com.example.qa.ui.locator;

/** Thrown when a locator that must identify one element matches several — scope it through its container. */
public class StrictLocatorException extends RuntimeException {

    public StrictLocatorException(String description, int count) {
        super(count + " elements match " + description
                + " — scope the locator through its container or section, or identify the item by a business key");
    }
}
