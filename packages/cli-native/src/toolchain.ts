// Toolchain provisioning and probing, shared by the `vesk-native setup`
// command (cli-native) and the create CLI (create-native). The single
// implementation lives here; both CLIs reuse it rather than forking the
// install flow or the aapt2-override sync.
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { AAPT2_OVERRIDE, GRADLE_VERSION, GRADLE_URL, SDK_PACKAGES, TERMUX_AAPT2, TERMUX_LIB, cmdlineToolsUrl, hostInfo, log } from '@cli-native/constants';
import type { HostInfo } from '@cli-native/constants';

export interface ToolchainDetection {
  java: string | null;
  javaMajor: number | null;
  sdkRoot: string;
  sdkmanager: string | null;
  adb: string | null;
  hasCmdlineTools: boolean;
  hasPlatformTools: boolean;
  hasBuildTools: boolean;
  hasPlatforms: boolean;
  gradle: string | null;
}

// Probes the toolchain rooted at `root` (VESK_HOME → /opt/vesk-native-toolchain
// → ~/.vesk-native per toolchainRoot()): JDK on PATH/JAVA_HOME, the SDK
// components under root/sdk, and the Gradle distribution. Never downloads —
// purely diagnostic, so the create CLI can offer (or print steps for) setup.
export function detectToolchain(root: string, host: HostInfo): ToolchainDetection {
  const javaBin = findJava();
  const major = javaMajor();
  const sdkRoot = join(root, 'sdk');
  const adbExe = host.os === 'windows' ? 'adb.exe' : 'adb';
  const gradleExe = host.os === 'windows' ? 'gradle.bat' : 'gradle';
  const sdkman = sdkmanagerPath(root, host.os);
  return {
    java: major !== null ? javaBin : null,
    javaMajor: major,
    sdkRoot,
    sdkmanager: existsSync(sdkman) ? sdkman : null,
    adb: existsSync(join(sdkRoot, 'platform-tools', adbExe)) ? join(sdkRoot, 'platform-tools', adbExe) : null,
    hasCmdlineTools: existsSync(join(sdkRoot, 'cmdline-tools')),
    hasPlatformTools: existsSync(join(sdkRoot, 'platform-tools')),
    hasBuildTools: existsSync(join(sdkRoot, 'build-tools')),
    hasPlatforms: existsSync(join(sdkRoot, 'platforms')),
    gradle: existsSync(join(root, `gradle-${GRADLE_VERSION}`, 'bin', gradleExe)) ? join(root, `gradle-${GRADLE_VERSION}`, 'bin', gradleExe) : null,
  };
}

