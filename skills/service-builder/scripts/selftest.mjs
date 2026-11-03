#!/usr/bin/env node
// selftest — openapi-tool.mjs: inventory, schemas (all tags and --tags), coverage (clean, missing, --tags scope).
// Uses a small inline spec, so it needs no network and no other file. Used by CI.
//
//   node selftest.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TOOL = new URL('./openapi-tool.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = mkdtempSync(join(tmpdir(), 'openapi-tool-'));
const failures = [];
const spec = {
  openapi: '3.0.3',
  info: { title: 'Mini store', version: '1' },
  servers: [{ url: 'https://api.example.test/v1' }],
  paths: {
    '/pet': { post: { tags: ['pet'], operationId: 'addPet', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } }, responses: { 200: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } } } } },
    '/pet/{petId}': { get: { tags: ['pet'], operationId: 'getPetById', parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } }, 404: { description: 'nope' } } } },
    '/store/order': { post: { tags: ['store'], operationId: 'placeOrder', responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } } } } },
  },
  components: { schemas: { Pet: { type: 'object', required: ['name'], properties: { id: { type: 'integer' }, name: { type: 'string' }, status: { type: 'string', enum: ['available', 'sold'] } } } } },
};

function run(...args) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
const expect = (name, cond, detail) => { if (!cond) failures.push(`${name}\n    ${String(detail).trim().split('\n').join('\n    ')}`); };

try {
  writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec));

  let r = run('inventory', 'spec.json');
  expect('inventory lists 3 operations', r.code === 0 && /3 operations/.test(r.out), r.out);
  expect('inventory maps getPetById to PetService', /\| Pet(Service)? \| getPetById \| GET \| \/pet\/\{petId\}/.test(r.out) || /PetService \| getPetById/.test(r.out), r.out);

  r = run('schemas', 'spec.json', '--out-dir', 'all');
  const all = readdirSync(join(dir, 'all'));
  expect('schemas without --tags writes every tag folder', r.code === 0 && all.includes('pet') && all.includes('store'), `${r.out}\nfolders: ${all.join(', ')}`);
  expect('schemas names files <methodName>_<status>_schema.json', existsSync(join(dir, 'all', 'pet', 'getPetById_200_schema.json')), readdirSync(join(dir, 'all', 'pet')).join(', '));
  expect('schemas skips non-2xx responses', !existsSync(join(dir, 'all', 'pet', 'getPetById_404_schema.json')), 'a 404 schema was written');

  r = run('schemas', 'spec.json', '--out-dir', 'scoped', '--tags', 'pet');
  const scoped = readdirSync(join(dir, 'scoped'));
  expect('schemas --tags pet writes only pet/', r.code === 0 && scoped.length === 1 && scoped[0] === 'pet', `${r.out}\nfolders: ${scoped.join(', ')}`);
  expect('schemas --tags pet reports 2 files', /2 schema file\(s\)/.test(r.out), r.out);

  mkdirSync(join(dir, 'src', 'services'), { recursive: true });
  writeFileSync(join(dir, 'src', 'services', 'pet.service.ts'), [
    'export class PetService {',
    '  /** @operationId addPet\n   * POST /pet */ async addPet() {}',
    '  /** @operationId getPetById\n   * GET /pet/{petId} */ async getPetById() {}',
    '}', ''].join('\n'));
  r = run('coverage', 'spec.json', '--services', 'src/services', '--tags', 'pet');
  expect('coverage --tags pet is clean with both pet operations mapped', r.code === 0 && /2\/2 operations mapped in tags pet \(1 out of scope\)/.test(r.out), r.out);
  r = run('coverage', 'spec.json', '--services', 'src/services');
  expect('coverage without --tags reports placeOrder missing and exits 1', r.code === 1 && /MISSING\s+placeOrder/.test(r.out), r.out);
  writeFileSync(join(dir, 'src', 'services', 'ghost.service.ts'), '/** @operationId notInSpec\n * GET /x */\n');
  r = run('coverage', 'spec.json', '--services', 'src/services', '--tags', 'pet');
  expect('coverage flags an @operationId that is not in the spec even inside --tags', r.code === 1 && /EXTRA\s+@operationId notInSpec/.test(r.out), r.out);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `selftest: ${failures.length} failure(s)` : 'selftest: ok');
process.exitCode = failures.length ? 1 : 0;
