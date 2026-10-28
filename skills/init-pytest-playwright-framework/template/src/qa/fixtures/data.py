"""Data factories: create through a service, delete in teardown (after ``yield``, which runs even when the test
fails). Register new factories here. Example (from ``test-script-writer``):

    @pytest.fixture
    def pet_factory(pet_service: PetService) -> Iterator[PetFactory]:
        factory = PetFactory(pet_service)
        yield factory
        factory.cleanup()
"""

from __future__ import annotations
