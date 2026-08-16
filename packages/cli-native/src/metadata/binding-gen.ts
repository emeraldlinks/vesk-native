// Auto-generated `.vsklib` bindings from Kotlin `@Metadata`.
//
// `vesk add group:artifact@version` for a library outside the builtin registry
// falls back to this pipeline: fetch the AAR/JAR from Maven Central, extract
// `classes.jar`, read each class file's `kotlin.Metadata` (kind 2 file
// facades + kind 1/3 class surfaces), and build a `VskLibRecord`:
//   - tags: public top-level `@Composable` functions returning Unit, with
//     value-parameter -> attribute mappings (Modifier, lambdas and unmappable
//     types are excluded; trailing `@Composable` lambdas become `container`)
//     plus `attrShapes` describing constructible/enum/array attribute types.
//   - exports: public top-level functions whose whole signature maps to JS
//     primitives.
//   - signatures: constructor factories for public data classes and enum
//     references, with typed parameter shapes resolved against the classes
//     and enums of the same artifact.
//   - minSdk/permissions: parsed from the AAR's packaged AndroidManifest.xml.
// Anything the schema cannot express fails closed — it lands in `skipped`
// instead of producing a wrong binding.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { VskLibRecord } from '@cli-native/vsklib';
import type { LibExportSig, LibParamSig } from '@compiler-native/elements';
import { parseAxml } from './axml.js';
import {
  ACC_PUBLIC,
  ACC_STATIC,
  ACC_SYNTHETIC,
  ACC_INTERFACE,
  ACC_ABSTRACT,
  ACC_ENUM,
  methodAnnotationOf,
  paramAnnotationOf,
  parseClassFile,
  type MethodInfo,
  type FieldInfo,
} from './classfile.js';
import { extractKotlinMetadata } from './kotlin-metadata.js';
import {
  CLASS_KIND,
  FLAGS,
  MEMBER_KIND_DECLARATION,
  MODALITY,
  VISIBILITY_PUBLIC,
  decodeMetadata,
  flagBits,
  typeAt,
  type ClassMsg,
  type ConstructorMsg,
  type FunctionMsg,
  type PackageMsg,
  type PropertyMsg,
  type TypeMsg,
  type TypeTableMsg,
  type ValueParameterMsg,
} from './protobuf.js';

const COMPOSABLE_DESC = 'Landroidx/compose/runtime/Composable;';

// Compose mangles top-level functions that carry default arguments into
// `<name>-<7-char hash>`; the hash comes from a base64url alphabet and may
// itself contain `-` (`drawAxisLabel-iHT-50w`). Kotlin source names cannot
// contain `-`, so a `-` at the mangle separator position is unambiguous.
// Returns the unmangled base name if it looks mangled, otherwise unchanged.
function demangleComposeName(jvmName: string): string {
  if (jvmName.length < 9) return jvmName;
  const sep = jvmName.length - 8;
  if (jvmName[sep] !== '-') return jvmName;
  for (let i = sep + 1; i < jvmName.length; i++) {
    const c = jvmName[i] ?? '';
    const ok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_' || c === '-';
    if (!ok) return jvmName;
  }
  return jvmName.slice(0, sep);
}

function findJvmMethod(facade: FacadeSurface, fn: FunctionMsg): MethodInfo | null {
  const staticMethods = facade.methods.filter(
    (m) => (m.access & ACC_SYNTHETIC) === 0 && (m.access & ACC_STATIC) !== 0,
  );
  const exact = staticMethods.find((m) => m.name === fn.name);
  if (exact) return exact;
  // Compose mangled name: pick the fullest overload (the canonical function;
  // default-arg variants are synthetic and already filtered out).
  let best: MethodInfo | null = null;
  for (const m of staticMethods) {
    if (demangleComposeName(m.name) !== fn.name) continue;
    if (!best || m.descriptor.length > best.descriptor.length) best = m;
  }
  return best;
}

export interface GeneratedBinding {
  record: VskLibRecord;
  /** Declarations the schema cannot bind (fail-closed stubs). */
  skipped: string[];
  stats: { classes: number; facades: number; composables: number; exports: number };
  /** Public top-level class names plus public static `*Kt` facade methods —
   *  the reference surface for Java/Kotlin symbols the record may export
   *  opaquely. */
  surfaceNames: string[];
  /** Simple names of Java top-level classes that expose a public no-arg
   *  constructor (the zero-arg constructor call surface). */
  javaNoArgCtors: string[];
}

export interface MavenCoord {
  group: string;
  artifact: string;
  version: string;
}

type MavenRepo = 'central' | 'google';

function repoBase(repo: MavenRepo): string {
  return repo === 'central' ? 'https://repo1.maven.org/maven2' : 'https://dl.google.com/dl/android/maven2';
}

export function mavenUrl(coord: MavenCoord, ext: 'aar' | 'jar', repo: MavenRepo = 'central'): string {
  return `${repoBase(repo)}/${coord.group.replaceAll('.', '/')}/${coord.artifact}/${coord.version}/${coord.artifact}-${coord.version}.${ext}`;
}

export async function fetchTo(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'follow' });
    if (res.ok) {
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return true;
    }
  } catch {
    // Try the next candidate source.
  }
  return false;
}

interface GradleVariant {
  attributes?: Record<string, string>;
  'available-at'?: MavenCoord & { module: string };
}

interface GradleModuleMetadata {
  variants?: GradleVariant[];
}

/** Fetch the Gradle module metadata (`.module`) of an artifact from the given
 *  repository. Returns null when the artifact ships no module metadata (a
 *  POM-only publication — plain JVM/AAR libraries like gson or glide-compose). */
