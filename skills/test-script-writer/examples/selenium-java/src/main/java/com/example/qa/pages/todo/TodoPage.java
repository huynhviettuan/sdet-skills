package com.example.qa.pages.todo;

import com.example.qa.ui.containers.todo.TodoFooterContainer;
import com.example.qa.ui.containers.todo.TodoFooterContainer.Filter;
import com.example.qa.ui.containers.todo.TodoHeaderContainer;
import com.example.qa.ui.containers.todo.TodoItemSection;
import com.example.qa.ui.containers.todo.TodoMainContainer;
import com.example.qa.ui.wait.Waits;
import java.util.List;

/** TodoMVC (https://demo.playwright.dev/todomvc): composes containers; methods express intent. */
public class TodoPage {

    public final TodoHeaderContainer header = new TodoHeaderContainer();
    public final TodoMainContainer main = new TodoMainContainer();
    public final TodoFooterContainer footer = new TodoFooterContainer();

    public void addTodo(String title) {
        header.txtNewTodo.submit(title); // fill + Enter
    }

    public void completeTodo(String title) {
        main.item(title).chkToggle.check();
    }

    public void uncompleteTodo(String title) {
        main.item(title).chkToggle.uncheck();
    }

    public void deleteTodo(String title) {
        TodoItemSection item = main.item(title);
        item.hover();
        item.btnDelete.click();
    }

    /** Shows a filter and waits until the app marks it selected (the list renders in the same update). */
    public void filterBy(Filter filter) {
        footer.filter(filter).click();
        Waits.until(() -> footer.isSelected(filter), filter + " filter to be selected");
    }

    /** The titles listed under {@code filter} — a snapshot read after the filter is selected. */
    public List<String> titlesUnder(Filter filter) {
        filterBy(filter);
        return main.titles();
    }
}
