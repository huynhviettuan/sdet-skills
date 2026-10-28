#!/usr/bin/env node
// can-fail — prove that the assertions in new or changed tests can fail.
//
//   node scripts/can-fail.mjs --run "<command that runs one test file, with {file}>" [--base origin/main]
//                             [--max 5] [file ...]
//
// For each test file (the files given, else the test files changed against --base), it takes the assertion lines that
// were added (all assertion lines when a file is given explicitly), changes the expected value on one line at a time
// (the last string literal gets a suffix, else the last number is incremented), runs the file, and restores it.
// A mutation the run does not notice — the command still exits 0 — is a SURVIVOR: an assertion that cannot fail,
// so the test proves nothing. The unmutated file is run first and must pass, or the file is INCONCLUSIVE.
//
// Exit codes: 0 every mutation killed; 1 a survivor; 2 a baseline that did not pass, or nothing to check.
// Examples:
//   node scripts/can-fail.mjs --run "npx playwright test {file} --retries=0"
//   node scripts/can-fail.mjs --run "mvn -q test -Dtest={class}" src/test/java/com/example/qa/TodoTest.java
//   node scripts/can-fail.mjs --run "uv run pytest {file} -p no:randomly -q"
// {class} is the file name without directory and extension (for runners that select by class).
//
// The files are restored after every run, also on Ctrl+C. Run it on a clean working tree, or at least commit or stash
// first, so a crash can never leave a mutant behind unnoticed.

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, extname } from 'node:path';

