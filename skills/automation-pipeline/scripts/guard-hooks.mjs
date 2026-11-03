#!/usr/bin/env node
// guard-hooks — the automation pipeline's stop rules as Claude Code hooks, so a model under pressure cannot break them.
//
// Wired in the scaffold's .claude/settings.json (PreToolUse on Bash and Edit|Write, PostToolUse on Edit|Write). Reads
// the hook's JSON on stdin; exit 0 allows, exit 2 blocks with the reason on stderr (Claude sees it and must change
// course). Nothing here asks a model anything.
//
//   node scripts/guard-hooks.mjs pre-bash     block: merge into / push to the default branch; a production host;
//                                             --dangerously-skip-permissions; force-push
//   node scripts/guard-hooks.mjs pre-edit     block in tests/**: an Edit that removes or changes an existing assertion
//                                             line (the "edit the expectation to go green" move); a fixed sleep
//                                             anywhere (waitForTimeout, Thread.sleep, time.sleep, asyncio.sleep)
//   node scripts/guard-hooks.mjs post-edit    run audit-suite.mjs on the repo with --fail-on block after a write
//                                             under src/ or tests/ (exit 2 relays the audit's findings)
//
// Configuration (all optional), .claude/guard.json next to settings.json:
//   { "defaultBranch": "main", "productionHosts": ["app.example.com"], "allowAssertionEdits": false }
// A person who means to change an expectation sets ALLOW_ASSERTION_EDIT=1 for that one command, or edits the case
// first and lets the test follow it; the hook is for the model, not for the reviewer.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

const ASSERTION = /\bexpect(\.poll|\.soft)?\s*\(|\.to(Be|Equal|Have|Contain|Match|StrictEqual)\w*\s*\(|\bassert(That|Equals|True|False|NotNull|Null)?\s*\(|^\s*assert\b|\.(isEqualTo|hasSize|containsExactly\w*|matches)\s*\(/;
const SLEEP = /\bwaitForTimeout\s*\(|\bThread\.sleep\s*\(|\btime\.sleep\s*\(|\basyncio\.sleep\s*\(|\bsetTimeout\s*\([^,]*,\s*\d{3,}\s*\)|\bsleep\s+\d/;

export function loadConfig(root) {
  const file = join(root, '.claude', 'guard.json');
  const cfg = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return {
    defaultBranch: cfg.defaultBranch ?? 'main',
    productionHosts: (cfg.productionHosts ?? []).map((h) => String(h).toLowerCase()),
    allowAssertionEdits: Boolean(cfg.allowAssertionEdits) || process.env.ALLOW_ASSERTION_EDIT === '1',
  };
}

export function checkBash(command, cfg) {
  const c = String(command ?? '');
  const branch = cfg.defaultBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\bgit\\s+merge\\b`).test(c) && !/--abort|--continue|--no-commit\s+--dry-run/.test(c))
    return `git merge is the user's (Gate C): the pipeline delivers a branch and a PR, never a merge`;
  if (new RegExp(`\\bgit\\s+push\\b[^\\n;&|]*\\b(${branch}|origin\\s+HEAD:${branch})\\b`).test(c))
    return `pushing to ${cfg.defaultBranch} is the user's; push the automation/<scope> branch and open a PR`;
  if (/\bgit\s+push\b[^\n;&|]*(--force\b|-f\b|\+\w)/.test(c)) return 'force-push rewrites shared history; not from the pipeline';
  if (/--dangerously-skip-permissions/.test(c)) return 'permission bypass is never part of a pipeline run (unattended.md)';
  if (/\bgit\s+(checkout|switch)\s+(-B\s+)?(main|master)\b/.test(c) && /\bgit\s+(commit|reset)\b/.test(c))
    return `committing on ${cfg.defaultBranch} directly; work on automation/<scope>`;
  for (const host of cfg.productionHosts) if (c.toLowerCase().includes(host)) return `"${host}" is a production host (guard.json); the pipeline runs against test environments only`;
  return null;
}

export function checkEdit(input, cfg, root) {
  const file = String(input.file_path ?? '');
  const rel = isAbsolute(file) ? relative(root, file).replaceAll('\\', '/') : file.replaceAll('\\', '/');
  const newText = String(input.new_string ?? input.content ?? '');
  const oldText = String(input.old_string ?? '');
  const sleepHit = newText.split('\n').find((l) => SLEEP.test(l));
  if (sleepHit) return `fixed sleep in ${rel}: "${sleepHit.trim().slice(0, 80)}" — wait on the real signal (an element state, a response, a poll with a bound)`;
  const inTests = /^(tests?|src\/test|e2e|spec)\//.test(rel) || /(\.(spec|test)\.[cm]?[jt]sx?|Tests?\.java|test_[^/]*\.py)$/.test(rel);
  if (inTests && oldText && !cfg.allowAssertionEdits) {
    const before = oldText.split('\n').filter((l) => ASSERTION.test(l)).map((l) => l.trim());
    const after = new Set(newText.split('\n').filter((l) => ASSERTION.test(l)).map((l) => l.trim()));
    const changed = before.filter((l) => !after.has(l));
    if (changed.length)
      return `${rel}: this edit changes or removes an existing assertion (${changed[0].slice(0, 70)}). A failing test is a finding — the case or the product is wrong, not the expectation. Fix the case first, or a person sets ALLOW_ASSERTION_EDIT=1.`;
  }
  return null;
}

export function postEdit(input, root) {
  const file = String(input.file_path ?? '');
  const rel = isAbsolute(file) ? relative(root, file).replaceAll('\\', '/') : file.replaceAll('\\', '/');
  if (!/^(src|tests?|e2e)\//.test(rel) || !/\.(ts|js|mjs|java|py)$/.test(rel)) return null;
  const audit = join(root, 'scripts', 'audit-suite.mjs');
  if (!existsSync(audit)) return null;
  try {
    execFileSync(process.execPath, [audit, root, '--fail-on', 'block'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    return null;
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const lines = out.split('\n').filter((l) => /\bR-[A-Z]+\b/.test(l)).slice(0, 12);
    return `audit-suite found a blocking rule after writing ${rel}:\n${lines.join('\n') || out.slice(-800)}`;
  }
}

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function main() {
  const [event] = process.argv.slice(2);
  const payload = readStdin();
  const root = resolve(payload.cwd ?? process.cwd());
  const cfg = loadConfig(root);
  const input = payload.tool_input ?? {};
  let reason = null;
  if (event === 'pre-bash') reason = checkBash(input.command, cfg);
  else if (event === 'pre-edit') reason = checkEdit(input, cfg, root);
  else if (event === 'post-edit') reason = postEdit(input, root);
  else {
    console.error(`guard-hooks: unknown event "${event}" (pre-bash | pre-edit | post-edit)`);
    return 1;
  }
  if (reason) {
    console.error(`[guard-hooks] blocked: ${reason}`);
    return 2;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  process.exitCode = main();
}
export const _dir = dirname;
