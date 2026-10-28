#!/usr/bin/env node
// Pre-flight check for a manual-qa-agent ExecutableSpec before it is proposed.
//
// Validates the spec with the agent's own zod schema (packages/domain/src/executable.ts; ADR-0008 plus the values,
// rows, sessions, waits, uploads, hooks and headers of ADR-0015/0021/0024/0025), so the check can't drift from what
// the API accepts, then adds review checks the schema can't express: traceability to the approved case, literal
// secrets, unscoped locators, unflagged destructive actions, missing cleanup, unproven negative checks, and the
// agent's own weak-assertion flags (ADR-0023) that the reviewer would otherwise see first.
//
// Run it from the agent checkout so tsx and zod resolve there:
//   pnpm --dir <agent-repo> exec tsx <skill-dir>/scripts/check-spec.mjs <spec.json> [--refs A@v1,B@v1] [--json]
//
// <spec.json> holds either the API body ({ "spec": {...} }) or the bare spec. --refs lists the sourceRefs of the
// approved case revision (GET /api/test-cases/:id); without it the traceability check is skipped.
// Exit code: 0 = no errors (warnings allowed), 1 = errors, 2 = usage or setup problem.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--refs');
if (!file) {
  console.error('usage: check-spec.mjs <spec.json> [--refs A@v1,B@v1] [--json]  (run from the agent repo)');
  process.exit(2);
}

const schemaFile = resolve(process.cwd(), 'packages/domain/src/executable.ts');
if (!existsSync(schemaFile)) {
  console.error(`agent schema not found at ${schemaFile} — run with: pnpm --dir <agent-repo> exec tsx ...`);
  process.exit(2);
}
const domain = await import(pathToFileURL(schemaFile).href);
const { ExecutableSpec, destructiveSteps, referencedSecrets, describeLocator } = domain;
// Older agent checkouts (before ADR-0023) have no weakAssertions; the check is then skipped, not failed.
const weakAssertions = domain.weakAssertions ?? (() => []);

const raw = JSON.parse(readFileSync(resolve(file), 'utf8'));
const input = raw && typeof raw === 'object' && 'spec' in raw ? raw.spec : raw;
const findings = [];
const add = (level, step, message) => findings.push({ level, step, message });

const parsed = ExecutableSpec.safeParse(input);
if (!parsed.success) {
  for (const issue of parsed.error.issues) add('error', issue.path.join('.') || '(spec)', issue.message);
  report();
}
const spec = parsed.data;
const all = [
  ...spec.setup.map((s) => ({ phase: 'setup', s })),
  ...spec.steps.map((s) => ({ phase: 'steps', s })),
  ...spec.teardown.map((s) => ({ phase: 'teardown', s })),
];

// Traceability: the API rejects refs outside the approved case; catch it before proposing.
const refsArg = flag('--refs');
if (refsArg) {
  const allowed = new Set(refsArg.split(',').map((r) => r.trim()).filter(Boolean));
  for (const { s } of all)
    for (const r of s.sourceRefs)
      if (!allowed.has(r) && !r.startsWith('story:')) add('error', s.id, `cites ${r}, which the approved case does not cite`);
}
// An assertion is an expect* step, or an apiRequest that checks its status or its JSON (ADR-0024).
const isAssertion = (s) =>
  s.type.startsWith('expect') || (s.type === 'apiRequest' && (s.expectStatus !== undefined || (s.expectJson?.length ?? 0) > 0));
const isAction = (s) => !isAssertion(s) && !['capture', 'waitFor'].includes(s.type);
for (const s of spec.steps)
  if (isAssertion(s) && s.sourceRefs.length === 0)
    add('warn', s.id, 'assertion has no sourceRefs; cite the source whose expected result it proves');

