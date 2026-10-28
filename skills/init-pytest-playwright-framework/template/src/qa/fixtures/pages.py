"""Page-object fixtures: one per page, constructed with the test's ``page``. Register new pages here.

Example (from ``page-builder``):

    @pytest.fixture
    def todo_page(page: Page) -> TodoPage:
        return TodoPage(page)
"""

from __future__ import annotations
