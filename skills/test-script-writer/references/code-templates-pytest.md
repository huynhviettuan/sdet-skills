# Code Templates — pytest (Python)

The implementation of [`sample-test-cases.md`](sample-test-cases.md) for the `init-pytest-playwright-framework`
scaffold. Verified on 2026-10-28 against the live TodoMVC demo and Swagger Petstore: 9/9 tests green with retries off, 27/27 on `--count=3`, 9/9 with `-n 4`, ruff + mypy strict clean, audit 0 findings; breaking an expected value fails with the actual value (`Actual value: 1 item left`). Prerequisites (TodoPage, PetService, models, schemas) come from `page-builder` and
`service-builder` (Python templates).

Contents:

- [Data factory](#data-factory)
- [UI tests](#ui-tests)
- [API tests](#api-tests)
- [Run and verify](#run-and-verify)

---

## Data factory

`src/qa/data/pets.py`

```python
import random

from qa.api.services.pet import PetService
from qa.models.pet import Pet, PetStatus


class PetFactory:
    """Creates pets through the API for test preconditions and deletes them in the fixture's teardown."""

    def __init__(self, service: PetService) -> None:
        self._service = service
        self._created: list[int] = []

    def create(self, status: PetStatus = PetStatus.AVAILABLE) -> Pet:
        """A new pet with a unique id and name."""
        pet_id = random.randint(1_000_000_000, 9_000_000_000)
        response = self._service.add_pet(Pet(id=pet_id, name=f"autotest-pet-{pet_id}", photo_urls=[], status=status))
        if response.status_code != 200:
            raise RuntimeError(f"Precondition failed: addPet returned {response.status_code} {response.text[:200]}")
        self._created.append(pet_id)
        return response.data

    def cleanup(self) -> None:
        """Idempotent: a 404 means the test already deleted it."""
        for pet_id in self._created:
            self._service.delete_pet(pet_id)
        self._created.clear()
```

Registered with teardown after `yield` (runs even when the test fails):

`src/qa/fixtures/data.py`

```python
"""Data factories: create through a service, clean up after ``yield`` (runs even when the test fails)."""

from __future__ import annotations

from collections.abc import Iterator

import pytest

from qa.api.services.pet import PetService
from qa.data.pets import PetFactory


@pytest.fixture
def pet_factory(pet_service: PetService) -> Iterator[PetFactory]:
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
    assert pet_service.delete_pet(pet.id).status_code == 200, "precondition: delete"

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

## Run and verify

```bash
uv run pytest tests/e2e/test_todo.py tests/api/test_pet.py -q           # green, retries off
uv run pytest -q --count=3                                              # repeated
uv run pytest -q -n 4                                                   # parallel
node scripts/audit-suite.mjs . --fail-on block                          # audit
```

"Can it fail?": change one expected value, run, confirm the failure shows the actual value, restore it.
