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
