import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPlaywright from 'eslint-plugin-playwright';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Global ignores
    {
        ignores: ['lib/**/*', '**/*.cjs', 'node_modules/**', 'scripts/**/*.mjs'] // scripts/*.mjs: vendored tools kept identical to their source
    },

    // ──────────────────────────────────────────────
    // Base config for ALL TypeScript files (src + tests)
    // ──────────────────────────────────────────────
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            globals: {
                ...globals.node
            },
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['eslint.config.mjs']
                },
                tsconfigRootDir: import.meta.dirname
            }
        },
        plugins: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            'simple-import-sort': simpleImportSort
        },
        rules: {
            // ── Import sorting ──
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',

            // ── Re-enabled rules (previously disabled) ──
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
            ],
            '@typescript-eslint/no-empty-function': 'warn',
            'no-empty-pattern': 'error',

            // ── Async safety (critical for Playwright) ──
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': 'error',

            // ── Code quality ──
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-empty-object-type': 'error',
            '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true, allowShortCircuit: true }],
            '@typescript-eslint/prefer-readonly': 'warn',

            // ── Naming conventions ──
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'enum',
                    format: ['PascalCase']
                },
                {
                    selector: 'enumMember',
                    format: ['UPPER_CASE']
                },
                {
                    selector: ['function'],
                    modifiers: ['exported'],
                    format: ['PascalCase', 'camelCase']
                },
                {
                    selector: ['variable'],
                    modifiers: ['exported'],
                    format: ['PascalCase', 'camelCase', 'UPPER_CASE']
                }
            ],

            // ── General JS rules ──
            'no-var': 'error',
            'no-param-reassign': 'error',
            'no-unreachable': 'error',
            'no-else-return': 'error',
            'no-lonely-if': 'error',
            'no-unused-labels': 'error',
            'no-self-compare': 'error',
            'valid-typeof': 'error',
            'constructor-super': 'error',
            'no-import-assign': 'error',

            // ── Disable base rules that conflict with TS versions ──
            'no-unused-vars': 'off',
            'no-undef': 'off'
        }
    },

    // ──────────────────────────────────────────────
    // Fixture files — allow empty destructuring (Playwright fixture API convention)
    // ──────────────────────────────────────────────
    {
        files: ['src/fixtures/**/*.ts'],
        rules: {
            'no-empty-pattern': 'off'
        }
    },

    // ──────────────────────────────────────────────
    // Source files only (src/) — stricter rules
    // ──────────────────────────────────────────────
    {
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': [
                'warn',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true
                }
            ],
            // Audit rules (scripts/audit-suite.mjs) enforced in the editor. Messages carry the rule ID.
            'no-restricted-syntax': [
                'error',
                {
                    selector: "CallExpression[callee.property.name='waitForTimeout']",
                    message: 'R-NO-SLEEP: wait on a real signal (locator state, response, URL), never a fixed timeout.'
                }
            ]
        }
    },

    // ──────────────────────────────────────────────
    // Test files — Playwright plugin + relaxed rules
    // ──────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    {
        ...eslintPluginPlaywright.configs['flat/recommended'],
        files: ['tests/**/*.ts']
    },
    {
        files: ['tests/**/*.ts'],
        rules: {
            // Relax for test code
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-empty-function': 'off',

            // Playwright plugin overrides
            'playwright/no-skipped-test': 'warn',
            'playwright/no-focused-test': 'error',
            'playwright/no-page-pause': 'error',
            'playwright/no-wait-for-timeout': 'error',
            'playwright/prefer-web-first-assertions': 'warn',
            'playwright/expect-expect': 'warn',
            'playwright/no-force-option': 'warn',
            'playwright/no-networkidle': 'warn',
            'playwright/missing-playwright-await': 'error',

            // Audit rules (scripts/audit-suite.mjs) enforced in the editor. Messages carry the rule ID;
            // the audit remains the CI gate and covers what these selectors can't see.
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@playwright/test',
                            message: "R-COMPOSITION: import { test, expect } from '@fixtures/fixtures'."
                        }
                    ]
                }
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector:
                        "MemberExpression[object.name='page'][property.name=/^(locator|getBy[A-Z]\\w*|\\$\\$?|click|fill|check|press|type|selectOption)$/]",
                    message: 'R-RAW-UI-IN-TEST: reach the UI through a page object fixture, not `page` directly.'
                },
                {
                    selector: "MemberExpression[object.name='request'][property.name=/^(get|post|put|patch|delete|head|fetch)$/]",
                    message: 'R-RAW-HTTP-IN-TEST: call the API through a service fixture, not `request` directly.'
                },
                {
                    selector: 'NewExpression[callee.name=/(Page|Service|Container|Section)$/]',
                    message: 'R-COMPOSITION: get page objects and services from fixtures; never construct them in a test.'
                },
                {
                    selector: "CallExpression[callee.name='setTimeout']",
                    message: 'R-NO-SLEEP: wait on a real signal (expect.poll, web-first assertion, response), never a timer.'
                },
                {
                    selector: "MemberExpression[object.property.name='describe'][property.name='serial']",
                    message: 'R-SHARED-STATE: tests must run alone; create data per test through a factory fixture.'
                }
            ]
        }
    },

    // ──────────────────────────────────────────────
    // Prettier must be last — disables formatting rules
    // ──────────────────────────────────────────────
    eslintConfigPrettier
);
