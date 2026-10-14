---
description: Tests reach pages and services only through the composition root, and hold no instance state
globs: ['src/test/java/**/*.java']
---

# Composition Root

Tests extend `BaseTest` (API) or `BaseUiTest` (UI) and get everything through `pages()`, `services()`, `data()`,
and `context()`.

```java
// ✅ Correct
TodoPage todo = pages().todo();
ApiResponse<Pet> response = services().pet().getPetById(id);
Pet pet = data().pets().create(PetStatus.AVAILABLE);   // factory registers its own cleanup

// ❌ Wrong — bypasses registration, credentials, and teardown
TodoPage todo = new TodoPage();
PetService pets = new PetService();
```

Test classes declare **no instance fields** (no driver, page, service, or data fields): TestNG runs methods of one
instance in parallel threads, so an instance field is shared mutable state between tests. Use local variables.
