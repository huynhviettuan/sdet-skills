package com.example.qa.data;

import com.example.qa.api.ApiResponse;
import com.example.qa.api.models.pet.Pet;
import com.example.qa.api.models.pet.PetStatus;
import com.example.qa.api.models.pet.Tag;
import com.example.qa.api.services.PetService;
import com.example.qa.config.Config;
import com.example.qa.context.TestContext;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Creates pets through the API for test preconditions and deletes them after the test, from the context's teardown
 * stack (run by BaseTest's @AfterMethod even when an assertion failed). Every pet and tag gets a unique id and name,
 * so parallel tests and other users of a shared Petstore never see each other's data.
 */
public final class PetFactory {

    /** Hosts this factory may write to; override with WRITE_ALLOWED_HOSTS (comma-separated). Never production. */
    private static final Set<String> DEFAULT_WRITE_HOSTS = Set.of("localhost", "127.0.0.1", "petstore3.swagger.io");

    private final PetService service;
    private final TestContext context;

    public PetFactory(PetService service, TestContext context) {
        this.service = service;
        this.context = context;
    }

    /** A new pet with a unique id and name; deleted after the test even if it fails. */
    public Pet create(PetStatus status, String... tagNames) {
        requireWritableTarget();
        long id = uniqueId();
        List<Tag> tags = Arrays.stream(tagNames).map(name -> Tag.builder().id(uniqueId()).name(name).build()).toList();
        Pet pet = Pet.builder().id(id).name("autotest-pet-" + id).photoUrls(List.of()).tags(tags).status(status).build();
        ApiResponse<Pet> response = service.addPet(pet);
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Precondition failed: addPet returned " + response.statusCode() + " "
                    + response.bodyText());
        }
        context.onTeardown("delete pet " + id, () -> service.deletePet(id)); // 404 when already deleted: fine
        return response.body();
    }

    /** The id of a pet that certainly does not exist: created, then deleted (never a "magic" id). */
    public long absentPetId() {
        Pet pet = create(PetStatus.AVAILABLE);
        int status = service.deletePet(pet.getId()).statusCode();
        if (status != 200) {
            throw new IllegalStateException("Precondition failed: deletePet returned " + status);
        }
        return pet.getId();
    }

    /** A tag name no other pet on the server carries. */
    public String uniqueTag() {
        return "autotest-tag-" + uniqueId();
    }

    private static long uniqueId() {
        return ThreadLocalRandom.current().nextLong(1_000_000_000L, 9_000_000_000L);
    }

    /** The suite writes data, so it refuses any API host that is not allowlisted as a test target. */
    private static void requireWritableTarget() {
        String host = URI.create(Config.apiDomain()).getHost();
        Set<String> allowed = Config.find("WRITE_ALLOWED_HOSTS")
                .map(value -> Set.of(value.split("\s*,\s*")))
                .orElse(DEFAULT_WRITE_HOSTS);
        if (!allowed.contains(host)) {
            throw new IllegalStateException("Refusing to create test data on " + host + ": not in " + allowed
                    + " (set WRITE_ALLOWED_HOSTS to a test environment, never production)");
        }
    }
}
