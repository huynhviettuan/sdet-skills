package com.example.qa.api.services;

import com.example.qa.api.ApiRequest;
import com.example.qa.api.ApiResponse;
import com.example.qa.api.BaseService;
import com.example.qa.api.models.pet.FindPetsByStatusQuery;
import com.example.qa.api.models.pet.FindPetsByTagsQuery;
import com.example.qa.api.models.pet.Pet;
import com.example.qa.api.models.pet.UpdatePetWithFormQuery;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.http.Method;
import java.util.List;

/**
 * Generated 1:1 from OpenAPI tag {@code pet} — Swagger Petstore - OpenAPI 3.0 (3.0.4), specs/petstore.json.
 * One method per operation; method name = operationId. Regenerate from the spec instead of renaming.
 */
public class PetService extends BaseService {

    /**
     * @operationId updatePet
     * PUT /pet
     */
    public ApiResponse<Pet> updatePet(Pet body) {
        return send(Method.PUT, "/pet", ApiRequest.with().body(body), Pet.class);
    }

    /**
     * @operationId addPet
     * POST /pet
     */
    public ApiResponse<Pet> addPet(Pet body) {
        return send(Method.POST, "/pet", ApiRequest.with().body(body), Pet.class);
    }

    /**
     * @operationId findPetsByStatus
     * GET /pet/findByStatus
     */
    public ApiResponse<List<Pet>> findPetsByStatus(FindPetsByStatusQuery query) {
        return send(Method.GET, "/pet/findByStatus", ApiRequest.with().query(query), new TypeReference<>() {
        });
    }

    /**
     * @operationId findPetsByTags
     * GET /pet/findByTags
     */
    public ApiResponse<List<Pet>> findPetsByTags(FindPetsByTagsQuery query) {
        return send(Method.GET, "/pet/findByTags", ApiRequest.with().query(query), new TypeReference<>() {
        });
    }

    /**
     * @operationId getPetById
     * GET /pet/{petId}
     */
    public ApiResponse<Pet> getPetById(long petId) {
        return send(Method.GET, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId), Pet.class);
    }

    /**
     * @operationId updatePetWithForm
     * POST /pet/{petId}
     */
    public ApiResponse<Pet> updatePetWithForm(long petId, UpdatePetWithFormQuery query) {
        return send(Method.POST, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId).query(query), Pet.class);
    }

    /**
     * @operationId deletePet
     * DELETE /pet/{petId}
     */
    public ApiResponse<Void> deletePet(long petId) {
        return send(Method.DELETE, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId));
    }

    /**
     * @operationId uploadFile
     * POST /pet/{petId}/uploadImage
     * @skipped request body is application/octet-stream; BaseService sends JSON bodies only
     */
}
