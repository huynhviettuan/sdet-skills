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
- [Sentinel](#sentinel)
- [Metamorphic relations and derived values](#metamorphic-relations-and-derived-values)
- [Run and verify](#run-and-verify)

The full, runnable set (page objects, PetService, factory, tests, schemas) is in
[`examples/selenium-java/`](../examples/selenium-java/); its `run-examples.sh` re-verifies it against the live apps.

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

## Sentinel

**When:** once per suite or nightly job, so that a green run means something. A sentinel is one test with an
expectation known to be false, written through the same page objects and assertion path as the real tests, and
marked so the run is red if it ever **passes** (after manual-qa-agent ADR-0023). It catches an assertion path that
cannot fail: a swallowed error, a retry that turns red into green, a no-op verify.

`src/test/java/com/example/qa/tests/ui/SentinelTest.java` (verified):

```java
@Feature("Sentinel")
public class SentinelTest extends BaseUiTest {

    @Test(groups = "sentinel",
            description = "[SENTINEL] A known-false expectation fails through the real page objects and assertions",
            expectedExceptions = AssertionError.class,
            expectedExceptionsMessageRegExp = "(?s).*expected: \"2 items left\".*but was: \"1 item left\".*")
    public void knownFalseExpectationFails() {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();

        todo.addTodo("one todo");

        // Known false: exactly one todo was added, so the counter can only read "1 item left".
        Eventually.verify(() -> assertThat(todo.footer.lblCount.text()).isEqualTo("2 items left"));
    }
}
```

**How it is checked:**

- `expectedExceptions` alone would also accept an AssertionError raised for an unrelated reason. Pin the
  expected and actual values with `expectedExceptionsMessageRegExp` (`(?s)` because AssertJ messages span lines).
  A broken page (a locator `TimeoutException`, or `Eventually`'s "Still failing after" wrapper around a missing
  element) does not match, so it stays red.
- Negative control (done once): change the expectation to the true value and run it. TestNG must fail it with
  "should have thrown an exception of type class java.lang.AssertionError".
- Keep it out of `can-fail` (failing is its job), and never "fix" it to match the app. In CI, check it passed
  (`status="PASS"` for `knownFalseExpectationFails` in `testng-results.xml`), not just that the run is green.

---

## Metamorphic relations and derived values

**When:** the full expected output is unknowable or unstable (a shared server's search results, a large list), or
one stored snapshot would prove little. Assert a **relation** between independent reads of the same state, or
between a source run and a follow-up run, and **derived values** computed from the operations the test itself
performed. Group them `metamorphic`.

UI: `src/test/java/com/example/qa/tests/ui/TodoMetamorphicTest.java` (verified). `TodoPage.titlesUnder(filter)`
clicks the filter, waits until the app marks it `selected`, then reads the titles.

```java
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
```

API on a shared server: `src/test/java/com/example/qa/tests/api/PetMetamorphicTest.java` (verified). The relations
are stated over pets this test created with unique names and tags; `PetFactory` deletes them in teardown.

```java
@Test(groups = {"metamorphic", "P1"},
        description = "[MR-PET-001] A pet is found under exactly its own status, before and after the status changes")
public void statusSearchFollowsTheUpdate() {
    Pet pet = data().pets().create(PetStatus.AVAILABLE);

    // Source input: the status partitions are disjoint, the pet is under available and not under sold
    assertThat(idsWithStatus(PetStatus.AVAILABLE)).contains(pet.getId());
    assertThat(idsWithStatus(PetStatus.SOLD)).doesNotContain(pet.getId());

    // Follow-up input: change only the status
    Pet sold = Pet.builder().id(pet.getId()).name(pet.getName()).photoUrls(pet.getPhotoUrls())
            .tags(pet.getTags()).status(PetStatus.SOLD).build();
    ApiResponse<Pet> update = services().pet().updatePet(sold);
    assertThat(update.statusCode()).isEqualTo(200);

    // Relation: the pet moved between partitions, now under sold and no longer under available
    assertThat(idsWithStatus(PetStatus.SOLD)).contains(pet.getId());
    assertThat(idsWithStatus(PetStatus.AVAILABLE)).doesNotContain(pet.getId());
}

@Test(groups = {"metamorphic", "P2"},
        description = "[MR-PET-002] Searching by two tags returns a superset of searching by one of them")
public void moreTagsReturnASuperset() {
    String tagA = data().pets().uniqueTag();
    String tagB = data().pets().uniqueTag();
    Pet withA = data().pets().create(PetStatus.AVAILABLE, tagA);
    Pet withB = data().pets().create(PetStatus.AVAILABLE, tagB);

    Set<Long> byA = idsWithTags(tagA);
    Set<Long> byAandB = idsWithTags(tagA, tagB);

    // Relation: adding a tag to the filter never drops a result
    assertThat(byAandB).containsAll(byA);
    // Derived values: the unique tags match exactly the pets created here
    assertThat(byA).containsExactly(withA.getId());
    assertThat(byAandB).containsExactlyInAnyOrder(withA.getId(), withB.getId());
}

private List<Long> idsWithStatus(PetStatus status) {
    ApiResponse<List<Pet>> response = services().pet()
            .findPetsByStatus(FindPetsByStatusQuery.builder().status(status).build());
    assertThat(response.statusCode()).isEqualTo(200);
    SchemaValidator.assertMatches(response, "pet", "findPetsByStatus_200");
    return response.body().stream().map(Pet::getId).toList();
}

/** Ids as a set: the server returns a pet once per matching tag. */
private Set<Long> idsWithTags(String... tags) {
    ApiResponse<List<Pet>> response = services().pet()
            .findPetsByTags(FindPetsByTagsQuery.builder().tags(List.of(tags)).build());
    assertThat(response.statusCode()).isEqualTo(200);
    SchemaValidator.assertMatches(response, "pet", "findPetsByTags_200");
    return response.body().stream().map(Pet::getId).collect(Collectors.toSet());
}
```

**How it is checked:**

- Sync before reading: one derived-value assertion inside `Eventually.verify` (`hasSize(added.size() - 1)`) proves
  the sequence has been applied. After that, the reads are snapshots of settled state, and the relations are plain
  assertions on them.
- Each read is independent (another filter, the counter, another query), so a relation compares two paths, not one
  value with itself.
- On a shared server, assert membership of ids you created, never totals: other users change the counts.
- Keep locator keys out of assertion lines (`item(toggled)`, not `item("inverse two")`): `can-fail` mutates the last
  literal on an assertion line, and a mutated locator key "kills" the mutant through a timeout instead of the
  assertion.
- `can-fail` mutates the literals in derived values (`- 1` → `- 2`, `200` → `201`), and every such mutant must
  fail. It cannot mutate relation lines without a literal; the [sentinel](#sentinel) shows that an assertion of
  that shape can fail on the build.

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
