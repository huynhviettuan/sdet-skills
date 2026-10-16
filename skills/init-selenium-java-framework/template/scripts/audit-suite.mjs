#!/usr/bin/env node
/**
 * audit-suite — counts violations of the test-automation rules (refactor-test-suite skill) in a TypeScript/JavaScript
 * or Java test suite. Heuristic, dependency-free (Node >= 18).
 *
 *   node audit-suite.mjs <repo-dir> [--json report.json] [--baseline audit-baseline.json] [--fail-on block|warn]
 *
 *   --json      write the full report (counts + every finding) to a file
 *   --baseline  ratchet: compare per-rule counts with a saved report; exit 1 if any count increased
 *   --fail-on   exit 1 if there is any finding of that severity or worse (default: never)
 *
 * Suppress a justified finding on its line (or the line above) with:  audit-ignore R-XXX: reason
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'build', 'dist', 'test-results', 'playwright-report',
    'allure-results', 'allure-report', '.idea', '.vscode', 'scripts']);

/** Where a file sits in the suite — rules apply to roles, not to every file. */
function roleOf(rel) {
    const p = rel.replace(/\\/g, '/');
    if (/(^|\/)(fixtures)\//.test(p) || /(^|\/)(context|testbase)\//.test(p)) return 'composition';
    if (/(^|\/)architecture\//.test(p)) return 'framework'; // architecture-rule tests (ArchUnit) are tooling, not tests
    if (/\.(spec|test)\.[jt]s$/.test(p) || /(^|\/)tests?\//.test(p) && /\.[jt]s$/.test(p) || /src\/test\/java\/.*\.java$/.test(p)) return 'test';
    if (/(^|\/)(pages?|containers?|components?|screens?|sections?)\//.test(p)) return 'page';
    return 'framework';
}

const TS = /\.(ts|js|mjs|cjs)$/;
const JAVA = /\.java$/;

/**
 * Rules: id, severity, title, and per-language patterns limited to file roles.
 * `when(line, ctx)` can refine a match (context: file text, role, line index).
 */
const RULES = [
    {
        id: 'R-NO-SLEEP', severity: 'block', title: 'Fixed sleep / implicit wait instead of waiting on a real signal',
        checks: [
            { lang: TS, roles: ['test', 'page', 'framework', 'composition'], re: /\bwaitForTimeout\s*\(|\bnew Promise\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*setTimeout\s*\(/ },
            { lang: JAVA, roles: ['test', 'page', 'framework', 'composition'], re: /\bThread\.sleep\s*\(/, when: (l, c) => !/class Eventually\b/.test(c.text) },
            { lang: JAVA, roles: ['test', 'page', 'framework', 'composition'], re: /implicitlyWait\s*\(\s*(?!Duration\.ZERO)/ }
        ]
    },
    {
        id: 'R-RAW-UI-IN-TEST', severity: 'block', title: 'Test talks to the browser directly instead of through page objects',
        checks: [
            { lang: TS, roles: ['test'], re: /\bpage\.(locator|getBy\w+|click|fill|type|press|check|selectOption|\$\$?)\s*\(|\$\$?\(\s*['"`]/ },
            { lang: JAVA, roles: ['test'], re: /\.findElements?\s*\(|\bBy\.(id|xpath|cssSelector|name|className|linkText|tagName)\s*\(|\bWebElement\b/ }
        ]
    },
    {
        id: 'R-RAW-HTTP-IN-TEST', severity: 'block', title: 'Test sends HTTP directly instead of through a service',
        checks: [
            { lang: TS, roles: ['test'], re: /\brequest\.(get|post|put|patch|delete|fetch)\s*\(|\bfetch\s*\(\s*['"`]http/ },
            { lang: JAVA, roles: ['test'], re: /\b(RestAssured\.)?given\s*\(\s*\)|\bRestAssured\.(get|post|put|patch|delete)\s*\(/ }
        ]
    },
    {
        id: 'R-COMPOSITION', severity: 'block', title: 'Test builds its own dependencies instead of using the composition root',
        checks: [
            { lang: TS, roles: ['test'], re: /\bnew\s+\w+(Page|Service|Container|Api|Client)\s*\(/ },
            { lang: TS, roles: ['test'], re: /from\s+['"]@playwright\/test['"]/, when: (l, c) => c.hasFixtureModule },
            { lang: JAVA, roles: ['test'], re: /\bnew\s+\w+(Page|Service|Container|Client)\s*\(/ },
            { lang: JAVA, roles: ['test'], re: /\bnew\s+(Chrome|Firefox|Edge|Safari|Remote)(Web)?Driver\s*\(/ }
        ]
    },
    {
        id: 'R-SHARED-STATE', severity: 'block', title: 'State shared between tests (parallel and order hazard)',
        checks: [
            { lang: JAVA, roles: ['test', 'page', 'framework', 'composition'], re: /^\s*(public|protected|private)?\s*static\s+(?!final\b)[\w<>,\s]*\b(WebDriver|Page|Response)\b[\w<>]*\s+\w+\s*[;=]/ },
            // Instance fields of a test class (class-body depth); TestNG shares one instance across parallel methods.
            { lang: JAVA, roles: ['test'], re: /^\s*(private|protected|public)?\s*(?!static\b)(?!final\b)(?!return\b)([A-Z][\w<>,\[\]]*|int|long|double|float|boolean|short|byte|char)\s+\w+\s*(=\s*[^;]+)?;\s*$/,
                when: (l, c) => c.depthAt(c.i) === 1 },
            // Order dependence: one test relies on another having run first.
            { lang: JAVA, roles: ['test'], re: /@Test\s*\([^)]*\b(priority|dependsOnMethods)\s*=/ },
            { lang: TS, roles: ['test'], re: /^\s*let\s+\w+\s*(:\s*[\w<>[\]|\s]+)?\s*;?\s*$/, when: (l, c) => c.depthAt(c.i) <= 1 },
            { lang: TS, roles: ['test'], re: /\.describe\.serial\b|mode:\s*['"]serial['"]/ }
        ]
    },
    {
        id: 'R-TEARDOWN', severity: 'block', title: 'Cleanup in the test body (skipped when an assertion fails)',
        checks: [
            { lang: TS, roles: ['test'], re: /\.(delete\w*|remove\w*|cleanup\w*|destroy\w*)\s*\(/, when: (l, c) => !c.inHook(c.i) },
            { lang: JAVA, roles: ['test'], re: /\.(delete\w*|remove\w*|cleanup\w*|destroy\w*)\s*\(/, when: (l, c) => !/onTeardown|@After/.test(c.window(c.i, 6)) }
        ]
    },
    {
        id: 'R-SECRETS', severity: 'block', title: 'Hard-coded credential or token',
        checks: [
            { lang: /\.(ts|js|java|properties|json|ya?ml|env)$/, roles: ['test', 'page', 'framework', 'composition'],
                re: /(password|passwd|secret|api[_-]?key|token)\s*['"]?\s*[:=]\s*['"][^'"$\s{][^'"]{3,}['"]|Bearer\s+[A-Za-z0-9\-_.]{12,}/i }
        ]
    },
    {
        id: 'R-FOCUS', severity: 'block', title: 'Focused test left in (runs only this test)',
        checks: [{ lang: TS, roles: ['test'], re: /\b(test|it|describe)\.only\s*\(/ }]
    },
    {
        id: 'R-SCOPE', severity: 'warn', title: 'Page-global lookup inside a page object (not scoped to a container)',
        checks: [
            { lang: TS, roles: ['page'], re: /\$getBy\w+\s*\(|BrowserInstance\.currentPage\.(locator|getBy\w+)\s*\(|\bpage\.(locator|getBy\w+)\s*\(/ },
            { lang: JAVA, roles: ['page'], re: /\bdriver\(?\)?\.findElements?\s*\(|DriverFactory\.driver\(\)\.findElements?\s*\(/ }
        ]
    },
    {
        id: 'R-POSITION', severity: 'warn', title: 'Element identified by position (nth / index / :nth-child)',
        // Generic widgets (table, list, notification components) address rows/cells by position by design.
        checks: [{ lang: /\.(ts|js|java)$/, roles: ['test', 'page'], re: /\.nth\s*\(|\.first\s*\(\s*\)|:nth-child|findElements\s*\(.*\)\s*\.get\s*\(\s*\d+\s*\)|\.get\s*\(\s*\d+\s*\)\s*\.click|\[\d+\]['"]/,
            when: (l, c) => !c.genericComponent }]
    },
    {
        id: 'R-XPATH-ABS', severity: 'warn', title: 'Absolute or long XPath',
        checks: [{ lang: /\.(ts|js|java)$/, roles: ['test', 'page'], re: /['"`](xpath=)?(\/html|\/\/\w+(\[[^\]]*\])?(\/\w+(\[[^\]]*\])?){3,})/ }]
    },
    {
        id: 'R-FORCE', severity: 'warn', title: 'Forced or scripted action bypassing real interactability',
        checks: [
            { lang: TS, roles: ['test', 'page'], re: /force:\s*true/ },
            { lang: JAVA, roles: ['test', 'page'], re: /executeScript\s*\([^)]*click/ }
        ]
    },
    {
        id: 'R-WEAK-ASSERT', severity: 'warn', title: 'Weak assertion that proves little',
        checks: [
            { lang: TS, roles: ['test'], re: /\.toBeTruthy\s*\(\s*\)|\.toBeDefined\s*\(\s*\)/ },
            { lang: JAVA, roles: ['test'], re: /\bassertNotNull\s*\(|assertTrue\s*\(\s*\w+\s*!=\s*null|\.isNotNull\s*\(\s*\)\s*;\s*$/ }
        ]
    },
    {
        id: 'R-HARDCODED-URL', severity: 'warn', title: 'Environment URL hard-coded in a test or page',
        checks: [{ lang: /\.(ts|js|java)$/, roles: ['test', 'page'], re: /['"`]https?:\/\/(?!(www\.)?(w3\.org|json-schema\.org))[^'"`\s]+/ }]
    },
    {
        id: 'R-RETRY-MASK', severity: 'warn', title: 'Retries configured high enough to hide flakiness',
        checks: [
            { lang: TS, roles: ['framework', 'composition'], re: /retries:\s*([2-9]|\d{2,})\b/ },
            { lang: /\.(java|xml)$/, roles: ['framework', 'composition', 'test'], re: /retryAnalyzer|rerunFailingTestsCount\s*>?\s*[2-9]/ }
        ]
    }
];

// ---------- scanning ----------

async function listFiles(root, dir = root) {
    const out = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) out.push(...(await listFiles(root, path.join(dir, entry.name))));
        } else if (/\.(ts|js|mjs|cjs|java|properties|json|ya?ml|env|xml)$/.test(entry.name) && !/\.d\.ts$|package-lock\.json$/.test(entry.name)) {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

function makeContext(text, role, hasFixtureModule, rel) {
    const lines = text.split(/\r?\n/);
    // Brace depth at the start of each line (rough: ignores braces in strings) — used for "top-level / describe-level".
    const depth = [];
    let d = 0;
    for (const line of lines) {
        depth.push(d);
        for (const ch of line) d += ch === '{' ? 1 : ch === '}' ? -1 : 0;
    }
    return {
        text, role, lines, hasFixtureModule, i: 0,
        /** A reusable widget directly under components/ (not a page-specific container or section). */
        genericComponent: /(^|\/)(components?|ui\/components)\/[^/]+\.(ts|js|java)$/.test(rel),
        depthAt: (i) => depth[i],
        window: (i, n) => lines.slice(Math.max(0, i - n), i + 1).join('\n'),
        /** Inside test.afterEach/afterAll or a fixture's teardown (after `use(`) — rough backwards scan. */
        inHook: (i) => {
            for (let j = i; j >= Math.max(0, i - 40); j--) {
                if (/\b(afterEach|afterAll)\s*\(/.test(lines[j]) || /await use\s*\(/.test(lines[j])) return true;
                if (/\btest\s*\(\s*['"`]/.test(lines[j])) return false;
            }
            return false;
        }
    };
}

function ignored(lines, i, id) {
    const re = new RegExp(`audit-ignore\\s+${id}\\b`);
    return re.test(lines[i]) || (i > 0 && re.test(lines[i - 1]));
}

async function audit(root) {
    const files = await listFiles(root);
    const rels = files.map((f) => path.relative(root, f));
    const hasFixtureModule = rels.some((r) => /fixtures\/fixtures\.[jt]s$/.test(r.replace(/\\/g, '/')));
    const findings = [];
    let scanned = 0;
    for (let k = 0; k < files.length; k++) {
        const rel = rels[k].replace(/\\/g, '/');
        const role = roleOf(rel);
        const text = await fs.readFile(files[k], 'utf-8');
        const ctx = makeContext(text, role, hasFixtureModule, rel);
        let touched = false;
        for (const rule of RULES) {
            for (const check of rule.checks) {
                if (!check.lang.test(rel) || !check.roles.includes(role)) continue;
                touched = true;
                ctx.lines.forEach((line, i) => {
                    if (/^\s*(\/\/|\*|\/\*|#)/.test(line)) return; // comments
                    if (/\.java$/.test(rel) && /^\s*import\s/.test(line)) return; // a usage line is the finding, not its import
                    if (!check.re.test(line)) return;
                    ctx.i = i;
                    if (check.when && !check.when(line, ctx)) return;
                    if (ignored(ctx.lines, i, rule.id)) return;
                    findings.push({ rule: rule.id, severity: rule.severity, file: rel, line: i + 1, code: line.trim().slice(0, 160) });
                });
            }
        }
        if (touched) scanned++;
    }
    // One finding per rule+file+line even when several checks of a rule match.
    const unique = [...new Map(findings.map((f) => [`${f.rule}|${f.file}|${f.line}`, f])).values()];
    const counts = Object.fromEntries(RULES.map((r) => [r.id, unique.filter((f) => f.rule === r.id).length]));
    return { root: path.resolve(root), scannedFiles: scanned, counts, findings: unique };
}

// ---------- CLI ----------

function arg(name) {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
    const root = process.argv[2];
    if (!root || root.startsWith('--')) {
        console.error('Usage: audit-suite.mjs <repo-dir> [--json report.json] [--baseline baseline.json] [--fail-on block|warn]');
        process.exit(2);
    }
    const report = await audit(root);
    const byRule = Object.fromEntries(RULES.map((r) => [r.id, r]));

    console.log(`audit: ${report.scannedFiles} files scanned in ${report.root}\n`);
    console.log('| Rule | Severity | Count | Title |');
    console.log('|---|---|---:|---|');
    for (const r of RULES) console.log(`| ${r.id} | ${r.severity} | ${report.counts[r.id]} | ${r.title} |`);

    const hot = Object.entries(report.findings.reduce((acc, f) => ({ ...acc, [f.file]: (acc[f.file] ?? 0) + 1 }), {}))
        .sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (hot.length) {
        console.log('\nHot spots (findings per file):');
        hot.forEach(([file, n]) => console.log(`  ${String(n).padStart(4)}  ${file}`));
        console.log('\nExamples:');
        for (const r of RULES) {
            report.findings.filter((f) => f.rule === r.id).slice(0, 2)
                .forEach((f) => console.log(`  ${f.rule}  ${f.file}:${f.line}  ${f.code}`));
        }
    }

    const out = arg('--json');
    if (out) await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n');

    let fail = false;
    const baselinePath = arg('--baseline');
    if (baselinePath) {
        const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf-8'));
        const worse = RULES.filter((r) => report.counts[r.id] > (baseline.counts?.[r.id] ?? 0));
        console.log(`\nratchet vs ${baselinePath}:`);
        for (const r of RULES) {
            const before = baseline.counts?.[r.id] ?? 0;
            const now = report.counts[r.id];
            if (before !== now) console.log(`  ${r.id}: ${before} -> ${now}${now > before ? '  INCREASED' : ''}`);
        }
        if (worse.length) {
            console.log(`  FAIL: ${worse.map((r) => r.id).join(', ')} increased`);
            fail = true;
        } else {
            console.log('  OK: no rule count increased');
        }
    }

    const failOn = arg('--fail-on');
    if (failOn) {
        const levels = failOn === 'warn' ? ['block', 'warn'] : ['block'];
        const n = report.findings.filter((f) => levels.includes(byRule[f.rule].severity)).length;
        if (n) {
            console.log(`\nFAIL: ${n} finding(s) at severity ${failOn} or worse`);
            fail = true;
        }
    }
    process.exit(fail ? 1 : 0);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
