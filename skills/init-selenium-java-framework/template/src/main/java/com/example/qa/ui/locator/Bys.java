package com.example.qa.ui.locator;

import com.example.qa.config.Config;
import org.openqa.selenium.By;

/**
 * Locator strategies in priority order. All are safe inside {@link Locator#find(By)}: CSS is always relative to the
 * parent, and every XPath here starts with {@code .//} so it never escapes the parent.
 */
public final class Bys {

    private Bys() {
    }

    /** 1. Test id (attribute from TEST_ID_ATTRIBUTE, default data-testid). */
    public static By testId(String id) {
        return By.cssSelector("[" + Config.testIdAttribute() + "=" + quote(id) + "]");
    }

    /** 2. Accessible name given by aria-label, optionally restricted to a role or tag. */
    public static By ariaLabel(String label) {
        return By.cssSelector("[aria-label=" + quote(label) + "]");
    }

    /** 2. Button by its visible text (native button or role=button). */
    public static By button(String text) {
        return By.xpath(".//*[self::button or @role='button'][normalize-space(.)=" + xpathLiteral(text) + "]");
    }

    /** 2. Link by its visible text. */
    public static By link(String text) {
        return By.xpath(".//a[normalize-space(.)=" + xpathLiteral(text) + "]");
    }

    /** 2. Heading (h1–h6) by its visible text. */
    public static By heading(String text) {
        return By.xpath(".//*[self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6]"
                + "[normalize-space(.)=" + xpathLiteral(text) + "]");
    }

    /** 3. Form control associated with a {@code <label>} by text (for= or nesting). */
    public static By label(String text) {
        String literal = xpathLiteral(text);
        return By.xpath(".//*[@id=//label[normalize-space(.)=" + literal + "]/@for]"
                + " | .//label[normalize-space(.)=" + literal + "]//*[self::input or self::select or self::textarea]");
    }

    /** 4. Input or textarea by placeholder. */
    public static By placeholder(String text) {
        return By.cssSelector("[placeholder=" + quote(text) + "]");
    }

    /** 5. Any element whose own visible text equals {@code text} (use only for stable, non-localized copy). */
    public static By text(String text) {
        return By.xpath(".//*[normalize-space(text())=" + xpathLiteral(text) + "]");
    }

    private static String quote(String value) {
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'";
    }

    private static String xpathLiteral(String value) {
        if (!value.contains("'")) {
            return "'" + value + "'";
        }
        if (!value.contains("\"")) {
            return "\"" + value + "\"";
        }
        return "concat('" + value.replace("'", "', \"'\", '") + "')";
    }
}
