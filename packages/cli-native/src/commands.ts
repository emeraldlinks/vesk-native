import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve, relative, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { AAPT2_OVERRIDE, CONFIG_JSON, CONFIG_TS, DEFAULT_GRADLE, GRADLE_VERSION, SAMPLE_VSK, DEFAULT_SDK, GRADLE_URL, SDK_PACKAGES, TEMPLATE_DIR, TERMUX_AAPT2, TERMUX_LIB, cmdlineToolsUrl, collectVskFiles, hostInfo, log } from '@cli-native/constants';
import { loadConfig, writeDefaultConfig } from '@cli-native/config';
import { generateProject, generateVskLibDeclarations } from '@cli-native/generators';
import { generateIosProject, iosBuildDir, iosExportOptions, requireIosSigning } from '@cli-native/ios';
import type { VeskConfig } from '@vesk/native';
import type { HostInfo } from '@cli-native/constants';
import { deriveLibraryPermissions, installedLibraries, loadLibraries, mavenMetadata, parseLibrarySpec, resolveLibrary, saveLibraries, verifyLibraries, verifyLibrary, withVersion, writeVsklibCache } from '@cli-native/vsklib';
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
  if (existsSync(SAMPLE_VSK)) {
    for (const f of collectVskFiles(SAMPLE_VSK)) {
      const rel = relative(SAMPLE_VSK, f);
      const dest = join(appDir, rel);
      mkdirSync(resolve(dest, '..'), { recursive: true });
      writeFileSync(dest, readFileSync(f, 'utf8'));
    }
    log('init', `sample .vsk files copied (${collectVskFiles(SAMPLE_VSK).length})`);
  } else {
    log('init', 'no sample .vsk files packaged with this cli-native — skipping samples');
  }

  generateProject(target, config);
  console.log(`\n  done. next: vesk-native build`);
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
    const zip = join(tmpdir(), 'cmdtools.zip');
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
    const zip = join(tmpdir(), `gradle-${GRADLE_VERSION}-bin.zip`);
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

// `vesk bundle [dir] [android|ios]` — release packaging.
//
// Android: an AAB (Play Store, Play App Signing upload key from
// veskconfig.signing.android) and a release APK. Without signing config the
// release artifacts sign with the debug keystore (dev flow — never upload
// those to a store).
//
// iOS: regenerates the Xcode project, then (on macOS with Xcode 26+ for
// App Store Connect, per the Apr 28 2026 SDK requirement) archives and
// exports the .ipa with ExportOptions.plist driven by veskconfig.bundle.ios
// and veskconfig.signing.ios.
export async function bundleApp(dir: string, platform: 'android' | 'ios' = 'android'): Promise<void> {
  const target = resolve(dir);
  const config = await loadConfig(target);
  log('bundle', `regenerating project from source (${platform})`);
  generateProject(target, config);

  if (platform === 'ios') {
    await bundleIos(target, config);
    return;
  }
  await bundleAndroid(target, config);
}

