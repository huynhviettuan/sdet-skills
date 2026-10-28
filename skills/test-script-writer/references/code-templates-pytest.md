# Code Templates — pytest (Python)

The implementation of [`sample-test-cases.md`](sample-test-cases.md) for the `init-pytest-playwright-framework`
scaffold. Verified on 2026-10-28 against the live TodoMVC demo and Swagger Petstore: 9/9 tests green with retries off, 27/27 on `--count=3`, 9/9 with `-n 4`, ruff + mypy strict clean, audit 0 findings; breaking an expected value fails with the actual value (`Actual value: 1 item left`). Prerequisites (TodoPage, PetService, models, schemas) come from `page-builder` and
`service-builder` (Python templates). The full suite, with the sentinel and metamorphic tests below, is in
[`../examples/pytest-playwright/`](../examples/pytest-playwright/) and re-verified end to end by its
`run-examples.sh` (2026-10-28: 42 passed + 3 xfailed on `--count=3 -n 4`, can-fail 21 killed / 0 survived).

Contents:

- [Data factory](#data-factory)
- [UI tests](#ui-tests)
- [API tests](#api-tests)
- [Sentinel](#sentinel)
- [Metamorphic relations and derived values](#metamorphic-relations-and-derived-values)
- [Run and verify](#run-and-verify)

---

## Data factory

`src/qa/data/pets.py`

```python
"""Pet data factory: unique pets created through the API, deleted in the fixture's teardown (``fixtures/data.py``)."""

import random
import uuid

from qa.api.services.pet import PetService
from qa.models.pet import Pet, PetStatus, Tag


def unique_label(prefix: str) -> str:
    """A name no other test, worker or user of the shared server will produce: ``<prefix>-<12 hex chars>``."""
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


class PetFactory:
    """Creates pets for test preconditions and remembers them, so teardown deletes exactly what this test made."""

    def __init__(self, service: PetService) -> None:
        self._service = service
        self._created: list[int] = []

    def create(self, status: PetStatus = PetStatus.AVAILABLE, tags: list[str] | None = None) -> Pet:
        """A new pet with a random id and a unique name; ``tags`` are tag names (make them unique per test)."""
        pet_id = random.randint(1_000_000_000, 9_000_000_000)
        body = Pet(
            id=pet_id,
            name=unique_label("autotest-pet"),
            photo_urls=[],
            status=status,
            tags=[Tag(name=name) for name in tags] if tags else None,
        )
        response = self._service.add_pet(body)
        if response.status_code != 200:
            raise RuntimeError(f"Precondition failed: addPet returned {response.status_code} {response.text[:200]}")
        self._created.append(pet_id)
        return response.data

    def cleanup(self) -> None:
        """Idempotent: deleting a pet the test already deleted is harmless. Tries every pet, then reports failures."""
        failures: list[str] = []
        for pet_id in self._created:
            try:
                status = self._service.delete_pet(pet_id).status_code
            except Exception as error:  # keep deleting the others; reported below
                failures.append(f"{pet_id}: {error!r}")
                continue
            if status not in (200, 404):
                failures.append(f"{pet_id}: deletePet returned {status}")
        self._created.clear()
        if failures:
            raise RuntimeError("Teardown could not delete pets: " + "; ".join(failures))
```

Registered with teardown after `yield` (runs even when the test fails), behind a guard on the write target:

`src/qa/fixtures/data.py`

```python
"""Data factories: create through a service, clean up after ``yield`` (runs even when the test fails).

Writing factories guard their target first: the suite creates and deletes records, so it only runs against a local
server or a host on the allowlist below — never against an environment nobody named as safe to write to.
"""

from __future__ import annotations

from collections.abc import Iterator
from urllib.parse import urlparse

import pytest

from qa.api.services.pet import PetService
from qa.config import CONFIG
from qa.data.pets import PetFactory

# Hosts this suite may write to: local servers and the public Swagger Petstore demo (a sandbox anyone may write to).
WRITABLE_API_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", "petstore3.swagger.io"})


def _guard_write_target(api_domain: str) -> None:
    host = urlparse(api_domain).hostname or ""
    if host not in WRITABLE_API_HOSTS:
        raise RuntimeError(f"Refusing to create test data on {host!r}: not in WRITABLE_API_HOSTS ({api_domain})")


@pytest.fixture
def pet_factory(pet_service: PetService) -> Iterator[PetFactory]:
    _guard_write_target(CONFIG.api_domain)
    factory = PetFactory(pet_service)
    yield factory
    factory.cleanup()
```

---

## UI tests

`tests/e2e/test_todo.py`

```python
"""Implements docs/test-cases/todo.md."""

import pytest

from qa.assertions import eventually, expect
from qa.pages.todo import TodoPage


@pytest.mark.P0
@pytest.mark.smoke
@pytest.mark.case("TC-TODO-001")
@pytest.mark.requirement("AC-TODO-001")
def test_added_todo_appears_in_list_and_counter(todo_page: TodoPage) -> None:
    """[TC-TODO-001] Added todo appears in the list and the counter."""
    todo_page.open()

    todo_page.add_todo("buy milk")

    eventually(lambda: _assert_titles(todo_page, ["buy milk"]))
    expect(todo_page.footer.lbl_count).to_have_text("1 item left")


@pytest.mark.P1
@pytest.mark.case("TC-TODO-002")
@pytest.mark.requirement("AC-TODO-002")
def test_completed_todo_is_filtered_by_status(todo_page: TodoPage) -> None:
    """[TC-TODO-002] Completed todo is listed under Completed and hidden under Active."""
    todo_page.open()
    todo_page.add_todo("buy milk")
    todo_page.add_todo("walk dog")

    todo_page.complete_todo("buy milk")
    expect(todo_page.footer.lbl_count).to_have_text("1 item left")

    todo_page.filter_by("Completed")
    eventually(lambda: _assert_titles(todo_page, ["buy milk"]))

    todo_page.filter_by("Active")
    eventually(lambda: _assert_titles(todo_page, ["walk dog"]))


@pytest.mark.P2
@pytest.mark.case("TC-TODO-003")
@pytest.mark.requirement("AC-TODO-003")
@pytest.mark.parametrize("title", ["", "   "], ids=["empty", "spaces only"])
def test_blank_title_is_not_added(todo_page: TodoPage, title: str) -> None:
    """[TC-TODO-003] Blank titles are not added."""
    todo_page.open()

    todo_page.add_todo(title)
    # Sync point for a negative check: a valid todo added afterwards proves the blank one was processed
    todo_page.add_todo("sentinel")

    eventually(lambda: _assert_titles(todo_page, ["sentinel"]))


def _assert_titles(todo_page: TodoPage, expected: list[str]) -> None:
    assert todo_page.main.titles() == expected
```

- `eventually(...)` retries the read until it matches; `expect(element)` is Playwright's web-first assertion.
- TC-TODO-003 is one test per data row through `parametrize` with named ids; the `sentinel` todo is the sync point
  for the absence check.

---

## API tests

`tests/api/test_pet.py`

```python
"""Implements docs/test-cases/pet.md."""

import pytest

from qa.api.schema import assert_matches
from qa.api.services.pet import PetService
from qa.data.pets import PetFactory
from qa.models.pet import PetStatus


@pytest.mark.P0
@pytest.mark.smoke
@pytest.mark.case("TC-PET-001")
@pytest.mark.requirement("AC-PET-001")
def test_created_pet_can_be_retrieved_by_id(pet_factory: PetFactory, pet_service: PetService) -> None:
    """[TC-PET-001] Created pet can be retrieved by id."""
    pet = pet_factory.create(PetStatus.AVAILABLE)
    assert pet.id is not None

    response = pet_service.get_pet_by_id(pet.id)

    assert response.status_code == 200
    assert_matches(response, "pet", "getPetById_200")
    assert (response.data.id, response.data.name, response.data.status) == (pet.id, pet.name, PetStatus.AVAILABLE)


@pytest.mark.P1
@pytest.mark.case("TC-PET-002")
@pytest.mark.requirement("AC-PET-002")
def test_unknown_pet_id_returns_404(pet_factory: PetFactory, pet_service: PetService) -> None:
    """[TC-PET-002] Unknown pet id returns 404."""
    # Arrange: an id that certainly doesn't exist — created, then deleted
    pet = pet_factory.create(PetStatus.AVAILABLE)
    assert pet.id is not None
    # audit-ignore R-TEARDOWN: deleting is the precondition; cleanup stays with the factory
    assert pet_service.delete_pet(pet.id).status_code == 200

    response = pet_service.get_pet_by_id(pet.id)

    assert response.status_code == 404


@pytest.mark.P1
@pytest.mark.case("TC-PET-003")
@pytest.mark.requirement("AC-PET-003")
@pytest.mark.parametrize("status", list(PetStatus), ids=lambda s: s.value)
def test_find_by_status_returns_only_that_status(pet_service: PetService, status: PetStatus) -> None:
    """[TC-PET-003] Search by status returns only pets with that status."""
    response = pet_service.find_pets_by_status(status)

    assert response.status_code == 200
    assert_matches(response, "pet", "findPetsByStatus_200")
    assert {pet.status for pet in response.data} <= {status}
```

---

## Sentinel

**When:** in every suite that a pipeline trusts as a gate — one per suite is enough. A green run only means something
if its assertions can go red on this build: a broken matcher, an `expect` that was never awaited, a conftest hook
that swallows failures, or a misconfigured runner all make every test pass. The sentinel is the run's own control:
it expects a value known to be false, through the same page object and the same assertion path as the real tests
(manual-qa-agent ADR-0023).

`tests/test_sentinel.py`

```python
"""Sentinel: proves the assertion path can fail on this build (manual-qa-agent ADR-0023).

A green suite only means something if its assertions are able to go red. This test drives the app through the same
page object and the same web-first ``expect`` as the real tests, but expects a value that is known to be false: one
todo shows "1 item left", never "2 items left" (the nearest wrong value, so the check must really compare).

``xfail(strict=True, raises=AssertionError)`` turns that into a guard on the run itself:
- the assertion fails as it should      -> XFAIL, the run stays green;
- the assertion passes (it can't fail)  -> XPASS(strict) is reported as FAILED, the run goes red;
- anything else breaks (navigation, a locator, a timeout that isn't an assertion) -> FAILED, not hidden as XFAIL.
"""

import pytest

from qa.assertions import expect
from qa.pages.todo import TodoPage


@pytest.mark.sentinel
@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="sentinel: expects a known-false value; a pass means assertions cannot fail on this build (ADR-0023)",
)
def test_sentinel_known_false_expectation_fails(todo_page: TodoPage) -> None:
    """[SENTINEL] A known-false expectation fails through the real page object and assertion path."""
    todo_page.open()

    todo_page.add_todo("buy milk")

    expect(todo_page.footer.lbl_count).to_have_text("2 items left")
```

Register the marker in `pyproject.toml` (`--strict-markers` rejects an unregistered one):

```toml
    "sentinel: known-false expectation under xfail(strict=True); the run goes red if it ever passes",
```

**How it is checked:** the run summary must show the sentinel as `xfailed` (once per repeat) and nothing as
`xpassed`. `strict=True` turns a pass into a failure; `raises=AssertionError` keeps a navigation error or a missing
element from being counted as the expected failure. Pick the nearest wrong value ("2 items left" against the true
"1 item left"), so the check must really compare. The sentinel is never a can-fail target — it is already the
failing case — and never deleted to make a run green: an XPASS means stop trusting the run until it is explained.

---

## Metamorphic relations and derived values

**When:** the exact expected value is unknown, expensive to state, or owned by someone else (a shared server whose
data other people change), but a relation between two reads must hold: two filters partition a list; a counter and a
row count are two independent paths to one number; an action followed by its inverse restores the state; a search
with more terms returns a superset; an update moves a record from one result to another. Mark them `metamorphic`
(register the marker like `sentinel`) and trace them to the AC whose behaviour the relation follows.

Rules that keep a relation honest:

- **Anchor it on data the test created.** A relation over two empty results holds vacuously; assert at least one
  concrete fact about the test's own records (`count(pet.id) == 1`, the row deleted shrank All by one).
- **Read each side after a real sync point.** `count_under()` waits for the filter's `selected` class before
  counting; the inverse check first proves the forward action changed something (`{before - 1} items left`),
  otherwise "restored" passes without anything having happened.
- **Never compare a value with itself.** The two sides come from different paths (label vs rows, two searches).

Page-object support — a filter that waits for the app's own signal, and a counter parsed to a number:

`src/qa/components/containers/todo/footer.py`

```python
import re
from typing import Literal

from playwright.sync_api import Page

from qa.ui.elements import Button, Label, Link

TodoFilter = Literal["All", "Active", "Completed"]

_ITEMS_LEFT = re.compile(r"^(\d+) items? left$")


class TodoFooterContainer:
    """Counter, filters and clear-completed; rendered only when at least one todo exists."""

    def __init__(self, page: Page) -> None:
        self._root = page.locator("footer.footer")
        self.lbl_count = Label(self._root.get_by_test_id("todo-count"))
        self.btn_clear_completed = Button(self._root.get_by_role("button", name="Clear completed"))

    def filter_link(self, name: TodoFilter) -> Link:
        """One link per filter, built per call."""
        return Link(self._root.get_by_role("link", name=name, exact=True))

    def wait_until_selected(self, name: TodoFilter) -> None:
        """Wait for the app's own signal that the filter is applied: the link gets the ``selected`` class."""
        self.filter_link(name).locator.and_(self._root.locator("a.selected")).wait_for()

    def items_left(self) -> int:
        """The number the counter shows ("2 items left" -> 2); a snapshot, read it after a sync point."""
        text = self.lbl_count.text()
        match = _ITEMS_LEFT.match(text)
        if match is None:
            raise ValueError(f"todo counter has an unexpected format: {text!r}")
        return int(match.group(1))
```

`src/qa/pages/todo.py`

```python
from playwright.sync_api import Page

from qa.components.containers.todo.footer import TodoFilter, TodoFooterContainer
from qa.components.containers.todo.header import TodoHeaderContainer
from qa.components.containers.todo.main import TodoMainContainer


class TodoPage:
    """The todo list screen: composes its three regions; methods express user intent and delegate."""

    PATH = "/todomvc/#/"

    def __init__(self, page: Page) -> None:
        self._page = page
        self.header = TodoHeaderContainer(page)
        self.main = TodoMainContainer(page)
        self.footer = TodoFooterContainer(page)

    def open(self) -> None:
        self._page.goto(self.PATH)

    def add_todo(self, title: str) -> None:
        self.header.txt_new_todo.submit(title)

    def complete_todo(self, title: str) -> None:
        self.main.item(title).chk_toggle.check()

    def uncomplete_todo(self, title: str) -> None:
        self.main.item(title).chk_toggle.uncheck()

    def delete_todo(self, title: str) -> None:
        row = self.main.item(title)
        row.hover()
        row.btn_delete.click()

    def filter_by(self, name: TodoFilter) -> None:
        self.footer.filter_link(name).click()

    def count_under(self, name: TodoFilter) -> int:
        """Show filter ``name``, wait until the app marks it selected, and count the rows it shows."""
        self.filter_by(name)
        self.footer.wait_until_selected(name)
        return self.main.count()
```

UI relations — `tests/e2e/test_todo_metamorphic.py`

```python
"""Metamorphic relations and derived values for the todo list (AC-TODO-001, AC-TODO-002).

Each test checks a relation that must hold between two independent reads of the same state, or between a state and
the state after an action and its inverse — so it needs no hand-written oracle for every intermediate value.
"""

import pytest

from qa.assertions import eventually, expect
from qa.pages.todo import TodoPage

TITLES = ["write report", "call bank", "book flight", "pay rent", "water plants"]
COMPLETED = ["call bank", "pay rent"]


@pytest.mark.P1
@pytest.mark.metamorphic
@pytest.mark.requirement("AC-TODO-002")
@pytest.mark.parametrize("deleted", ["book flight", "pay rent"], ids=["delete active", "delete completed"])
def test_filters_partition_all_and_counter_equals_active(todo_page: TodoPage, deleted: str) -> None:
    """[MR-TODO-01] After add/complete/delete, |Active| + |Completed| == |All| and the counter equals |Active|."""
    todo_page.open()
    for title in TITLES:
        todo_page.add_todo(title)
    for title in COMPLETED:
        todo_page.complete_todo(title)
    # audit-ignore R-TEARDOWN: deleting a todo is a step under test here, not cleanup
    todo_page.delete_todo(deleted)

    all_rows = todo_page.count_under("All")
    active_rows = todo_page.count_under("Active")
    completed_rows = todo_page.count_under("Completed")

    # Relation 1: the Active and Completed filters partition All (no todo in both, none in neither).
    assert active_rows + completed_rows == all_rows
    # Relation 2: two independent paths to the same number, the counter label and the rows under Active.
    assert todo_page.footer.items_left() == active_rows
    # Derived value: the deletion removed exactly one row, so All shrank by one from what was added.
    assert len(TITLES) - all_rows == 1
    expect(todo_page.footer.lbl_count).to_have_text(f"{active_rows} items left")


@pytest.mark.P1
@pytest.mark.metamorphic
@pytest.mark.requirement("AC-TODO-002")
def test_complete_then_uncomplete_restores_counter(todo_page: TodoPage) -> None:
    """[MR-TODO-02] Completing a todo and un-completing it again (the inverse action) restores the counter."""
    todo_page.open()
    for title in TITLES:
        todo_page.add_todo(title)
    eventually(lambda: _assert_titles(todo_page, TITLES))
    before = todo_page.footer.items_left()

    todo_page.complete_todo("call bank")
    # Sync point and the forward half of the relation: the action changed the counter by exactly one.
    expect(todo_page.footer.lbl_count).to_have_text(f"{before - 1} items left")

    todo_page.uncomplete_todo("call bank")

    expect(todo_page.footer.lbl_count).to_have_text(f"{before} items left")
    expect(todo_page.main.item("call bank").chk_toggle).not_to_be_checked()
    eventually(lambda: _assert_titles(todo_page, TITLES))


def _assert_titles(todo_page: TodoPage, expected: list[str]) -> None:
    assert todo_page.main.titles() == expected
```

API relations on a shared server — `tests/api/test_pet_metamorphic.py`

```python
"""Metamorphic relations between Pet API searches (AC-PET-003).

The Petstore is shared: other people's pets come and go in every search result, so these tests never assert a whole
result. They assert relations about the pets this test created (unique ids and tag names), which hold whatever else
is on the server.
"""

import pytest

from qa.api.schema import assert_matches
from qa.api.services.pet import PetService
from qa.data.pets import PetFactory, unique_label
from qa.models.pet import PetStatus


@pytest.mark.P1
@pytest.mark.metamorphic
@pytest.mark.requirement("AC-PET-003")
def test_status_update_moves_pet_between_status_searches(pet_factory: PetFactory, pet_service: PetService) -> None:
    """[MR-PET-01] A pet is found under exactly one status, and updating the status moves it to the other search."""
    pet = pet_factory.create(PetStatus.AVAILABLE)
    assert pet.id is not None

    assert _ids_by_status(pet_service, PetStatus.AVAILABLE).count(pet.id) == 1
    assert _ids_by_status(pet_service, PetStatus.SOLD).count(pet.id) == 0

    response = pet_service.update_pet(pet.model_copy(update={"status": PetStatus.SOLD}))
    assert response.status_code == 200

    assert _ids_by_status(pet_service, PetStatus.AVAILABLE).count(pet.id) == 0
    assert _ids_by_status(pet_service, PetStatus.SOLD).count(pet.id) == 1


@pytest.mark.P2
@pytest.mark.metamorphic
@pytest.mark.requirement("AC-PET-003")
def test_find_by_more_tags_returns_a_superset(pet_factory: PetFactory, pet_service: PetService) -> None:
    """[MR-PET-02] Adding a tag to the search never loses a result: findByTags(a, b) ⊇ findByTags(a)."""
    tag_a, tag_b = unique_label("autotest-tag-a"), unique_label("autotest-tag-b")
    pet_a = pet_factory.create(PetStatus.AVAILABLE, tags=[tag_a])
    pet_b = pet_factory.create(PetStatus.AVAILABLE, tags=[tag_b])

    one_tag = pet_service.find_pets_by_tags([tag_a])
    two_tags = pet_service.find_pets_by_tags([tag_a, tag_b])

    assert (one_tag.status_code, two_tags.status_code) == (200, 200)
    assert_matches(two_tags, "pet", "findPetsByTags_200")
    one_ids = [pet.id for pet in one_tag.data]
    two_ids = [pet.id for pet in two_tags.data]
    # The relation: nothing found by the narrower search is missing from the wider one.
    assert len(set(one_ids) - set(two_ids)) == 0
    # Anchors on this test's own pets, so the relation can't hold vacuously over two empty results.
    assert (one_ids.count(pet_a.id), one_ids.count(pet_b.id)) == (1, 0)
    assert (two_ids.count(pet_a.id), two_ids.count(pet_b.id)) == (1, 1)


def _ids_by_status(pet_service: PetService, status: PetStatus) -> list[int | None]:
    response = pet_service.find_pets_by_status(status)
    assert response.status_code == 200
    return [pet.id for pet in response.data]
```

**How it is checked:** the relations ran green 3× with 4 workers against the live apps, and each was proven able to
fail. `can-fail` mutated the lines it recognises (counts, status codes, the derived counter text: 15 killed, 0
survived in the two files); the relation lines it can't mutate (no literal, or inside `eventually`) were mutated by
hand (`+ 1` on one side, a truncated title list): every mutant failed. Write relations so a mutation is visible —
`count(pet.id) == 1` rather than `pet.id in ids`, `len(narrow - wide) == 0` rather than `narrow <= wide` — and keep
assertion messages off the assertion line: `can-fail` mutates the last literal on the line, and a mutated message
always survives.

---

## Run and verify

```bash
uv run pytest tests/e2e/test_todo.py tests/api/test_pet.py -q           # green, retries off
uv run pytest -q --count=3                                              # repeated
uv run pytest -q -n 4                                                   # parallel
uv run pytest -q -m "metamorphic or sentinel"                          # the relation tests and the sentinel
uv run pytest -q --count=3 -n 4 -rsxX                                   # the gate: sentinel XFAIL, nothing skipped
node scripts/can-fail.mjs --max 50 --run "uv run pytest {file} -q -p no:cacheprovider" tests/e2e/test_todo.py
node scripts/audit-suite.mjs . --fail-on block                          # audit
```

"Can it fail?": `can-fail` breaks one expected value at a time and must report every mutant killed; for lines it
can't mutate (`eventually(...)`, relations without a literal), change the expected value by hand, confirm the
failure shows the actual value, restore it. `can-fail` needs the target configured (`BASE_URL`, `API_DOMAIN`): with
it unset every test is skipped, the unmutated run "passes", and every mutant survives.

The whole sequence on a fresh scaffold: `bash ../examples/pytest-playwright/run-examples.sh` (from this skill's
folder: `examples/pytest-playwright/run-examples.sh`).
