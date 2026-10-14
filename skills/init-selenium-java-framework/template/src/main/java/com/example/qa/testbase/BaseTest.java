package com.example.qa.testbase;

import com.example.qa.context.Pages;
import com.example.qa.context.Services;
import com.example.qa.context.TestContext;
import com.example.qa.context.TestData;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

/**
 * Base for every test. TestNG may run methods of one class instance in parallel threads, so this class and its
 * subclasses hold <b>no instance fields</b>: everything per-test is resolved from the thread's {@link TestContext} on
 * each call.
 */
public abstract class BaseTest {

    @BeforeMethod(alwaysRun = true)
    public void startTestContext() {
        TestContext.start();
    }

    @AfterMethod(alwaysRun = true)
    public void finishTestContext() {
        TestContext.finish();
    }

    protected TestContext context() {
        return TestContext.current();
    }

    protected Pages pages() {
        return context().pages();
    }

    protected Services services() {
        return context().services();
    }

    protected TestData data() {
        return context().data();
    }
}