// Secrets: credentials must be { "secret": "NAME" } / { "totp": "NAME" } references, never literals.
const SECRETY = /pass(word)?|secret|token|api[_-]?key|otp|pin\b/i;
const WRONG_ON_PURPOSE = /^(wrong|invalid|bad|not-the-right)/i;
const nameOf = (l) => (l.by === 'label' ? l.label : l.by === 'role' ? l.name ?? '' : l.by === 'testId' ? l.testId : l.text);
const literalSecret = (k, v) => SECRETY.test(k) && typeof v === 'string' && v.length > 0 && !WRONG_ON_PURPOSE.test(v);
for (const { s } of all) {
  if (s.type === 'fill' && typeof s.value === 'string' && SECRETY.test(nameOf(s.target)) && s.value.length > 0) {
    const looksWrongOnPurpose = WRONG_ON_PURPOSE.test(s.value);
    add(looksWrongOnPurpose ? 'info' : 'error', s.id,
      looksWrongOnPurpose
        ? `literal value in a credential field ("${s.value}") — fine for a deliberately wrong credential`
        : 'literal value in a credential field; use { "secret": "NAME" }');
  }
  // Bodies of apiRequest, session (a sign-in: the usual place for a literal password) and testHook.
  if (['apiRequest', 'session', 'testHook'].includes(s.type) && s.body)
    for (const [k, v] of Object.entries(s.body))
      if (literalSecret(k, v)) add('error', s.id, `literal "${k}" in the request body; use { "secret": "NAME" }`);
  if (s.type === 'apiRequest' && s.rawBody && /"(pass(word)?|secret|token|api[_-]?key)"\s*:\s*"[^"]+"/i.test(s.rawBody.text))
    add('warn', s.id, 'rawBody seems to carry a credential literal; rawBody has no secret references, so keep it to deliberately invalid input');
  if (s.type === 'apiRequest' && s.expectJson)
    for (const c of s.expectJson)
      if (c.equals !== undefined && literalSecret(c.path, c.equals))
        add('error', s.id, `literal secret compared at "${c.path}"; use { "secret": "NAME" } (evidence then shows only the name)`);
}

// Scoping: locators resolve through their owning region; page-global text/role/label matches are fragile.
const LANDMARKS = new Set(['main', 'navigation', 'dialog', 'alertdialog', 'form', 'region']);
const scoped = (l) => l.within !== undefined || l.by === 'testId' || (l.by === 'role' && LANDMARKS.has(l.role));
// Every locator a step holds: target (fill, click, select, press?, upload, expect*, capture text), trigger, waitFor text.
const locatorsOf = (s) => {
  const out = [];
  if (s.target) out.push(s.target);
  if (s.type === 'expectDownload') out.push(s.trigger);
  if (s.type === 'capture' && s.from.kind === 'text') out.push(s.from.target);
  if (s.type === 'waitFor' && s.until.kind === 'text') out.push(s.until.target);
  return out;
};
const GRIDS = new Set(['grid', 'table', 'menu', 'menubar', 'listbox']);
for (const { s } of all)
  for (const l of locatorsOf(s)) {
    if (!scoped(l)) add('warn', s.id, `unscoped locator ${describeLocator(l)}; add "within" its owning region or use a test id`);
    // ADR-0022: a control looked up in a whole grid or menu matches every slot and the run is INCONCLUSIVE.
    if (l.within && l.within.by === 'role' && GRIDS.has(l.within.role) && l.by === 'role' && !l.name && !l.exact)
      add('warn', s.id, `${describeLocator(l)} is scoped to a whole ${l.within.role}; scope it through its row/rowheader or name it exactly`);
  }

// Destructive actions must be flagged so the run is gated by a scoped approval.
const DESTRUCTIVE = /\b(delete|remove|destroy|purge|deactivate|terminate|pay|purchase|refund|transfer|send|invite|publish|archive|cancel (my )?(account|subscription|order))\b/i;
for (const { s } of all) {
  if (s.type === 'click' && !s.destructive && DESTRUCTIVE.test(nameOf(s.target)))
    add('warn', s.id, `"${nameOf(s.target)}" looks irreversible; set "destructive": true or confirm it isn't`);
  if (s.type === 'apiRequest' && !s.destructive && s.method !== 'DELETE' && DESTRUCTIVE.test(s.path))
    add('warn', s.id, `${s.method} ${s.path} looks irreversible; set "destructive": true or confirm it isn't`);
  if (s.type === 'testHook' && DESTRUCTIVE.test(s.path))
    add('warn', s.id, `test hook ${s.path} looks irreversible; a testHook cannot be flagged destructive — use apiRequest if the gate should apply`);
}

