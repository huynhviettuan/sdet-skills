package com.example.qa.ui.containers.todo;

import com.example.qa.ui.elements.Button;
import com.example.qa.ui.elements.Label;
import com.example.qa.ui.elements.Link;
import com.example.qa.ui.locator.Bys;
import com.example.qa.ui.locator.Locator;
import org.openqa.selenium.By;

/** Counter, filters and "Clear completed". Rendered only when at least one todo exists. */
public class TodoFooterContainer {

    public enum Filter { All, Active, Completed }

    private final Locator root = Locator.root(By.cssSelector("footer.footer"));

    /** "1 item left" / "3 items left". */
    public final Label lblCount = new Label(root.find(Bys.testId("todo-count")));
    /** Rendered only while at least one todo is completed. */
    public final Button btnClearCompleted = new Button(root.find(Bys.button("Clear completed")));

    public Link filter(Filter filter) {
        return new Link(root.find(Bys.link(filter.name())));
    }

    public boolean isSelected(Filter filter) {
        String classes = filter(filter).attribute("class");
        return classes != null && classes.contains("selected");
    }

    /** The number the counter shows ("3 items left" -> 3) — a read, not an assertion. */
    public int itemsLeft() {
        return Integer.parseInt(lblCount.text().split("\s+")[0]);
    }
}
