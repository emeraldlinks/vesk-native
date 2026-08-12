// Verify the per-library typing files and signature surfaces end-to-end without
// running a full app build:
//
//   1. Every registry `.vsklib` record's typing file (regenerated from the
//      record) parses cleanly with the native JS/TS parser the compiler uses.
//   2. Every export/tag of every record compiles to Kotlin when used from a
//      `.vsk` file: the import resolves against the registry surface and the
//      usage emits valid Kotlin through compileVskResult (no gradle needed).
//
//   npx tsx packages/cli-native/src/metadata/verify-typings.ts
import { mkdirSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from '@compiler-native/parser';
import { compileVskResult } from '@compiler-native/index';
import type { LibExportSig, LibParamSig, VskLibSurface } from '@compiler-native/elements';
import { vskLibTypingFile } from '@cli-native/generators';
import { loadRegistry } from '@cli-native/vsklib-registry';
import type { VskLibRecord } from '@cli-native/vsklib';

// A JS literal for a typed library parameter, matching the coercion the compiler
// applies (number -> numeric literal, string -> quoted, object/array -> literal).
function literalFor(sig: LibParamSig): string {
  switch (sig.shape) {
    case 'string':
      return `'x'`;
    case 'number':
      return '1';
    case 'boolean':
      return 'true';
    case 'array':
      return '[]';
    case 'enum':
      return sig.enumValues && sig.enumValues.length > 0 ? `'${sig.enumValues[0]}'` : `'x'`;
    case 'object':
    case 'any':
    case 'other':
    default:
      return '{}';
  }
}

// Build a `.vsk` that imports every export + tag of a library and uses each one,
// so the import resolution + Kotlin emission paths are both exercised.
function usageVsk(rec: VskLibRecord): string {
  const exported = [...rec.exports, ...Object.keys(rec.tags ?? {})];
  const imports = exported.length > 0 ? `import { ${exported.join(', ')} } from '@vesk/${rec.id}';\n` : '';
  const headerLines: string[] = [];
  const tagLines: string[] = [];
  for (const name of rec.exports) {
    const sig = rec.signatures?.[name];
    if (sig?.isConstructor && sig.params.length === 0) {
      headerLines.push(`const _${name} = ${name}();`);
    } else if (sig?.isConstructor && sig.params.length > 0) {
      const props = sig.params.map((p) => `${p.name}: ${literalFor(p)}`).join(', ');
      headerLines.push(`const _${name} = ${name}({ ${props} });`);
    } else if (sig?.isEnum && sig.enumValues && sig.enumValues.length > 0) {
      headerLines.push(`const _${name} = ${name}.${sig.enumValues[0]};`);
    } else {
      // Opaque export: reference it so the import resolves and the name emits.
      headerLines.push(`const _${name} = ${name};`);
    }
  }
  for (const tagName of Object.keys(rec.tags ?? {})) {
    tagLines.push(`      <${tagName} />`);
  }
  return `${imports}${headerLines.join('\n')}\n\ncomponent Lib() {\n  <div>\n${tagLines.join('\n')}\n  </div>\n}\n`;
}

function buildVsklibRegistry(records: VskLibRecord[]): Map<string, VskLibSurface> {
  const reg = new Map<string, VskLibSurface>();
  for (const rec of records) {
    const exports = new Map<string, LibExportSig>();
    for (const sig of Object.values(rec.signatures ?? {})) exports.set(sig.name, sig);
    for (const name of rec.exports ?? []) {
      if (!exports.has(name)) {
        exports.set(name, { name, target: name, qualified: name, isConstructor: false, params: [], defaultParams: [], returnShape: 'any' });
      }
    }
    reg.set(rec.id, { exports, tags: rec.tags ?? {} });
  }
  return reg;
}

async function main(): Promise<void> {
  const records = loadRegistry();
  const vsklibRegistry = buildVsklibRegistry(records);
  const appDir = mkdtempSync(join(tmpdir(), 'vesk-verify-'));
  mkdirSync(join(appDir, 'lib'), { recursive: true });
  let failures = 0;
  let parsed = 0;
  let compiled = 0;

  console.log(`  [verify] ${records.length} registry libraries`);
  for (const rec of records) {
    // 1. typing file parses with the native parser
    const ts = vskLibTypingFile(rec);
    try {
      parse(ts);
      parsed++;
    } catch (e) {
      failures++;
      console.error(`  [verify] ${rec.id}: typing file failed to parse: ${(e as Error).message}`);
      continue;
    }

    // 2. usage compiles to Kotlin through the real pipeline
    const vsk = usageVsk(rec);
    const fileRel = `lib/${rec.id}.vsk`;
    const result = compileVskResult(vsk, join(appDir, fileRel), { vsklibRegistry, fileRel, appDir, packageName: 'app' });
    if (result.errors.length > 0) {
      failures++;
      console.error(`  [verify] ${rec.id}: compile errors:`);
      for (const er of result.errors.slice(0, 6)) console.error(`              - ${er}`);
      continue;
    }
    compiled++;
    if (result.notes.length > 0) {
      // notes are non-fatal warnings; surface them for visibility
      for (const n of result.notes.slice(0, 3)) console.error(`              (note) ${rec.id}: ${n}`);
    }
  }

  console.log(`\n  [verify] typing files parsed: ${parsed}/${records.length}`);
  console.log(`  [verify] libraries compiled to Kotlin: ${compiled}/${records.length}`);
  console.log(`  [verify] ${failures} failure(s).`);
  if (failures > 0) process.exit(1);
}

void main();
