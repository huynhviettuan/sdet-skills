#!/usr/bin/env node
/**
 * openapi-tool — deterministic helpers for the service-builder skill. No dependencies (Node ≥ 18).
 *
 *   node openapi-tool.mjs inventory <spec> [--out inventory.json]
 *       List every operation with the service class, file, and method name it maps to (1:1).
 *   node openapi-tool.mjs schemas   <spec> [--out-dir src/data/schemas]
 *       Write one JSON Schema per JSON 2xx response: <out-dir>/<folder>/<methodName>_<status>_schema.json
 *       (the naming read by validateJsonSchema(`${methodName}_${status}`, folder, body)).
 *   node openapi-tool.mjs coverage  <spec> [--services src/services]
 *       Compare spec operations with `@operationId <id>` tags in service files (.ts or .java). Exit 1 on any gap.
 *
 * <spec> is a file path or http(s) URL, JSON or YAML (YAML needs the `yaml` or `js-yaml` package installed).
 * Supports OpenAPI 3.0 / 3.1 and Swagger 2.0.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];
// Keywords Ajv (strict mode, draft-07 + ajv-formats) understands; everything else is OpenAPI-only and is dropped.
const JSON_SCHEMA_KEYWORDS = new Set([
    '$ref', 'type', 'enum', 'const', 'format', 'title', 'description', 'default', 'examples', 'deprecated',
    'readOnly', 'writeOnly', 'multipleOf', 'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum',
    'maxLength', 'minLength', 'pattern', 'items', 'additionalItems', 'maxItems', 'minItems', 'uniqueItems',
    'contains', 'maxProperties', 'minProperties', 'required', 'properties', 'patternProperties',
    'additionalProperties', 'dependencies', 'propertyNames', 'if', 'then', 'else', 'allOf', 'anyOf', 'oneOf', 'not'
]);
const KNOWN_FORMATS = new Set([
    'date', 'time', 'date-time', 'duration', 'uri', 'uri-reference', 'uri-template', 'url', 'email', 'hostname',
    'ipv4', 'ipv6', 'regex', 'uuid', 'json-pointer', 'relative-json-pointer', 'byte', 'int32', 'int64', 'float',
    'double', 'password', 'binary'
]);

// ---------- loading ----------

async function loadSpec(source) {
    const text = /^https?:\/\//.test(source)
        ? await (await fetch(source)).text()
        : await fs.readFile(source, 'utf-8');
    try {
        return JSON.parse(text);
    } catch {
        for (const lib of ['yaml', 'js-yaml']) {
            try {
                const mod = await import(lib);
                return (mod.parse ?? mod.load ?? mod.default.parse ?? mod.default.load)(text);
            } catch {
                /* try next */
            }
        }
        throw new Error('Spec is not JSON and no YAML parser is installed. Run `npm i -D yaml` or convert to JSON.');
    }
}

// ---------- naming ----------

const words = (s) =>
    String(s)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean);
const pascal = (s) => words(s).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const kebab = (s) => words(s).map((w) => w.toLowerCase()).join('-');

/** camelCase(operationId), keeping the operationId's own casing inside words. */
function methodNameFromOperationId(operationId) {
    const parts = String(operationId).split(/[^A-Za-z0-9]+/).filter(Boolean);
    let name = parts.map((p, i) => (i === 0 ? p[0].toLowerCase() + p.slice(1) : p[0].toUpperCase() + p.slice(1))).join('');
    if (/^[0-9]/.test(name)) name = `op${name}`;
    return name;
}

/** Fallback when operationId is missing: GET /users/{id}/orders → getUsersByIdOrders */
function fallbackOperationId(method, apiPath) {
    const segs = apiPath
        .split('/')
        .filter(Boolean)
        .filter((s) => !/^v\d+$/.test(s))
        .map((s) => (s.startsWith('{') ? `By${pascal(s.slice(1, -1))}` : pascal(s)));
    return method.toLowerCase() + segs.join('');
}

