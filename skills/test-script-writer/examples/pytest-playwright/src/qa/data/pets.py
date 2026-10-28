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
