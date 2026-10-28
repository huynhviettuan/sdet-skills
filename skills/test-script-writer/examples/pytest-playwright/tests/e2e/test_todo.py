"""Implements docs/test-cases/todo.md (test-script-writer → references/sample-test-cases.md)."""

import pytest

from qa.assertions import eventually, expect
from qa.pages.todo import TodoPage


@pytest.mark.P0
@pytest.mark.smoke
@pytest.mark.case("TC-TODO-001")
@pytest.mark.requirement("AC-TODO-001")
def test_added_todo_appears_in_list_and_counter(todo_page: TodoPage) -> None:
    """[TC-TODO-001] Added todo appears in the list and the counter."""
    todo_page.open()

    todo_page.add_todo("buy milk")

    eventually(lambda: _assert_titles(todo_page, ["buy milk"]))
    expect(todo_page.footer.lbl_count).to_have_text("1 item left")


@pytest.mark.P1
@pytest.mark.case("TC-TODO-002")
@pytest.mark.requirement("AC-TODO-002")
def test_completed_todo_is_filtered_by_status(todo_page: TodoPage) -> None:
    """[TC-TODO-002] Completed todo is listed under Completed and hidden under Active."""
    todo_page.open()
    todo_page.add_todo("buy milk")
    todo_page.add_todo("walk dog")

    todo_page.complete_todo("buy milk")
    expect(todo_page.footer.lbl_count).to_have_text("1 item left")

    todo_page.filter_by("Completed")
    eventually(lambda: _assert_titles(todo_page, ["buy milk"]))

    todo_page.filter_by("Active")
    eventually(lambda: _assert_titles(todo_page, ["walk dog"]))


@pytest.mark.P2
@pytest.mark.case("TC-TODO-003")
@pytest.mark.requirement("AC-TODO-003")
@pytest.mark.parametrize("title", ["", "   "], ids=["empty", "spaces only"])
def test_blank_title_is_not_added(todo_page: TodoPage, title: str) -> None:
    """[TC-TODO-003] Blank titles are not added."""
    todo_page.open()

    todo_page.add_todo(title)
    # Sync point for a negative check: a valid todo added afterwards proves the blank one was processed
    todo_page.add_todo("sentinel")

    eventually(lambda: _assert_titles(todo_page, ["sentinel"]))


def _assert_titles(todo_page: TodoPage, expected: list[str]) -> None:
    assert todo_page.main.titles() == expected