export async function moduleMetadataOf(coord: MavenCoord, repo: MavenRepo = 'central'): Promise<GradleModuleMetadata | null> {
  const url = `${repoBase(repo)}/${coord.group.replaceAll('.', '/')}/${coord.artifact}/${coord.version}/${coord.artifact}-${coord.version}.module`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'follow' });
    if (!res.ok) return null;
    return JSON.parse(await res.text()) as GradleModuleMetadata;
  } catch {
    return null;
  }
}

/** Whether the artifact publishes Kotlin Multiplatform common metadata: its
 *  real Gradle module metadata declares a `metadataApiElements` variant
 *  (`org.jetbrains.kotlin.platform.type: common`). That is the exact signal
 *  for "commonMain can depend on the same coordinate", verified from the
 *  published artifact — never inferred from the name. */
export async function isMultiplatform(coord: MavenCoord): Promise<boolean> {
  for (const repo of ['central', 'google'] as MavenRepo[]) {
    const meta = await moduleMetadataOf(coord, repo);
    if (!meta) continue;
    for (const variant of meta.variants ?? []) {
      if ((variant.attributes?.['org.jetbrains.kotlin.platform.type'] ?? '') === 'common') return true;
    }
    // Module metadata exists but declares no common variant — a single-platform
    // (android/jvm) publication; checked once.
    return false;
  }
  // No module metadata on either repo: a POM-only publication. Never guess a
  // platform the artifact does not publish.
  return false;
}

/** True when a JAR carries no `.class` files — a KMP `commonMain` metadata jar
 *  (`.knm` tables only). The JVM/Android class surface then lives in the
 *  platform variant, reached by following the Gradle module metadata
 *  `available-at` redirect. */
export function jarIsMetadataOnly(jarPath: string): boolean {
  try {
    const listing = execFileSync('unzip', ['-Z1', jarPath], { encoding: 'utf8', stdio: 'pipe' });
    return !listing.split('\n').some((line) => line.endsWith('.class'));
  } catch {
    return false;
  }
}

/** Follow the `.module` metadata of a KMP artifact to the platform variant
 *  that an Android build actually resolves: the `android` environment variant
 *  when present, else the `jvm` platform variant (okio/apollo/ktor publish no
 *  android target and Android consumes the JVM artifact). androidx publishes
 *  the same redirect on Google Maven; both repos are consulted. */
export async function platformVariantOf(coord: MavenCoord, dir: string, repo: MavenRepo): Promise<MavenCoord | null> {
  const modulePath = join(dir, 'lib.module');
  const url = `${repoBase(repo)}/${coord.group.replaceAll('.', '/')}/${coord.artifact}/${coord.version}/${coord.artifact}-${coord.version}.module`;
  if (!(await fetchTo(url, modulePath))) return null;
  let meta: { variants?: Array<{ attributes?: Record<string, string>; 'available-at'?: MavenCoord & { module: string } }> };
  try {
    meta = JSON.parse(readFileSync(modulePath, 'utf8'));
  } catch {
    return null;
  }
  let jvmFallback: MavenCoord | null = null;
  for (const variant of meta.variants ?? []) {
    const attrs = variant.attributes ?? {};
    const avail = variant['available-at'];
    if (!avail) continue;
    // Gradle module metadata names the coordinate's artifact `module`.
    const target: MavenCoord = { group: avail.group, artifact: avail.module ?? avail.artifact, version: avail.version };
    if (!target.group || !target.artifact || !target.version) continue;
    // androidx marks the android variant with `androidJvm` platform type;
    // JetBrains KMP libraries use the `org.gradle.jvm.environment` attribute.
    const isAndroid =
      attrs['org.gradle.jvm.environment'] === 'android' || attrs['org.jetbrains.kotlin.platform.type'] === 'androidJvm';
    if (isAndroid) return target;
    if (attrs['org.jetbrains.kotlin.platform.type'] === 'jvm' && !jvmFallback) jvmFallback = target;
  }
  return jvmFallback;
}

/** True when an AAR carries no `classes.jar` — a KMP shell that only holds the
 *  manifest; the real class surface lives in the `-android` variant. */
export function aarHasClasses(aarPath: string, dir: string): boolean {
  try {
    const aarDir = join(dir, 'aar-probe');
    execFileSync('mkdir', ['-p', aarDir]);
    execFileSync('unzip', ['-o', '-q', aarPath, 'classes.jar', '-d', aarDir], { stdio: 'pipe' });
    return existsSync(join(aarDir, 'classes.jar'));
  } catch {
    return false;
  }
}

async function fetchArtifact(coord: MavenCoord): Promise<{ kind: 'aar' | 'jar'; path: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'vesk-lib-'));
  const aarPath = join(dir, 'lib.aar');
  const jarPath = join(dir, 'lib.jar');

  const fetchPlain = async (repo: MavenRepo): Promise<{ kind: 'aar' | 'jar'; path: string } | null> => {
    if (await fetchTo(mavenUrl(coord, 'aar', repo), aarPath)) {
      if (aarHasClasses(aarPath, dir)) return { kind: 'aar', path: aarPath };
      const android = await platformVariantOf(coord, dir, repo);
      if (android && (await fetchTo(mavenUrl(android, 'aar', repo), aarPath))) return { kind: 'aar', path: aarPath };
      return { kind: 'aar', path: aarPath };
    }
    if (!(await fetchTo(mavenUrl(coord, 'jar', repo), jarPath))) return null;
    if (jarIsMetadataOnly(jarPath)) {
      const platform = await platformVariantOf(coord, dir, repo);
      if (platform) {
        if (await fetchTo(mavenUrl(platform, 'aar', repo), aarPath)) return { kind: 'aar', path: aarPath };
        if (await fetchTo(mavenUrl(platform, 'jar', repo), jarPath)) return { kind: 'jar', path: jarPath };
      }
    }
    return { kind: 'jar', path: jarPath };
  };

  const found = (await fetchPlain('central')) ?? (await fetchPlain('google'));
  if (found) return found;
  throw new Error(`no artifact ${coord.group}:${coord.artifact}:${coord.version} on Maven Central or Google Maven`);
}

