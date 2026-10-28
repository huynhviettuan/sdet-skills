# Code Templates — Python (httpx + pydantic)

Services for the `init-pytest-playwright-framework` scaffold, generated 1:1 from Swagger Petstore 3.0 (`tag: pet`).
Verified on 2026-10-28 against the live TodoMVC demo and Swagger Petstore: 9/9 tests green with retries off, 27/27 on `--count=3`, 9/9 with `-n 4`, ruff + mypy strict clean, audit 0 findings; breaking an expected value fails with the actual value (`Actual value: 1 item left`). `openapi-tool coverage --tags pet` reports 7/8 mapped, 1 skipped.

Contents:

- [Mapping in Python](#mapping-in-python)
- [Models](#models)
- [Service](#service)
- [Credentials and registration](#credentials-and-registration)
- [Schemas and coverage](#schemas-and-coverage)

---

## Mapping in Python

| OpenAPI | Python |
|---|---|
| tag | one `XxxService(BaseService)` in `src/qa/api/services/<tag>.py` |
| operation | one method, name = **snake_case(operationId)**; the docstring starts with `@operationId <id>` and `METHOD /path` (what coverage matches) |
| path params | positional arguments, filled with `self.path_of("/pet/{petId}", petId=pet_id)` — the spec path stays verbatim |
| query params | keyword arguments; `None` values are dropped |
| request body | the model; sent with `model_dump(by_alias=True, exclude_none=True)` |
| response | `ApiResponse[Model]`: `status_code`, `text`, `json()`, `data` (validated on first access) |
| `components.schemas` | pydantic models in `src/qa/models/<tag>.py`; camelCase fields through `Field(alias=...)`; enums as `StrEnum` |
| skipped operation | a `#` comment block with `@operationId` and `@skipped <reason>` where the method would be |

Composition: a service **receives** the worker's `httpx.Client` (base URL and credentials applied once in the
fixture); it holds no configuration and never asserts.

---

## Models

`src/qa/models/pet.py`

```python
"""Generated from components.schemas of specs/petstore.json (Swagger Petstore - OpenAPI 3.0), tag ``pet``."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class PetStatus(StrEnum):
    AVAILABLE = "available"
    PENDING = "pending"
    SOLD = "sold"


class Category(BaseModel):
    id: int | None = None
    name: str | None = None


class Tag(BaseModel):
    id: int | None = None
    name: str | None = None


class Pet(BaseModel):
    """components.schemas.Pet. Required: name, photoUrls."""

    model_config = ConfigDict(populate_by_name=True)

    id: int | None = None
    name: str
    category: Category | None = None
    photo_urls: list[str] = Field(alias="photoUrls")
    tags: list[Tag] | None = None
    status: PetStatus | None = None
```

---

## Service

`src/qa/api/services/pet.py`

```python
from qa.api.base_service import ApiResponse, BaseService
from qa.models.pet import Pet, PetStatus


class PetService(BaseService):
    """Generated 1:1 from OpenAPI tag ``pet`` — Swagger Petstore - OpenAPI 3.0 1.0.27.

    One method per operation; method name = snake_case(operationId); the ``@operationId`` line in each docstring is
    what ``openapi-tool coverage`` matches. Regenerate from the spec instead of renaming.
    """

    def update_pet(self, body: Pet) -> ApiResponse[Pet]:
        """
        @operationId updatePet
        PUT /pet
        """
        return self.send("PUT", "/pet", model=Pet, json_body=body.model_dump(by_alias=True, exclude_none=True))

    def add_pet(self, body: Pet) -> ApiResponse[Pet]:
        """
        @operationId addPet
        POST /pet
        """
        return self.send("POST", "/pet", model=Pet, json_body=body.model_dump(by_alias=True, exclude_none=True))

    def find_pets_by_status(self, status: PetStatus | None = None) -> ApiResponse[list[Pet]]:
        """
        @operationId findPetsByStatus
        GET /pet/findByStatus
        """
        return self.send("GET", "/pet/findByStatus", model=list[Pet], params={"status": status})

    def find_pets_by_tags(self, tags: list[str] | None = None) -> ApiResponse[list[Pet]]:
        """
        @operationId findPetsByTags
        GET /pet/findByTags
        """
        return self.send("GET", "/pet/findByTags", model=list[Pet], params={"tags": tags})

    def get_pet_by_id(self, pet_id: int) -> ApiResponse[Pet]:
        """
        @operationId getPetById
        GET /pet/{petId}
        """
        return self.send("GET", self.path_of("/pet/{petId}", petId=pet_id), model=Pet)

    def update_pet_with_form(self, pet_id: int, name: str | None = None, status: str | None = None) -> ApiResponse[Pet]:
        """
        @operationId updatePetWithForm
        POST /pet/{petId}
        """
        return self.send(
            "POST", self.path_of("/pet/{petId}", petId=pet_id), model=Pet, params={"name": name, "status": status}
        )

    def delete_pet(self, pet_id: int) -> ApiResponse[None]:
        """
        @operationId deletePet
        DELETE /pet/{petId}
        """
        return self.send("DELETE", self.path_of("/pet/{petId}", petId=pet_id))

    # @operationId uploadFile
    # POST /pet/{petId}/uploadImage
    # @skipped request body is application/octet-stream; BaseService sends JSON bodies only
```

---

## Credentials and registration

`src/qa/fixtures/services.py`

```python
"""API fixtures: one ``httpx.Client`` per worker carrying the base URL and credentials, one service per test.

Credentials come from the spec's ``securitySchemes`` and are applied here, once (``service-builder``).
"""

from __future__ import annotations

from collections.abc import Iterator

import httpx
import pytest

from qa.api.services.pet import PetService
from qa.config import CONFIG


@pytest.fixture(scope="session")
def api_client() -> Iterator[httpx.Client]:
    if not CONFIG.api_domain:
        pytest.skip("API_DOMAIN is not set")
    headers = {"api_key": CONFIG.api_key} if CONFIG.api_key else {}
    with httpx.Client(base_url=CONFIG.api_domain, headers=headers, timeout=30.0) as client:
        yield client


@pytest.fixture
def pet_service(api_client: httpx.Client) -> PetService:
    return PetService(api_client)
```

`api_key` comes from `securitySchemes.api_key` (header). A bearer token obtained through the API is a session-scoped
fixture that signs in once and sets `Authorization` on the client; a cookie session sets the cookie header and, for
APIs that check `Origin`, the app's origin (`mapping-rules.md` → Auth).

---

## Schemas and coverage

```bash
node scripts/openapi-tool.mjs schemas specs/petstore.json --out-dir src/qa/schemas
node scripts/openapi-tool.mjs coverage specs/petstore.json --services src/qa/api/services --tags pet
```

Tests validate with `qa.api.schema.assert_matches(response, "pet", "getPetById_200")`.
