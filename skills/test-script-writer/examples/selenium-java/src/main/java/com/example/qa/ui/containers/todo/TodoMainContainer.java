package com.example.qa.ui.containers.todo;

import com.example.qa.ui.elements.CheckBox;
import com.example.qa.ui.locator.Bys;
import com.example.qa.ui.locator.Locator;
import java.util.List;
import org.openqa.selenium.By;

/** The list. Rendered only when at least one todo exists. */
public class TodoMainContainer {

    private final Locator root = Locator.root(By.cssSelector("section.main"));
    private final Locator items = root.find(Bys.testId("todo-item"));

    public final CheckBox chkToggleAll = new CheckBox(root.find(Bys.label("Mark all as complete")));

    /** The row whose title is {@code title} (business key, not position). */
    public TodoItemSection item(String title) {
        return new TodoItemSection(items.withDescendantText(Bys.testId("todo-title"), title));
    }

    /** Snapshot of the visible titles — assert it inside {@code Eventually.verify}. */
    public List<String> titles() {
        return root.find(Bys.testId("todo-title")).all().stream().map(element -> element.getText().trim()).toList();
    }
}
