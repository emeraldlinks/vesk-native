import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileNpmModules } from '../packages/cli-native/src/npm.ts';

const dirs: string[] = [];
function fixtureApp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'vesk-npm-test-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function writePage(app: string, header: string): void {
  writeFileSync(join(app, 'page.vsk'), `${header}\ncomponent P() {\n<p>hi</p>\n}\n`);
}

describe('npm package compilation', () => {
  it('translates an installed ESM package and its export surface to Kotlin', () => {
    const app = fixtureApp();
    writePage(app, "import { format, shout } from 'tiny-format'");
    mkdirSync(join(app, 'node_modules', 'tiny-format'), { recursive: true });
    writeFileSync(join(app, 'node_modules', 'tiny-format', 'package.json'), JSON.stringify({ name: 'tiny-format', version: '1.0.0', main: 'index.js' }));
    writeFileSync(
      join(app, 'node_modules', 'tiny-format', 'index.js'),
      [
        "export function format(n) {",
        "  const s = n.toFixed(2)",
        "  return '$' + s",
        "}",
        'export function shout(s) { return s.toUpperCase() }',
      ].join('\n'),
    );

    const r = compileNpmModules(app);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.files.map((f) => f.rel), ['vmod/tiny_format/index.kt']);
    const registry = r.registry.get('tiny-format');
    assert.ok(registry?.has('format'));
    assert.ok(registry?.has('shout'));
    const kt = r.files[0]!.kt;
    assert.ok(kt.includes('fun format('));
    assert.ok(kt.includes('fun shout('));
    assert.ok(kt.includes('uppercase()'));
  });

  it('follows relative imports inside a package (BFS over the reachable subgraph)', () => {
    const app = fixtureApp();
    writePage(app, "import { combined } from 'two-file-pkg'");
    mkdirSync(join(app, 'node_modules', 'two-file-pkg'), { recursive: true });
    writeFileSync(join(app, 'node_modules', 'two-file-pkg', 'package.json'), JSON.stringify({ name: 'two-file-pkg', version: '1.0.0', main: 'index.js' }));
    writeFileSync(
      join(app, 'node_modules', 'two-file-pkg', 'index.js'),
      ["import { base } from './base.js'", 'export function combined(n) { return base(n) + 1 }'].join('\n'),
    );
    writeFileSync(join(app, 'node_modules', 'two-file-pkg', 'base.js'), 'export function base(n) { return n * 2 }');

    const r = compileNpmModules(app);
    assert.deepEqual(r.errors, []);
    const rels = r.files.map((f) => f.rel).sort();
    assert.deepEqual(rels, ['vmod/two_file_pkg/base.kt', 'vmod/two_file_pkg/index.kt']);
  });

  it('errors on uninstalled packages instead of skipping them', () => {
    const app = fixtureApp();
    writePage(app, "import { x } from 'nope-pkg'");

    const r = compileNpmModules(app);
    assert.equal(r.errors.length, 1);
    assert.match(r.errors[0]!, /could not resolve npm package \(not installed in node_modules\)/);
  });

  it('hard-errors on CommonJS-only packages', () => {
    const app = fixtureApp();
    writePage(app, "import { x } from 'old-pkg'");
    mkdirSync(join(app, 'node_modules', 'old-pkg'), { recursive: true });
    writeFileSync(join(app, 'node_modules', 'old-pkg', 'package.json'), JSON.stringify({ name: 'old-pkg', version: '1.0.0', main: 'index.cjs' }));
    writeFileSync(join(app, 'node_modules', 'old-pkg', 'index.cjs'), 'module.exports = { x: 1 }\n');

    const r = compileNpmModules(app);
    assert.equal(r.errors.length, 1);
    assert.match(r.errors[0]!, /CommonJS-only or missing entry file/);
  });
});
