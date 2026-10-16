# Element Registry

Living summary of all UI elements. Update this file when creating, updating, or deleting an element.

## Base Classes

| Class         | Path                          | Extends     | Purpose                      |
| ------------- | ----------------------------- | ----------- | ---------------------------- |
| `BaseControl` | `@elements/base/base-control` | —           | Visibility, text, attributes |
| `Clickable`   | `@elements/base/clickable`    | BaseControl | Click, hover, download       |
| `Editable`    | `@elements/base/editable`     | BaseControl | Fill, clear, upload          |

## Common Elements

| Element            | Class               | Path                                  | Extends/Implements  | Key Methods                                       |
| ------------------ | ------------------- | ------------------------------------- | ------------------- | ------------------------------------------------- |
| Button             | `Button`            | `@elements/common/button`             | Clickable           | `click()`                                         |
| Checkbox           | `Checkbox`          | `@elements/common/checkbox`           | Clickable           | `check()`, `uncheck()`, `isChecked()`             |
| Date Picker        | `DatePicker`        | `@elements/common/date-picker`        | Clickable           | `selectDate()`                                    |
| Dropdown           | `Dropdown`          | `@elements/common/dropdown`           | ISelect             | `selectOption()`, `getOptions()`                  |
| Cascading Dropdown | `CascadingDropdown` | `@elements/common/cascading-dropdown` | Clickable + ISelect | `selectPath()`, `getOptions()`, `getSubOptions()` |
| Group Radio Button | `GroupRadioButton`  | `@elements/common/group-radio-button` | BaseControl         | `selectOption()`                                  |
| Image              | `Image`             | `@elements/common/image`              | BaseControl         | `getSrc()`, `getAlt()`                            |
| Input              | `Input`             | `@elements/common/input`              | Editable            | `fill()`, `clear()`, `getValue()`                 |
| Label              | `Label`             | `@elements/common/label`              | BaseControl         | `getText()`                                       |
| Link               | `Link`              | `@elements/common/link`               | Clickable           | `click()`, `getHref()`                            |
| Skeleton           | `Skeleton`          | `@elements/common/skeleton`           | BaseControl         | `waitForHidden()`                                 |

## DOM assumptions of the convenience constructors

Every element accepts `{ locator }`: pass a Locator built from the container root and **no DOM structure is assumed** —
this is the form `page-builder` generates and the one to prefer. The other constructor options (`label`, `index`, `id`,
no arguments) build the locator for you and assume the component-library markup below. If the app's DOM differs, pass
`{ locator }` instead of adapting the app or the class.

| Element             | Option            | Assumed DOM                                                                                                         | Notes                                                              |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Button`            | `label` / `index` | `<button>` with the label text                                                                                      | `index` is positional — avoid (audit R-POSITION)                   |
| `Link`              | `label`           | `<a>` with the label text                                                                                           |                                                                    |
| `Input`             | `label`           | wrapper `.input` containing the label text and an `<input>` (or `type`)                                             | without options: `.input input`                                    |
| `Input`             | `placeholder`     | `.input input[placeholder="…"]`                                                                                     |                                                                    |
| `Checkbox`          | `label`           | label's parent contains `.checkbox`; checked state = `input` has class `is-checked`                                 | native checkboxes: pass `{ locator }`, use `check()`               |
| `Dropdown`          | `label`           | wrapper `.dropdown` with the label text containing `.select`, options as `li`, value in an `input`                  | native `<select>`: pass `{ locator }`                              |
| `GroupRadioButton`  | `label`           | label's parent contains `.group-radio-button`, options `.radio-button` with their text                              |                                                                    |
| `DatePicker`        | `label`           | `.date-picker` with the label text; calendar popup `.popup` with `.header`, `.day`, nav icons                       | page-global `.popup` — scope it if several pickers can be open     |
| `CascadingDropdown` | default           | `.cascading-dropdown`; open panels `[role="menu"]` (override with `panelLocator`), items `li` / `[role="menuitem"]` |                                                                    |
| `Image`             | `alt` / `index`   | `<img alt="…">`                                                                                                     |                                                                    |
| any                 | `id`              | `#id` under the parent                                                                                              | ids must be unique in the parent                                   |
| any                 | no parent         | page-global lookup (`BrowserInstance.currentPage`)                                                                  | violates parent scoping — always pass `parentLocator` or `locator` |