const versionOf = (apiPath) => (apiPath.split('/').filter(Boolean)[0] ?? '').match(/^v\d+$/)?.[0] ?? null;

// ---------- inventory ----------

function refName(schema) {
    const ref = schema?.$ref ?? schema?.items?.$ref;
    if (!ref) return schema ? 'inline' : null;
    return ref.split('/').pop() + (schema.items ? '[]' : '');
}

function jsonContentSchema(content) {
    if (!content) return undefined;
    const key = Object.keys(content).find((k) => /json/i.test(k) || k === '*/*');
    return key ? content[key].schema : undefined;
}

function buildInventory(spec) {
    const isSwagger2 = spec.swagger === '2.0';
    const ops = [];
    for (const [apiPath, item] of Object.entries(spec.paths ?? {})) {
        for (const method of HTTP_METHODS) {
            const op = item[method];
            if (!op) continue;
            const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map((p) => resolve(spec, p));
            const bodyParam = isSwagger2 ? params.find((p) => p.in === 'body') : undefined;
            const requestSchema = isSwagger2 ? bodyParam?.schema : jsonContentSchema(op.requestBody?.content);
            const responses = {};
            for (const [status, resp] of Object.entries(op.responses ?? {})) {
                const r = resolve(spec, resp);
                const schema = isSwagger2 ? r.schema : jsonContentSchema(r.content);
                responses[status] = schema ? refName(schema) : null;
            }
            const operationId = op.operationId ?? fallbackOperationId(method, apiPath);
            ops.push({
                tag: op.tags?.[0] ?? 'default',
                extraTags: (op.tags ?? []).slice(1),
                version: versionOf(apiPath),
                method: method.toUpperCase(),
                path: apiPath,
                operationId,
                operationIdMissing: !op.operationId,
                methodName: methodNameFromOperationId(operationId),
                pathParams: params.filter((p) => p.in === 'path').map((p) => p.name),
                queryParams: params.filter((p) => p.in === 'query').map((p) => ({ name: p.name, required: !!p.required })),
                headerParams: params.filter((p) => p.in === 'header').map((p) => p.name),
                requestBody: requestSchema ? refName(requestSchema) : op.requestBody ? 'non-json' : null,
                requestBodyRequired: isSwagger2 ? !!bodyParam?.required : !!op.requestBody?.required,
                multipart: !!op.requestBody?.content?.['multipart/form-data'] || params.some((p) => p.in === 'formData'),
                responses,
                security: (op.security ?? spec.security ?? []).flatMap((s) => Object.keys(s)),
                deprecated: !!op.deprecated
            });
        }
    }

    // Service class per tag (+ version suffix only when a tag spans several API versions).
    const versionsByTag = {};
    for (const o of ops) (versionsByTag[o.tag] ??= new Set()).add(o.version);
    for (const o of ops) {
        const suffix = versionsByTag[o.tag].size > 1 && o.version ? o.version.toUpperCase() : '';
        o.service = `${pascal(o.tag)}${suffix}Service`;
        o.file = `src/services/${kebab(o.tag)}${suffix ? `-${suffix.toLowerCase()}` : ''}.service.ts`;
        o.schemaFolder = `${kebab(o.tag)}${suffix ? `-${suffix.toLowerCase()}` : ''}`;
    }

    // Method-name collisions inside one service → numbered suffix, flagged for a spec fix.
    const seen = {};
    for (const o of ops) {
        const key = `${o.service}.${o.methodName}`;
        seen[key] = (seen[key] ?? 0) + 1;
        if (seen[key] > 1) {
            o.collision = true;
            o.methodName = `${o.methodName}${seen[key]}`;
        }
    }

    return {
        title: spec.info?.title,
        specVersion: spec.openapi ?? spec.swagger,
        servers: isSwagger2
            ? [`${(spec.schemes ?? ['https'])[0]}://${spec.host ?? ''}${spec.basePath ?? ''}`]
            : (spec.servers ?? []).map((s) => s.url),
        securitySchemes: isSwagger2 ? spec.securityDefinitions ?? {} : spec.components?.securitySchemes ?? {},
        operations: ops
    };
}

