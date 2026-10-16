# Code Templates — RestAssured / Java

Templates for the init-selenium-java-framework scaffold (RestAssured, TestNG, Jackson, Lombok, AssertJ), shown with
Swagger Petstore 3.0 (`tag: pet`). They compile against the scaffold's `BaseService`, `ApiRequest`, `ApiResponse`,
and `SchemaValidator`, and the smoke test passes against the public Petstore in parallel TestNG threads — use them
verbatim, replacing names.

Contents:

- [Models](#models)
- [Query object](#query-object)
- [Service](#service)
- [Skipped operation](#skipped-operation)
- [Credentials and registration](#credentials-and-registration)
- [Schemas](#schemas)
- [Smoke test per service](#smoke-test-per-service)
- [Review checklist](#review-checklist)

---

## Models

`src/main/java/com/example/qa/api/models/pet/` — one class per `components.schemas` entry the tag uses.

```java
package com.example.qa.api.models.pet;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Generated from components.schemas.Pet. Required: name, photoUrls. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pet {
    private Long id;
    private String name;
    private Category category;
    private List<String> photoUrls;
    private List<Tag> tags;
    private PetStatus status;
}
```

Enums carry the wire value:

```java
package com.example.qa.api.models.pet;

import com.fasterxml.jackson.annotation.JsonValue;

/** Generated from components.schemas.Pet.properties.status (enum). */
public enum PetStatus {
    AVAILABLE("available"),
    PENDING("pending"),
    SOLD("sold");

    private final String value;

    PetStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
```

`Category` and `Tag` follow the `Pet` shape (`Long id; String name;`).

---

## Query object

One per operation with query parameters, in the tag's model package:

```java
package com.example.qa.api.models.pet;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Query parameters of operation findPetsByStatus. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindPetsByStatusQuery {
    private PetStatus status;
}
```

`ApiRequest.query(object)` converts it with Jackson: enum wire values via `@JsonValue`, null fields dropped.

---

## Service

`src/main/java/com/example/qa/api/services/PetService.java` — methods in spec order.

```java
package com.example.qa.api.services;

import com.example.qa.api.ApiRequest;
import com.example.qa.api.ApiResponse;
import com.example.qa.api.BaseService;
import com.example.qa.api.models.pet.FindPetsByStatusQuery;
import com.example.qa.api.models.pet.Pet;
import com.fasterxml.jackson.core.type.TypeReference;
import io.restassured.http.Method;
import java.util.List;

/**
 * Generated 1:1 from OpenAPI tag {@code pet} — <API title> <spec version>.
 * One method per operation; method name = operationId. Regenerate from the spec instead of renaming.
 */
public class PetService extends BaseService {

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
     * @operationId getPetById
     * GET /pet/{petId}
     */
    public ApiResponse<Pet> getPetById(long petId) {
        return send(Method.GET, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId), Pet.class);
    }

    /**
     * @operationId deletePet
     * DELETE /pet/{petId}
     */
    public ApiResponse<Void> deletePet(long petId) {
        return send(Method.DELETE, "/pet/{petId}", ApiRequest.with().pathParam("petId", petId));
    }
}
```

The excerpt shows four of the eight `pet` operations. The full class also has `updatePet` (PUT `/pet`, body `Pet`),
`findPetsByTags` (query object with `List<String> tags`) and `updatePetWithForm` (path `petId` + query `name`,
`status`) in the same shape, plus the skipped `uploadFile` below: coverage `--tags pet` reports 7/8 mapped, 1 skipped.

RestAssured fills `{petId}` from `pathParam`, so the spec path stays verbatim and grep-identical to the spec.
`BaseService` splits `API_DOMAIN` into base URI and base path (e.g. `https://petstore3.swagger.io` + `/api/v3`).

---

## Skipped operation

Inside the class, where the method would be:

```java
    /**
     * @operationId uploadFile
     * POST /pet/{petId}/uploadImage
     * @skipped request body is application/octet-stream; BaseService sends JSON bodies only (OQ-004)
     */
```

---

## Credentials and registration

`src/main/java/com/example/qa/api/Credentials.java` — one method per `securitySchemes` entry, from env / `-D` only:

```java
package com.example.qa.api;

import com.example.qa.config.Config;

/** Credentials per securitySchemes entry, from environment / -D only. */
public final class Credentials {

    private Credentials() {
    }

    /** securitySchemes.api_key: apiKey in header {@code api_key}. */
    public static String apiKey() {
        return Config.get("API_KEY");
    }
}
```

A bearer token obtained through the API is fetched once per run and shared read-only across threads (the auth service,
request model, and token field come from the spec's login operation — names here are illustrative):

```java
private static final Map<String, String> TOKENS = new ConcurrentHashMap<>();

public static String token(String role) {
    return TOKENS.computeIfAbsent(role, r -> new AuthService().login(LoginRequest.forRole(r)).body().getAccessToken());
}
```

`src/main/java/com/example/qa/context/Services.java` — one accessor per service:

```java
public PetService pet() {
    return get(PetService.class, () -> {
        PetService service = new PetService();
        service.setHeader("api_key", Credentials.apiKey());
        return service;
    });
}
```

`docs/registry/services.md`:

```md
| Service | Class | Accessor | Spec tag | Operations | Models |
| --- | --- | --- | --- | --- | --- |
| Pet | `api.services.PetService` | `services().pet()` | `pet` | 7 + 1 skipped (see `@operationId`) | `api.models.pet` |
```

---

## Schemas

```bash
node scripts/openapi-tool.mjs schemas specs/petstore.json --out-dir src/test/resources/schemas
node scripts/openapi-tool.mjs coverage specs/petstore.json --services src/main/java/com/example/qa/api/services --tags pet
```

---

## Smoke test per service

`src/test/java/com/example/qa/tests/api/PetSmokeTest.java` — one read-only call per service proves wiring, auth,
and the schema.

```java
package com.example.qa.tests.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.api.ApiResponse;
import com.example.qa.api.SchemaValidator;
import com.example.qa.api.models.pet.FindPetsByStatusQuery;
import com.example.qa.api.models.pet.Pet;
import com.example.qa.api.models.pet.PetStatus;
import com.example.qa.testbase.BaseTest;
import java.util.List;
import org.testng.annotations.Test;

public class PetSmokeTest extends BaseTest {

    @Test(groups = "smoke", description = "[findPetsByStatus] returns pets matching the requested status")
    public void findPetsByStatusReturnsMatchingPets() {
        ApiResponse<List<Pet>> response = services().pet()
                .findPetsByStatus(FindPetsByStatusQuery.builder().status(PetStatus.AVAILABLE).build());

        assertThat(response.statusCode()).isEqualTo(200);
        SchemaValidator.assertMatches(response, "pet", "findPetsByStatus_200");
        assertThat(response.body()).isNotEmpty().allSatisfy(pet -> assertThat(pet.getStatus()).isEqualTo(PetStatus.AVAILABLE));
    }
}
```

Run: `mvn test -Dtest=PetSmokeTest -DAPI_DOMAIN=https://petstore3.swagger.io/api/v3` with `API_KEY` exported.

---

## Review checklist

```text
[ ] Spec stored in specs/; inventory regenerated from it
[ ] coverage: 0 missing, 0 extra, 0 duplicate; every SKIPPED has a reason + OQ
[ ] Method names = operationIds; Javadoc @operationId + METHOD /path on every method
[ ] Spec paths verbatim with {param} placeholders; no hardcoded host
[ ] Models are Lombok classes with boxed types; enums with @JsonValue; query objects per operation
[ ] Response schemas generated by the tool into src/test/resources/schemas, not edited
[ ] Auth from securitySchemes via Credentials (env / -D only), applied in Services
[ ] Registered in context/Services.java and docs/registry/services.md
[ ] mvn -q test-compile clean; one smoke test per service passes
```