const TEST_FILE = /(\.(spec|test)\.[cm]?[jt]sx?$)|(Tests?\.java$)|((^|[\\/])test_[^\\/]*\.py$)|(_test\.py$)/;
// Polling helpers (expect.poll, Eventually.verify, eventually(...)) and assert_* helpers are assertion lines too.
const ASSERTION = {
  js: /\bexpect(\.poll|\.soft)?\s*\(|\.to(Be|Equal|Have|Contain|Match|StrictEqual)\w*\s*\(|\bassert\.\w+\s*\(|\b[eE]ventually\w*\s*\(/,
  java: /\bassertThat\s*\(|\bassert(Equals|True|False|NotNull|Null)\s*\(|\.(isEqualTo|contains\w*|hasSize|matches|startsWith|endsWith)\s*\(|\bEventually\.\w+\s*\(/,
  py: /^\s*assert\b|\bexpect\s*\(|\.to_(be|have|contain)\w*\s*\(|\beventually\s*\(|\b_?assert_\w+\s*\(/,
};

// The literal that is only an assertion's message, never its expected value: Python `assert x == 1, "msg"`;
// TestNG `assertEquals(actual, expected, "msg")`; `expect(x, "msg")`; AssertJ `.as("msg")`. Mutating it proves nothing.
function messageSpans(line, language) {
  const spans = [];
  const add = (re) => {
    for (const m of line.matchAll(re)) spans.push([m.index + m[0].indexOf(m[1]), m.index + m[0].indexOf(m[1]) + m[1].length]);
  };
  if (language === 'py') add(/^\s*assert\b[^#]*?,\s*(f?(["'])(?:\\.|(?!\2).)*\2)\s*$/g);
  if (language === 'java') {
    add(/\.(?:as|describedAs|withFailMessage|overridingErrorMessage)\s*\(\s*("(?:\\.|[^"])*")/g);
    add(/\bassert\w*\s*\([^;]*,[^;]*,\s*("(?:\\.|[^"])*")\s*\)\s*;?\s*$/g);
  }
  if (language === 'js') {
    add(/\bexpect(?:\.soft)?\s*\([^,()]*(?:\([^()]*\))?[^,()]*,\s*((["'`])(?:\\.|(?!\2).)*\2)\s*\)/g);
    // node:assert — assert(value, msg) / assert.ok(value, msg) and assert.xEqual(actual, expected, msg)
    add(/\bassert(?:\.ok)?\s*\([^,]*,\s*((["'`])(?:\\.|(?!\2).)*\2)\s*\)\s*;?\s*$/g);
    add(/\bassert\.\w+\s*\([^;]*,[^;]*,\s*((["'`])(?:\\.|(?!\2).)*\2)\s*\)\s*;?\s*$/g);
  }
  return spans;
}

function lang(file) {
  const ext = extname(file);
  if (ext === '.java') return 'java';
  if (ext === '.py') return 'py';
  return 'js';
}

function parseArgs(argv) {
  const args = { run: null, base: 'origin/main', max: 5, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') args.run = argv[++i];
    else if (a === '--base') args.base = argv[++i];
    else if (a === '--max') args.max = Number(argv[++i]);
    else if (a === '-h' || a === '--help') args.help = true;
    else args.files.push(a);
  }
  return args;
}

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

// Added line numbers per file, from the diff against the base plus uncommitted changes.
function addedLines(base) {
  const result = new Map();
  let diff = '';
  try {
    diff = git(`diff -U0 ${base} --`);
  } catch {
    diff = git('diff -U0 HEAD --');
  }
  let file = null;
  for (const line of diff.split('\n')) {
    const f = line.match(/^\+\+\+ b\/(.+)$/);
    if (f) {
      file = f[1];
      continue;
    }
    const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (h && file) {
      const start = Number(h[1]);
      const count = h[2] === undefined ? 1 : Number(h[2]);
      const set = result.get(file) ?? new Set();
      for (let n = start; n < start + count; n++) set.add(n);
      result.set(file, set);
    }
  }
  return result;
}

// The expected value is usually the last literal on an assertion line that is not the assertion's message.
function mutate(line, language = 'js') {
  const messages = messageSpans(line, language);
  const isMessage = (m) => messages.some(([s, e]) => m.index >= s && m.index < e);
  const strings = [...line.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)].filter((m) => !isMessage(m));
  if (strings.length) {
    const m = strings[strings.length - 1];
    const quote = m[1];
    const replaced = `${quote}${m[2]}__mutant__${quote}`;
    return { text: line.slice(0, m.index) + replaced + line.slice(m.index + m[0].length), what: `${m[0]} -> ${replaced}` };
  }
  const numbers = [...line.matchAll(/(?<![\w.$])(-?\d+(?:\.\d+)?)(?![\w.])/g)].filter((m) => !isMessage(m));
  if (numbers.length) {
    const m = numbers[numbers.length - 1];
    const next = String(Number(m[1]) + 1);
    return { text: line.slice(0, m.index) + next + line.slice(m.index + m[0].length), what: `${m[1]} -> ${next}` };
  }
  return null;
}

function runTest(command, file) {
  const cmd = command.replaceAll('{file}', file).replaceAll('{class}', basename(file, extname(file)));
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { status: r.status ?? 1, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

// A run that skipped everything also exits 0. Read the runner's summary (Playwright / pytest "N passed, N skipped",
// Maven/TestNG "Tests run: N, Failures: F, Errors: E, Skipped: S"): with nothing passed, the baseline proves nothing.
function nothingPassed(output) {
  const maven = [...output.matchAll(/Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/g)].pop();
  if (maven) return Number(maven[1]) - Number(maven[2]) - Number(maven[3]) - Number(maven[4]) <= 0;
  const passed = [...output.matchAll(/(\d+)\s+passed/g)].reduce((n, m) => n + Number(m[1]), 0);
  const skipped = /(\d+)\s+(skipped|deselected)|no tests ran|No tests found/i.test(output);
  return passed === 0 && skipped;
}

function pickEvenly(items, max) {
  if (items.length <= max) return items;
  const step = items.length / max;
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.run) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    return args.help ? 0 : 2;
  }
  const explicit = args.files.length > 0;
  const added = explicit ? new Map() : addedLines(args.base);
  const files = (explicit ? args.files : [...added.keys()]).filter((f) => TEST_FILE.test(f) && existsSync(f));
  if (!files.length) {
    console.log('can-fail: no test files to check');
    return 2;
  }

  let survivors = 0;
  let inconclusive = 0;
  let killed = 0;
  let restore = null;
  const onSignal = () => {
    if (restore) restore();
    process.exit(130);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  for (const file of files) {
    const original = readFileSync(file, 'utf8');
    const lines = original.split('\n');
    const language = lang(file);
    const pattern = ASSERTION[language];
    const changed = added.get(file);
    const candidates = lines
      .map((text, i) => ({ n: i + 1, text }))
      .filter(({ n, text }) => (explicit || changed?.has(n)) && pattern.test(text) && mutate(text, language));
    if (!candidates.length) continue;

    const baseline = runTest(args.run, file);
    if (baseline.status !== 0) {
      console.log(`INCONCLUSIVE ${file}: the unmutated file does not pass, so a failing mutant would prove nothing`);
      inconclusive++;
      continue;
    }
    if (nothingPassed(baseline.output)) {
      console.log(`INCONCLUSIVE ${file}: the unmutated run passed nothing (everything skipped?), so a surviving mutant`
        + ' would prove nothing — set what the tests need (base URL, credentials) and run again');
      inconclusive++;
      continue;
    }
    for (const { n, text } of pickEvenly(candidates, args.max)) {
      const m = mutate(text, language);
      const mutated = [...lines];
      mutated[n - 1] = m.text;
      restore = () => writeFileSync(file, original);
      writeFileSync(file, mutated.join('\n'));
      let status;
      try {
        status = runTest(args.run, file).status;
      } finally {
        restore();
        restore = null;
      }
      if (status === 0) {
        survivors++;
        console.log(`SURVIVED ${file}:${n}  ${m.what}  — the test still passes with this expectation changed`);
      } else {
        killed++;
        console.log(`killed   ${file}:${n}  ${m.what}`);
      }
    }
  }
  console.log(`can-fail: ${killed} killed, ${survivors} survived, ${inconclusive} inconclusive file(s)`);
  if (survivors) return 1;
  if (inconclusive || killed === 0) return 2;
  return 0;
}

process.exitCode = main();