function resolve(spec, obj) {
    let cur = obj;
    const guard = new Set();
    while (cur?.$ref && cur.$ref.startsWith('#/') && !guard.has(cur.$ref)) {
        guard.add(cur.$ref);
        cur = cur.$ref
            .slice(2)
            .split('/')
            .reduce((acc, k) => acc?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
    }
    return cur ?? obj;
}

// ---------- schema extraction ----------

function componentSchemas(spec) {
    return spec.swagger === '2.0' ? spec.definitions ?? {} : spec.components?.schemas ?? {};
}

/** Convert one OpenAPI schema node to draft-07 JSON Schema; collects referenced component names. */
function convert(node, refs, warnings) {
    if (Array.isArray(node)) return node.map((n) => convert(n, refs, warnings));
    if (!node || typeof node !== 'object') return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
        if (k === '$ref') {
            const name = v.split('/').pop();
            refs.add(name);
            out.$ref = `#/definitions/${name}`;
        } else if (k === 'properties' || k === 'patternProperties' || k === 'definitions') {
            out[k] = Object.fromEntries(Object.entries(v).map(([p, s]) => [p, convert(s, refs, warnings)]));
        } else if (k === 'format' && !KNOWN_FORMATS.has(v)) {
            warnings.add(`format "${v}" not supported by ajv-formats — dropped`);
        } else if (JSON_SCHEMA_KEYWORDS.has(k)) {
            out[k] = typeof v === 'object' ? convert(v, refs, warnings) : v;
        }
    }
    if (node.nullable === true) {
        if (out.type) out.type = [].concat(out.type, 'null');
        else if (out.$ref) return { anyOf: [out, { type: 'null' }] };
    }
    return out;
}

function toJsonSchema(spec, root, warnings) {
    const components = componentSchemas(spec);
    const refs = new Set();
    const schema = { $schema: 'http://json-schema.org/draft-07/schema#', ...convert(root, refs, warnings) };
    const definitions = {};
    const queue = [...refs];
    while (queue.length) {
        const name = queue.shift();
        if (definitions[name] || !components[name]) continue;
        const nested = new Set();
        definitions[name] = convert(components[name], nested, warnings);
        queue.push(...nested);
    }
    if (Object.keys(definitions).length) schema.definitions = definitions;
    return schema;
}

async function writeSchemas(spec, outDir) {
    const inv = buildInventory(spec);
    const isSwagger2 = spec.swagger === '2.0';
    const warnings = new Set();
    const written = [];
    for (const o of inv.operations) {
        const op = spec.paths[o.path][o.method.toLowerCase()];
        for (const [status, resp] of Object.entries(op.responses ?? {})) {
            if (!/^2\d\d$/.test(status)) continue;
            const r = resolve(spec, resp);
            const schema = isSwagger2 ? r.schema : jsonContentSchema(r.content);
            if (!schema) continue;
            const file = path.join(outDir, o.schemaFolder, `${o.methodName}_${status}_schema.json`);
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, JSON.stringify(toJsonSchema(spec, schema, warnings), null, 2) + '\n');
            written.push(file);
        }
    }
    return { written, warnings: [...warnings] };
}

// ---------- coverage ----------

async function listSourceFiles(dir) {
    const out = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...(await listSourceFiles(p)));
        else if (/\.(ts|java)$/.test(entry.name)) out.push(p);
    }
    return out;
}

