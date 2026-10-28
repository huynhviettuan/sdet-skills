package com.example.qa.ui.containers.todo;

import com.example.qa.ui.elements.Input;
import com.example.qa.ui.elements.Label;
import com.example.qa.ui.locator.Bys;
import com.example.qa.ui.locator.Locator;
import org.openqa.selenium.By;

/** The title and the new-todo input. */
public class TodoHeaderContainer {

    private final Locator root = Locator.root(By.cssSelector("header.header"));

    public final Label lblTitle = new Label(root.find(By.tagName("h1")));
    public final Input txtNewTodo = new Input(root.find(Bys.placeholder("What needs to be done?")));
}
