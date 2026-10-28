"""Composition root. Tests receive pages, services and data factories as fixtures; they never construct them.

Each module below registers one layer's fixtures. Add a page object to qa.fixtures.pages, a service to
qa.fixtures.services, a data factory to qa.fixtures.data.
"""

pytest_plugins = [
    "qa.fixtures.browser",
    "qa.fixtures.pages",
    "qa.fixtures.services",
    "qa.fixtures.data",
]
