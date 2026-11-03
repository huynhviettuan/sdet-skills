package com.example.qa.tests.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.api.ApiResponse;
import com.example.qa.api.SchemaValidator;
import com.example.qa.api.models.pet.FindPetsByStatusQuery;
import com.example.qa.api.models.pet.Pet;
import com.example.qa.api.models.pet.PetStatus;
import com.example.qa.testbase.BaseTest;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import java.util.List;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

/** Implements docs/test-cases/pet.md (TC-PET-001..003). */
@Feature("Pet API")
public class PetTest extends BaseTest {

    @Test(groups = {"P0", "smoke"}, description = "[TC-PET-001] Created pet can be retrieved by id")
    @Link(name = "AC-PET-001")
    public void createdPetCanBeRetrievedById() {
        // Arrange
        Pet pet = data().pets().create(PetStatus.AVAILABLE);

        // Act
        ApiResponse<Pet> response = services().pet().getPetById(pet.getId());

        // Assert
        assertThat(response.statusCode()).isEqualTo(200);
        SchemaValidator.assertMatches(response, "pet", "getPetById_200");
        assertThat(response.body())
                .extracting(Pet::getId, Pet::getName, Pet::getStatus)
                .containsExactly(pet.getId(), pet.getName(), PetStatus.AVAILABLE);
    }

    @Test(groups = "P1", description = "[TC-PET-002] Unknown pet id returns 404")
    @Link(name = "AC-PET-002")
    public void unknownPetIdReturns404() {
        // Arrange: an id that certainly doesn't exist, created and then deleted by the factory
        long id = data().pets().absentPetId();

        // Act
        ApiResponse<Pet> response = services().pet().getPetById(id);

        // Assert
        assertThat(response.statusCode()).isEqualTo(404);
    }

    @DataProvider(name = "statuses")
    public Object[][] statuses() {
        return new Object[][] {{PetStatus.AVAILABLE}, {PetStatus.PENDING}, {PetStatus.SOLD}};
    }

    @Test(groups = "P1", dataProvider = "statuses",
            description = "[TC-PET-003] Search by status returns only pets with that status")
    @Link(name = "AC-PET-003")
    public void findByStatusReturnsOnlyThatStatus(PetStatus status) {
        // Arrange: a pet of ours with this status, so the result can't be empty and we own one record's shape
        Pet pet = data().pets().create(status);

        // Act
        ApiResponse<List<Pet>> response = services().pet()
                .findPetsByStatus(FindPetsByStatusQuery.builder().status(status).build());

        // Assert — the contract is checked on the record this test owns; other users' records on the shared
        // server may violate the spec (three nameless pets on 2026-11-02), and that is their finding
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).allSatisfy(found -> assertThat(found.getStatus()).isEqualTo(status));
        Pet ours = response.body().stream().filter(found -> pet.getId().equals(found.getId())).findFirst()
                .orElseThrow(() -> new AssertionError("pet " + pet.getId() + " created with status " + status + " is listed"));
        SchemaValidator.assertMatches(ours, "pet", "getPetById_200");
    }
}