function unzip(archive: string, dest: string): void {
  execFileSync('unzip', ['-o', '-q', archive, '-d', dest], { stdio: 'pipe' });
}

function walkClassFiles(dir: string): string[] {
  const out: string[] = [];
  const visit = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'META-INF') continue;
        visit(p);
      } else if (entry.name.endsWith('.class')) {
        out.push(p);
      }
    }
  };
  visit(dir);
  return out;
}

interface FacadeSurface {
  functions: FunctionMsg[];
  properties: PropertyMsg[];
  typeTable: PackageMsg['typeTable'];
  packageDotted: string;
  methods: MethodInfo[];
}

interface ClassSurface {
  qualified: string;
  simpleName: string;
  kind: number;
  cls: ClassMsg;
  jvmPublic: boolean;
}

interface JavaClassSurface {
  simpleName: string;
  qualified: string;
  access: number;
  methods: MethodInfo[];
  fields: FieldInfo[];
}

/** True when the dotted name contains a `$` immediately followed by a digit
 *  (`Foo$1`, `Foo$2$1$size$$inlined$mapNotNull$1$2`): JVM anonymous/lambda
 *  classes that carry no meaningful public surface. */
function hasAnonymousDollarSuffix(name: string): boolean {
  for (let i = 0; i + 1 < name.length; i++) {
    if (name[i] !== '$') continue;
    const c = name.charCodeAt(i + 1);
    if (c >= 48 && c <= 57) return true;
  }
  return false;
}

/** The importable name of a class: for nested classes (`Outer$Inner`), the
 *  last `$` segment is what source refers to (`Timber.DebugTree`). */
function exportNameOf(simpleName: string): string {
  return simpleName.includes('$') ? simpleName.slice(simpleName.lastIndexOf('$') + 1) : simpleName;
}

/** Public usable constructor: a primary constructor (`IS_SECONDARY` bit 4
 *  clear) whose recorded visibility is not private/protected. Kotlin writes
 *  no visibility bits for public primary constructors of public classes
 *  (0 = unspecified), and records private=1 / protected=2 explicitly. */
function usablePrimaryCtor(cls: ClassMsg): ConstructorMsg | null {
  let best: ConstructorMsg | null = null;
  for (const ctor of cls.constructors) {
    if (flagBits(ctor.flags, 4, 1) === 1) continue;
    const vis = flagBits(ctor.flags, FLAGS.VISIBILITY.offset, FLAGS.VISIBILITY.width);
    if (vis === 1 || vis === 2) continue;
    if (!best || ctor.valueParams.length > best.valueParams.length) best = ctor;
  }
  return best;
}

export interface BindingGenOptions {
  cacheTo?: string;
  keepTemp?: boolean;
}

type Shape = 'number' | 'string' | 'boolean' | 'void' | 'array' | 'function' | 'any' | 'modifier' | 'other';

const NUMBER_TYPES = new Set([
  'kotlin.Int',
  'kotlin.Long',
  'kotlin.Float',
  'kotlin.Double',
  'kotlin.Short',
  'kotlin.Byte',
  'kotlin.Number',
  'java.lang.Number',
  'java.lang.Integer',
  'java.lang.Long',
  'java.lang.Float',
  'java.lang.Double',
  'java.lang.Short',
  'java.lang.Byte',
]);
const STRING_TYPES = new Set(['kotlin.String', 'java.lang.String', 'kotlin.CharSequence', 'java.lang.CharSequence']);
const BOOLEAN_TYPES = new Set(['kotlin.Boolean', 'java.lang.Boolean']);
const VOID_TYPES = new Set(['kotlin.Unit', 'void', 'java.lang.Void']);
const ARRAY_TYPES = new Set([
  'kotlin.Array',
  'kotlin.ByteArray',
  'kotlin.DoubleArray',
  'kotlin.FloatArray',
  'kotlin.IntArray',
  'kotlin.LongArray',
  'kotlin.ShortArray',
  'kotlin.BooleanArray',
  'kotlin.CharArray',
  'kotlin.collections.List',
  'kotlin.collections.MutableList',
  'kotlin.collections.Iterable',
  'kotlin.collections.MutableIterable',
  'kotlin.collections.Collection',
  'kotlin.collections.MutableCollection',
  'kotlin.collections.Set',
  'kotlin.collections.MutableSet',
  'kotlin.collections.Map',
  'kotlin.collections.MutableMap',
  'java.util.List',
  'java.util.Collection',
  'java.util.Iterable',
  'java.util.Set',
  'java.util.Map',
  'java.util.ArrayList',
  'java.util.HashMap',
]);
const ANY_TYPES = new Set(['kotlin.Any', 'java.lang.Object']);
const MODIFIER_TYPES = new Set(['androidx.compose.ui.Modifier']);

export function shapeOf(t: TypeMsg): Shape {
  if (t.typeParamId !== undefined) return 'other';
  const name = t.className;
  if (!name) return 'other';
  if (MODIFIER_TYPES.has(name)) return 'modifier';
  if (NUMBER_TYPES.has(name)) return 'number';
  if (STRING_TYPES.has(name)) return 'string';
  if (BOOLEAN_TYPES.has(name)) return 'boolean';
  if (VOID_TYPES.has(name)) return 'void';
  if (ARRAY_TYPES.has(name)) return 'array';
  if (ANY_TYPES.has(name)) return 'any';
  if (/^kotlin\.(Function\d+|jvm\.functions\.Function\d+|coroutines\.(Suspend)?Function\d+)$/.test(name)) return 'function';
  return 'other';
}

function isFunctionType(t: TypeMsg): boolean {
  return shapeOf(t) === 'function';
}

