import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { AAPT2_OVERRIDE, CONFIG_JSON, CONFIG_TS, DEFAULT_GRADLE, GRADLE_VERSION, SAMPLE_VSK, DEFAULT_SDK, GRADLE_URL, SDK_PACKAGES, TEMPLATE_DIR, TERMUX_AAPT2, TERMUX_BIN, TERMUX_HOME, TERMUX_LIB, cmdlineToolsUrl, collectVskFiles, hostInfo, log } from '@cli-native/constants';
import { loadConfig, writeDefaultConfig } from '@cli-native/config';
import { generateProject, generateVskLibDeclarations } from '@cli-native/generators';
import type { HostInfo } from '@cli-native/constants';
import { deriveLibraryPermissions, installedLibraries, loadLibraries, mavenMetadata, parseLibrarySpec, regenerateVsklib, resolveLibrary, saveLibraries, verifyLibrary, withVersion, writeVsklibCache } from '@cli-native/vsklib';
import type { VskLibRecord } from '@cli-native/vsklib';

export async function initApp(dir: string): Promise<void> {
  const target = resolve(dir);
  if (existsSync(target) && readdirSync(target).length > 0) {
    console.error(`  [init] ${target} is not empty — refusing to overwrite`);
    process.exit(1);
  }
  mkdirSync(target, { recursive: true });

  for (const f of readdirSync(TEMPLATE_DIR)) {
    if (f === 'app') continue;
    cpSync(join(TEMPLATE_DIR, f), join(target, f), { recursive: true });
  }
  log('init', 'gradle scaffolding copied');

  writeFileSync(join(target, 'local.properties'), `sdk.dir=${DEFAULT_SDK}\n`);
  writeDefaultConfig(target);
  const config = await loadConfig(target);

  const appDir = join(target, 'app');
  mkdirSync(appDir, { recursive: true });
  for (const f of collectVskFiles(SAMPLE_VSK)) {
    const rel = relative(SAMPLE_VSK, f);
    const dest = join(appDir, rel);
    mkdirSync(resolve(dest, '..'), { recursive: true });
    writeFileSync(dest, readFileSync(f, 'utf8'));
  }
  log('init', `sample .vsk files copied (${collectVskFiles(SAMPLE_VSK).length})`);

  generateProject(target, config);
  console.log(`\n  done. next: vesk-native build ${target} && vesk-native run ${target}`);
}

function findJava(): string {
  if (process.env.JAVA_HOME) {
    const jh = join(process.env.JAVA_HOME!, 'bin', 'java');
    if (existsSync(jh)) return jh;
  }
  const found = spawnSync('which', ['java'], { encoding: 'utf8' });
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  return 'java';
}

function javaMajor(): number | null {
  const r = spawnSync(findJava(), ['-version'], { encoding: 'utf8' });
  const raw = (r.stderr || r.stdout || '') as string;
  const m = raw.match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  const major = Number(m[1]);
  return major === 1 ? Number(m[2]) : major;
}