async function bundleAndroid(target: string, config: VeskConfig): Promise<void> {
  const gradle = findGradle();
  log('bundle', `using gradle: ${gradle}`);
  const env = { ...process.env };
  if (!env.ANDROID_HOME) env.ANDROID_HOME = DEFAULT_SDK;
  if (!env.ANDROID_SDK_ROOT) env.ANDROID_SDK_ROOT = DEFAULT_SDK;

  const signing = config.signing?.android;
  if (signing) {
    const checks = androidSigningChecks(config, target);
    if (checks.fail.length > 0) {
      for (const f of checks.fail) console.error('  [bundle] ' + f);
      console.error('  [bundle] fix the failures above, or remove veskconfig.signing.android to sign with the debug keystore');
      process.exit(1);
    }
    for (const w of checks.warn) console.error('  [bundle] WARNING: ' + w);
  } else {
    log('bundle', 'no veskconfig.signing.android — release artifacts sign with the debug keystore (dev flow only)');
  }

  const targets = config.bundle?.android ?? ['aab', 'apk'];
  const tasks = targets.map((t) => (t === 'aab' ? 'bundleRelease' : 'assembleRelease'));
  const result = spawnSync(gradle, [...tasks, '--console=plain', '--no-daemon'], { cwd: target, env, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('  [bundle] gradle failed');
    process.exit(result.status ?? 1);
  }
  const outDir = join(target, 'app', 'build', 'outputs');
  const aab = join(outDir, 'bundle', 'release', 'app-release.aab');
  const apk = join(outDir, 'apk', 'release', 'app-release.apk');
  if (targets.includes('aab') && existsSync(aab)) log('bundle', `AAB: ${aab}`);
  if (targets.includes('apk') && existsSync(apk)) log('bundle', `release APK: ${apk}`);
}

// keytool ships with every JDK but its location varies per OS/install
// (JAVA_HOME/bin, a sibling of `java` on PATH, Termux $PREFIX/bin, ...).
// Resolution mirrors findJava() below; the signing check is advisory anyway
// and degrades to a log line when no JDK keytool can be found.
function findKeytool(): string {
  const exe = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
  if (process.env.JAVA_HOME) {
    const jk = join(process.env.JAVA_HOME!, 'bin', exe);
    if (existsSync(jk)) return jk;
  }
  const java = findJava();
  if (java !== 'java') {
    const sibling = join(dirname(java), exe);
    if (existsSync(sibling)) return sibling;
  }
  const found = spawnSync('which', ['keytool'], { encoding: 'utf8' });
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  return 'keytool';
}

// Structured signing/bundling pre-flight checks shared by `vesk bundle`
// (fail fast before gradle) and `vesk verify bundle` (probe the setup).
interface SigningChecks {
  pass: string[];
  warn: string[];
  fail: string[];
}

function androidSigningChecks(config: VeskConfig, dir: string): SigningChecks {
  const checks: SigningChecks = { pass: [], warn: [], fail: [] };
  const signing = config.signing?.android;
  if (!signing) {
    checks.pass.push('no veskconfig.signing.android — release artifacts sign with the debug keystore (dev flow only)');
    return checks;
  }
  const required = [
    ['storeFile', signing.storeFile],
    ['storePassword', signing.storePassword],
    ['keyAlias', signing.keyAlias],
    ['keyPassword', signing.keyPassword],
  ] as const;
  const missing = required.filter(([, v]) => !v || v === '');
  if (missing.length > 0) checks.fail.push(`signing.android incomplete — missing: ${missing.map(([l]) => l).join(', ')}`);
  else checks.pass.push('signing.android: storeFile, storePassword, keyAlias, keyPassword present');

  for (const [label, value] of [
    ['storePassword', signing.storePassword ?? ''],
    ['keyPassword', signing.keyPassword ?? ''],
  ] as const) {
    if (!value) continue;
    const resolved = value.startsWith('env:') ? process.env[value.slice(4)] : value;
    if (!resolved) checks.fail.push(`signing.${label} (${value.startsWith('env:') ? 'env:' + value.slice(4) : 'inline'}) resolves to an empty value`);
    else checks.pass.push(`signing.${label} resolves (${value.startsWith('env:') ? 'env ' + value.slice(4) : 'inline'})`);
  }

  if (signing.storeFile) {
    const ks = isAbsolute(signing.storeFile) ? signing.storeFile : resolve(dir, signing.storeFile);
    if (!existsSync(ks)) {
      checks.fail.push(`keystore not found: ${ks}`);
    } else {
      checks.pass.push(`keystore exists: ${ks}`);
      const keytool = findKeytool();
      const storePassword = signing.storePassword ?? '';
      const pwd = storePassword.startsWith('env:') ? process.env[storePassword.slice(4)] ?? '' : storePassword;
      const alias = signing.keyAlias ?? '';
      const out = spawnSync(keytool, ['-list', '-v', '-keystore', ks, '-storepass', pwd, '-alias', alias], { encoding: 'utf8' });
      if (out.error && keytool === 'keytool') {
        checks.warn.push('keytool not found on PATH — skipping keystore inspection (advisory only)');
      } else if (out.status !== 0) {
        checks.fail.push(`keytool could not read keystore/alias (${(out.stderr ?? '').trim().split('\n')[0] || 'bad storepass or alias'} — signing would fail)`);
      } else {
        checks.pass.push(`alias "${alias}" found in keystore`);
        const algo = out.stdout.match(/([0-9]+)-bit (RSA|EC|DSA) key/);
        if (algo) {
          if (algo[2] === 'RSA' && Number(algo[1]) < 2048) checks.warn.push(`upload key is RSA ${algo[1]} bit — Google Play requires RSA 2048+`);
          else checks.pass.push(`key algorithm: ${algo[2]} ${algo[1]} bit`);
        }
        const until = out.stdout.match(/until: \w+ (\w{3}) (\d{1,2}) \d{2}:\d{2}:\d{2} \w+ (\d{4})/);
        if (until) {
          const expiry = Date.parse(`${until[1]} ${until[2]} ${until[3]}`);
          if (expiry <= Date.parse('2033-10-22')) checks.warn.push(`upload key expires ${until[1]} ${until[2]} ${until[3]} — Google Play requires validity ending after 2033-10-22`);
          else checks.pass.push(`key valid until ${until[1]} ${until[2]} ${until[3]} (past the 2033-10-22 requirement)`);
        }
      }
    }
  }

  const targets = config.bundle?.android ?? ['aab', 'apk'];
  const badTargets = targets.filter((t) => t !== 'aab' && t !== 'apk');
  if (badTargets.length > 0) checks.fail.push(`bundle.android has unknown targets: ${badTargets.join(', ')} (allowed: aab, apk)`);
  else checks.pass.push(`bundle.android targets: ${targets.join(', ')}`);

  return checks;
}

function iosSigningChecks(config: VeskConfig, dir: string): SigningChecks {
  const checks: SigningChecks = { pass: [], warn: [], fail: [] };
  const ios = config.signing?.ios;
  if (!ios) {
    checks.fail.push('no veskconfig.signing.ios — bundle ios needs teamId at minimum (see packages/native/src/config.ts)');
  } else {
    if (!/^[A-Z0-9]{10}$/.test(ios.teamId)) checks.fail.push(`teamId must be 10 chars A-Z0-9, got "${ios.teamId}"`);
    else checks.pass.push(`teamId ${ios.teamId} looks valid`);
    const style = ios.style ?? 'automatic';
    checks.pass.push(`signing style: ${style}`);
    if (style === 'manual') {
      if (!ios.certificatePath) {
        checks.fail.push('manual signing needs certificatePath (.p12) and provisioningProfile');
      } else {
        const cert = resolve(dir, ios.certificatePath);
        if (!existsSync(cert)) checks.fail.push(`distribution certificate not found: ${cert}`);
        else checks.pass.push(`distribution certificate exists: ${cert}`);
        const pwd = ios.certificatePassword ?? '';
        if (pwd.startsWith('env:') && !process.env[pwd.slice(4)]) checks.fail.push(`certificatePassword env ${pwd.slice(4)} is not set`);
        else if (pwd.startsWith('env:')) checks.pass.push(`certificatePassword env ${pwd.slice(4)} resolves`);
        else checks.pass.push('certificatePassword inline');
      }
      if (!ios.provisioningProfile) checks.fail.push('manual signing needs provisioningProfile (name or UUID)');
      else checks.pass.push(`provisioning profile: ${ios.provisioningProfile}`);
    }
  }
  if (process.platform !== 'darwin') {
    checks.fail.push('iOS bundling requires macOS with Xcode (this host: ' + process.platform + ')');
  } else {
    checks.pass.push('host is macOS');
    const xcode = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
    if (xcode.status !== 0) checks.fail.push('xcodebuild not found — install Xcode 26+ (App Store Connect requires it since 2026-04-28)');
    else {
      const ver = xcode.stdout.match(/Xcode ([0-9]+)/)?.[1];
      if (ver && Number(ver) < 26) checks.warn.push(`Xcode ${ver} — App Store Connect uploads must be built with Xcode 26+ since 2026-04-28`);
      else checks.pass.push(`Xcode ${ver ?? '?'} present`);
    }
  }
  const method = config.bundle?.ios?.method ?? 'app-store-connect';
  if (method !== 'app-store-connect' && method !== 'ad-hoc' && method !== 'development' && method !== 'enterprise') {
    checks.fail.push(`bundle.ios.method "${method}" unknown (app-store-connect | ad-hoc | development | enterprise)`);
  } else {
    checks.pass.push(`bundle.ios.method: ${method}`);
  }
  return checks;
}

function verifyBundleSetup(config: VeskConfig, target: string, platforms: 'android' | 'ios' | 'both'): void {
  let bad = 0;
  if (platforms === 'android' || platforms === 'both') {
    console.log('\n  [verify] android bundle setup:');
    for (const p of androidSigningChecks(config, target).pass) console.log(`  [verify]   PASS  ${p}`);
    for (const w of androidSigningChecks(config, target).warn) console.warn(`  [verify]   WARN  ${w}`);
    for (const f of androidSigningChecks(config, target).fail) {
      console.error(`  [verify]   FAIL  ${f}`);
      bad++;
    }
  }
  if (platforms === 'ios' || platforms === 'both') {
    console.log('\n  [verify] ios bundle setup:');
    for (const p of iosSigningChecks(config, target).pass) console.log(`  [verify]   PASS  ${p}`);
    for (const w of iosSigningChecks(config, target).warn) console.warn(`  [verify]   WARN  ${w}`);
    for (const f of iosSigningChecks(config, target).fail) {
      console.error(`  [verify]   FAIL  ${f}`);
      bad++;
    }
  }
  console.log(bad === 0 ? '\n  [verify] bundle setup OK — no failing checks.' : `\n  [verify] ${bad} failing check(s) — fix them before bundling.`);
  if (bad > 0) process.exit(1);
}

export async function verifyBundle(dir: string, platform?: string): Promise<void> {
  const target = resolve(dir);
  const config = await loadConfig(target);
  const p = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'both';
  verifyBundleSetup(config, target, p);
}

async function bundleIos(target: string, config: VeskConfig): Promise<void> {
  requireIosSigning(config);
  generateIosProject(target, config);
  const ios = config.signing!.ios!;
  const scheme = config.bundle?.ios?.scheme ?? 'VeskApp';
  const buildDir = iosBuildDir(target);
  const archive = join(buildDir, 'VeskApp.xcarchive');
  const exportDir = join(buildDir, 'export');
  const proj = join(target, 'ios', 'VeskApp.xcodeproj');

  if (process.platform !== 'darwin') {
    console.error('  [bundle] iOS bundling requires macOS with Xcode (this host is ' + process.platform + '). The iOS project was generated under ios/ — run `vesk bundle ios` on a Mac.');
    process.exit(1);
  }
  const xcode = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
  if (xcode.status !== 0) {
    console.error('  [bundle] xcodebuild not found — install Xcode 26+ (App Store Connect requires it since 2026-04-28)');
    process.exit(1);
  }
  const xcodeVer = xcode.stdout.match(/Xcode ([0-9]+)/)?.[1];
  if (xcodeVer && Number(xcodeVer) < 26) {
    console.error(`  [bundle] WARNING: Xcode ${xcodeVer} — App Store Connect uploads must be built with Xcode 26+ (iOS 26 SDK) since 2026-04-28`);
  }
  mkdirSync(exportDir, { recursive: true });

  // Manual signing: import the distribution certificate into a build keychain
  // so codesign runs unattended (CI pattern: -T codesign + key partition list).
  const keychain = join(buildDir, 'vesk-build.keychain');
  if (ios.style === 'manual') {
    const cert = resolve(target, ios.certificatePath!);
    if (!existsSync(cert)) {
      console.error(`  [bundle] distribution certificate not found: ${cert}`);
      process.exit(1);
    }
    const kcPass = 'vesk-build';
    for (const cmd of [
      ['security', ['create-keychain', '-p', kcPass, keychain]],
      ['security', ['set-keychain-settings', '-lut', '21600', keychain]],
      ['security', ['unlock-keychain', '-p', kcPass, keychain]],
      ['security', ['import', cert, '-k', keychain, '-P', ios.certificatePassword?.startsWith('env:') ? process.env[ios.certificatePassword.slice(4)] ?? '' : ios.certificatePassword ?? '', '-T', '/usr/bin/codesign']],
      ['security', ['set-key-partition-list', '-S', 'apple-tool:,apple:', '-s', '-k', kcPass, keychain]],
    ]) {
      const r = spawnSync(cmd[0] as string, cmd[1] as string[], { stdio: 'inherit' });
      if (r.status !== 0) {
        console.error(`  [bundle] signing setup failed at ${cmd[0]}`);
        process.exit(r.status ?? 1);
      }
    }
    log('bundle', 'distribution certificate imported into the build keychain');
  }

  // Archive (generic iOS destination, Release).
  const styleArgs =
    ios.style === 'manual'
      ? ['CODE_SIGN_STYLE=Manual', 'DEVELOPMENT_TEAM=' + ios.teamId, 'PROVISIONING_PROFILE_SPECIFIER=' + (ios.provisioningProfile ?? '')]
      : ['CODE_SIGN_STYLE=Automatic', 'DEVELOPMENT_TEAM=' + ios.teamId];
  log('bundle', 'xcodebuild archive (this takes a while on first run)');
  const archiveResult = spawnSync(
    'xcodebuild',
    ['-project', proj, '-scheme', scheme, '-configuration', 'Release', '-destination', 'generic/platform=iOS', '-archivePath', archive, 'archive', ...styleArgs],
    { cwd: target, stdio: 'inherit' },
  );
  if (archiveResult.status !== 0) {
    console.error('  [bundle] xcodebuild archive failed');
    process.exit(archiveResult.status ?? 1);
  }

  // The provisioning profile UUID in ExportOptions must match the profile
  // embedded in the freshly-built archive (it changes on every renewal), so
  // read it out of the archive instead of trusting stale config.
  let profileUuid: string | undefined;
  const embedded = join(archive, 'Products', 'Applications', 'VeskApp.app', 'embedded.mobileprovision');
  if (existsSync(embedded)) {
    const uuid = spawnSync('sh', ['-c', `security cms -D -i "${embedded}" | plutil -extract UUID raw -`], { encoding: 'utf8' });
    profileUuid = uuid.status === 0 ? uuid.stdout.trim() : undefined;
    if (profileUuid) {
      const profilesDir = join(process.env.HOME ?? '', 'Library', 'MobileDevice', 'Provisioning Profiles');
      mkdirSync(profilesDir, { recursive: true });
      spawnSync('cp', ['-f', embedded, join(profilesDir, profileUuid + '.mobileprovision')]);
      log('bundle', `provisioning profile ${profileUuid} staged for export`);
    }
  }

  const exportOptions = join(buildDir, 'ExportOptions.plist');
  writeFileSync(exportOptions, iosExportOptions(config, profileUuid));

  const ascArgs = ios.appStoreConnectApiKey
    ? ['-allowProvisioningUpdates', '-authenticationKeyPath', resolve(target, ios.appStoreConnectApiKey.keyPath), '-authenticationKeyID', ios.appStoreConnectApiKey.keyId, '-authenticationKeyIssuerID', ios.appStoreConnectApiKey.issuerId]
    : ios.style === 'automatic'
      ? ['-allowProvisioningUpdates']
      : [];
  const exportResult = spawnSync('xcodebuild', ['-exportArchive', '-archivePath', archive, '-exportOptionsPlist', exportOptions, '-exportPath', exportDir, ...ascArgs], {
    cwd: target,
    stdio: 'inherit',
  });
  if (exportResult.status !== 0) {
    console.error('  [bundle] xcodebuild export failed');
    process.exit(exportResult.status ?? 1);
  }
  const ipa = join(exportDir, 'VeskApp.ipa');
  if (existsSync(ipa)) {
    log('bundle', `IPA: ${ipa}`);
  } else {
    console.error('  [bundle] export finished but no .ipa was produced (check ' + exportDir + ')');
    process.exit(1);
  }
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
  return { spec: rest[0], dir: process.cwd() };
}

function printSurface(rec: VskLibRecord): void {
  const surface: string[] = [];
  surface.push(`  libType: ${rec.libType}`);
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
        { id: '', name: parsed.artifact, description: '', group: parsed.group, artifact: parsed.artifact, version: parsed.version, gradle: [], permissions: [], exports: [], tags: {}, libType: 'utility' },
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
  console.log(`\n  next: vesk-native build registers the dependency + permissions.`);
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

// Curated registry records are the trusted source of truth for their surface.
// `vesk update` refreshes the manifest snapshot when the catalog improved
// (new exports/signatures/tags/attrs) without a version bump. Non-curated
// records keep their generated binding — the registry entry is only a pin.
function resyncFromRegistry(installed: VskLibRecord): VskLibRecord | null {
  let catalog: VskLibRecord;
  try {
    catalog = resolveLibrary({ id: installed.id });
  } catch {
    return null;
  }
  if (!catalog.curated) return null;
  const changed =
    catalog.version !== installed.version ||
    JSON.stringify(catalog.signatures) !== JSON.stringify(installed.signatures) ||
    JSON.stringify(catalog.tags) !== JSON.stringify(installed.tags);
  if (!changed) return null;
  // Permissions stay as derived at the previous add/update — the catalog has none.
  return { ...catalog, permissions: installed.permissions };
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
      const synced = resyncFromRegistry(installed);
      if (synced) {
        data.libraries[synced.id] = synced;
        saveLibraries(target, data);
        writeVsklibCache(target, installedLibraries(target));
        generateVskLibDeclarations(target);
        log('update', `${synced.id} re-synced from the registry (surface refreshed at ${synced.version})`);
        printSurface(synced);
        return;
      }
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
  const synced: string[] = [];
  for (const id of ids) {
    const installed = data.libraries[id]!;
    let next: string;
    try {
      ({ next } = await nextVersionOf(installed));
    } catch (e) {
      log('update', `keeping ${id} — ${(e as Error).message}`);
      continue;
    }
    if (next === installed.version) {
      const resynced = resyncFromRegistry(installed);
      if (resynced) {
        data.libraries[id] = resynced;
        synced.push(`${id} re-synced from the registry`);
      }
      continue;
    }
    const rec = await rederiveAtVersion(installed, next);
    data.libraries[id] = rec;
    bumped.push(`${rec.id} ${installed.version} -> ${rec.version}`);
  }
  saveLibraries(target, data);
  writeVsklibCache(target, installedLibraries(target));
  generateVskLibDeclarations(target);
  if (bumped.length > 0) log('update', `${bumped.length} library(ies) bumped to the latest version`);
  if (synced.length > 0) for (const s of synced) log('update', s);
  if (bumped.length === 0 && synced.length === 0) log('update', 'all installed libraries are at the latest version');
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

// `vesk verify` — read-only check that every pinned coordinate in the
// manifest resolves on its real repository (Google Maven for androidx,
// Maven Central otherwise). Exits non-zero when any pin is bad, so it can
// gate CI without ever touching build output.
export async function verifyApp(dir: string): Promise<void> {
  const target = resolve(dir);
  requireApp(target);
  const results = await verifyLibraries(target);
  let bad = 0;
  for (const r of results) {
    if (r.status === 'verified') log('verify', `${r.id} ${r.coordinate} verified`);
    else if (r.status === 'not-found') {
      console.error(`  [verify] ${r.id} ${r.coordinate} does not resolve — remove it with: vesk remove ${r.id}`);
      bad++;
    } else if (r.status === 'version-missing') {
      console.error(`  [verify] ${r.id} ${r.coordinate} not found${r.latest ? ` — latest is ${r.latest}` : ''} — use: vesk update ${r.id}`);
      bad++;
    } else {
      log('verify', `${r.id} ${r.coordinate} unreachable — skipping (offline)`);
    }
  }
  if (bad > 0) {
    console.error(`  [verify] ${bad} of ${results.length} pinned libraries do not resolve`);
    process.exit(1);
  }
  log('verify', `all ${results.length} pinned libraries resolve`);
}