// Cleanup: whoever creates data owns its teardown.
const creates = all.filter(({ phase, s }) =>
  phase !== 'teardown' && ((s.type === 'apiRequest' && ['POST', 'PUT', 'PATCH'].includes(s.method)) || (s.type === 'testHook' && s.method !== 'GET')));
if (creates.length && spec.teardown.length === 0)
  add('warn', creates[0].s.id, 'creates or changes data but teardown is empty; add the cleanup (teardown always runs)');

// Every action's effect is observed: the spec should not end on an action.
const last = spec.steps[spec.steps.length - 1];
if (isAction(last)) add('warn', last.id, 'the last step is an action; its effect is never asserted');

// Negative checks need a sync point: expectHidden straight after an action passes before the app reacts.
spec.steps.forEach((s, i) => {
  const prev = spec.steps[i - 1];
  if (s.type === 'expectHidden' && prev && isAction(prev))
    add('warn', s.id, 'expectHidden right after an action passes instantly; first assert something that proves the app responded');
});

// The agent's own weak-assertion flags (ADR-0023) become the executable's reviewFlags; resolve them before proposing.
for (const f of weakAssertions(spec)) add('warn', f.match(/^steps? ([a-z0-9_,-]+(?:, [a-z0-9_-]+)*)/)?.[1] ?? '(spec)', `weak assertion (agent reviewFlags): ${f}`);

// Bounded waits (ADR-0024): a timeout BLOCKS the run; a wait at the ceiling usually means the case needs a hook or a framework test.
for (const { s } of all)
  if (s.type === 'waitFor') {
    if (s.timeoutMs >= 120_000) add('warn', s.id, 'waitFor at the 120 s ceiling; if the signal takes that long, a testHook or a framework test with a clock fits better');
    add('info', s.id, `waitFor runs out after ${s.timeoutMs} ms → the run is BLOCKED (WAIT_TIMEOUT:${s.id}), never PASSED or FAILED`);
  }

for (const id of destructiveSteps(spec)) add('info', id, 'destructive: the run is BLOCKED until a QA lead approves this exact spec and environment');
for (const name of referencedSecrets(spec)) add('info', '(spec)', `needs secret ${name}: the worker must have QA_SECRET_${name}`);
for (const { s } of all)
  if (s.type === 'testHook') add('info', s.id, `test hook ${s.path}: the environment must list its path prefix (pnpm qa env … --test-hooks), never production`);
const sessions = all.filter(({ s }) => s.type === 'session').map(({ s }) => s.name);
if (sessions.length) add('info', '(spec)', `API sessions: ${sessions.join(', ')} — a sign-in that answers non-2xx makes the run INCONCLUSIVE`);
const valueNames = Object.keys(spec.values);
if (valueNames.length) add('info', '(spec)', `run-scoped dates: ${valueNames.join(', ')} — derived once at run start; they appear in logs and evidence`);
if (spec.rows.length) add('info', '(spec)', `${spec.rows.length} data row(s) over columns ${Object.keys(spec.rows[0]).join(', ')}: the whole spec runs per row, one verdict per row`);
if (spec.exclusive) add('info', '(spec)', 'exclusive: the worker runs it alone on its environment; expect it to queue behind other runs');
if (spec.setup.length) add('info', '(spec)', 'a failing setup step makes the run INCONCLUSIVE, not FAILED');

report();

function report() {
  const errors = findings.filter((f) => f.level === 'error').length;
  const warns = findings.filter((f) => f.level === 'warn').length;
  if (args.includes('--json')) console.log(JSON.stringify({ file, errors, warnings: warns, findings }, null, 2));
  else {
    for (const f of findings) console.log(`${f.level.toUpperCase().padEnd(5)} ${f.step.padEnd(18)} ${f.message}`);
    console.log(`${file}: ${errors} error(s), ${warns} warning(s)${errors ? '' : ' — ready to propose'}`);
  }
  process.exit(errors ? 1 : 0);
}
