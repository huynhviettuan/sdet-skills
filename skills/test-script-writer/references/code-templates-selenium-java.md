# Code Templates — Selenium + RestAssured / Java

The implementation of [`sample-test-cases.md`](sample-test-cases.md) for the init-selenium-java-framework scaffold
(TestNG, AssertJ, Allure). It compiles, and all 9 tests pass in parallel threads against the live TodoMVC demo and
Petstore API; breaking an expected value makes the test fail with `expected: "2 items left" but was: "1 item left"`.
Prerequisites (TodoPage, PetService, models, schemas) come from `page-builder` and `service-builder`.

Contents:

- [Data factory](#data-factory)
- [UI test class](#ui-test-class)
- [API test class](#api-test-class)
- [Blocked and known-bug cases](#blocked-and-known-bug-cases)
- [Run and verify](#run-and-verify)

---

## Data factory

`src/main/java/com/example/qa/data/PetFactory.java` — creates through the service and registers its own cleanup on
the test context (runs even when the test fails).

```java
package com.example.qa.data;

import com.example.qa.api.ApiResponse;
import com.example.qa.api.models.pet.Pet;
import com.example.qa.api.models.pet.PetStatus;
import com.example.qa.api.services.PetService;
import com.example.qa.context.TestContext;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/** Creates pets through the API for test preconditions and deletes them after the test (idempotent). */
public final class PetFactory {

    private final PetService service;
    private final TestContext context;

    public PetFactory(PetService service, TestContext context) {
        this.service = service;
        this.context = context;
    }

    /** A new pet with a unique id and name; deleted after the test even if it fails. */
    public Pet create(PetStatus status) {
        long id = ThreadLocalRandom.current().nextLong(1_000_000_000L, 9_000_000_000L);
        Pet pet = Pet.builder().id(id).name("autotest-pet-" + id).photoUrls(List.of()).status(status).build();
        ApiResponse<Pet> response = service.addPet(pet);
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Precondition failed: addPet returned " + response.statusCode() + " "
                    + response.bodyText());
        }
        context.onTeardown("delete pet " + id, () -> service.deletePet(id)); // 404 when already deleted: fine
        return response.body();
    }
}
```

Register it in `src/main/java/com/example/qa/context/TestData.java`:

```java
public PetFactory pets() {
    return get(PetFactory.class, () -> new PetFactory(context.services().pet(), context));
}
```

Tests then use `data().pets().create(PetStatus.AVAILABLE)`.

---

## UI test class

`src/test/java/com/example/qa/tests/ui/TodoTest.java` — implements `docs/test-cases/todo.md`.

```java
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

/** Implements docs/test-cases/todo.md. */
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

        // Arrange — precondition: two todos (the app has no API, so through the page object)
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
```

Notes:

- `Eventually.verify(...)` retries the AssertJ assertion until it passes — the waiting assertion for page state.
- The `@DataProvider` makes TC-TODO-003 one test per partition; the `sentinel` todo is the sync point for the
  absence check.
- No instance fields: TestNG runs these methods in parallel threads on one instance.

---

## API test class

`src/test/java/com/example/qa/tests/api/PetTest.java` — implements `docs/test-cases/pet.md`.

```java
package com.example.qa.tests.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.api.ApiResponse;
import com.example.qa.api.SchemaValidator;
import com.example.qa.api.models.pet.FindPetsByStatusQuery;
import com.example.qa.api.models.pet.Pet;
import com.example.qa.api.models.pet.PetStatus;
import com.example.qa.testbase.BaseTest;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import java.util.List;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

/** Implements docs/test-cases/pet.md. */
@Feature("Pet API")
public class PetTest extends BaseTest {

    @Test(groups = {"P0", "smoke"}, description = "[TC-PET-001] Created pet can be retrieved by id")
    @Link(name = "AC-PET-001")
    public void createdPetCanBeRetrievedById() {
        // Arrange
        Pet pet = data().pets().create(PetStatus.AVAILABLE);

        // Act
        ApiResponse<Pet> response = services().pet().getPetById(pet.getId());

        // Assert
        assertThat(response.statusCode()).isEqualTo(200);
        SchemaValidator.assertMatches(response, "pet", "getPetById_200");
        assertThat(response.body())
                .extracting(Pet::getId, Pet::getName, Pet::getStatus)
                .containsExactly(pet.getId(), pet.getName(), PetStatus.AVAILABLE);
    }

    @Test(groups = "P1", description = "[TC-PET-002] Unknown pet id returns 404")
    @Link(name = "AC-PET-002")
    public void unknownPetIdReturns404() {
        // Arrange — an id that certainly doesn't exist: created, then deleted
        Pet pet = data().pets().create(PetStatus.AVAILABLE);
        // audit-ignore R-TEARDOWN: deleting is the precondition; cleanup stays with the factory
        assertThat(services().pet().deletePet(pet.getId()).statusCode()).as("precondition: delete").isEqualTo(200);

        // Act
        ApiResponse<Pet> response = services().pet().getPetById(pet.getId());

        // Assert
        assertThat(response.statusCode()).isEqualTo(404);
    }

    @DataProvider(name = "statuses")
    public Object[][] statuses() {
        return new Object[][] {{PetStatus.AVAILABLE}, {PetStatus.PENDING}, {PetStatus.SOLD}};
    }

    @Test(groups = "P1", dataProvider = "statuses",
            description = "[TC-PET-003] Search by status returns only pets with that status")
    @Link(name = "AC-PET-003")
    public void findByStatusReturnsOnlyThatStatus(PetStatus status) {
        // Act
        ApiResponse<List<Pet>> response = services().pet()
                .findPetsByStatus(FindPetsByStatusQuery.builder().status(status).build());

        // Assert
        assertThat(response.statusCode()).isEqualTo(200);
        SchemaValidator.assertMatches(response, "pet", "findPetsByStatus_200");
        assertThat(response.body()).allSatisfy(pet -> assertThat(pet.getStatus()).isEqualTo(status));
    }
}
```

---

## Blocked and known-bug cases

```java
// Blocked by an open question: listed as skipped, never silently missing
@Test(enabled = false, description = "[TC-PET-004] Pet name longer than 255 characters is rejected (blocked by OQ-012)")
public void longPetNameIsRejected() {
}

// Known product bug: keep the correct expectation; disable with the defect id until fixed (or keep red per policy)
@Test(enabled = false, description = "[TC-PET-005] Updating a deleted pet returns 404 (DEF-231)")
@Link(name = "AC-PET-005")
@Issue("DEF-231")
public void updatingDeletedPetReturns404() {
    // full implementation with the correct expectation
}
```

---

## Run and verify

```bash
mvn -q test-compile
mvn test -Dtest='TodoTest,PetTest' -DBASE_URL=https://app.example.test -DAPI_DOMAIN=https://api.example.test
mvn test -Dgroups=smoke
```

Repeat check: add `invocationCount = 3` (and `threadPoolSize = 3` for parallel) to the new `@Test` temporarily, run
it, then remove it. "Can it fail?" check: change one expected value, run, confirm the failure message shows it, then
restore it.
