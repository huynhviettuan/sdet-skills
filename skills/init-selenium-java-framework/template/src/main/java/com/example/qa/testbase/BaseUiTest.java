package com.example.qa.testbase;

import com.example.qa.config.Config;
import com.example.qa.driver.DriverFactory;
import io.qameta.allure.Allure;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.testng.ITestResult;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

/**
 * Base for UI tests: starts a browser for the test's thread after the context, attaches a screenshot, page source, and
 * URL to the Allure report when the test fails, then lets the context's teardown quit the browser.
 */
public abstract class BaseUiTest extends BaseTest {

    @BeforeMethod(alwaysRun = true)
    public void startBrowser() {
        DriverFactory.start();
        context().onTeardown("quit browser", DriverFactory::quit);
    }

    /** Runs before {@link BaseTest#finishTestContext()} (subclass @AfterMethod first), while the browser is open. */
    @AfterMethod(alwaysRun = true)
    public void attachFailureEvidence(ITestResult result) {
        if (result.isSuccess() || !DriverFactory.hasDriver()) {
            return;
        }
        var driver = DriverFactory.driver();
        Allure.addAttachment("url", driver.getCurrentUrl());
        Allure.addAttachment("screenshot", "image/png",
                new ByteArrayInputStream(((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES)), "png");
        Allure.addAttachment("page source", "text/html",
                new ByteArrayInputStream(driver.getPageSource().getBytes(StandardCharsets.UTF_8)), "html");
    }

    /** Opens a route of the app under test (BASE_URL + path). Navigation belongs in tests, not page constructors. */
    protected void open(String path) {
        DriverFactory.driver().get(Config.baseUrl() + path);
    }
}