export function findJava(): string {
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

// Installs the native toolchain at `root` (JDK check, Android SDK via
// sdkmanager, Gradle GRADLE_VERSION). Exits non-zero on any failed step.
export function setupToolchain(root: string): void {
  const host = hostInfo();
  console.log(`\n  vesk-native setup — provisioning the native toolchain at:\n    ${root}`);
  console.log(`  host: ${host.os} / ${host.arch}${host.termux ? ' (termux)' : ''}\n`);
  mkdirSync(root, { recursive: true });

  const det = detectToolchain(root, host);
  if (det.javaMajor === null) {
    console.warn('  [setup] java not found — need JDK 17+ (arch: pacman -S jdk17-openjdk / debian: apt install openjdk-17-jdk / windows: winget install Microsoft.OpenJDK.17)');
  } else if (det.javaMajor < 17) {
    console.warn(`  [setup] java ${det.javaMajor} is too old — need JDK 17+ (set JAVA_HOME or install OpenJDK 17)`);
  } else {
    log('setup', `java ${det.javaMajor} OK (${det.java})`);
  }

  if (!det.sdkmanager) {
    installCmdlineTools(root, host);
  } else {
    log('setup', `sdkmanager found (${det.sdkmanager})`);
  }
  if (!det.sdkmanager && !existsSync(sdkmanagerPath(root, host.os))) {
    console.error('  [setup] sdkmanager missing after install — aborting');
    process.exit(1);
  }

  if (!det.adb) {
    log('setup', 'accepting SDK licenses + installing packages (platform-tools, build-tools, platforms 34/36)...');
    if (!sdkmanagerRun(root, host.os, ['--licenses'])) process.exit(1);
    if (!sdkmanagerRun(root, host.os, ['--install', ...SDK_PACKAGES])) process.exit(1);
  } else {
    log('setup', 'SDK packages already installed');
  }

  if (!det.gradle) {
    downloadGradle(root);
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

  writeEnvSh(root, host);

  console.log(`\n  [setup] done. run: vesk-native build <app>`);
}

// Downloads and stages the Android commandline-tools zip under root/sdk.
function installCmdlineTools(root: string, host: HostInfo): void {
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
}

// Rewrites gradle.properties so the aapt2 override line points at this
// machine's toolchain (dropping the line entirely when no override exists —
// AGP ships a bundled aapt2 for x86_64). Called on every build by
// generateProject and at scaffold time by the create CLI.
export function syncAapt2Override(gradleProperties: string): void {
  if (!existsSync(gradleProperties)) return;
  const lines = readFileSync(gradleProperties, 'utf8').split('\n');
  const kept = lines.filter((l) => !l.startsWith('android.aapt2FromMavenOverride'));
  if (existsSync(AAPT2_OVERRIDE)) kept.push(`android.aapt2FromMavenOverride=${AAPT2_OVERRIDE}`);
  writeFileSync(gradleProperties, `${kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
}

// ---------------------------------------------------------------------------
// Version probing + `vesk-native update-tools`
// ---------------------------------------------------------------------------

export const JDK_MIN_MAJOR = 17;

// Actual version of a gradle binary ("Gradle 9.7" from `--version`), or null
// when it cannot be executed/probed. Accepts either a distribution root, a
// binary path, or a bare command name resolved through PATH.
export function gradleVersionOf(gradleBin: string): string | null {
  const exe = hostInfo().os === 'windows' ? 'gradle.bat' : 'gradle';
  const isBare = !gradleBin.includes('/') && !gradleBin.includes('\\');
  const bin = isBare || basename(gradleBin) === exe ? gradleBin : join(gradleBin, 'bin', exe);
  if (!isBare && !existsSync(bin)) return null;
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  if ((r.status !== 0 && r.error) || !r.stdout) return null;
  const m = r.stdout.match(/Gradle (\d+\.\d+(?:\.\d+)?)/);
  return m?.[1] ?? null;
}

function versionParts(v: string): number[] {
  return v.split('.').map((n) => Number(n));
}

export function isSupportedGradle(version: string | null): boolean {
  if (!version) return false;
  const have = versionParts(version);
  const need = versionParts(GRADLE_VERSION);
  for (let i = 0; i < Math.max(have.length, need.length); i++) {
    const h = have[i] ?? 0;
    const n = need[i] ?? 0;
    if (h !== n) return h > n;
  }
  return true;
}

function downloadGradle(root: string): void {
  log('setup', `downloading Gradle ${GRADLE_VERSION} (universal JVM distribution)...`);
  const zip = join(tmpdir(), `gradle-${GRADLE_VERSION}-bin.zip`);
  if (!run('download', 'curl', ['-fSL', GRADLE_URL, '-o', zip])) process.exit(1);
  // Refresh an existing pinned distribution in place: remove first so a
  // half-updated tree never mixes files across versions.
  rmSync(join(root, `gradle-${GRADLE_VERSION}`), { recursive: true, force: true });
  if (!unzipTo(zip, root)) process.exit(1);
}

function writeEnvSh(root: string, host: HostInfo): void {
  if (host.os === 'windows') {
    log('setup', 'windows: add to PATH manually: ' + [join(root, 'sdk', 'cmdline-tools', 'latest', 'bin'), join(root, 'sdk', 'platform-tools'), join(root, `gradle-${GRADLE_VERSION}`, 'bin')].join(';'));
    return;
  }
  const smBin = join(root, 'sdk', 'cmdline-tools', 'latest', 'bin');
  const ptBin = join(root, 'sdk', 'platform-tools');
  const gBin = join(root, `gradle-${GRADLE_VERSION}`, 'bin');
  // Always rewritten (not just on first setup): after an update the stale
  // file would keep exporting the previous Gradle's home/PATH forever.
  writeFileSync(join(root, 'env.sh'), `export ANDROID_HOME=${join(root, 'sdk')}
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export GRADLE_HOME=${join(root, `gradle-${GRADLE_VERSION}`)}
export PATH="${smBin}:${ptBin}:${gBin}:$PATH"
`);
  log('setup', `env.sh written — source it: source ${join(root, 'env.sh')}`);
}

// `vesk-native update-tools` — bring the whole environment to the versions
// this CLI requires: refresh Android SDK packages through sdkmanager (--update),
// (re)install the pinned Gradle distribution, prune older managed Gradles,
// and rewrite env.sh. Idempotent; safe to run whenever builds complain about
// tool versions. The JDK cannot be auto-installed portably — probed and
// reported with per-OS install hints instead.
export function updateTools(root: string): void {
  const host = hostInfo();
  console.log(`\n  vesk-native update-tools — updating the native toolchain at:\n    ${root}`);
  console.log(`  host: ${host.os} / ${host.arch}${host.termux ? ' (termux)' : ''}\n`);
  mkdirSync(root, { recursive: true });

  const det = detectToolchain(root, host);
  if (det.javaMajor === null || det.javaMajor < JDK_MIN_MAJOR) {
    console.warn(`  [tools] java ${det.javaMajor ?? 'not found'} — this CLI needs JDK ${JDK_MIN_MAJOR}+ (arch: pacman -S jdk${JDK_MIN_MAJOR}-openjdk / debian: apt install openjdk-${JDK_MIN_MAJOR}-jdk / windows: winget install Microsoft.OpenJDK.${JDK_MIN_MAJOR})`);
  } else {
    log('tools', `java ${det.javaMajor} OK (${det.java})`);
  }

  if (!det.sdkmanager) {
    log('tools', 'commandline-tools missing — installing');
    installCmdlineTools(root, host);
  } else {
    log('tools', `commandline-tools found (${det.sdkmanager})`);
  }
  if (!existsSync(sdkmanagerPath(root, host.os))) process.exit(1);

  log('tools', 'accepting licenses + installing/updating SDK packages...');
  if (!sdkmanagerRun(root, host.os, ['--licenses'])) process.exit(1);
  if (!sdkmanagerRun(root, host.os, ['--install', ...SDK_PACKAGES])) process.exit(1);
  if (!sdkmanagerRun(root, host.os, ['--update'])) log('tools', 'sdkmanager --update reported nothing to do (or failed harmlessly)');

  const current = gradleVersionOf(det.gradle ?? '');
  if (current) log('tools', `managed gradle ${current} -> refreshing to ${GRADLE_VERSION}`);
  else log('tools', `managed gradle missing -> installing ${GRADLE_VERSION}`);
  downloadGradle(root);
  log('tools', `gradle ${GRADLE_VERSION} ready`);

  // Prune other managed distributions under the toolchain root (they are
  // vesk-managed state, not user installs) so PATH/env can never pick a stale
  // one again.
  for (const entry of readdirSync(root)) {
    if (/^gradle-\d+\.\d+(\.\d+)?$/.test(entry) && entry !== `gradle-${GRADLE_VERSION}`) {
      rmSync(join(root, entry), { recursive: true, force: true });
      log('tools', `removed outdated managed distribution ${entry}`);
    }
  }

  writeEnvSh(root, host);
  console.log(`\n  [tools] done. gradle ${GRADLE_VERSION}, sdk packages current.`);
}

