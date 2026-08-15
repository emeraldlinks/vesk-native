// Registry conformance gate: every catalog `.vsklib` record is re-derived from
// the published artifact via binding-gen (the same pipeline that verifies the
// coil/ycharts/glide bindings) and asserted against the authored surface.
//
//   - every authored `export` must be a real public symbol in the artifact
//     (callable export, signature, tag, or a skip-listed class/function);
//   - every authored `signature` must be backed by a machine signature with a
//     matching constructor/enum kind;
//   - every authored `tag` must match the machine composable (name, imports,
//     attrs, attrShapes).
//
// A record that promises a surface the artifact does not provide is a build
// failure here — the record must be fixed or removed, never guessed around.
// Run with:
//   npx tsx packages/cli-native/src/metadata/registry-conformance.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VskLibRecord } from '@cli-native/vsklib';
import { generateLibraryBinding } from './binding-gen.js';

const REGISTRY = 'packages/cli-native/registry';

// Exports that live in a transitive artifact of the pinned one rather than in
// the pinned artifact itself (e.g. `HttpClient` ships in ktor-client-core,
// which ktor-client-okhttp depends on). The pinned artifact's classpath brings
// them in, but the machine surface of the pinned artifact cannot show them —
// so verify them against the providing artifact instead of guessing.
const TRANSITIVE_PROVIDERS: Record<string, { group: string; artifact: string; version: string }> = {
  'ImageLoader': { group: 'io.coil-kt', artifact: 'coil-base', version: '2.7.0' },
  'ImageRequest': { group: 'io.coil-kt', artifact: 'coil-base', version: '2.7.0' },
  'LottieComposition': { group: 'com.airbnb.android', artifact: 'lottie', version: '6.5.2' },
  'HttpClient': { group: 'io.ktor', artifact: 'ktor-client-core', version: '2.3.12' },
  'Palette': { group: 'androidx.palette', artifact: 'palette', version: '1.0.0' },
  'LeakCanary': { group: 'com.squareup.leakcanary', artifact: 'leakcanary-android-core', version: '2.14' },
};

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}

function simpleNameOf(skippedEntry: string): string | null {
  const m = /^([A-Za-z0-9_.$]+) — /.exec(skippedEntry);
  if (!m) return null;
  const dotted = m[1] ?? '';
  return dotted.slice(dotted.lastIndexOf('.') + 1);
}

interface Failure {
  id: string;
  detail: string;
}

