"""Implements docs/test-cases/pet.md (test-script-writer → references/sample-test-cases.md)."""

from typing import Any

import pytest

from qa.api.schema import assert_matches, assert_value_matches
from qa.api.services.pet import PetService
from qa.data.pets import PetFactory
from qa.models.pet import Pet, PetStatus


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
def test_find_by_status_returns_only_that_status(
    pet_factory: PetFactory, pet_service: PetService, status: PetStatus
) -> None:
    """[TC-PET-003] Search by status returns only pets with that status."""
    pet = pet_factory.create(status)

    response = pet_service.find_pets_by_status(status)

    # The contract is checked on the record this test owns; other users' records on the shared server may
    # violate the spec (three nameless pets on 2026-11-02), and that is their finding, not this case's — so the
    # list is scanned raw (parsing it into Pet would assert their shape) and only our record is parsed and validated.
    assert response.status_code == 200
    listed: list[dict[str, Any]] = response.json()
    assert {found.get("status") for found in listed} <= {status.value}
    ours = next((found for found in listed if found.get("id") == pet.id), None)
    assert ours is not None, f"pet {pet.id} created with status {status.value} is listed"
    assert Pet.model_validate(ours).status == status
    assert_value_matches(ours, "pet", "getPetById_200")
