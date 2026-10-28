"""Page-object fixtures: one per page, constructed with the test's ``page``. Register new pages here."""

from __future__ import annotations

import pytest
from playwright.sync_api import Page

from qa.pages.todo import TodoPage


@pytest.fixture
def todo_page(page: Page) -> TodoPage:
    return TodoPage(page)