async function verifyRecord(record: VskLibRecord): Promise<Failure[]> {
  const failures: Failure[] = [];
  const coord = { group: record.group, artifact: record.artifact, version: record.version };
  let binding;
  try {
    binding = await generateLibraryBinding(coord);
  } catch (e) {
    return [{ id: record.id, detail: `artifact unreachable: ${String(e).slice(0, 200)}` }];
  }
  const mach = binding.record;
  const machineSigs = mach.signatures ?? {};
  const machineTags = mach.tags ?? {};
  const machineNames = new Set<string>(binding.surfaceNames);
  for (const n of mach.exports) machineNames.add(n);
  for (const n of Object.keys(machineSigs)) machineNames.add(n);
  for (const n of Object.keys(machineTags)) machineNames.add(n);
  for (const s of binding.skipped) {
    const simple = simpleNameOf(s);
    if (simple) machineNames.add(simple);
  }

  // The authored multiplatform flag must match the real artifact's published
  // Gradle module metadata — a wrong value silently misplaces pages between
  // commonMain and androidMain, so it fails the gate instead.
  if (record.multiplatform !== undefined && record.multiplatform !== mach.multiplatform) {
    failures.push({ id: record.id, detail: `multiplatform mismatch: record says ${record.multiplatform}, artifact metadata says ${mach.multiplatform}` });
  }

  // A name that the primary artifact cannot show may be provided by a known
  // transitive artifact; verify it against that artifact's machine surface.
  const transitiveSurface = new Map<string, Set<string>>();
  const transitiveNoArg = new Map<string, Set<string>>();
  const surfaceFor = async (name: string): Promise<{ names: Set<string>; noArg: Set<string> }> => {
    const provider = TRANSITIVE_PROVIDERS[name];
    if (!provider) return { names: machineNames, noArg: new Set(binding.javaNoArgCtors) };
    if (!transitiveSurface.has(name)) {
      let names = new Set<string>();
      let noArg = new Set<string>();
      try {
        const tb = await generateLibraryBinding(provider);
        names = new Set(tb.surfaceNames);
        noArg = new Set(tb.javaNoArgCtors);
        for (const n of tb.record.exports) names.add(n);
        for (const n of Object.keys(tb.record.signatures ?? {})) names.add(n);
        for (const n of Object.keys(tb.record.tags ?? {})) names.add(n);
        for (const s of tb.skipped) {
          const simple = simpleNameOf(s);
          if (simple) names.add(simple);
        }
      } catch {
        names = new Set();
      }
      transitiveSurface.set(name, names);
      transitiveNoArg.set(name, noArg);
    }
    return { names: transitiveSurface.get(name) ?? new Set(), noArg: transitiveNoArg.get(name) ?? new Set() };
  };

  for (const name of record.exports ?? []) {
    const { names } = await surfaceFor(name);
    if (!names.has(name)) {
      failures.push({ id: record.id, detail: `export '${name}' is not a public symbol in ${coord.group}:${coord.artifact}:${coord.version}` });
    }
  }

  for (const [name, sig] of Object.entries(record.signatures ?? {})) {
    const msig = machineSigs[name];
    const { names, noArg } = await surfaceFor(name);
    if (!msig) {
      if (sig.isConstructor && noArg.has(name)) continue;
      failures.push({ id: record.id, detail: `signature '${name}' is not callable in the artifact (machine: ${names.has(name) ? 'present but not callable' : 'absent'})` });
      continue;
    }
    if (sig.isConstructor !== msig.isConstructor) {
      failures.push({ id: record.id, detail: `signature '${name}' kind mismatch: record says constructor=${sig.isConstructor}, machine says constructor=${msig.isConstructor}` });
    }
    if (sig.isEnum !== msig.isEnum) {
      failures.push({ id: record.id, detail: `signature '${name}' kind mismatch: record says enum=${sig.isEnum}, machine says enum=${msig.isEnum}` });
    }
    if (sig.qualified && msig.qualified && sig.qualified !== msig.qualified) {
      failures.push({ id: record.id, detail: `signature '${name}' qualified mismatch: record ${sig.qualified}, machine ${msig.qualified}` });
    }
  }

  for (const [tagName, tag] of Object.entries(record.tags ?? {})) {
    // vesk-native wrappers (composables defined in the runtime, not the
    // artifact) are verified against the runtime source instead.
    if (tag.composable.startsWith('vesk')) {
      const runtimeSource = readFileSync('packages/cli-native/src/runtime-templates.ts', 'utf8');
      if (!runtimeSource.includes(`fun ${tag.composable}(`) && !runtimeSource.includes(`fun ${tag.composable} `)) {
        failures.push({ id: record.id, detail: `tag '${tagName}' composable '${tag.composable}' is not a vesk runtime composable` });
      }
      continue;
    }
    const machineName = tag.composable.slice(tag.composable.lastIndexOf('.') + 1);
    const mtag = machineTags[machineName];
    if (!mtag) {
      failures.push({ id: record.id, detail: `tag '${tagName}' composable '${tag.composable}' is not a composable in the artifact` });
      continue;
    }
    if (tag.imports && tag.imports.length > 0 && mtag.imports && mtag.imports.length > 0 && tag.imports[0] !== mtag.imports[0]) {
      failures.push({ id: record.id, detail: `tag '${tagName}' import mismatch: record ${tag.imports[0]}, machine ${mtag.imports[0]}` });
    }
    for (const [attr, value] of Object.entries(tag.attrs ?? {})) {
      if (!(value in (mtag.attrs ?? {}))) {
        failures.push({ id: record.id, detail: `tag '${tagName}' attr '${attr}' maps to '${value}' which is not a param of ${machineName} (got: ${Object.keys(mtag.attrs ?? {}).join(', ')})` });
      }
    }
    for (const [attr, shape] of Object.entries(tag.attrShapes ?? {})) {
      const machineParam = tag.attrs?.[attr] ?? attr;
      const mshape = mtag.attrShapes?.[machineParam];
      if (!mshape) {
        failures.push({ id: record.id, detail: `tag '${tagName}' attrShape '${attr}' not produced by the machine (machine attrShapes: ${Object.keys(mtag.attrShapes ?? {}).join(', ')})` });
      } else if (shape.shape !== mshape.shape) {
        failures.push({ id: record.id, detail: `tag '${tagName}' attrShape '${attr}' shape mismatch: record ${shape.shape}, machine ${mshape.shape}` });
      }
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const files = walk(REGISTRY).filter((f) => f.endsWith('.vsklib')).sort();
  let totalFailures = 0;
  let verified = 0;
  for (const file of files) {
    const record: VskLibRecord = JSON.parse(readFileSync(file, 'utf8')).library;
    const failures = await verifyRecord(record);
    if (failures.length === 0) {
      verified++;
      console.log(`  [registry] OK   ${record.id}`);
    } else {
      totalFailures += failures.length;
      console.log(`  [registry] FAIL ${record.id}`);
      for (const f of failures) console.log(`              - ${f.detail}`);
    }
  }
  console.log(`\n  [registry] ${verified}/${files.length} records verified, ${totalFailures} failures.`);
  if (totalFailures > 0) process.exit(1);
}

main().catch((e) => {
  console.error('  [registry] FAILED:', e);
  process.exit(1);
});
