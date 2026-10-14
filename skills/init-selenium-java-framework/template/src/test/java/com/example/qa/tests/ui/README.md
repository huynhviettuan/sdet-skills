# UI tests

UI test classes extend `BaseUiTest`. Use `open(path)`, `pages().<page>()`, and `Eventually.verify(...)` for
assertions on page state. Put the TC ID in `@Test(description = "[TC-AREA-NNN] ...")`.
