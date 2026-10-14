---
description: Every element must resolve through a parent Locator, never page-globally
globs: ['src/pages/**/*.ts', 'src/components/**/*.ts']
---

# Parent Scoping

Every element MUST resolve through a parent `Locator` (container, section, or component). Never use page-global
selectors.

```ts
// ✅ Correct — built from the container's root
this.btnSubmit = new Button({ locator: this.container.getByTestId('submit') });

// ❌ Wrong — page-global, will match duplicates in modals/tabs
this.btnSubmit = new Button({ locator: $getByTestId('submit') });
```

The same `data-testid` can appear in modals, hidden tabs, or prerendered routes. Page-global locators are flakiness
sources.

The one allowed page-level lookup is a container's own root (`this.container = $('section.main')`); every element is
then built from that root.
