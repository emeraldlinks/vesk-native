import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VskLibRecord } from '@cli-native/vsklib';
import type { LibExportSig, VskLibTag } from '@compiler-native/elements';

// The library catalog ships as `.vsklib` data files (one JSON record per
// library, grouped by category under registry/<category>/<id>.vsklib) rather
// than framework source code. The CLI loads the same records it needs at
// `vesk add/update` time from these files; auto-generated bindings for
// non-catalog libraries are persisted the same way into the project's
// gitignored `.vsklib/` cache. The format is the contract library maintainers
// can eventually author natively — nothing about a specific library lives in
// compiler or CLI source.
//
//   { "version": 1, "library": { VskLibRecord } }

export const VSKLIB_FORMAT_VERSION = 1;
const CATALOG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'registry');

export function registryCatalogDir(): string {
  return CATALOG_DIR;
}

// A single `.vsklib` record file: the serialized VskLibRecord, wrapped in a
// versioned envelope so the format can evolve without ambiguity.
export interface VsklibRecordFile {
  version: 1;
  library: VskLibRecord;
}

export function writeVsklibRecordFile(path: string, rec: VskLibRecord): void {
  mkdirSync(dirname(path), { recursive: true });
  const file: VsklibRecordFile = { version: VSKLIB_FORMAT_VERSION, library: rec };
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
}

export function readVsklibRecordFile(path: string): VskLibRecord {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<VsklibRecordFile>;
  if (raw.version !== VSKLIB_FORMAT_VERSION || !raw.library) {
    throw new Error(`corrupt .vsklib record ${path} — expected version ${VSKLIB_FORMAT_VERSION} with a library`);
  }
  return validateRecord(raw.library, path);
}

// Structural validation so a hand-authored or contributed catalog entry can
// never silently feed a malformed record into the compiler. Unknown fields are
// preserved (forward-compatible); missing required fields fail the load loudly.
export function validateRecord(rec: VskLibRecord, source: string): VskLibRecord {
  const required = ['id', 'name', 'description', 'group', 'artifact', 'version', 'exports', 'tags'] as const;
  for (const k of required) {
    if (rec[k] === undefined || rec[k] === null) throw new Error(`registry entry ${source}: missing field "${k}"`);
  }
  if (typeof rec.id !== 'string' || rec.id.length === 0) throw new Error(`registry entry ${source}: "id" must be a non-empty string`);
  if (typeof rec.group !== 'string' || typeof rec.artifact !== 'string' || typeof rec.version !== 'string') {
    throw new Error(`registry entry ${source}: group/artifact/version must be strings`);
  }
  if (!Array.isArray(rec.permissions) || rec.permissions.some((p) => typeof p !== 'string')) {
    throw new Error(`registry entry ${source}: "permissions" must be an array of strings`);
  }
  if (!Array.isArray(rec.gradle) || rec.gradle.length === 0) {
    throw new Error(`registry entry ${source}: "gradle" must be a non-empty array of coordinates`);
  }
  if (!Array.isArray(rec.exports) || rec.exports.some((e) => typeof e !== 'string')) {
    throw new Error(`registry entry ${source}: "exports" must be an array of names`);
  }
  if (typeof rec.tags !== 'object' || rec.tags === null || Array.isArray(rec.tags)) {
    throw new Error(`registry entry ${source}: "tags" must be an object`);
  }
  for (const [name, tag] of Object.entries(rec.tags as Record<string, VskLibTag>)) {
    if (typeof tag.composable !== 'string' || !Array.isArray(tag.imports) || typeof tag.attrs !== 'object' || tag.attrs === null) {
      throw new Error(`registry entry ${source}: tag "${name}" needs composable/imports/attrs`);
    }
  }
  for (const [name, sig] of Object.entries((rec.signatures ?? {}) as Record<string, LibExportSig>)) {
    if (typeof sig.name !== 'string' || typeof sig.target !== 'string' || typeof sig.qualified !== 'string' || !Array.isArray(sig.params)) {
      throw new Error(`registry entry ${source}: signature "${name}" needs name/target/qualified/params`);
    }
    if (typeof sig.isConstructor !== 'boolean') {
      throw new Error(`registry entry ${source}: signature "${name}" needs isConstructor`);
    }
  }
  // Derive libType from the presence of markup tags so every loaded record
  // carries it, even catalog entries authored before the field existed.
  if (rec.libType !== 'utility' && rec.libType !== 'component') {
    rec.libType = Object.keys(rec.tags).length > 0 ? 'component' : 'utility';
  }
  return rec;
}

function collectFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collectFiles(p, out);
    else if (name.endsWith('.vsklib')) out.push(p);
  }
}

// The catalog: every committed `registry/**/*.vsklib` file, validated at load.
// Essential entries sort first so `vesk add` and registry listings surface the
// first-curated tier before the long tail.
export function loadRegistry(): VskLibRecord[] {
  const files: string[] = [];
  collectFiles(CATALOG_DIR, files);
  if (files.length === 0) {
    throw new Error('registry catalog is empty — no .vsklib files found under registry/');
  }
  const records = files.map((p) => readVsklibRecordFile(p));
  records.sort((a, b) => Number(b.essential === true) - Number(a.essential === true) || a.id.localeCompare(b.id));
  return records;
}
