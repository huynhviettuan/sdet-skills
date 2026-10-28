"""Metamorphic relations and derived values for the todo list (AC-TODO-001, AC-TODO-002).

Each test checks a relation that must hold between two independent reads of the same state, or between a state and
the state after an action and its inverse — so it needs no hand-written oracle for every intermediate value.
"""

import pytest

from qa.assertions import eventually, expect
from qa.pages.todo import TodoPage

TITLES = ["write report", "call bank", "book flight", "pay rent", "water plants"]
COMPLETED = ["call bank", "pay rent"]


@pytest.mark.P1
@pytest.mark.metamorphic
@pytest.mark.requirement("AC-TODO-002")
@pytest.mark.parametrize("deleted", ["book flight", "pay rent"], ids=["delete active", "delete completed"])
def test_filters_partition_all_and_counter_equals_active(todo_page: TodoPage, deleted: str) -> None:
    """[MR-TODO-01] After add/complete/delete, |Active| + |Completed| == |All| and the counter equals |Active|."""
    todo_page.open()
    for title in TITLES:
        todo_page.add_todo(title)
    for title in COMPLETED:
        todo_page.complete_todo(title)
    # audit-ignore R-TEARDOWN: deleting a todo is a step under test here, not cleanup
    todo_page.delete_todo(deleted)

    all_rows = todo_page.count_under("All")
    active_rows = todo_page.count_under("Active")
    completed_rows = todo_page.count_under("Completed")

    # Relation 1: the Active and Completed filters partition All (no todo in both, none in neither).
    assert active_rows + completed_rows == all_rows
    # Relation 2: two independent paths to the same number, the counter label and the rows under Active.
    assert todo_page.footer.items_left() == active_rows
    # Derived value: the deletion removed exactly one row, so All shrank by one from what was added.
    assert len(TITLES) - all_rows == 1
    expect(todo_page.footer.lbl_count).to_have_text(f"{active_rows} items left")


@pytest.mark.P1
@pytest.mark.metamorphic
@pytest.mark.requirement("AC-TODO-002")
def test_complete_then_uncomplete_restores_counter(todo_page: TodoPage) -> None:
    """[MR-TODO-02] Completing a todo and un-completing it again (the inverse action) restores the counter."""
    todo_page.open()
    for title in TITLES:
        todo_page.add_todo(title)
    eventually(lambda: _assert_titles(todo_page, TITLES))
    before = todo_page.footer.items_left()

    todo_page.complete_todo("call bank")
    # Sync point and the forward half of the relation: the action changed the counter by exactly one.
    expect(todo_page.footer.lbl_count).to_have_text(f"{before - 1} items left")

    todo_page.uncomplete_todo("call bank")

    expect(todo_page.footer.lbl_count).to_have_text(f"{before} items left")
    expect(todo_page.main.item("call bank").chk_toggle).not_to_be_checked()
    eventually(lambda: _assert_titles(todo_page, TITLES))


def _assert_titles(todo_page: TodoPage, expected: list[str]) -> None:
    assert todo_page.main.titles() == expected
