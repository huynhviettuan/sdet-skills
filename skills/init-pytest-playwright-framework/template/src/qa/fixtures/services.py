"""API fixtures: one ``httpx.Client`` per worker carrying the base URL and credentials, one service per test.

Credentials come from the spec's ``securitySchemes`` and are applied here, once (``service-builder``). Example:

    @pytest.fixture
    def pet_service(api_client: httpx.Client) -> PetService:
        return PetService(api_client)
"""

from __future__ import annotations

from collections.abc import Iterator

import httpx
import pytest

from qa.config import CONFIG


@pytest.fixture(scope="session")
def api_client() -> Iterator[httpx.Client]:
    if not CONFIG.api_domain:
        pytest.skip("API_DOMAIN is not set")
    headers = {"api_key": CONFIG.api_key} if CONFIG.api_key else {}
    with httpx.Client(base_url=CONFIG.api_domain, headers=headers, timeout=30.0) as client:
        yield client