/** Type-directed signature for a declaration type: primitives, enums and
 *  constructible classes from the same artifact resolve to their literal
 *  shapes; everything else falls back to `other` (or `function`/`modifier`),
 *  which the compiler fails closed on instead of miscompiling. */
function classShapeOf(
  t: TypeMsg,
  constructible: Set<string>,
  enumEntriesByClass: Map<string, string[]>,
  sealedEnumsByClass: Map<string, string[]>,
  table: TypeTableMsg | null,
): LibParamSig {
  if (t.typeParamId !== undefined) return { name: '', shape: 'other' };
  const name = t.className;
  if (!name) return { name: '', shape: 'other' };
  if (MODIFIER_TYPES.has(name)) return { name: '', shape: 'other' };
  if (NUMBER_TYPES.has(name)) return { name: '', shape: 'number', typeName: name };
  if (STRING_TYPES.has(name)) return { name: '', shape: 'string' };
  if (BOOLEAN_TYPES.has(name)) return { name: '', shape: 'boolean' };
  if (VOID_TYPES.has(name)) return { name: '', shape: 'void' };
  if (ANY_TYPES.has(name)) return { name: '', shape: 'any' };
  if (isFunctionType(t)) return { name: '', shape: 'function' };
  const argOf = (a: TypeMsg | number): TypeMsg | null =>
    typeof a === 'object' && a !== null ? a : typeAt(typeof a === 'number' ? a : undefined, null, table);
  const argSig = (a: TypeMsg | number): LibParamSig => {
    const resolved = argOf(a);
    return resolved ? classShapeOf(resolved, constructible, enumEntriesByClass, sealedEnumsByClass, table) : { name: '', shape: 'any' as const };
  };
  if (name === 'kotlin.Pair') {
    return { name: '', shape: 'object', typeName: name, pairElements: t.args.slice(0, 2).map(argSig) };
  }
  if (name === 'kotlin.collections.Map' || name === 'kotlin.collections.MutableMap') {
    return { name: '', shape: 'object', typeName: name, pairElements: t.args.slice(0, 2).map(argSig) };
  }
  if (ARRAY_TYPES.has(name)) {
    const first = t.args[0];
    return { name: '', shape: 'array', elem: first !== undefined ? argSig(first) : { name: '', shape: 'any' as const } };
  }
  const enumValues = enumEntriesByClass.get(name);
  if (enumValues) return { name: '', shape: 'enum', typeName: name, enumValues };
  const sealedMembers = sealedEnumsByClass.get(name);
  if (sealedMembers) return { name: '', shape: 'enum', typeName: name, enumValues: sealedMembers };
  if (constructible.has(name)) return { name: '', shape: 'object', typeName: name };
  return { name: '', shape: 'other' };
}

function paramSigOf(
  p: ValueParameterMsg,
  table: TypeTableMsg | null,
  constructible: Set<string>,
  enumEntriesByClass: Map<string, string[]>,
  sealedEnumsByClass: Map<string, string[]>,
): LibParamSig {
  const name = p.name ?? '';
  if (p.vararg || p.varargTypeId !== undefined) {
    const vt = p.vararg ?? typeAt(p.varargTypeId, null, table);
    const inner: LibParamSig = vt ? classShapeOf(vt, constructible, enumEntriesByClass, sealedEnumsByClass, table) : { name: '', shape: 'any' };
    return { name, shape: 'array', elem: inner };
  }
  const t = typeAt(p.typeId, p.type, table);
  if (!t) return { name, shape: 'other' };
  return { ...classShapeOf(t, constructible, enumEntriesByClass, sealedEnumsByClass, table), name };
}

