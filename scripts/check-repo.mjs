#!/usr/bin/env node
// Consistency check for the sdet-skills repo (no dependencies; Node >= 18). Run before every commit and in CI:
//   node scripts/check-repo.mjs
// Checks:
//   - every skills/<name>/SKILL.md: frontmatter name == folder, description present and <= 1024 characters
//   - agents/*.md and commands/*.md: frontmatter with a description (agents also need a name == file name)
//   - plugin.json / marketplace.json parse; plugin name matches; marketplace source is "./"
//   - every Markdown file: balanced code fences; relative links resolve; #anchors exist in the target
//   - shared scripts are byte-identical in every copy (skill + both templates)
//   - every .mjs under skills/ and scripts/ parses (node --check)
// Exit code 0 = clean, 1 = problems found.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', 'target', 'test-results', 'playwright-report']);
const problems = [];
const problem = (file, msg) => problems.push(`${relative(root, file).replaceAll('\\', '/')}: ${msg}`);
const read = (f) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

function frontmatter(file) {
    const m = read(file).match(/^---\n([\s\S]*?)\n---/);
    if (!m) return null;
    const fm = m[1];
    const scalar = (key) => fm.match(new RegExp(`^${key}:\\s*(?!>|\\|)(.+)$`, 'm'))?.[1].trim();
    const folded = (key) => {
        const lines = fm.split('\n');
        const i = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
        if (i < 0) return undefined;
        const inline = lines[i].replace(new RegExp(`^${key}:\\s*[>|]?\\s*`), '');
        const rest = [];
        for (const l of lines.slice(i + 1)) {
            if (/^\S/.test(l)) break;
            rest.push(l.trim());
        }
        return [inline, ...rest].join(' ').trim();
    };
    return { name: scalar('name'), description: folded('description') };
}

const files = walk(root);

// Skills
const skillsDir = join(root, 'skills');
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
for (const d of skills) {
    const f = join(skillsDir, d, 'SKILL.md');
    if (!existsSync(f)) {
        problem(join(skillsDir, d), 'missing SKILL.md');
        continue;
    }
    const fm = frontmatter(f);
    if (!fm) problem(f, 'no frontmatter');
    else {
        if (fm.name !== d) problem(f, `name "${fm.name}" != folder "${d}"`);
        if (!fm.description) problem(f, 'missing description');
        else if (fm.description.length > 1024) problem(f, `description is ${fm.description.length} chars (max 1024)`);
    }
}

// Agents and commands
for (const [dir, needsName] of [
    ['agents', true],
    ['commands', false],
]) {
    const p = join(root, dir);
    if (!existsSync(p)) continue;
    for (const f of readdirSync(p).filter((x) => x.endsWith('.md'))) {
        const fm = frontmatter(join(p, f));
        if (!fm?.description) problem(join(p, f), 'frontmatter needs a description');
        if (needsName && fm?.name !== basename(f, '.md')) problem(join(p, f), `name "${fm?.name}" != file name`);
    }
}

// Manifests
try {
    const plugin = JSON.parse(read(join(root, '.claude-plugin/plugin.json')));
    const market = JSON.parse(read(join(root, '.claude-plugin/marketplace.json')));
    const entry = market.plugins?.find((x) => x.name === plugin.name);
    if (!entry) problem(join(root, '.claude-plugin/marketplace.json'), `no plugin entry named ${plugin.name}`);
    else if (entry.source !== './') problem(join(root, '.claude-plugin/marketplace.json'), 'plugin source must be "./"');
    if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) problem(join(root, '.claude-plugin/plugin.json'), 'version must be x.y.z');
} catch (err) {
    problem(join(root, '.claude-plugin'), `manifest does not parse: ${err.message}`);
}

// Markdown: fences, links, anchors
const slug = (h) =>
    h
        .trim()
        .toLowerCase()
        .replace(/[^\w\- ]/g, '')
        .replace(/ /g, '-');
const headingCache = new Map();
const headings = (f) => {
    if (!headingCache.has(f))
        headingCache.set(
            f,
            new Set(
                [...read(f).replace(/```[\s\S]*?```/g, '').matchAll(/^#+\s+(.+)$/gm)].map((m) => slug(m[1]))
            )
        );
    return headingCache.get(f);
};
for (const f of files.filter((x) => x.endsWith('.md'))) {
    const s = read(f);
    if ((s.match(/^\s*(```|````)/gm) ?? []).length % 2) problem(f, 'unbalanced code fences');
    const prose = s.replace(/````[\s\S]*?````/g, '').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const m of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
        const link = m[1];
        if (/^(https?:|mailto:)/.test(link)) continue;
        const [path, anchor] = link.split('#');
        const target = path ? resolve(dirname(f), path) : f;
        if (!existsSync(target)) {
            problem(f, `broken link ${link}`);
            continue;
        }
        if (anchor && target.endsWith('.md') && !headings(target).has(anchor)) problem(f, `missing anchor ${link}`);
    }
}

// Shared scripts: identical copies
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
for (const name of ['openapi-tool.mjs', 'audit-suite.mjs', 'can-fail.mjs']) {
    const copies = files.filter((f) => basename(f) === name);
    const hashes = new Set(copies.map(sha));
    if (copies.length < 3) problem(root, `${name}: expected 3 copies, found ${copies.length}`);
    if (hashes.size > 1)
        problem(root, `${name}: copies differ — ${copies.map((c) => relative(root, c).replaceAll('\\', '/')).join(', ')}`);
}

// Scripts parse
for (const f of files.filter((x) => x.endsWith('.mjs'))) {
    try {
        execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (err) {
        problem(f, `does not parse: ${String(err.stderr).split('\n').find(Boolean)}`);
    }
}

const md = files.filter((x) => x.endsWith('.md')).length;
if (problems.length) {
    for (const p of problems) console.log(`FAIL ${p}`);
    console.log(`\n${problems.length} problem(s) · ${skills.length} skills · ${md} Markdown files`);
    process.exit(1);
}
console.log(`OK · ${skills.length} skills · ${md} Markdown files · shared scripts identical`);
