#!/usr/bin/env node
// Pre-flight check for a manual-qa-agent ExecutableSpec before it is proposed.
//
// Validates the spec with the agent's own zod schema (packages/domain/src/executable.ts), so the check can't drift
// from what the API accepts, then adds review checks the schema can't express: traceability to the approved case,
// literal secrets, unscoped locators, unflagged destructive actions, missing cleanup, unproven negative checks.
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
const { ExecutableSpec, destructiveSteps, referencedSecrets, describeLocator } = await import(
  pathToFileURL(schemaFile).href
);

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
const isAssertion = (s) => s.type.startsWith('expect') || (s.type === 'apiRequest' && s.expectStatus !== undefined);
for (const s of spec.steps)
  if (isAssertion(s) && s.sourceRefs.length === 0)
    add('warn', s.id, 'assertion has no sourceRefs; cite the source whose expected result it proves');

// Secrets: credentials must be { "secret": "NAME" } references, never literals.
const SECRETY = /pass(word)?|secret|token|api[_-]?key|otp|pin\b/i;
const nameOf = (l) => (l.by === 'label' ? l.label : l.by === 'role' ? l.name ?? '' : l.by === 'testId' ? l.testId : l.text);
for (const { s } of all) {
  if (s.type === 'fill' && typeof s.value === 'string' && SECRETY.test(nameOf(s.target)) && s.value.length > 0) {
    const looksWrongOnPurpose = /^(wrong|invalid|bad|not-the-right)/i.test(s.value);
    add(looksWrongOnPurpose ? 'info' : 'error', s.id,
      looksWrongOnPurpose
        ? `literal value in a credential field ("${s.value}") — fine for a deliberately wrong credential`
        : 'literal value in a credential field; use { "secret": "NAME" }');
  }
  if (s.type === 'apiRequest' && s.body)
    for (const [k, v] of Object.entries(s.body))
      if (SECRETY.test(k) && typeof v === 'string' && !/^(wrong|invalid|bad)/i.test(v))
        add('error', s.id, `literal "${k}" in the request body; use { "secret": "NAME" }`);
}

// Scoping: locators resolve through their owning region; page-global text/role/label matches are fragile.
const LANDMARKS = new Set(['main', 'navigation', 'dialog', 'alertdialog', 'form', 'region']);
const scoped = (l) => l.within !== undefined || l.by === 'testId' || (l.by === 'role' && LANDMARKS.has(l.role));
for (const { s } of all)
  if ('target' in s && !scoped(s.target))
    add('warn', s.id, `unscoped locator ${describeLocator(s.target)}; add "within" its owning region or use a test id`);

// Destructive actions must be flagged so the run is gated by a scoped approval.
const DESTRUCTIVE = /\b(delete|remove|destroy|purge|deactivate|terminate|pay|purchase|refund|transfer|send|invite|publish|archive|cancel (my )?(account|subscription|order))\b/i;
for (const { s } of all) {
  if (s.type === 'click' && !s.destructive && DESTRUCTIVE.test(nameOf(s.target)))
    add('warn', s.id, `"${nameOf(s.target)}" looks irreversible; set "destructive": true or confirm it isn't`);
  if (s.type === 'apiRequest' && !s.destructive && s.method !== 'DELETE' && DESTRUCTIVE.test(s.path))
    add('warn', s.id, `${s.method} ${s.path} looks irreversible; set "destructive": true or confirm it isn't`);
}

// Cleanup: whoever creates data owns its teardown.
const creates = all.filter(({ phase, s }) => phase !== 'teardown' && s.type === 'apiRequest' && ['POST', 'PUT', 'PATCH'].includes(s.method));
if (creates.length && spec.teardown.length === 0)
  add('warn', creates[0].s.id, 'creates or changes data but teardown is empty; add the cleanup (teardown always runs)');

// Every action's effect is observed: the spec should not end on an action.
const last = spec.steps[spec.steps.length - 1];
if (!isAssertion(last)) add('warn', last.id, 'the last step is an action; its effect is never asserted');

// Negative checks need a sync point: expectHidden straight after an action passes before the app reacts.
spec.steps.forEach((s, i) => {
  const prev = spec.steps[i - 1];
  if (s.type === 'expectHidden' && prev && !isAssertion(prev))
    add('warn', s.id, 'expectHidden right after an action passes instantly; first assert something that proves the app responded');
});

for (const id of destructiveSteps(spec)) add('info', id, 'destructive: the run is BLOCKED until a QA lead approves this exact spec and environment');
for (const name of referencedSecrets(spec)) add('info', '(spec)', `needs secret ${name}: the worker must have QA_SECRET_${name}`);
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
