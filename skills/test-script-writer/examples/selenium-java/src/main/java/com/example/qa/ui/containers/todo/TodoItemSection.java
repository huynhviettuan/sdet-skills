package com.example.qa.ui.containers.todo;

import com.example.qa.ui.elements.Button;
import com.example.qa.ui.elements.CheckBox;
import com.example.qa.ui.elements.Clickable;
import com.example.qa.ui.elements.Label;
import com.example.qa.ui.locator.Bys;
import com.example.qa.ui.locator.Locator;

/** One row of the todo list. Created per row by {@link TodoMainContainer#item(String)} — never a singleton. */
public class TodoItemSection {

    private final Locator root;
    private final Clickable row;

    public final CheckBox chkToggle;
    public final Label lblTitle;
    /** Visible on hover only: {@link #hover()} first. */
    public final Button btnDelete;

    public TodoItemSection(Locator root) {
        this.root = root;
        this.row = new Clickable(root);
        this.chkToggle = new CheckBox(root.find(Bys.ariaLabel("Toggle Todo")));
        this.lblTitle = new Label(root.find(Bys.testId("todo-title")));
        this.btnDelete = new Button(root.find(Bys.ariaLabel("Delete")));
    }

    /** Moves the pointer over the row, which reveals its delete button. */
    public void hover() {
        row.hover();
    }

    public boolean isCompleted() {
        String classes = root.resolve().getDomAttribute("class");
        return classes != null && classes.contains("completed");
    }
}
