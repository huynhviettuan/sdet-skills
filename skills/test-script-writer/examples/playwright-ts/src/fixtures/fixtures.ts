import { test as a11yFixtures } from '@fixtures/accessibility-fixtures';
import { test as dataFixtures } from '@fixtures/data-fixtures';
import { test as databaseFixtures } from '@fixtures/database-fixtures';
import { test as hookFixtures } from '@fixtures/hook-fixtures';
import { test as pdfFixtures } from '@fixtures/pdf-fixtures';
import { test as wordFixtures } from '@fixtures/word-fixtures';
import { mergeTests } from '@playwright/test';
import { test as notificationFixtures } from 'src/fixtures/notification-fixtures';
import { test as pageFixtures } from 'src/fixtures/page-fixtures';
import { test as serviceFixtures } from 'src/fixtures/service-fixtures';

export const test = mergeTests(
    serviceFixtures,
    dataFixtures,
    pageFixtures,
    notificationFixtures,
    hookFixtures,
    a11yFixtures,
    databaseFixtures,
    pdfFixtures,
    wordFixtures
);
// Element-aware expect (see expect-fixtures.ts). Not passed through mergeExpects, which would drop the unwrapping.
export { expect } from 'src/fixtures/expect-fixtures';
