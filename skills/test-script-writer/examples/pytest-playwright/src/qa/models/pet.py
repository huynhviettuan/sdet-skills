"""Generated from components.schemas of specs/petstore.json (Swagger Petstore - OpenAPI 3.0 1.0.28), tag ``pet``."""

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