function run(what: string, cmd: string, args: string[]): boolean {
  log('setup', `$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`  [setup] ${what} failed (exit ${r.status})`);
    return false;
  }
  return true;
}

function unzipTo(zip: string, dest: string): boolean {
  if (run('extract zip', 'unzip', ['-q', '-o', zip, '-d', dest])) return true;
  if (run('extract zip', 'tar', ['-xf', zip, '-C', dest])) return true;
  return run('extract zip', 'powershell', ['-NoProfile', '-Command', `Expand-Archive -Force -Path '${zip}' -DestinationPath '${dest}'`]);
}

function sdkmanagerPath(root: string, os: HostInfo['os']): string {
  return join(root, 'sdk', 'cmdline-tools', 'latest', 'bin', os === 'windows' ? 'sdkmanager.bat' : 'sdkmanager');
}

function sdkmanagerRun(root: string, os: HostInfo['os'], args: string[]): boolean {
  const sm = sdkmanagerPath(root, os);
  if (os === 'windows') {
    const r = spawnSync(sm, args, { input: 'y\n'.repeat(50), stdio: ['pipe', 'inherit', 'inherit'] });
    if (r.status !== 0) {
      console.error('  [setup] sdkmanager failed');
      return false;
    }
    return true;
  }
  return run('sdkmanager', 'bash', ['-c', `yes | "${sm}" ${args.map((a) => `"${a}"`).join(' ')}`]);
}

export function setupToolchain(root: string): void {
  const host = hostInfo();
  console.log(`\n  vesk-native setup — provisioning the native toolchain at:\n    ${root}`);
  console.log(`  host: ${host.os} / ${host.arch}${host.termux ? ' (termux)' : ''}\n`);
  mkdirSync(root, { recursive: true });

  const java = findJava();
  const jmajor = javaMajor();
  if (jmajor === null) {
    console.warn('  [setup] java not found — need JDK 17+ (arch: pacman -S jdk17-openjdk / debian: apt install openjdk-17-jdk / windows: winget install Microsoft.OpenJDK.17)');
  } else if (jmajor < 17) {
    console.warn(`  [setup] java ${jmajor} is too old — need JDK 17+ (set JAVA_HOME or install OpenJDK 17)`);
  } else {
    log('setup', `java ${jmajor} OK (${java})`);
  }

  const sdkman = sdkmanagerPath(root, host.os);
  if (!existsSync(sdkman)) {
    log('setup', `downloading Android commandline-tools (${host.os}/${host.arch})...`);
    const zip = join('/tmp', 'cmdtools.zip');
    if (!run('download', 'curl', ['-fsSL', cmdlineToolsUrl(host.os), '-o', zip])) process.exit(1);
    const staging = join(root, 'sdk', 'cmdline-tools', 'dl');
    mkdirSync(staging, { recursive: true });
    if (!unzipTo(zip, staging)) process.exit(1);
    const inner = readdirSync(staging).find((d) => existsSync(join(staging, d, 'bin', 'sdkmanager')) || existsSync(join(staging, d, 'bin', 'sdkmanager.bat')));
    if (!inner) {
      console.error('  [setup] commandline-tools zip layout unexpected — aborting');
      process.exit(1);
    }
    mkdirSync(join(root, 'sdk', 'cmdline-tools', 'latest'), { recursive: true });
    for (const e of readdirSync(join(staging, inner))) {
      renameSync(join(staging, inner, e), join(root, 'sdk', 'cmdline-tools', 'latest', e));
    }
  } else {
    log('setup', `sdkmanager found (${sdkman})`);
  }
  if (!existsSync(sdkman)) {
    console.error('  [setup] sdkmanager missing after install — aborting');
    process.exit(1);
  }

  const adb = join(root, 'sdk', 'platform-tools', host.os === 'windows' ? 'adb.exe' : 'adb');
  if (!existsSync(adb)) {
    log('setup', 'accepting SDK licenses + installing packages (platform-tools, build-tools, platforms 34/36)...');
    if (!sdkmanagerRun(root, host.os, ['--licenses'])) process.exit(1);
    if (!sdkmanagerRun(root, host.os, ['--install', ...SDK_PACKAGES])) process.exit(1);
  } else {
    log('setup', 'SDK packages already installed');
  }

  const gradleBin = join(root, `gradle-${GRADLE_VERSION}`, 'bin', host.os === 'windows' ? 'gradle.bat' : 'gradle');
  if (!existsSync(gradleBin)) {
    log('setup', `downloading Gradle ${GRADLE_VERSION} (universal JVM distribution)...`);
    const zip = join('/tmp', `gradle-${GRADLE_VERSION}-bin.zip`);
    if (!run('download', 'curl', ['-fSL', GRADLE_URL, '-o', zip])) process.exit(1);
    if (!unzipTo(zip, root)) process.exit(1);
  } else {
    log('setup', `gradle ${GRADLE_VERSION} found`);
  }

  if (existsSync(TERMUX_AAPT2) && !existsSync(AAPT2_OVERRIDE)) {
    mkdirSync(join(root, 'aapt2-veck'), { recursive: true });
    writeFileSync(AAPT2_OVERRIDE, `#!/bin/sh
export LD_LIBRARY_PATH=${TERMUX_LIB}
exec ${TERMUX_AAPT2} "$@"
`);
    chmodSync(AAPT2_OVERRIDE, 0o755);
    log('setup', `aapt2 proxied through termux binary (${host.arch})`);
  } else if (existsSync(AAPT2_OVERRIDE)) {
    log('setup', 'aapt2 override present');
  } else if (host.os === 'linux' && host.arch !== 'x86_64') {
    console.warn('  [setup] arch: ' + host.arch + ' linux, but Gradle\'s bundled aapt2 is x86_64-only — install an aarch64 aapt2 (e.g. from Android Studio) and set android.aapt2FromMavenOverride');
  } else {
    log('setup', 'aapt2: using AGP\'s bundled (maven) binary — fine for this arch');
  }

  if (host.os !== 'windows' && !existsSync(join(root, 'env.sh'))) {
    const smBin = join(root, 'sdk', 'cmdline-tools', 'latest', 'bin');
    const ptBin = join(root, 'sdk', 'platform-tools');
    const gBin = join(root, `gradle-${GRADLE_VERSION}`, 'bin');
    writeFileSync(join(root, 'env.sh'), `export ANDROID_HOME=${join(root, 'sdk')}
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export GRADLE_HOME=${join(root, `gradle-${GRADLE_VERSION}`)}
export PATH="${smBin}:${ptBin}:${gBin}:$PATH"
`);
    log('setup', `env.sh written — source it: source ${join(root, 'env.sh')}`);
  } else if (host.os === 'windows') {
    log('setup', 'windows: add to PATH manually: ' + [join(root, 'sdk', 'cmdline-tools', 'latest', 'bin'), join(root, 'sdk', 'platform-tools'), join(root, `gradle-${GRADLE_VERSION}`, 'bin')].join(';'));
  }

  console.log(`\n  [setup] done. run: vesk-native build <app>`);
}

function findGradle(): string {
  if (process.env.GRADLE_HOME) return join(process.env.GRADLE_HOME, 'bin', 'gradle');
  const found = spawnSync('which', ['gradle'], { encoding: 'utf8' });
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  if (existsSync(DEFAULT_GRADLE)) return DEFAULT_GRADLE;
  return 'gradle';
}

export async function buildApp(dir: string): Promise<void> {
  const target = resolve(dir);
  const config = await loadConfig(target);
  log('build', 'regenerating project from source');
  generateProject(target, config);

  const gradle = findGradle();
  log('build', `using gradle: ${gradle}`);
  const env = { ...process.env };
  if (!env.ANDROID_HOME) env.ANDROID_HOME = DEFAULT_SDK;
  if (!env.ANDROID_SDK_ROOT) env.ANDROID_SDK_ROOT = DEFAULT_SDK;
  const result = spawnSync(gradle, ['assembleDebug', '--console=plain', '--no-daemon'], {
    cwd: target,
    env,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error('  [build] gradle failed');
    process.exit(result.status ?? 1);
  }
  log('build', 'assembleDebug OK');
}

function stageApk(apk: string): string | null {
  if (!existsSync(TERMUX_HOME)) {
    log('run', `termux home not found at ${TERMUX_HOME} — skipping stage`);
    return null;
  }
  const dest = join(TERMUX_HOME, 'app-debug.apk');
  writeFileSync(dest, readFileSync(apk));
  log('run', `APK staged at ${dest}`);
  return dest;
}

function isAppDir(dir: string): boolean {
  return existsSync(join(dir, CONFIG_TS)) || existsSync(join(dir, CONFIG_JSON));
}

function requireApp(target: string): void {
  if (!isAppDir(target)) {
    console.error(`  [lib] ${target} is not a vesk app (no ${CONFIG_TS}/${CONFIG_JSON})`);
    process.exit(1);
  }
}

// `vesk <verb> [pkg] [dir]` — positionals that look like app dirs are treated
// as the target, the rest as the package spec (so `vesk update /path` updates
// everything in that app and `vesk update coil /path` targets one library).
export function parseLibraryArgs(rest: string[]): { spec?: string; dir: string } {
  const dirs = rest.filter((r) => isAppDir(resolve(r)));
  const specs = rest.filter((r) => !isAppDir(resolve(r)));
  return { spec: specs[0], dir: dirs[0] ? resolve(dirs[0]) : process.cwd() };
}

function printSurface(rec: VskLibRecord): void {
  const surface: string[] = [];
  if (rec.exports.length > 0) surface.push(`  exports: ${rec.exports.join(', ')}`);
  const tagNames = Object.keys(rec.tags ?? {});
  if (tagNames.length > 0) surface.push(`  tags:    ${tagNames.map((t) => `<${t}>`).join(', ')}`);
  if (surface.length > 0) {
    console.log(`  JS surface:`);
    for (const line of surface) console.log(line);
  }
  if (rec.permissions.length > 0) {
    console.log(`  manifest permissions (derived at add/update from the AAR + rules): ${rec.permissions.join(', ')}`);
  }
}

// Generate the typed binding (tags, exports, signatures, AAR manifest
// permissions) for a library record. Returns the regenerated record (keeping
// the pinned id) or null when metadata is unavailable (offline, Java-only
// artifact, no mappable surface) so the pinned record stands unchanged.
async function generateBindingFor(rec: VskLibRecord, verb: 'add' | 'update'): Promise<VskLibRecord | null> {
  try {
    const { generateLibraryBinding } = await import('@cli-native/metadata/binding-gen');
    const result = await generateLibraryBinding({ group: rec.group, artifact: rec.artifact, version: rec.version });
    if (result.stats.classes > 0) {
      if (verb === 'add') {
        console.log(`  [add] read ${result.stats.classes} classes, ${result.stats.facades} file facades`);
        console.log(`  [add] ${result.stats.composables} composable tags, ${result.stats.exports} JS exports`);
        if (result.skipped.length > 0) {
          console.log(`  [add] ${result.skipped.length} declarations skipped (not expressible yet):`);
          for (const s of result.skipped.slice(0, 8)) console.log(`    - ${s}`);
          if (result.skipped.length > 8) console.log(`    - … and ${result.skipped.length - 8} more`);
        }
      }
      return { ...result.record, id: rec.id || result.record.id };
    }
    log(verb, `${rec.id}: metadata yielded no binding surface — keeping the pinned record`);
    return null;
  } catch (e) {
    log(verb, `${rec.id}: metadata binding unavailable (${(e as Error).message}) — keeping the pinned record`);
    return null;
  }
}

export async function addLibrary(dir: string, spec: string): Promise<void> {
  const target = resolve(dir);
  requireApp(target);
  let rec: VskLibRecord;
  const parsed = parseLibrarySpec(spec);
  try {
    rec = resolveLibrary(parsed);
    // Curated catalog records are trusted as authored — never regenerate.
    // Non-catalog records (auto-generated at a previous `add`) and records
    // predating metadata auto-generation get a binding regenerated so
    // `vesk add lottie` installs real signatures/tags. If the metadata is
    // unavailable (offline, Java-only artifact) the registry record stands.
    if (!rec.curated && rec.signatures === undefined) {
      const regen = await generateBindingFor(rec, 'add');
      if (regen) rec = regen;
    }
  } catch (e) {
    if (parsed.group && parsed.artifact && !parsed.id) {
      if (!parsed.version) {
        console.error(`  [add] ${parsed.group}:${parsed.artifact} is not in the builtin registry — auto-generation needs an exact version: vesk add ${parsed.group}:${parsed.artifact}@<version>`);
        process.exit(1);
      }
      log('add', `${parsed.group}:${parsed.artifact}@${parsed.version} is not in the builtin registry — generating a binding from Kotlin metadata`);
      const regen = await generateBindingFor(
        { id: '', name: parsed.artifact, description: '', group: parsed.group, artifact: parsed.artifact, version: parsed.version, gradle: [], permissions: [], exports: [], tags: {} },
        'add',
      );
      if (!regen) {
        console.error(`  [add] no binding surface for ${parsed.group}:${parsed.artifact}@${parsed.version} — cannot install`);
        process.exit(1);
      }
      rec = regen;
    } else {
      console.error(`  [add] ${(e as Error).message}`);
      process.exit(1);
    }
  }
  const data = loadLibraries(target);
  const existing = data.libraries[rec.id];
  if (existing) {
    console.error(`  [add] ${rec.id} ${existing.version} is already installed — use: vesk update ${rec.id}`);
    process.exit(1);
  }
  if (rec.signatures === undefined) {
    const verify = await verifyLibrary(rec);
    if (verify.status === 'not-found') {
      console.error(`  [add] ${rec.group}:${rec.artifact} does not resolve on Maven Central — check the coordinates`);
      process.exit(1);
    }
    if (verify.status === 'version-missing') {
      console.error(`  [add] ${rec.id} version ${rec.version} not found on Maven Central${verify.latest ? ` — latest is ${verify.latest}` : ''}`);
      process.exit(1);
    }
    if (verify.status === 'verified') log('add', `${rec.id} ${rec.version} verified on Maven Central`);
    else log('add', 'Maven Central unreachable — pinning registry version without verification');
  }
  // Permissions are derived at add time: the AAR's own manifest declarations
  // merged with the coordinate rules (e.g. INTERNET for network clients) and
  // persisted into the record — the build never needs a manual permission.
  rec = { ...rec, permissions: deriveLibraryPermissions(rec) };

  data.libraries[rec.id] = rec;
  saveLibraries(target, data);
  writeVsklibCache(target, installedLibraries(target));
  generateVskLibDeclarations(target);
  log('add', `${rec.name} (${rec.gradle.join(', ')}) pinned to libraries.json`);
  printSurface(rec);
  console.log(`\n  next: vesk-native build ${target} registers the dependency + permissions.`);
}

// Next version for an installed record: an explicit spec version wins, then
// the builtin registry pin, then the latest published on Maven Central (for
// auto-generated non-registry libraries like `vesk add group:artifact@version`).
async function nextVersionOf(rec: VskLibRecord, specVersion?: string): Promise<{ next: string; source: string }> {
  if (specVersion) return { next: specVersion, source: 'pinned' };
  try {
    return { next: resolveLibrary({ id: rec.id }).version, source: 'registry' };
  } catch {
    const meta = await mavenMetadata(rec);
    if (!meta.reachable || meta.notFound || meta.versions.length === 0) {
      throw new Error(`cannot discover a newer ${rec.id} version — Maven Central unreachable or lists none; pass one explicitly: vesk update ${rec.id}@<version>`);
    }
    return { next: meta.latest ?? rec.version, source: 'maven' };
  }
}

// Re-pin a library at a new version: regenerate the binding surface + AAR
// manifest permissions from the artifact, then derive the coordinate rules.
// Falls back to the version-bumped pinned record when metadata is unavailable.
async function rederiveAtVersion(rec: VskLibRecord, next: string): Promise<VskLibRecord> {
  const bumped = withVersion(rec, next);
  const regen = await generateBindingFor(bumped, 'update');
  const base = regen ?? bumped;
  return { ...base, permissions: deriveLibraryPermissions(base) };
}

export async function updateLibraries(dir: string, spec?: string): Promise<void> {
  const target = resolve(dir);
  requireApp(target);
  const data = loadLibraries(target);
  const ids = Object.keys(data.libraries);
  if (ids.length === 0) {
    console.error('  [update] no libraries installed — use: vesk add <pkg>');
    process.exit(1);
  }
  if (spec) {
    let parsed;
    try {
      parsed = parseLibrarySpec(spec);
    } catch (e) {
      console.error(`  [update] ${(e as Error).message}`);
      process.exit(1);
    }
    if (!parsed.id) {
      console.error(`  [update] "${spec}" is not an installed library (installed: ${ids.join(', ')})`);
      process.exit(1);
    }
    const installed = data.libraries[parsed.id];
    if (!installed) {
      console.error(`  [update] "${spec}" is not an installed library (installed: ${ids.join(', ')})`);
      process.exit(1);
    }
    let next: string;
    let source: string;
    try {
      ({ next, source } = await nextVersionOf(installed, parsed.version));
    } catch (e) {
      console.error(`  [update] ${(e as Error).message}`);
      process.exit(1);
    }
    if (next === installed.version) {
      log('update', `${installed.id} already at ${installed.version}`);
      return;
    }
    const rec = await rederiveAtVersion(installed, next);
    data.libraries[rec.id] = rec;
    saveLibraries(target, data);
    writeVsklibCache(target, installedLibraries(target));
    generateVskLibDeclarations(target);
    log('update', `${rec.id} ${installed.version} -> ${rec.version}${parsed.version ? '' : ` (${source})`}`);
    printSurface(rec);
    return;
  }
  const bumped: string[] = [];
  for (const id of ids) {
    const installed = data.libraries[id]!;
    let next: string;
    try {
      ({ next } = await nextVersionOf(installed));
    } catch (e) {
      log('update', `keeping ${id} — ${(e as Error).message}`);
      continue;
    }
    if (next === installed.version) continue;
    const rec = await rederiveAtVersion(installed, next);
    data.libraries[id] = rec;
    bumped.push(`${rec.id} ${installed.version} -> ${rec.version}`);
  }
  saveLibraries(target, data);
  writeVsklibCache(target, installedLibraries(target));
  generateVskLibDeclarations(target);
  if (bumped.length === 0) {
    log('update', 'all installed libraries are at the latest version');
    return;
  }
  log('update', `${bumped.length} library(ies) bumped to the latest version`);
}

export async function removeLibrary(dir: string, spec: string): Promise<void> {
  const target = resolve(dir);
  requireApp(target);
  let parsed;
  try {
    parsed = parseLibrarySpec(spec);
  } catch (e) {
    console.error(`  [remove] ${(e as Error).message}`);
    process.exit(1);
  }
  if (!parsed.id) {
    console.error(`  [remove] expected a library id (e.g. "vesk remove coil")`);
    process.exit(1);
  }
  const data = loadLibraries(target);
  const rec = data.libraries[parsed.id];
  if (!rec) {
    console.error(`  [remove] ${parsed.id} is not installed (installed: ${Object.keys(data.libraries).join(', ') || 'none'})`);
    process.exit(1);
  }
  delete data.libraries[parsed.id];
  saveLibraries(target, data);
  writeVsklibCache(target, installedLibraries(target));
  generateVskLibDeclarations(target);
  log('remove', `${parsed.id} removed — the next build drops its gradle dep${rec.permissions.length > 0 ? ' + permissions' : ''}`);
}

// `vesk install` = restore libraries from the committed manifest (regenerate
// the disposable `.vsklib/` from libraries.json, re-verifying each pin) then
// build + install the APK on the device.
export async function installApp(dir: string): Promise<void> {
  const target = resolve(dir);
  requireApp(target);
  const restored = await regenerateVsklib(target);
  if (restored.length === 0) {
    log('install', 'no libraries in libraries.json — .vsklib regenerated empty');
  } else {
    log('install', `regenerated .vsklib from libraries.json (${restored.map((r) => r.id).join(', ')})`);
  }
  await runApp(target);
}

export async function runApp(dir: string): Promise<void> {
  const target = resolve(dir);
  const config = await loadConfig(target);
  const apk = join(target, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!existsSync(apk)) {
    log('run', 'apk missing — building first');
    buildApp(target);
  }
  if (!existsSync(apk)) {
    console.error('  [run] build did not produce an apk');
    process.exit(1);
  }

  const staged = stageApk(apk);

  console.log(`\n  [run] launching the system package installer...`);
  const am = join(TERMUX_BIN, 'am');
  if (existsSync(am)) {
    if (staged) {
      // The system installer cannot read Termux's private storage directly, so we
      // hand it a content:// URI served by Termux's TermuxOpenReceiver provider
      // (authority com.termux.files) and grant read permission on the intent.
      const apkUri = `content://com.termux.files${staged}`;
      spawnSync(am, [
        'start', '--user', '0',
        '-a', 'android.intent.action.VIEW',
        '-d', apkUri,
        '-t', 'application/vnd.android.package-archive',
        '--grant-read-uri-permission',
      ], { stdio: 'inherit' });
    } else {
      log('run', 'termux am not usable — copy the APK to shared storage first');
    }
  } else {
    console.log(`  [run] termux am missing — open the APK from shared storage manually`);
  }

  console.log(`\n  [run] after installing, launch the app with:`);
  console.log(`        ${TERMUX_BIN}/am start --user 0 -n ${config.appId}/.MainActivity`);
  console.log(`  or re-run this CLI with: vesk-native run ${target}`);
}

