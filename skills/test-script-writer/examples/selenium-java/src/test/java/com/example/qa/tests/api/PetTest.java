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
        // Act
        ApiResponse<List<Pet>> response = services().pet()
                .findPetsByStatus(FindPetsByStatusQuery.builder().status(status).build());

        // Assert
        assertThat(response.statusCode()).isEqualTo(200);
        SchemaValidator.assertMatches(response, "pet", "findPetsByStatus_200");
        assertThat(response.body()).allSatisfy(pet -> assertThat(pet.getStatus()).isEqualTo(status));
    }
}