export async function generateLibraryBinding(coord: MavenCoord, opts?: BindingGenOptions): Promise<GeneratedBinding> {
  const { kind, path } = await fetchArtifact(coord);
  const multiplatform = await isMultiplatform(coord);
  const work = mkdtempSync(join(tmpdir(), 'vesk-lib-decode-'));
  try {
    let classesDir: string;
    let minSdk: number | undefined;
    let permissions: string[] = [];
    if (kind === 'aar') {
      const aarDir = join(work, 'aar');
      unzip(path, aarDir);
      const manifestPath = join(aarDir, 'AndroidManifest.xml');
      if (existsSync(manifestPath)) {
        const manifest = parseAxml(new Uint8Array(readFileSync(manifestPath)));
        minSdk = manifest.minSdk;
        permissions = manifest.permissions;
      }
      classesDir = join(work, 'classes');
      const classesJar = join(aarDir, 'classes.jar');
      if (!existsSync(classesJar)) throw new Error(`AAR for ${coord.group}:${coord.artifact} has no classes.jar`);
      try {
        unzip(classesJar, classesDir);
      } catch {
        // Facade artifacts (e.g. leakcanary-android) ship an empty classes.jar;
        // their surface lives in a dependency, not here.
        execFileSync('mkdir', ['-p', classesDir]);
      }
    } else {
      classesDir = join(work, 'classes');
      unzip(path, classesDir);
    }

    const facades: FacadeSurface[] = [];
    const classSurfaces: ClassSurface[] = [];
    const skipped: string[] = [];
    const stats = { classes: 0, facades: 0, composables: 0, exports: 0 };
    // Public symbols Java/Kotlin code can reference even when the Kotlin
    // metadata pipeline cannot express them: public top-level class names,
    // public no-arg constructors (Java classes), and public static methods on
    // `*Kt` file facades (top-level functions/properties). Used by the
    // registry conformance to verify opaque exports of Java-authored libs.
    const surfaceNames = new Set<string>();
    const javaNoArgCtors = new Set<string>();
    // Public Java-authored classes (no Kotlin metadata) whose constructor /
    // reference surface the schema can express directly: enum sigs, public
    // no-arg constructor sigs, and opaque non-constructor references.
    const javaClasses: JavaClassSurface[] = [];
    // Classes in this artifact annotated with `kotlin.RequiresOptIn` — the
    // opt-in markers that callers of experimental APIs must opt into.
    const optInMarkers = new Set<string>();

    for (const classPath of walkClassFiles(classesDir)) {
      const internal = classPath.replaceAll('\\', '/');
      if (internal.endsWith('module-info.class') || internal.includes('/META-INF/')) continue;
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(readFileSync(classPath));
      } catch {
        continue;
      }
      let cf;
      try {
        cf = parseClassFile(bytes);
      } catch {
        continue;
      }
      stats.classes++;
      if (cf.thisClass.endsWith('/R') || cf.thisClass.endsWith('/R$') || cf.thisClass.endsWith('BuildConfig')) continue;
      const meta = extractKotlinMetadata(cf);
      const simpleName = cf.thisClass.slice(cf.thisClass.lastIndexOf('/') + 1);
      const publicTopLevel =
        (cf.access & ACC_PUBLIC) !== 0 && !cf.thisClass.includes('$') && !simpleName.endsWith('Kt');
      if (publicTopLevel && !meta) {
        surfaceNames.add(simpleName);
        if (cf.methods.some((m) => m.name === '<init>' && m.descriptor === '()V' && (m.access & ACC_PUBLIC) !== 0)) {
          javaNoArgCtors.add(simpleName);
        }
      }
      // Java-authored (no metadata) public classes keep a reference surface
      // even when nested: the simple name of the last `$` segment is what
      // source refers to (`Retrofit.Builder`, `Moshi.Builder`). Anonymous
      // (`$1`) and `*Kt` file facades carry no such surface.
      if (!meta && (cf.access & ACC_PUBLIC) !== 0 && (cf.access & ACC_INTERFACE) === 0 && !simpleName.endsWith('Kt')) {
        const nestedName = simpleName.includes('$') ? simpleName.slice(simpleName.lastIndexOf('$') + 1) : simpleName;
        if (nestedName && !hasAnonymousDollarSuffix(cf.thisClass)) {
          surfaceNames.add(nestedName);
          const dotted = cf.thisClass.replaceAll('/', '.');
          javaClasses.push({ simpleName: nestedName, qualified: dotted, access: cf.access, methods: cf.methods, fields: cf.fields });
        }
      }
      // Top-level functions on `*Kt` file facades surface as public static
      // methods even when the Kotlin metadata cannot be decoded (e.g. the
      // Kotlin 2.0 metadata format, or Java-compiled Kotlin).
      if (simpleName.endsWith('Kt')) {
        for (const m of cf.methods) {
          if ((m.access & (ACC_PUBLIC | ACC_STATIC)) === (ACC_PUBLIC | ACC_STATIC) && (m.access & ACC_SYNTHETIC) === 0) {
            surfaceNames.add(m.name);
          }
        }
      }
      if (!meta) continue;
      const dotted = cf.thisClass.replaceAll('/', '.');
      for (const a of cf.annotations) {
        if (a.type === 'Lkotlin/RequiresOptIn;') optInMarkers.add(dotted);
      }
      if (meta.kind === 2) {
        const decoded = decodeMetadata(meta.kind, meta.d1, meta.d2);
        if (!decoded.pkg) continue;
        const slash = cf.thisClass.lastIndexOf('/');
        const packageDotted = slash >= 0 ? cf.thisClass.slice(0, slash).replaceAll('/', '.') : '';
        facades.push({ functions: decoded.pkg.functions, properties: decoded.pkg.properties, typeTable: decoded.pkg.typeTable, packageDotted, methods: cf.methods });
        stats.facades++;
      } else if (meta.kind === 1 || meta.kind === 3) {
        if (dotted.endsWith('$Companion')) {
          skipped.push(`${dotted} — companion object not supported yet`);
          continue;
        }
        if (hasAnonymousDollarSuffix(dotted)) {
          skipped.push(`${dotted} — anonymous class`);
          continue;
        }
        const simpleName = dotted.slice(dotted.lastIndexOf('.') + 1);
        let decoded;
        try {
          decoded = decodeMetadata(meta.kind, meta.d1, meta.d2);
        } catch {
          skipped.push(`${dotted} — undecodable metadata`);
          continue;
        }
        if (!decoded.class) continue;
        const kind = flagBits(decoded.class.flags, FLAGS.CLASS_KIND.offset, FLAGS.CLASS_KIND.width);
        classSurfaces.push({ qualified: dotted, simpleName, kind, cls: decoded.class, jvmPublic: (cf.access & ACC_PUBLIC) !== 0 });
      }
    }

    // Round 1: classify class surfaces. Constructible classes, enums and
    // sealed-enum types (sealed class/interface whose members are all nested
    // objects — the `PlotType.Line` pattern) survive to become the resolution
    // sets for signatures and tag attrs.
    const sortedClasses = [...classSurfaces].sort((a, b) => (a.qualified < b.qualified ? -1 : a.qualified > b.qualified ? 1 : 0));
    const byQualified = new Map(sortedClasses.map((s) => [s.qualified, s] as const));
    const constructible = new Set<string>();
    const enumClasses = new Set<string>();
    const enumEntriesByClass = new Map<string, string[]>();
    const sealedEnumsByClass = new Map<string, string[]>();

    // A sealed type whose sealed subclasses are all nested objects behaves like
    // an enum in JS (`PlotType.Line` -> `PlotType.Line`), so it becomes an
    // enum export instead of being rejected as a non-constructible interface.
    for (const s of sortedClasses) {
      if (s.kind !== CLASS_KIND.INTERFACE && s.kind !== CLASS_KIND.CLASS) continue;
      const modality = flagBits(s.cls.flags, FLAGS.MODALITY.offset, FLAGS.MODALITY.width);
      if (modality !== MODALITY.SEALED) continue;
      const members: string[] = [];
      let allObjects = true;
      for (const sub of s.cls.sealedSubclassNames) {
        const memberName = sub.slice(sub.lastIndexOf('.') + 1);
        const surface = byQualified.get(`${s.qualified}$${memberName}`);
        if (!surface || surface.kind !== CLASS_KIND.OBJECT) {
          allObjects = false;
          break;
        }
        members.push(memberName);
      }
      if (allObjects && members.length > 0) sealedEnumsByClass.set(s.qualified, members);
    }

    for (const s of sortedClasses) {
      if (s.qualified.includes('$')) {
        skipped.push(`${s.qualified} — nested class`);
        continue;
      }
      const cls = s.cls;
      const vis = flagBits(cls.flags, FLAGS.VISIBILITY.offset, FLAGS.VISIBILITY.width);
      const modality = flagBits(cls.flags, FLAGS.MODALITY.offset, FLAGS.MODALITY.width);
      switch (s.kind) {
        case CLASS_KIND.OBJECT:
          skipped.push(`${s.qualified} — object not supported yet`);
          continue;
        case CLASS_KIND.COMPANION_OBJECT:
          skipped.push(`${s.qualified} — companion object not supported yet`);
          continue;
        case CLASS_KIND.ANNOTATION:
          skipped.push(`${s.qualified} — annotation`);
          continue;
        case CLASS_KIND.ENUM_ENTRY:
          skipped.push(`${s.qualified} — enum entry`);
          continue;
        case CLASS_KIND.ENUM:
          if (vis !== VISIBILITY_PUBLIC) {
            skipped.push(`${s.qualified} — non-public enum`);
            continue;
          }
          enumClasses.add(s.qualified);
          enumEntriesByClass.set(s.qualified, cls.enumEntries);
          continue;
        case CLASS_KIND.INTERFACE:
          skipped.push(`${s.qualified} — ${modality === MODALITY.SEALED ? 'sealed interface' : 'interface'}, not constructible`);
          continue;
        case CLASS_KIND.CLASS:
          break;
        default:
          skipped.push(`${s.qualified} — unsupported class kind ${s.kind}`);
          continue;
      }
      if (modality === MODALITY.SEALED) {
        skipped.push(`${s.qualified} — sealed class, not constructible`);
        continue;
      }
      if (modality === MODALITY.ABSTRACT) {
        skipped.push(`${s.qualified} — abstract class, not constructible`);
        continue;
      }
      if (vis !== VISIBILITY_PUBLIC) {
        skipped.push(`${s.qualified} — non-public class`);
        continue;
      }
      if (usablePrimaryCtor(cls) === null) {
        skipped.push(`${s.qualified} — no public constructor`);
        continue;
      }
      constructible.add(s.qualified);
    }

    // Round 2: emit constructor/enum/reference signatures. Constructible data
    // classes map to object factories; a param whose class resolves in the
    // same artifact gets a typed `object`/`enum` shape. Non-constructible
    // JVM-public classes (metadata visibility quirk, nested, abstract, or
    // no-public-ctor) keep an opaque reference sig so imports resolve, and
    // nested classes with a usable primary ctor still map to a constructor.
    const tags: Record<string, NonNullable<VskLibRecord['tags']>[string]> = {};
    const exportsSet = new Set<string>();
    const signatures: Record<string, LibExportSig> = {};
    const exportedNames = new Map<string, string>();

    const emitSig = (sig: LibExportSig): void => {
      const previous = exportedNames.get(sig.name);
      if (previous !== undefined) {
        skipped.push(`${sig.qualified} — duplicate export name (${previous} already exports ${sig.name})`);
        return;
      }
      exportedNames.set(sig.name, sig.qualified);
      signatures[sig.name] = sig;
      exportsSet.add(sig.name);
      stats.exports++;
    };

    const ctorSig = (s: ClassSurface): LibExportSig | null => {
      const ctor = usablePrimaryCtor(s.cls);
      if (!ctor) return null;
      const params: LibParamSig[] = ctor.valueParams.map((p) => paramSigOf(p, s.cls.typeTable, constructible, enumEntriesByClass, sealedEnumsByClass));
      const defaultParams: string[] = [];
      let fromDefault = false;
      for (const p of ctor.valueParams) {
        if (flagBits(p.flags, FLAGS.DECLARES_DEFAULT_VALUE, 1) === 1) fromDefault = true;
        if (fromDefault && p.name) defaultParams.push(p.name);
      }
      const name = exportNameOf(s.simpleName);
      const dotQualified = s.qualified.includes('$') ? s.qualified.replaceAll('$', '.') : s.qualified;
      return { name, target: name, qualified: dotQualified, isConstructor: true, params, defaultParams, returnShape: 'object' };
    };

    for (const s of sortedClasses) {
      let sig: LibExportSig | null = null;
      if (constructible.has(s.qualified)) {
        sig = ctorSig(s);
      } else if (enumClasses.has(s.qualified)) {
        sig = { name: s.simpleName, target: s.simpleName, qualified: s.qualified, isConstructor: false, isEnum: true, enumValues: s.cls.enumEntries, params: [], defaultParams: [], returnShape: 'string' };
      } else if (sealedEnumsByClass.has(s.qualified)) {
        sig = { name: s.simpleName, target: s.simpleName, qualified: s.qualified, isConstructor: false, isEnum: true, enumValues: sealedEnumsByClass.get(s.qualified), params: [], defaultParams: [], returnShape: 'string' };
      } else if (s.kind === CLASS_KIND.OBJECT && !s.qualified.includes('$') && s.jvmPublic) {
        // Top-level public object (e.g. `androidx.compose.material.icons.Icons`):
        // importable opaque reference for member-chained values (`Icons.Filled.Home`).
        sig = { name: s.simpleName, target: s.simpleName, qualified: s.qualified, isConstructor: false, params: [], defaultParams: [], returnShape: 'object' };
      } else if (s.kind === CLASS_KIND.CLASS && s.jvmPublic) {
        sig = ctorSig(s) ?? { name: exportNameOf(s.simpleName), target: exportNameOf(s.simpleName), qualified: s.qualified.includes('$') ? s.qualified.replaceAll('$', '.') : s.qualified, isConstructor: false, params: [], defaultParams: [], returnShape: 'object' };
      }
      if (!sig) continue;
      emitSig(sig);
    }

    // Java-authored classes (no Kotlin metadata): enums map to enum sigs,
    // public no-arg-constructor classes to constructor factories, and every
    // other public class to an opaque reference (`Moshi`, `JsonAdapter`).
    for (const jc of javaClasses) {
      let sig: LibExportSig;
      const qualified = jc.qualified.includes('$') ? jc.qualified.replaceAll('$', '.') : jc.qualified;
      if ((jc.access & ACC_ENUM) !== 0) {
        const self = `L${jc.qualified.replaceAll('.', '/')};`;
        const entries = jc.fields.filter((f) => (f.access & ACC_ENUM) !== 0 && f.descriptor === self).map((f) => f.name);
        sig = { name: jc.simpleName, target: jc.simpleName, qualified, isConstructor: false, isEnum: true, enumValues: entries, params: [], defaultParams: [], returnShape: 'string' };
      } else if ((jc.access & ACC_ABSTRACT) !== 0) {
        sig = { name: jc.simpleName, target: jc.simpleName, qualified, isConstructor: false, params: [], defaultParams: [], returnShape: 'object' };
      } else if (jc.methods.some((m) => m.name === '<init>' && m.descriptor === '()V' && (m.access & ACC_PUBLIC) !== 0)) {
        sig = { name: jc.simpleName, target: jc.simpleName, qualified, isConstructor: true, params: [], defaultParams: [], returnShape: 'object' };
      } else {
        sig = { name: jc.simpleName, target: jc.simpleName, qualified, isConstructor: false, params: [], defaultParams: [], returnShape: 'object' };
      }
      emitSig(sig);
    }

    for (const facade of facades) {
      for (const fn of facade.functions) {
        const method = findJvmMethod(facade, fn);
        if (!method) {
          skipped.push(`${facade.packageDotted}.${fn.name} — no JVM method (JvmName/multifile)`);
          continue;
        }
        if (fn.receiverType || fn.receiverTypeId !== undefined) {
          skipped.push(`${facade.packageDotted}.${fn.name} — extension receiver not supported yet`);
          continue;
        }
        if (fn.typeParams.length > 0) {
          skipped.push(`${facade.packageDotted}.${fn.name} — generic type parameters`);
          continue;
        }
        const vis = flagBits(fn.flags, FLAGS.VISIBILITY.offset, FLAGS.VISIBILITY.width);
        if (vis !== VISIBILITY_PUBLIC || (method.access & ACC_PUBLIC) === 0) continue;
        if (flagBits(fn.flags, FLAGS.MEMBER_KIND.offset, FLAGS.MEMBER_KIND.width) !== MEMBER_KIND_DECLARATION) continue;
        if (flagBits(fn.flags, FLAGS.IS_EXPECT_FUNCTION, 1) === 1) continue;
        if (flagBits(fn.flags, FLAGS.HAS_NON_STABLE_PARAMETER_NAMES, 1) === 1) {
          skipped.push(`${facade.packageDotted}.${fn.name} — non-stable parameter names`);
          continue;
        }
        const composable = methodAnnotationOf(method, COMPOSABLE_DESC) !== null;
        if (composable) {
          const tag = buildTag(facade, fn, method, constructible, enumEntriesByClass, sealedEnumsByClass, optInMarkers);
          if (tag) {
            const existing = tags[fn.name];
            if (existing) {
              // Overloaded composables share one markup element: union the
              // parameter surfaces (`Icon(imageVector, …)` + `Icon(painter, …)`)
              // instead of keeping only the first overload.
              mergeTagOverloads(existing, tag);
            } else {
              tags[fn.name] = tag;
              stats.composables++;
            }
          } else {
            skipped.push(`${facade.packageDotted}.${fn.name} — composable with non-Unit return or no mappable params`);
          }
        } else if (isExportable(facade, fn)) {
          if (signatures[fn.name] !== undefined) {
            skipped.push(`${facade.packageDotted}.${fn.name} — duplicate export name`);
            continue;
          }
          exportsSet.add(fn.name);
          stats.exports++;
        }
      }
      for (const p of facade.properties) {
        if (!p.name || p.name.startsWith('_')) continue;
        if (signatures[p.name] !== undefined || tags[p.name] !== undefined) continue;
        const vis =
          p.getterFlags !== undefined
            ? flagBits(p.getterFlags, FLAGS.VISIBILITY.offset, FLAGS.VISIBILITY.width)
            : flagBits(p.flags, FLAGS.VISIBILITY.offset, FLAGS.VISIBILITY.width);
        if (vis !== VISIBILITY_PUBLIC) continue;
        const cap = p.name.charAt(0).toUpperCase() + p.name.slice(1);
        const hasAccessor = facade.methods.some(
          (m) =>
            (m.name === `get${cap}` || m.name === `is${cap}`) &&
            (m.access & ACC_PUBLIC) !== 0 &&
            (m.access & ACC_STATIC) !== 0 &&
            (m.access & ACC_SYNTHETIC) === 0,
        );
        if (!hasAccessor) continue;
        emitSig({ name: p.name, target: p.name, qualified: `${facade.packageDotted}.${p.name}`, isConstructor: false, params: [], defaultParams: [], returnShape: 'any' });
      }
    }

    const id = sanitizeId(coord.artifact);
    const record: VskLibRecord = {
      id,
      name: coord.artifact,
      description: `Auto-generated from Kotlin metadata (${coord.group}:${coord.artifact}:${coord.version})`,
      group: coord.group,
      artifact: coord.artifact,
      version: coord.version,
      gradle: [`${coord.group}:${coord.artifact}:${coord.version}`],
      multiplatform,
      minSdk,
      permissions,
      exports: [...exportsSet].sort(),
      signatures,
      tags,
      libType: Object.keys(tags).length > 0 ? 'component' : 'utility',
    };
    if (opts?.cacheTo) {
      writeFileSync(opts.cacheTo, `${JSON.stringify({ version: 1, libraries: { [id]: record } }, null, 2)}\n`);
    }
    return { record, skipped, stats, surfaceNames: [...surfaceNames], javaNoArgCtors: [...javaNoArgCtors] };
  } finally {
    rmSync(path, { force: true });
    if (!opts?.keepTemp) rmSync(work, { recursive: true, force: true });
  }
}

