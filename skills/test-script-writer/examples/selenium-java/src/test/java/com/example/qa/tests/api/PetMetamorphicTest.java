package com.example.qa.tests.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.api.ApiResponse;
import com.example.qa.api.SchemaValidator;
import com.example.qa.api.models.pet.FindPetsByStatusQuery;
import com.example.qa.api.models.pet.FindPetsByTagsQuery;
import com.example.qa.api.models.pet.Pet;
import com.example.qa.api.models.pet.PetStatus;
import com.example.qa.testbase.BaseTest;
import io.qameta.allure.Feature;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.testng.annotations.Test;

/**
 * Metamorphic relations for the pet search operations (docs/test-cases/pet.md, MR-PET-...). The Petstore is a shared
 * public server, so its full result lists are unknowable; the relations are stated over pets this test created, with
 * unique names and tags, and the factory deletes them after the test.
 */
@Feature("Pet API")
public class PetMetamorphicTest extends BaseTest {

    @Test(groups = {"metamorphic", "P1"},
            description = "[MR-PET-001] A pet is found under exactly its own status, before and after the status changes")
    public void statusSearchFollowsTheUpdate() {
        Pet pet = data().pets().create(PetStatus.AVAILABLE);

        // Source input: the status partitions are disjoint, the pet is under available and not under sold
        assertThat(idsWithStatus(PetStatus.AVAILABLE)).contains(pet.getId());
        assertThat(idsWithStatus(PetStatus.SOLD)).doesNotContain(pet.getId());

        // Follow-up input: change only the status
        Pet sold = Pet.builder().id(pet.getId()).name(pet.getName()).photoUrls(pet.getPhotoUrls())
                .tags(pet.getTags()).status(PetStatus.SOLD).build();
        ApiResponse<Pet> update = services().pet().updatePet(sold);
        assertThat(update.statusCode()).isEqualTo(200);

        // Relation: the pet moved between partitions, now under sold and no longer under available
        assertThat(idsWithStatus(PetStatus.SOLD)).contains(pet.getId());
        assertThat(idsWithStatus(PetStatus.AVAILABLE)).doesNotContain(pet.getId());
    }

    @Test(groups = {"metamorphic", "P2"},
            description = "[MR-PET-002] Searching by two tags returns a superset of searching by one of them")
    public void moreTagsReturnASuperset() {
        String tagA = data().pets().uniqueTag();
        String tagB = data().pets().uniqueTag();
        Pet withA = data().pets().create(PetStatus.AVAILABLE, tagA);
        Pet withB = data().pets().create(PetStatus.AVAILABLE, tagB);

        Set<Long> byA = idsWithTags(tagA);
        Set<Long> byAandB = idsWithTags(tagA, tagB);

        // Relation: adding a tag to the filter never drops a result
        assertThat(byAandB).containsAll(byA);
        // Derived values: the unique tags match exactly the pets created here
        assertThat(byA).containsExactly(withA.getId());
        assertThat(byAandB).containsExactlyInAnyOrder(withA.getId(), withB.getId());
    }

    private List<Long> idsWithStatus(PetStatus status) {
        ApiResponse<List<Pet>> response = services().pet()
                .findPetsByStatus(FindPetsByStatusQuery.builder().status(status).build());
        assertThat(response.statusCode()).isEqualTo(200);
        SchemaValidator.assertMatches(response, "pet", "findPetsByStatus_200");
        return response.body().stream().map(Pet::getId).toList();
    }

    /** Ids as a set: the server returns a pet once per matching tag. */
    private Set<Long> idsWithTags(String... tags) {
        ApiResponse<List<Pet>> response = services().pet()
                .findPetsByTags(FindPetsByTagsQuery.builder().tags(List.of(tags)).build());
        assertThat(response.statusCode()).isEqualTo(200);
        SchemaValidator.assertMatches(response, "pet", "findPetsByTags_200");
        return response.body().stream().map(Pet::getId).collect(Collectors.toSet());
    }
}
