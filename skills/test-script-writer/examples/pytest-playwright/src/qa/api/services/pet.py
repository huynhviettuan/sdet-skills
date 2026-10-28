from qa.api.base_service import ApiResponse, BaseService
from qa.models.pet import Pet, PetStatus


class PetService(BaseService):
    """Generated 1:1 from OpenAPI tag ``pet`` — Swagger Petstore - OpenAPI 3.0 1.0.28.

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