function buildTag(
  facade: FacadeSurface,
  fn: FunctionMsg,
  method: MethodInfo,
  constructible: Set<string>,
  enumEntriesByClass: Map<string, string[]>,
  sealedEnumsByClass: Map<string, string[]>,
  optInMarkers: Set<string>,
): NonNullable<VskLibRecord['tags']>[string] | null {
  const table = fn.typeTable ?? facade.typeTable;
  const returnShape = fn.returnType ? shapeOf(typeAt(fn.returnTypeId, fn.returnType, table) ?? fn.returnType) : 'void';
  if (returnShape !== 'void' && returnShape !== 'any') return null;
  const attrs: Record<string, string> = {};
  const attrShapes: Record<string, LibParamSig> = {};
  let container = false;
  const params = fn.valueParams;
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    if (!p) continue;
    if (p.vararg || p.varargTypeId !== undefined) continue;
    const t = typeAt(p.typeId, p.type, table);
    if (!t) continue;
    const isLast = i === params.length - 1;
    const composableLambda = isFunctionType(t) && paramAnnotationOf(method, i, COMPOSABLE_DESC) !== null;
    if (isLast && composableLambda) {
      container = true;
      continue;
    }
    const sig = classShapeOf(t, constructible, enumEntriesByClass, sealedEnumsByClass, table);
    const shape = sig.shape;
    if (shape === 'function' || shape === 'void') continue;
    if (shape === 'array') {
      const elemShape = sig.elem?.shape;
      if (elemShape !== 'number' && elemShape !== 'string' && elemShape !== 'boolean' && elemShape !== 'any' && elemShape !== 'object' && elemShape !== 'enum') continue;
    }
    if (!p.name) continue;
    attrs[p.name] = p.name;
    attrShapes[p.name] = { ...sig, name: p.name };
  }
  const optIn = methodOptIns(method, optInMarkers);
  return {
    composable: fn.name,
    imports: [`${facade.packageDotted}.${fn.name}`],
    attrs,
    ...(Object.keys(attrShapes).length > 0 ? { attrShapes } : {}),
    ...(container ? { container: true } : {}),
    ...(optIn.length > 0 ? { optIn } : {}),
  };
}

