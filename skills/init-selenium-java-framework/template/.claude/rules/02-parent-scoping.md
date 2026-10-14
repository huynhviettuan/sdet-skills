---
description: Every element resolves through its container or section root
globs: ['src/main/java/**/ui/**/*.java', 'src/main/java/**/pages/**/*.java']
---

# Parent Scoping

A container owns one root — `Locator.root(...)` is the only page-level lookup — and builds every element from it.

```java
// ✅ Correct
private final Locator root = Locator.root(By.cssSelector("section.main"));
public final Button btnSave = new Button(root.find(Bys.button("Save")));

// ❌ Wrong — page-global, matches the same button in a modal or hidden tab
public final Button btnSave = new Button(Locator.root(Bys.button("Save")));
```

XPath inside `find` must be relative (`.//`); `//` searches the whole page. Locators are strict: if several elements
match, the lookup fails with `StrictLocatorException` — narrow the scope or identify the item by a business key
(section factory), never by index.
