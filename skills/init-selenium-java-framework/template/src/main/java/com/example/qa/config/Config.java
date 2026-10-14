package com.example.qa.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.util.Optional;
import java.util.Properties;

/**
 * Configuration lookup, in priority order: {@code -Dkey} system property, environment variable, then
 * {@code config/<TEST_ENV>.properties} on the classpath. Secrets (passwords, tokens, API keys) come only from system
 * properties or environment variables — never commit them to the properties files.
 */
public final class Config {

    private static final Properties FILE = load();

    private Config() {
    }

    public static String env() {
        return Optional.ofNullable(System.getProperty("TEST_ENV"))
                .or(() -> Optional.ofNullable(System.getenv("TEST_ENV")))
                .orElse("dev");
    }

    public static Optional<String> find(String key) {
        return Optional.ofNullable(System.getProperty(key))
                .or(() -> Optional.ofNullable(System.getenv(key)))
                .or(() -> Optional.ofNullable(FILE.getProperty(key)))
                .map(String::trim)
                .filter(value -> !value.isEmpty());
    }

    public static String get(String key) {
        return find(key).orElseThrow(() -> new IllegalStateException(
                "Missing configuration '" + key + "': set -D" + key + ", the " + key
                        + " environment variable, or config/" + env() + ".properties"));
    }

    public static String get(String key, String defaultValue) {
        return find(key).orElse(defaultValue);
    }

    public static String baseUrl() {
        return get("BASE_URL");
    }

    public static String apiDomain() {
        return get("API_DOMAIN");
    }

    public static String browser() {
        return get("BROWSER", "chrome");
    }

    public static boolean headless() {
        return Boolean.parseBoolean(get("HEADLESS", "true"));
    }

    public static Optional<String> gridUrl() {
        return find("GRID_URL");
    }

    /** Attribute used by {@code Bys.testId(...)}. */
    public static String testIdAttribute() {
        return get("TEST_ID_ATTRIBUTE", "data-testid");
    }

    /** Upper bound for every wait on a real signal (element state, polled assertion). */
    public static Duration timeout() {
        return Duration.ofSeconds(Long.parseLong(get("TIMEOUT_SECONDS", "10")));
    }

    private static Properties load() {
        Properties properties = new Properties();
        String resource = "/config/" + env() + ".properties";
        try (InputStream in = Config.class.getResourceAsStream(resource)) {
            if (in != null) {
                properties.load(in);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + resource, e);
        }
        return properties;
    }
}
