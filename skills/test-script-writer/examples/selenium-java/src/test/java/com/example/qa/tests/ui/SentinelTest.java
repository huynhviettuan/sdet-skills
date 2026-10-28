package com.example.qa.tests.ui;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.qa.pages.todo.TodoPage;
import com.example.qa.testbase.BaseUiTest;
import com.example.qa.ui.wait.Eventually;
import io.qameta.allure.Feature;
import org.testng.annotations.Test;

/**
 * Sentinel (after manual-qa-agent ADR-0023): a green run only means something if the assertion path can go red on
 * this build. This test drives the real page objects and the same {@code Eventually.verify} + AssertJ path as the
 * suite, with an expectation known to be false. TestNG passes it only when that exact AssertionError is thrown
 * ({@code expectedExceptionsMessageRegExp} pins the expected and the actual value), so:
 * <ul>
 *   <li>if assertions stop failing (a swallowed error, a retry that turns red into green, a no-op verify), nothing
 *       is thrown, TestNG reports the expected exception as missing, and the run is red;</li>
 *   <li>if the page breaks instead (locator timeout, no browser), the error is not that AssertionError and the run is
 *       red too: the sentinel never turns a broken setup into a pass.</li>
 * </ul>
 * Never "fix" this test to match the app. It is excluded from can-fail because failing is its job.
 */
@Feature("Sentinel")
public class SentinelTest extends BaseUiTest {

    @Test(groups = "sentinel",
            description = "[SENTINEL] A known-false expectation fails through the real page objects and assertions",
            expectedExceptions = AssertionError.class,
            expectedExceptionsMessageRegExp = "(?s).*expected: \"2 items left\".*but was: \"1 item left\".*")
    public void knownFalseExpectationFails() {
        open("/todomvc/#/");
        TodoPage todo = pages().todo();

        todo.addTodo("one todo");

        // Known false: exactly one todo was added, so the counter can only read "1 item left".
        Eventually.verify(() -> assertThat(todo.footer.lblCount.text()).isEqualTo("2 items left"));
    }
}
