#!/usr/bin/env node
// status — validate docs/automation-status.json against the pipeline's schema and render docs/automation-status.md.
//
//   node scripts/status.mjs validate [path/to/automation-status.json]
//   node scripts/status.mjs render   [path/to/automation-status.json] [--out docs/automation-status.md]
//   node scripts/status.mjs summary  [path/to/automation-status.json]      one line: counts, gates, next
//
// No dependencies: the validator covers what the schema uses (type, enum, required, additionalProperties, pattern,
// items, $ref into $defs). The JSON is the source of truth; the Markdown is for people and the PR description.
// Exit 0 valid, 1 invalid (every problem listed), 2 usage.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATHS = [join(here, '..', 'schemas', 'automation-status.schema.json'), join(here, 'automation-status.schema.json')];

function loadSchema() {
  for (const p of SCHEMA_PATHS) {
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      /* next */
    }
  }
  throw new Error('automation-status.schema.json not found beside the script or in ../schemas');
}

export function validate(doc, schema, path = '$', root = schema, problems = []) {
  if (schema.$ref) {
    const target = schema.$ref.replace(/^#\//, '').split('/').reduce((o, k) => o?.[k], root);
    return validate(doc, target, path, root, problems);
  }
  if (schema.enum && !schema.enum.includes(doc)) problems.push(`${path}: "${doc}" is not one of ${schema.enum.join(' | ')}`);
  if (schema.type) {
    const t = Array.isArray(doc) ? 'array' : doc === null ? 'null' : typeof doc;
    const ok = schema.type === 'integer' ? Number.isInteger(doc) : t === schema.type;
    if (!ok) {
      problems.push(`${path}: expected ${schema.type}, got ${t}`);
      return problems;
    }
  }
  if (schema.pattern && typeof doc === 'string' && !new RegExp(schema.pattern).test(doc)) problems.push(`${path}: "${doc}" does not match ${schema.pattern}`);
  if (schema.minLength && typeof doc === 'string' && doc.length < schema.minLength) problems.push(`${path}: must not be empty`);
  if (schema.format === 'date-time' && typeof doc === 'string' && Number.isNaN(Date.parse(doc))) problems.push(`${path}: "${doc}" is not a date-time`);
  if (schema.type === 'object' && doc && typeof doc === 'object') {
    for (const key of schema.required ?? []) if (!(key in doc)) problems.push(`${path}: missing required "${key}"`);
    for (const [key, value] of Object.entries(doc)) {
      const sub = schema.properties?.[key];
      if (sub) validate(value, sub, `${path}.${key}`, root, problems);
      else if (schema.additionalProperties === false) problems.push(`${path}: unknown property "${key}"`);
    }
  }
  if (schema.type === 'array' && Array.isArray(doc) && schema.items) doc.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`, root, problems));
  return problems;
}

export function counts(doc) {
  const by = {};
  for (const c of doc.cases ?? []) by[c.state] = (by[c.state] ?? 0) + 1;
  return by;
}

export function summary(doc) {
  const by = counts(doc);
  const gates = Object.entries(doc.gates ?? {}).map(([g, v]) => `${g}:${v.state}`).join(' ');
  return `${doc.scope} | stage ${doc.stage?.current} | automated ${by.automated ?? 0} | in progress ${by['in-progress'] ?? 0} | blocked ${by.blocked ?? 0} | routed ${by.routed ?? 0} | manual ${by.manual ?? 0} | gates ${gates} | stops ${(doc.stops ?? []).length} | next: ${doc.stage?.next ?? '-'}`;
}

export function render(doc) {
  const by = counts(doc);
  const row = (cells) => `| ${cells.join(' | ')} |`;
  const lines = [
    `# Automation status — ${doc.scope}`,
    '',
    `Stack: ${doc.stack} · Repo: ${doc.repo} · Branch: ${doc.branch} · Updated: ${doc.updated}`,
    `Stage: ${doc.stage.current} · Next: ${doc.stage.next}`,
    '',
    `**${by.automated ?? 0} automated · ${by['in-progress'] ?? 0} in progress · ${by.blocked ?? 0} blocked · ${by.routed ?? 0} routed · ${by.manual ?? 0} manual** (${(doc.cases ?? []).length} cases)`,
    '',
    '## Gates',
    '',
    row(['Gate', 'State', 'By', 'At', 'Note']),
    row(['---', '---', '---', '---', '---']),
    ...['A', 'B', 'C'].map((g) => row([`${g} ${{ A: 'test cases', B: 'inventory', C: 'merge' }[g]}`, doc.gates[g].state, doc.gates[g].by ?? '', doc.gates[g].at ?? '', doc.gates[g].note ?? ''])),
    '',
  ];
  if (doc.intake) {
    lines.push('## Intake', '', ...Object.entries(doc.intake).map(([k, v]) => `- ${k}: ${v}`), '');
  }
  if (doc.stage.completed?.length) {
    lines.push('## Stages', '', row(['Stage', 'Agent', 'Model', 'Finished', 'Outcome', 'Summary']), row(['---', '---', '---', '---', '---', '---']));
    for (const s of doc.stage.completed) lines.push(row([s.stage, s.agent, s.model ?? '', s.finishedAt, s.outcome, s.summary ?? '']));
    lines.push('');
  }
  if (doc.inventory) {
    lines.push('## Inventory', '');
    for (const p of doc.inventory.pages ?? []) lines.push(`- page ${p.name} (${p.file}): ${p.elements} elements, ${p.verified}${p.unverifiedLocators ? `, ${p.unverifiedLocators} UNVERIFIED` : ''}`);
    for (const s of doc.inventory.services ?? []) lines.push(`- service ${s.tag} (${s.file}): ${s.operations} operations${s.coverage ? `, coverage ${s.coverage}` : ''}`);
    if (doc.inventory.testIdRequests?.length) lines.push('', 'Test-id requests for developers:', ...doc.inventory.testIdRequests.map((t) => `- ${t}`));
    lines.push('');
  }
  lines.push('## Cases', '', row(['Case', 'State', 'Level', 'File / reason', 'Verified']), row(['---', '---', '---', '---', '---']));
  for (const c of doc.cases ?? []) {
    const v = c.verified ? `${c.verified.green ? 'green' : 'red'}${c.verified.repeats ? ` ×${c.verified.repeats}` : ''}${c.verified.workers ? ` /${c.verified.workers}w` : ''}${c.verified.canFail ? `, can-fail ${c.verified.canFail}` : ''}` : '';
    lines.push(row([c.id, c.state, c.level ?? '', c.file ?? c.reason ?? '', v]));
  }
  lines.push('');
  if (doc.verification) {
    const v = doc.verification;
    lines.push('## Verification', '', `- command: \`${v.command ?? ''}\``, `- passed ${v.passed ?? '?'}, failed ${v.failed ?? '?'}, skipped ${v.skipped ?? '?'}${v.repeats ? `, ×${v.repeats}` : ''}${v.workers ? `, ${v.workers} workers` : ''}`,
      `- sentinel: ${v.sentinel ?? 'absent'}`, `- can-fail: ${v.canFail ? `${v.canFail.killed} killed, ${v.canFail.survived} survived` : 'not run'}`, `- audit: ${v.audit ?? 'not run'}`);
    if (v.reviewer) lines.push(`- independent review (${v.reviewer.agent}): ${v.reviewer.findings} finding(s) — ${v.reviewer.verdict ?? ''}`);
    lines.push('');
  }
  if (doc.openQuestions?.length) {
    lines.push('## Open questions', '', row(['ID', 'Question', 'For', 'Blocks']), row(['---', '---', '---', '---']));
    for (const q of doc.openQuestions) lines.push(row([q.id, q.question, q.forWhom ?? '', (q.blocks ?? []).join(', ')]));
    lines.push('');
  }
  lines.push('## Stops and decisions', '');
  if (!doc.stops?.length) lines.push('none');
  for (const s of doc.stops ?? []) lines.push(`- ${s.at} · ${s.stage} · **${s.rule}** — ${s.detail}${s.cases?.length ? ` (${s.cases.join(', ')})` : ''}${s.resolution ? ` → ${s.resolution}` : ''}`);
  lines.push('', `_Rendered from automation-status.json; edit the JSON, not this file._`, '');
  return lines.join('\n');
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!['validate', 'render', 'summary'].includes(cmd)) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    return 2;
  }
  const file = resolve(rest.find((a) => !a.startsWith('--')) ?? 'docs/automation-status.json');
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const problems = validate(doc, loadSchema());
  if (problems.length) {
    for (const p of problems) console.error(`INVALID ${p}`);
    return 1;
  }
  if (cmd === 'validate') console.log(`valid: ${summary(doc)}`);
  if (cmd === 'summary') console.log(summary(doc));
  if (cmd === 'render') {
    const out = rest.includes('--out') ? resolve(rest[rest.indexOf('--out') + 1]) : file.replace(/\.json$/, '.md');
    writeFileSync(out, render(doc));
    console.log(`rendered ${out}`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) process.exitCode = main();
