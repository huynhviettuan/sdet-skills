package com.example.qa.driver;

import com.example.qa.config.Config;
import java.net.MalformedURLException;
import java.net.URI;
import java.time.Duration;
import org.openqa.selenium.Capabilities;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.remote.RemoteWebDriver;

/**
 * One WebDriver per test thread. TestNG runs methods in parallel threads, so the driver lives in a ThreadLocal and is
 * resolved on every access — never cache it in a field of a test, page, or element. Drivers are resolved by Selenium
 * Manager; set GRID_URL to run on a Selenium Grid instead.
 */
public final class DriverFactory {

    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

    private DriverFactory() {
    }

    public static WebDriver driver() {
        WebDriver driver = DRIVER.get();
        if (driver == null) {
            throw new IllegalStateException("No WebDriver on this thread: UI tests must extend BaseUiTest");
        }
        return driver;
    }

    public static boolean hasDriver() {
        return DRIVER.get() != null;
    }

    public static void start() {
        if (DRIVER.get() != null) {
            throw new IllegalStateException("A WebDriver is already running on this thread");
        }
        WebDriver driver = create();
        // Explicit waits only: an implicit wait silently stretches every lookup, including checks for absence.
        driver.manage().timeouts().implicitlyWait(Duration.ZERO);
        DRIVER.set(driver);
    }

    public static void quit() {
        WebDriver driver = DRIVER.get();
        if (driver == null) {
            return;
        }
        try {
            driver.quit();
        } finally {
            DRIVER.remove();
        }
    }

    private static WebDriver create() {
        String browser = Config.browser();
        Capabilities options = options(browser, Config.headless());
        if (Config.gridUrl().isPresent()) {
            try {
                return new RemoteWebDriver(URI.create(Config.gridUrl().get()).toURL(), options);
            } catch (MalformedURLException e) {
                throw new IllegalStateException("Invalid GRID_URL: " + Config.gridUrl().get(), e);
            }
        }
        return switch (browser) {
            case "firefox" -> new FirefoxDriver((FirefoxOptions) options);
            case "edge" -> new EdgeDriver((EdgeOptions) options);
            default -> new ChromeDriver((ChromeOptions) options);
        };
    }

    private static Capabilities options(String browser, boolean headless) {
        return switch (browser) {
            case "chrome" -> {
                ChromeOptions options = new ChromeOptions();
                if (headless) {
                    options.addArguments("--headless=new");
                }
                options.addArguments("--window-size=1920,1080");
                yield options;
            }
            case "edge" -> {
                EdgeOptions options = new EdgeOptions();
                if (headless) {
                    options.addArguments("--headless=new");
                }
                options.addArguments("--window-size=1920,1080");
                yield options;
            }
            case "firefox" -> {
                FirefoxOptions options = new FirefoxOptions();
                if (headless) {
                    options.addArguments("-headless");
                }
                options.addArguments("--width=1920", "--height=1080");
                yield options;
            }
            default -> throw new IllegalStateException("Unsupported BROWSER '" + browser + "' (chrome, firefox, edge)");
        };
    }
}
