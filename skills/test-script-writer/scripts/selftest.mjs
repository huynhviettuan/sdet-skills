#!/usr/bin/env node
// selftest — prove can-fail.mjs still tells a real assertion from one that cannot fail. Used by CI.
//
//   node selftest.mjs
//
// Builds tiny test files in a temporary folder (plain Node `assert`, run with `node {file}`; a fake runner prints a
// framework summary), runs can-fail on them and checks each verdict. Exit 0 when all hold.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CAN_FAIL = new URL('./can-fail.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = mkdtempSync(join(tmpdir(), 'can-fail-selftest-'));
const failures = [];

function canFail(run, file) {
  const r = spawnSync(process.execPath, [CAN_FAIL, '--run', run, '--max', '20', file], { cwd: dir, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}
function expect(name, cond, out) {
  if (!cond) failures.push(`${name}\n${out.split('\n').map((l) => `    ${l}`).join('\n')}`);
}

try {
  // 1. Real assertions die, a weak one survives, a message literal is not the mutation target.
  const original = [
    "import assert from 'node:assert';",
    'const sum = (a, b) => a + b;',
    'assert.strictEqual(sum(2, 3), 5);',
    "assert.strictEqual(String(sum(1, 1)), '2', 'the sum as text');",
    "assert.ok(typeof sum === 'function' || 'anything');",
    "const eventually = (f) => f(); eventually(() => assert.strictEqual(sum(1, 2), 3));",
    '',
  ].join('\n');
  writeFileSync(join(dir, 'sum.test.mjs'), original);
  let r = canFail('node {file}', 'sum.test.mjs');
  expect('a real numeric assertion is killed', /killed\s+sum\.test\.mjs:3 /.test(r.out), r.out);
  expect("the expected value '2' is mutated, not the message", /killed\s+sum\.test\.mjs:4\s+'2' -> '2__mutant__'/.test(r.out), r.out);
  expect('the weak assertion survives', /SURVIVED sum\.test\.mjs:5 /.test(r.out), r.out);
  expect('an eventually(...) line is checked', /killed\s+sum\.test\.mjs:6 /.test(r.out), r.out);
  expect('exit 1 with a survivor', r.status === 1, r.out);
  expect('the file is restored', readFileSync(join(dir, 'sum.test.mjs'), 'utf8') === original, r.out);

  // 2. Python-style message: the literal after the comma of an assert is a message.
  writeFileSync(join(dir, 'msg.test.mjs'), "import assert from 'node:assert';\nassert.strictEqual(200, 200);\n");
  r = canFail('node {file}', 'msg.test.mjs');
  expect('every mutant killed exits 0', r.status === 0 && /1 killed, 0 survived/.test(r.out), r.out);

  // 3. A baseline that passed nothing (all skipped) is inconclusive, never "every mutant survived".
  writeFileSync(join(dir, 'runner.mjs'), "console.log('  3 skipped'); process.exit(0);\n");
  writeFileSync(join(dir, 'skipped.test.mjs'), "import assert from 'node:assert';\nassert.strictEqual(1 + 1, 2);\n");
  r = canFail('node runner.mjs {file}', 'skipped.test.mjs');
  expect('an all-skipped baseline is INCONCLUSIVE', /INCONCLUSIVE skipped\.test\.mjs: the unmutated run passed nothing/.test(r.out), r.out);
  expect('an all-skipped baseline exits 2', r.status === 2, r.out);
  expect('nothing is reported as SURVIVED for it', !/SURVIVED/.test(r.out), r.out);

  // 4. Maven/TestNG summary with every test skipped is also nothing passed.
  writeFileSync(join(dir, 'mvn.mjs'), "console.log('Tests run: 4, Failures: 0, Errors: 0, Skipped: 4'); process.exit(0);\n");
  r = canFail('node mvn.mjs {file}', 'skipped.test.mjs');
  expect('a Maven all-skipped summary is INCONCLUSIVE', /INCONCLUSIVE/.test(r.out) && r.status === 2, r.out);

  // 5. A baseline that fails is inconclusive.
  writeFileSync(join(dir, 'red.test.mjs'), "import assert from 'node:assert';\nassert.strictEqual(1 + 1, 3);\n");
  r = canFail('node {file}', 'red.test.mjs');
  expect('a failing baseline is INCONCLUSIVE', /INCONCLUSIVE red\.test\.mjs: the unmutated file does not pass/.test(r.out) && r.status === 2, r.out);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `selftest: ${failures.length} failure(s)` : 'selftest: ok');
process.exitCode = failures.length ? 1 : 0;