/** Union a second composable overload into the tag of the first so a markup
 *  element accepts every parameter the overloads expose. First overload wins
 *  on conflicting shapes; container/optIn are OR-ed. */
function mergeTagOverloads(
  existing: NonNullable<VskLibRecord['tags']>[string],
  extra: NonNullable<VskLibRecord['tags']>[string],
): void {
  const attrs = existing.attrs ?? {};
  const shapes = existing.attrShapes ?? {};
  for (const [attr, value] of Object.entries(extra.attrs ?? {})) {
    if (attrs[attr] !== undefined) continue;
    attrs[attr] = value;
    const shape = extra.attrShapes?.[attr];
    if (shape) shapes[attr] = shape;
  }
  existing.attrs = attrs;
  if (Object.keys(shapes).length > 0) existing.attrShapes = shapes;
  if (extra.container) existing.container = true;
  if (extra.optIn && extra.optIn.length > 0) {
    existing.optIn = [...new Set([...(existing.optIn ?? []), ...extra.optIn])];
  }
}

function methodOptIns(method: MethodInfo, optInMarkers: Set<string>): string[] {
  const out: string[] = [];
  for (const a of method.annotations) {
    if (!a.type.startsWith('L') || !a.type.endsWith(';')) continue;
    const dotted = a.type.slice(1, -1).replaceAll('/', '.');
    if (optInMarkers.has(dotted)) out.push(dotted);
  }
  return out;
}

function isExportable(facade: FacadeSurface, fn: FunctionMsg): boolean {
  if (flagBits(fn.flags, FLAGS.IS_SUSPEND, 1) === 1) return false;
  if (flagBits(fn.flags, FLAGS.IS_EXTERNAL_FUNCTION, 1) === 1) return false;
  if (flagBits(fn.flags, FLAGS.IS_OPERATOR, 1) === 1) return false;
  const table = fn.typeTable ?? facade.typeTable;
  if (fn.returnType) {
    const rt = typeAt(fn.returnTypeId, fn.returnType, table) ?? fn.returnType;
    const s = shapeOf(rt);
    if (s !== 'number' && s !== 'string' && s !== 'boolean' && s !== 'void' && s !== 'any') return false;
  }
  for (const p of fn.valueParams) {
    if (p.vararg || p.varargTypeId !== undefined) return false;
    const t = typeAt(p.typeId, p.type, table);
    if (!t) return false;
    const s = shapeOf(t);
    if (s !== 'number' && s !== 'string' && s !== 'boolean' && s !== 'any') return false;
  }
  return true;
}

function sanitizeId(artifact: string): string {
  return artifact.replaceAll(/[^A-Za-z0-9-]/g, '-');
}
