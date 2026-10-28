"""What tests import to assert: Playwright's web-first ``expect`` that also accepts elements, and ``eventually``.

Tests import from here, never from ``playwright`` (ruff bans it in tests/): one place decides how UI state is
asserted, so retries, timeouts and messages are the same everywhere.
"""

from __future__ import annotations

from typing import overload

from playwright.sync_api import APIResponse, Locator, Page
from playwright.sync_api import expect as _pw_expect

# The assertion classes are re-exported by playwright.sync_api at runtime but only declared (for type checkers) here.
from playwright.sync_api._generated import APIResponseAssertions, LocatorAssertions, PageAssertions

from qa.ui.elements import Element
from qa.ui.wait import eventually

__all__ = ["eventually", "expect"]


@overload
def expect(actual: Element | Locator, message: str | None = None) -> LocatorAssertions: ...
@overload
def expect(actual: Page, message: str | None = None) -> PageAssertions: ...
@overload
def expect(actual: APIResponse, message: str | None = None) -> APIResponseAssertions: ...
def expect(
    actual: Element | Locator | Page | APIResponse, message: str | None = None
) -> LocatorAssertions | PageAssertions | APIResponseAssertions:
    """Playwright's retrying assertions; an Element is asserted through its Locator."""
    target = actual.locator if isinstance(actual, Element) else actual
    return _pw_expect(target, message)
