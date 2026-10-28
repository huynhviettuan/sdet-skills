# Parent Scoping

A container owns one root — `page.locator(...)` is the only page-level lookup — and builds every element from it.

```python
self._root = page.locator("section.main")  # ✅ the root
self.btn_save = Button(self._root.get_by_role("button", name="Save"))  # ✅ from the root
self.btn_save = Button(page.get_by_role("button", name="Save"))  # ❌ page-global
```

Repeated items are sections created by a method keyed by a business value (`item(title)`), never by index.
