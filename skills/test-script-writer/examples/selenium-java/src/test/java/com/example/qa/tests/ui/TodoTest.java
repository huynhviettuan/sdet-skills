package com.example.qa.tests.ui;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.pages.todo.TodoPage;
import com.example.qa.testbase.BaseUiTest;
import com.example.qa.ui.containers.todo.TodoFooterContainer.Filter;
import com.example.qa.ui.wait.Eventually;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

/** Implements docs/test-cases/todo.md (TC-TODO-001..003). */
@Feature("Todo list")
public class TodoTest extends BaseUiTest {

    @Test(groups = {"P0", "smoke"}, description = "[TC-TODO-001] Added todo appears in the list and the counter")
    @Link(name = "AC-TODO-001")
    public void addedTodoAppearsInListAndCounter() {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();

        // Act
        todo.addTodo("buy milk");

        // Assert
        Eventually.verify(() -> assertThat(todo.main.titles()).containsExactly("buy milk"));
        Eventually.verify(() -> assertThat(todo.footer.lblCount.text()).isEqualTo("1 item left"));
    }

    @Test(groups = "P1", description = "[TC-TODO-002] Completed todo is listed under Completed and hidden under Active")
    @Link(name = "AC-TODO-002")
    public void completedTodoIsFilteredByStatus() {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();

        // Arrange: precondition, two todos (the app has no API, so through the page object)
        todo.addTodo("buy milk");
        todo.addTodo("walk dog");

        // Act + Assert, step by step as in the test case
        todo.completeTodo("buy milk");
        Eventually.verify(() -> assertThat(todo.footer.lblCount.text()).isEqualTo("1 item left"));

        todo.filterBy(Filter.Completed);
        Eventually.verify(() -> assertThat(todo.main.titles()).containsExactly("buy milk"));

        todo.filterBy(Filter.Active);
        Eventually.verify(() -> assertThat(todo.main.titles()).containsExactly("walk dog"));
    }

    @DataProvider(name = "blankTitles")
    public Object[][] blankTitles() {
        return new Object[][] {
            {"empty", ""},
            {"spaces only", "   "},
        };
    }

    @Test(groups = "P2", dataProvider = "blankTitles", description = "[TC-TODO-003] Blank titles are not added")
    @Link(name = "AC-TODO-003")
    public void blankTitleIsNotAdded(String partition, String title) {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();

        // Act
        todo.addTodo(title);
        // Sync point for a negative check: a valid todo added afterwards proves the blank one was processed
        todo.addTodo("sentinel");

        // Assert
        Eventually.verify(() -> assertThat(todo.main.titles()).as("partition: %s", partition).containsExactly("sentinel"));
    }
}
