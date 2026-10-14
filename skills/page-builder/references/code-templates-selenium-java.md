# Code Templates — Selenium / Java

Templates for the init-selenium-java-framework scaffold (Selenium 4, TestNG, AssertJ), shown with the TodoMVC demo
(`https://demo.playwright.dev/todomvc`). They compile against the scaffold's `Locator`, `Bys`, and element classes,
and the smoke test passes against the live demo in parallel TestNG threads — reuse the shapes, replacing names and
locators with what exploration found.

Contents:

- [How the scaffold differs from Playwright](#how-the-scaffold-differs-from-playwright)
- [Container](#container)
- [Section and factory](#section-and-factory)
- [Container with a factory](#container-with-a-factory)
- [Page](#page)
- [Registration](#registration)
- [Smoke test](#smoke-test)
- [Review checklist](#review-checklist)

---

## How the scaffold differs from Playwright

| Concern | Selenium/Java scaffold |
|---|---|
| Scoping | `Locator.root(by)` for a container root (the only page-level lookup); `root.find(by)` for everything inside |
| Strictness | `Locator.resolve()` fails with `StrictLocatorException` on several matches — like Playwright strict mode |
| Staleness | Locators are lazy and re-resolve on every call; never store a `WebElement` in a field |
| Role/name locators | No `getByRole`: use `Bys.button(text)`, `Bys.link(text)`, `Bys.heading(text)`, `Bys.ariaLabel(label)`, `Bys.label(text)` |
| XPath | Only relative (`.//`) inside `find` — `//` escapes the parent |
| Visibility | `isDisplayed()` treats `opacity: 0` / zero-size elements as hidden even when clickable (custom checkboxes); actions don't depend on it — WebDriver's own interactability check decides |
| Composition root | `pages().todo()` from `TestContext` (registered in `context/Pages.java`), not fixtures |
| Polling assertions | `Eventually.verify(() -> assertThat(...))` instead of `expect.poll` |
| Fields | `public final` element fields (the Java counterpart of `readonly`); containers have no-arg constructors, sections take their root |

---

## Container

`src/main/java/com/example/qa/ui/containers/todo/TodoHeaderContainer.java`

```java
package com.example.qa.ui.containers.todo;

import com.example.qa.ui.elements.Input;
import com.example.qa.ui.elements.Label;
import com.example.qa.ui.locator.Bys;
import com.example.qa.ui.locator.Locator;
import org.openqa.selenium.By;

public class TodoHeaderContainer {

    private final Locator root = Locator.root(By.cssSelector("header.header"));

    public final Label lblTitle = new Label(root.find(By.tagName("h1")));
    public final Input txtNewTodo = new Input(root.find(Bys.placeholder("What needs to be done?")));
}
```

`root` must be declared before the fields that use it (Java initializes fields in declaration order).

---

## Section and factory

`TodoItemSection.java` — constructor takes its own root; no page-level lookups.

```java
package com.example.qa.ui.containers.todo;

import com.example.qa.ui.elements.Button;
import com.example.qa.ui.elements.CheckBox;
import com.example.qa.ui.elements.Label;
import com.example.qa.ui.locator.Bys;
import com.example.qa.ui.locator.Locator;

/** One row of the todo list. Created per row by {@link TodoMainContainer#item(String)} — never a singleton. */
public class TodoItemSection {

    private final Locator root;

    public final CheckBox chkToggle;
    public final Label lblTitle;
    /** Visible on hover only. */
    public final Button btnDelete;

    public TodoItemSection(Locator root) {
        this.root = root;
        this.chkToggle = new CheckBox(root.find(Bys.ariaLabel("Toggle Todo")));
        this.lblTitle = new Label(root.find(Bys.testId("todo-title")));
        this.btnDelete = new Button(root.find(Bys.ariaLabel("Delete")));
    }

    public boolean isCompleted() {
        String classes = root.resolve().getDomAttribute("class");
        return classes != null && classes.contains("completed");
    }
}
```

---

## Container with a factory

`TodoMainContainer.java`

```java
package com.example.qa.ui.containers.todo;

import com.example.qa.ui.elements.CheckBox;
import com.example.qa.ui.locator.Bys;
import com.example.qa.ui.locator.Locator;
import java.util.List;
import org.openqa.selenium.By;

/** Rendered only when at least one todo exists. */
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
```

Element factories for a fixed set of variants (filters, tabs):

```java
public enum Filter { All, Active, Completed }

public Link filter(Filter filter) {
    return new Link(root.find(Bys.link(filter.name())));
}
```

---

## Page

`src/main/java/com/example/qa/pages/todo/TodoPage.java` — composes containers; methods express intent.

```java
package com.example.qa.pages.todo;

import com.example.qa.ui.containers.todo.TodoFooterContainer;
import com.example.qa.ui.containers.todo.TodoHeaderContainer;
import com.example.qa.ui.containers.todo.TodoMainContainer;

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

    public void filterBy(TodoFooterContainer.Filter filter) {
        footer.filter(filter).click();
    }
}
```

---

## Registration

`src/main/java/com/example/qa/context/Pages.java` — one accessor per page:

```java
public TodoPage todo() {
    return get(TodoPage.class, TodoPage::new);
}
```

`docs/registry/pages.md`:

```md
| Page | Class | Accessor | Containers / sections | Key actions |
| --- | --- | --- | --- | --- |
| Todo list | `pages.todo.TodoPage` | `pages().todo()` | header, main (+ `TodoItemSection`), footer | `addTodo`, `completeTodo`, `filterBy` |
```

---

## Smoke test

`src/test/java/com/example/qa/tests/ui/TodoSmokeTest.java` — walks the explored states through the page object.

```java
package com.example.qa.tests.ui;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.pages.todo.TodoPage;
import com.example.qa.testbase.BaseUiTest;
import com.example.qa.ui.containers.todo.TodoFooterContainer.Filter;
import com.example.qa.ui.wait.Eventually;
import org.testng.annotations.Test;

public class TodoSmokeTest extends BaseUiTest {

    @Test(groups = "smoke", description = "TodoPage elements resolve in empty, populated and filtered states")
    public void elementsResolveInExploredStates() {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();

        Eventually.verify(() -> assertThat(todo.header.lblTitle.text()).isEqualTo("todos"));

        todo.addTodo("buy milk");
        todo.addTodo("walk dog");
        todo.completeTodo("buy milk");

        Eventually.verify(() -> assertThat(todo.main.titles()).containsExactly("buy milk", "walk dog"));
        Eventually.verify(() -> assertThat(todo.main.item("buy milk").isCompleted()).isTrue());
        Eventually.verify(() -> assertThat(todo.footer.lblCount.text()).isEqualTo("1 item left"));

        todo.filterBy(Filter.Active);
        Eventually.verify(() -> assertThat(todo.main.titles()).containsExactly("walk dog"));
        Eventually.verify(() -> assertThat(todo.footer.btnClearCompleted.isDisplayed()).isTrue());
    }
}
```

Run: `mvn test -Dtest=TodoSmokeTest -DBASE_URL=https://demo.playwright.dev`.

---

## Review checklist

```text
[ ] Scope matches the test cases; nothing modeled "just in case"
[ ] Registry checked; existing containers/sections reused
[ ] Each container has one Locator.root(...); every element is root.find(...)
[ ] Bys strategies follow the priority; XPath only relative (.//)
[ ] Repeated items are sections behind a factory keyed by business value (withDescendantText / filter)
[ ] No WebElement fields, no driver fields, no Thread.sleep, no assertions in page objects
[ ] Element classes fit the DOM (native CheckBox / Dropdown only for native controls; new element class otherwise)
[ ] Registered in context/Pages.java and docs/registry/pages.md
[ ] mvn -q test-compile clean; smoke test passes (also with -Dthreads > 1)
```
