"""Browser setup for pytest-playwright: base URL and a pinned locale from configuration.

pytest-playwright gives each test its own browser context and page, and pytest-xdist runs each worker as a
separate process, so no driver holder is needed: page objects receive the ``page`` fixture in their constructor.
"""

from __future__ import annotations

from typing import Any

import pytest

from qa.config import CONFIG


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args: dict[str, Any]) -> dict[str, Any]:
    if not CONFIG.base_url:
        pytest.skip("BASE_URL is not set")
    # Locale pinned so the app renders the same language on every machine (many apps follow the browser locale).
    return {**browser_context_args, "base_url": CONFIG.base_url, "locale": CONFIG.locale}
