#!/usr/bin/env node
// selftest — every stop rule in guard-hooks.mjs blocks what it should and allows what it should. Used by CI.
//
//   node selftest.mjs

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HOOK = new URL('./guard-hooks.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const root = mkdtempSync(join(tmpdir(), 'guard-hooks-'));
mkdirSync(join(root, '.claude'));
mkdirSync(join(root, 'tests'));
writeFileSync(join(root, '.claude', 'guard.json'), JSON.stringify({ defaultBranch: 'main', productionHosts: ['app.gym.vn'] }));
const failures = [];

function run(event, toolInput, env = {}) {
  const r = spawnSync(process.execPath, [HOOK, event], {
    input: JSON.stringify({ cwd: root, tool_input: toolInput }),
    encoding: 'utf8',
    env: { ...process.env, ALLOW_ASSERTION_EDIT: '', ...env },
  });
  return { code: r.status, err: r.stderr };
}
const blocked = (name, r, why) => { if (r.code !== 2 || !r.err.includes(why)) failures.push(`${name}: expected block mentioning "${why}", got exit ${r.code}: ${r.err.trim()}`); };
const allowed = (name, r) => { if (r.code !== 0) failures.push(`${name}: expected allow, got exit ${r.code}: ${r.err.trim()}`); };

try {
  // Bash
  blocked('merge', run('pre-bash', { command: 'git merge automation/todo' }), 'Gate C');
  blocked('push main', run('pre-bash', { command: 'git push origin main' }), 'pushing to main');
  blocked('push HEAD:main', run('pre-bash', { command: 'git push origin HEAD:main' }), 'pushing to main');
  blocked('force push', run('pre-bash', { command: 'git push --force origin automation/todo' }), 'force-push');
  blocked('skip permissions', run('pre-bash', { command: 'claude -p "x" --dangerously-skip-permissions' }), 'permission bypass');
  blocked('production host', run('pre-bash', { command: 'curl https://APP.gym.vn/api/health' }), 'production host');
  allowed('push branch', run('pre-bash', { command: 'git push -u origin automation/todo' }));
  allowed('merge --abort', run('pre-bash', { command: 'git merge --abort' }));
  allowed('staging host', run('pre-bash', { command: 'curl https://staging.gym.vn/api/health' }));
  allowed('plain test run', run('pre-bash', { command: 'npx playwright test --repeat-each=3' }));

  // Edit: assertion changed in a test file
  blocked('assertion changed', run('pre-edit', {
    file_path: join(root, 'tests', 'todo.spec.ts'),
    old_string: "await expect(page.counter).toHaveText('1 item left');",
    new_string: "await expect(page.counter).toHaveText('2 items left');",
  }), 'changes or removes an existing assertion');
  blocked('assertion removed (java)', run('pre-edit', {
    file_path: 'src/test/java/com/example/TodoTest.java',
    old_string: 'assertThat(footer.itemsLeft()).isEqualTo(1);\n    log.info("x");',
    new_string: 'log.info("x");',
  }), 'existing assertion');
  blocked('assertion changed (py)', run('pre-edit', {
    file_path: 'tests/test_todo.py',
    old_string: 'assert page.items_left() == 1',
    new_string: 'assert page.items_left() >= 0',
  }), 'existing assertion');
  allowed('assertion kept, step changed', run('pre-edit', {
    file_path: 'tests/todo.spec.ts',
    old_string: "await page.add('a');\nawait expect(page.counter).toHaveText('1 item left');",
    new_string: "await page.addTodo('a');\nawait expect(page.counter).toHaveText('1 item left');",
  }));
  allowed('new assertion added', run('pre-edit', {
    file_path: 'tests/todo.spec.ts',
    old_string: "await page.addTodo('a');",
    new_string: "await page.addTodo('a');\nawait expect(page.counter).toHaveText('1 item left');",
  }));
  allowed('assertion changed outside tests', run('pre-edit', {
    file_path: 'src/pages/todo.ts',
    old_string: 'expect(x).toBe(1)',
    new_string: 'expect(x).toBe(2)',
  }));
  allowed('assertion changed with the person\'s override', run('pre-edit', {
    file_path: 'tests/todo.spec.ts',
    old_string: "expect(a).toBe('x');",
    new_string: "expect(a).toBe('y');",
  }, { ALLOW_ASSERTION_EDIT: '1' }));

  // Sleeps on write
  blocked('waitForTimeout', run('pre-edit', { file_path: 'tests/a.spec.ts', content: 'await page.waitForTimeout(2000);' }), 'fixed sleep');
  blocked('Thread.sleep', run('pre-edit', { file_path: 'src/main/java/A.java', old_string: 'x', new_string: 'Thread.sleep(500);' }), 'fixed sleep');
  blocked('time.sleep', run('pre-edit', { file_path: 'src/qa/pages/a.py', old_string: 'x', new_string: 'time.sleep(1)' }), 'fixed sleep');
  allowed('bounded wait', run('pre-edit', { file_path: 'tests/a.spec.ts', content: "await expect(page.x).toBeVisible({ timeout: 5000 });" }));

  // Post-edit: no audit script in this temp repo → allowed; with a failing audit → blocked
  allowed('post-edit without audit script', run('post-edit', { file_path: 'tests/a.spec.ts' }));
  mkdirSync(join(root, 'scripts'));
  writeFileSync(join(root, 'scripts', 'audit-suite.mjs'), "console.log('R-SLEEP block tests/a.spec.ts:3 fixed sleep'); process.exit(1);\n");
  blocked('post-edit relays a blocking audit finding', run('post-edit', { file_path: 'tests/a.spec.ts' }), 'R-SLEEP');
  allowed('post-edit ignores docs', run('post-edit', { file_path: 'docs/notes.md' }));

  // Unknown event
  const r = run('nonsense', {});
  if (r.code !== 1) failures.push(`unknown event: expected exit 1, got ${r.code}`);

  // status.mjs: a valid document validates, renders and summarises; every planted problem is named
  const STATUS = new URL('./status.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const good = {
    scope: 'todo', stack: 'playwright-ts', repo: 'D:/x', branch: 'automation/todo', updated: '2026-11-02T09:00:00Z',
    stage: { current: '4-implement', next: 'TC-TODO-003, then 5-verify', completed: [{ stage: '3-build', agent: 'sdet-build-page', model: 'sonnet', finishedAt: '2026-11-02T08:00:00Z', outcome: 'done', produced: ['src/pages/todo/index.ts'] }] },
    gates: { A: { state: 'passed', by: 'tuan', at: '2026-11-02T07:00:00Z' }, B: { state: 'passed', by: 'tuan', at: '2026-11-02T08:30:00Z' }, C: { state: 'not-reached' } },
    cases: [{ id: 'TC-TODO-001', state: 'automated', level: 'ui', file: 'tests/e2e/todo.spec.ts', verified: { green: true, repeats: 3, workers: 4, canFail: 'killed' } }, { id: 'TC-TODO-003', state: 'blocked', reason: 'OQ-001' }],
    stops: [{ at: '2026-11-02T08:45:00Z', stage: '4-implement', rule: 'missing-requirement', detail: 'no message text for the empty todo', cases: ['TC-TODO-003'] }],
  };
  const sdir = mkdtempSync(join(tmpdir(), 'status-'));
  try {
    writeFileSync(join(sdir, 'automation-status.json'), JSON.stringify(good));
    let s = spawnSync(process.execPath, [STATUS, 'validate', join(sdir, 'automation-status.json')], { encoding: 'utf8' });
    if (s.status !== 0 || !/automated 1 \| in progress 0 \| blocked 1/.test(s.stdout)) failures.push(`status validate on a good document: exit ${s.status} ${s.stdout}${s.stderr}`);
    s = spawnSync(process.execPath, [STATUS, 'render', join(sdir, 'automation-status.json')], { encoding: 'utf8' });
    const md = s.status === 0 ? readFileSync(join(sdir, 'automation-status.md'), 'utf8') : '';
    for (const want of ['# Automation status — todo', '| TC-TODO-001 | automated | ui | tests/e2e/todo.spec.ts | green ×3 /4w, can-fail killed |', '**missing-requirement**', 'Rendered from automation-status.json'])
      if (!md.includes(want)) failures.push(`status render lacks: ${want}`);
    const bad = { ...good, branch: 'feature/todo', stack: 'cypress', cases: [{ id: 'TODO-1', state: 'done' }], gates: { A: { state: 'passed' }, B: { state: 'maybe' } }, extra: 1 };
    writeFileSync(join(sdir, 'bad.json'), JSON.stringify(bad));
    s = spawnSync(process.execPath, [STATUS, 'validate', join(sdir, 'bad.json')], { encoding: 'utf8' });
    if (s.status !== 1) failures.push(`status validate on a bad document: expected exit 1, got ${s.status}`);
    for (const want of ['$.branch: "feature/todo" does not match', '$.stack: "cypress" is not one of', '$.cases[0].id: "TODO-1" does not match', '$.cases[0].state: "done" is not one of', '$.gates: missing required "C"', '$.gates.B.state: "maybe" is not one of', '$: unknown property "extra"'])
      if (!s.stderr.includes(want)) failures.push(`status validate did not report: ${want}`);
  } finally {
    rmSync(sdir, { recursive: true, force: true });
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `selftest: ${failures.length} failure(s)` : 'selftest: ok');
process.exitCode = failures.length ? 1 : 0;