async function coverage(spec, servicesDir) {
    const inv = buildInventory(spec);
    const found = new Map();
    const skipped = new Map();
    for (const file of await listSourceFiles(servicesDir)) {
        const text = await fs.readFile(file, 'utf-8');
        // Each JSDoc block: `@operationId <id>` marks a generated method; adding `@skipped <reason>` marks an
        // operation deliberately not generated (reported, not counted as mapped).
        for (const block of text.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
            const id = block[1].match(/@operationId\s+([^\s*]+)/)?.[1];
            if (!id) continue;
            const reason = block[1].match(/@skipped\s+([^\n*]+)/)?.[1]?.trim();
            if (reason) skipped.set(id, reason);
            else found.set(id, [...(found.get(id) ?? []), file]);
        }
    }
    const specIds = new Set(inv.operations.map((o) => o.operationId));
    const missing = inv.operations.filter((o) => !found.has(o.operationId) && !skipped.has(o.operationId));
    const extra = [...found.keys(), ...skipped.keys()].filter((id) => !specIds.has(id));
    const duplicated = [...found.entries()].filter(([, files]) => files.length > 1);
    return {
        total: inv.operations.length,
        mapped: inv.operations.filter((o) => found.has(o.operationId)).length,
        skipped: [...skipped.entries()].filter(([id]) => specIds.has(id)),
        missing,
        extra,
        duplicated
    };
}

// ---------- CLI ----------

function arg(name, fallback) {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : fallback;
}

async function main() {
    const [cmd, source] = process.argv.slice(2);
    if (!cmd || !source) {
        console.error('Usage: openapi-tool.mjs <inventory|schemas|coverage> <spec> [options]');
        process.exit(2);
    }
    const spec = await loadSpec(source);

    if (cmd === 'inventory') {
        const inv = buildInventory(spec);
        const out = arg('--out');
        if (out) await fs.writeFile(out, JSON.stringify(inv, null, 2) + '\n');
        console.log(`${inv.title} — ${inv.specVersion} — ${inv.operations.length} operations`);
        console.log(`servers: ${inv.servers.join(', ') || '(none)'}`);
        console.log(`security schemes: ${Object.keys(inv.securitySchemes).join(', ') || '(none)'}\n`);
        console.log('| Service | Method | HTTP | Path | Request | 2xx response | Flags |');
        console.log('|---|---|---|---|---|---|---|');
        for (const o of inv.operations) {
            const ok = Object.entries(o.responses).filter(([s]) => /^2/.test(s)).map(([s, r]) => `${s}:${r ?? '-'}`);
            const flags = [
                o.operationIdMissing && 'NO-OPERATION-ID',
                o.collision && 'NAME-COLLISION',
                o.extraTags.length && `also:${o.extraTags.join(',')}`,
                o.deprecated && 'deprecated',
                o.multipart && 'multipart'
            ].filter(Boolean);
            console.log(
                `| ${o.service} | ${o.methodName} | ${o.method} | ${o.path} | ${o.requestBody ?? '-'} | ${ok.join(' ') || '-'} | ${flags.join(' ')} |`
            );
        }
    } else if (cmd === 'schemas') {
        const { written, warnings } = await writeSchemas(spec, arg('--out-dir', path.join('src', 'data', 'schemas')));
        written.forEach((f) => console.log(`wrote ${f}`));
        warnings.forEach((w) => console.warn(`warning: ${w}`));
        console.log(`${written.length} schema file(s)`);
    } else if (cmd === 'coverage') {
        const r = await coverage(spec, arg('--services', path.join('src', 'services')));
        console.log(`coverage: ${r.mapped}/${r.total} operations mapped, ${r.skipped.length} skipped`);
        r.skipped.forEach(([id, reason]) => console.log(`  SKIPPED  ${id} — ${reason}`));
        r.missing.forEach((o) => console.log(`  MISSING  ${o.operationId}  (${o.method} ${o.path} → ${o.service}.${o.methodName})`));
        r.extra.forEach((id) => console.log(`  EXTRA    @operationId ${id} not in spec`));
        r.duplicated.forEach(([id, files]) => console.log(`  DUPLICATE ${id} in ${files.join(', ')}`));
        if (r.missing.length || r.extra.length || r.duplicated.length) process.exit(1);
    } else {
        console.error(`Unknown command: ${cmd}`);
        process.exit(2);
    }
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
