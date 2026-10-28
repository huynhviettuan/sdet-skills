"""Waiting on real signals. The only sleep in the framework is the bounded poll interval below."""

from __future__ import annotations

import time
from collections.abc import Callable


def eventually(assertion: Callable[[], None], timeout: float = 10.0, interval: float = 0.2) -> None:
    """Retry an assertion until it passes or ``timeout`` seconds pass; then raise its last AssertionError.

    For values read from the page or the API (``eventually(lambda: assert_that_titles(...))``). For a locator's
    own state, prefer Playwright's web-first ``expect`` (``qa.assertions.expect``), which already retries.
    """
    deadline = time.monotonic() + timeout
    while True:
        try:
            assertion()
            return
        except AssertionError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(interval)  # bounded poll interval, not a wait for an event
