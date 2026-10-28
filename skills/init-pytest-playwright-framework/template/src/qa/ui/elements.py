"""UI elements: thin wrappers that *hold* a Playwright Locator (composition) and expose what tests and pages need.

Every element is built from a locator that the owning container scoped through its own root; elements never look
anything up page-globally. Playwright locators are lazy and strict: a locator matching two elements fails the
action instead of picking one.
"""

from __future__ import annotations

from playwright.sync_api import Locator


class Element:
    """Base for all elements: visibility and text. One level of inheritance, never more."""

    def __init__(self, locator: Locator) -> None:
        self.locator = locator

    def is_visible(self) -> bool:
        return self.locator.is_visible()

    def text(self) -> str:
        return self.locator.inner_text().strip()


class Label(Element):
    """Read-only text."""


class Button(Element):
    def click(self) -> None:
        self.locator.click()


class Link(Element):
    def click(self) -> None:
        self.locator.click()

    def href(self) -> str | None:
        return self.locator.get_attribute("href")


class Input(Element):
    def fill(self, value: str) -> None:
        self.locator.fill(value)

    def submit(self, value: str) -> None:
        """Fill and press Enter (search boxes, single-field forms)."""
        self.locator.fill(value)
        self.locator.press("Enter")

    def value(self) -> str:
        return self.locator.input_value()


class CheckBox(Element):
    def check(self) -> None:
        self.locator.check()

    def uncheck(self) -> None:
        self.locator.uncheck()

    def is_checked(self) -> bool:
        return self.locator.is_checked()
