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
