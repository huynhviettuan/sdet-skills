# Composition

Tests receive everything as fixtures registered in `src/qa/fixtures/` (pages, services, data factories) and import
only from `qa.*` and `pytest`.

```python
# ✅
def test_x(todo_page: TodoPage, pet_factory: PetFactory) -> None: ...


# ❌ constructs its own dependencies, talks to Playwright and HTTP directly
def test_x(page: Page) -> None:
    todo = TodoPage(page)
    httpx.post(...)
```

Pages, containers, sections, tests and factories never inherit from each other: a page *has* containers, a
container *has* elements. The only base classes are `Element`, `BaseService` and pydantic `BaseModel`.
