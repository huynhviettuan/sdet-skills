"""Sentinel: proves the assertion path can fail on this build (manual-qa-agent ADR-0023).

A green suite only means something if its assertions are able to go red. This test drives the app through the same
page object and the same web-first ``expect`` as the real tests, but expects a value that is known to be false: one
todo shows "1 item left", never "2 items left" (the nearest wrong value, so the check must really compare).

``xfail(strict=True, raises=AssertionError)`` turns that into a guard on the run itself:
- the assertion fails as it should      -> XFAIL, the run stays green;
- the assertion passes (it can't fail)  -> XPASS(strict) is reported as FAILED, the run goes red;
- anything else breaks (navigation, a locator, a timeout that isn't an assertion) -> FAILED, not hidden as XFAIL.
"""

import pytest

from qa.assertions import expect
from qa.pages.todo import TodoPage


@pytest.mark.sentinel
@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="sentinel: expects a known-false value; a pass means assertions cannot fail on this build (ADR-0023)",
)
def test_sentinel_known_false_expectation_fails(todo_page: TodoPage) -> None:
    """[SENTINEL] A known-false expectation fails through the real page object and assertion path."""
    todo_page.open()

    todo_page.add_todo("buy milk")

    expect(todo_page.footer.lbl_count).to_have_text("2 items left")
