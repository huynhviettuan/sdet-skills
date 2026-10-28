package com.example.qa.tests.ui;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.pages.todo.TodoPage;
import com.example.qa.testbase.BaseUiTest;
import com.example.qa.ui.containers.todo.TodoFooterContainer.Filter;
import com.example.qa.ui.wait.Eventually;
import io.qameta.allure.Feature;
import java.util.ArrayList;
import java.util.List;
import org.testng.annotations.Test;

/**
 * Metamorphic relations and derived values for the todo list (docs/test-cases/todo.md, MR-TODO-...). Instead of one
 * stored expected screen, each test checks relations that must hold between independent reads of the same state, and
 * expected values computed from the operations the test performed.
 */
@Feature("Todo list")
public class TodoMetamorphicTest extends BaseUiTest {

    @Test(groups = {"metamorphic", "P1"},
            description = "[MR-TODO-001] After add, complete and delete, Active and Completed partition All and the counter equals |Active|")
    public void filtersPartitionTheListAndCounterAgrees() {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();
        List<String> added = List.of("mr one", "mr two", "mr three", "mr four", "mr five");
        List<String> completed = added.subList(0, 2);
        String deleted = added.get(4); // an active one

        // A mixed sequence: add N, complete some, delete one
        added.forEach(todo::addTodo);
        completed.forEach(todo::completeTodo);
        // audit-ignore R-TEARDOWN: deleting a todo is the step under test, not cleanup
        todo.deleteTodo(deleted);
        // Sync point and derived value: the list holds every added todo but the deleted one
        Eventually.verify(() -> assertThat(todo.main.titles()).hasSize(added.size() - 1));

        // Three independent reads of the same state
        List<String> all = todo.titlesUnder(Filter.All);
        List<String> active = todo.titlesUnder(Filter.Active);
        List<String> done = todo.titlesUnder(Filter.Completed);

        // Relation 1: Active and Completed are disjoint and together are exactly All
        List<String> union = new ArrayList<>(active);
        union.addAll(done);
        assertThat(active).doesNotContainAnyElementsOf(done);
        assertThat(active.size() + done.size()).isEqualTo(all.size());
        assertThat(union).containsExactlyInAnyOrderElementsOf(all);

        // Relation 2: two independent paths to the number of open todos, the counter and the Active list
        assertThat(todo.footer.itemsLeft()).isEqualTo(active.size());

        // Derived values: what the sequence itself implies
        assertThat(done).containsExactlyInAnyOrderElementsOf(completed);
        assertThat(active).doesNotContain(deleted).hasSize(added.size() - completed.size() - 1);
    }

    @Test(groups = {"metamorphic", "P1"},
            description = "[MR-TODO-002] Completing then un-completing a todo restores the counter and the Active list")
    public void completeThenUncompleteIsIdentity() {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();
        List<String> added = List.of("inverse one", "inverse two", "inverse three");
        String toggled = added.get(1);

        added.forEach(todo::addTodo);
        int before = added.size();
        Eventually.verify(() -> assertThat(todo.footer.itemsLeft()).isEqualTo(before));

        // f: completing one todo leaves one fewer open
        todo.completeTodo(toggled);
        Eventually.verify(() -> assertThat(todo.footer.itemsLeft()).isEqualTo(before - 1));

        // f^-1(f(x)) = x: un-completing restores the counter and the Active list, order included
        todo.uncompleteTodo(toggled);
        Eventually.verify(() -> assertThat(todo.footer.itemsLeft()).isEqualTo(before));
        assertThat(todo.main.item(toggled).isCompleted()).isFalse();
        assertThat(todo.titlesUnder(Filter.Active)).containsExactlyElementsOf(added);
    }
}
