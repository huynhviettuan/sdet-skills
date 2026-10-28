package com.example.qa.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaConstructorCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.Set;
import org.openqa.selenium.WebDriver;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * The audit's rules (scripts/audit-suite.mjs) that the compiler can see, enforced on every {@code mvn test}. Each
 * rule's message starts with its audit rule ID. The audit stays the CI gate for what bytecode can't show (teardown in
 * test bodies, secrets, locator style).
 */
public class ArchitectureRulesTest {

    private static final String BASE = "com.example.qa";
    private static final String TESTS = BASE + ".tests..";

    private JavaClasses classes;

    @BeforeClass
    public void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_JARS)
                .importPackages(BASE);
    }

    private void check(ArchRule rule) {
        rule.allowEmptyShould(true).check(classes);
    }

    @Test(description = "R-RAW-UI-IN-TEST: tests reach the UI only through page objects")
    public void testsDoNotUseSelenium() {
        check(noClasses().that().resideInAPackage(TESTS)
                .should().dependOnClassesThat().resideInAPackage("org.openqa.selenium..")
                .because("R-RAW-UI-IN-TEST: use pages() from the test context, never WebDriver, By or WebElement"));
    }

    @Test(description = "R-RAW-HTTP-IN-TEST: tests reach APIs only through services")
    public void testsDoNotUseRestAssured() {
        check(noClasses().that().resideInAPackage(TESTS)
                .should().dependOnClassesThat().resideInAPackage("io.restassured..")
                .because("R-RAW-HTTP-IN-TEST: use services() from the test context, never RestAssured directly"));
    }

    @Test(description = "R-COMPOSITION: tests get pages, elements, services and drivers from the test context")
    public void testsDoNotConstructFrameworkObjects() {
        DescribedPredicate<JavaConstructorCall> frameworkConstructor =
                new DescribedPredicate<>("a page, UI, service or driver constructor") {
                    @Override
                    public boolean test(JavaConstructorCall call) {
                        String pkg = call.getTargetOwner().getPackageName();
                        boolean seleniumDriver = pkg.startsWith("org.openqa.selenium")
                                && call.getTargetOwner().getSimpleName().endsWith("Driver");
                        return seleniumDriver || pkg.startsWith(BASE + ".pages") || pkg.startsWith(BASE + ".ui")
                                || pkg.startsWith(BASE + ".api.services") || pkg.startsWith(BASE + ".driver");
                    }
                };
        check(noClasses().that().resideInAPackage(TESTS)
                .should().callConstructorWhere(frameworkConstructor)
                .because("R-COMPOSITION: pages(), services() and data() own construction, credentials and teardown"));
    }

    @Test(description = "R-NO-SLEEP: no fixed sleeps outside the bounded polling helpers")
    public void noThreadSleep() {
        check(noClasses().that().resideOutsideOfPackage(BASE + ".ui.wait..")
                .should().callMethod(Thread.class, "sleep", long.class)
                .because("R-NO-SLEEP: wait on a real signal (Waits / Eventually), never Thread.sleep"));
    }

    @Test(description = "R-SHARED-STATE: no WebDriver shared across threads")
    public void noStaticWebDriver() {
        check(noFields().that().haveRawType(WebDriver.class)
                .should().beStatic()
                .because("R-SHARED-STATE: one driver per thread through DriverFactory (ThreadLocal)"));
    }

    @Test(description = "R-SHARED-STATE: test classes hold no mutable state between test methods")
    public void testClassFieldsAreFinal() {
        check(fields().that().areDeclaredInClassesThat().resideInAPackage(TESTS)
                .should().beFinal()
                .because("R-SHARED-STATE: parallel methods share the instance; create data per test via data()"));
    }

    @Test(description = "Layers: page objects don't call APIs; services don't drive the browser")
    public void layersStaySeparate() {
        check(noClasses().that().resideInAnyPackage(BASE + ".pages..", BASE + ".ui..")
                .should().dependOnClassesThat().resideInAPackage("io.restassured..")
                .because("page objects model the UI; API calls belong to services"));
        check(noClasses().that().resideInAPackage(BASE + ".api..")
                .should().dependOnClassesThat().resideInAPackage("org.openqa.selenium..")
                .because("services model the API; browser access belongs to pages"));
    }

    @Test(description = "R-INHERIT: pages, containers, tests and services compose; only the thin bases are extended")
    public void compositionNotInheritance() {
        check(classes().that().resideInAnyPackage(BASE + ".pages..", BASE + ".ui.containers..")
                .and().areNotEnums().and().areNotInterfaces()
                .should(extendOnly("java.lang.Object", "java.lang.Record"))
                .because("R-INHERIT: a page has containers and a container has elements; neither extends another class"));
        check(classes().that().resideInAPackage(TESTS).and().areNotEnums().and().areNotInterfaces()
                .and().areTopLevelClasses()
                .should(extendOnly("java.lang.Object", BASE + ".testbase.BaseTest", BASE + ".testbase.BaseUiTest"))
                .because("R-INHERIT: test classes extend only the lifecycle base; share setup through TestContext"));
        // Top-level only: a list operation's anonymous `new TypeReference<List<Pet>>() {}` is a nested class
        check(classes().that().resideInAPackage(BASE + ".api.services..").and().areNotEnums().and().areNotInterfaces()
                .and().areTopLevelClasses()
                .should(extendOnly("java.lang.Object", BASE + ".api.BaseService"))
                .because("R-INHERIT: one service per spec tag, each extending BaseService only"));
    }

    /** The class's direct superclass is one of {@code allowed} (fully qualified names). */
    private static ArchCondition<JavaClass> extendOnly(String... allowed) {
        Set<String> permitted = Set.of(allowed);
        return new ArchCondition<>("extend only " + permitted) {
            @Override
            public void check(JavaClass item, ConditionEvents events) {
                String parent = item.getRawSuperclass().map(JavaClass::getName).orElse("java.lang.Object");
                if (!permitted.contains(parent)) {
                    events.add(SimpleConditionEvent.violated(item, item.getName() + " extends " + parent));
                }
            }
        };
    }
}
