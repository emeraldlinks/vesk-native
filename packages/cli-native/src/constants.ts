import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The CLI resolves its shipped assets from its own package location (dist/ or
// src/ depending on how it runs), never from the working directory — so a
// packed `cli-native` tarball is self-contained: template files, the nav
// Router.kt, sample .vsk sources, and the .vsklib registry all travel inside
// the package.
export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE_DIR = join(PKG_ROOT, 'assets', 'template');
export const SAMPLE_VSK = join(PKG_ROOT, 'assets', 'sample');
export const NAVIGATION_KT = join(PKG_ROOT, 'assets', 'navigation', 'Router.kt');
export const CONFIG_TS = 'veskconfig.ts';
export const CONFIG_JSON = 'veskconfig.json';
// Termux prefix comes from the environment when present ($PREFIX, $HOME,
// $TERMUX_VERSION are always exported by real Termux); the /data/data defaults
// back up the rare case where env vars are missing on a Termux host.
export const TERMUX_PREFIX = process.env.PREFIX ?? '/data/data/com.termux/files/usr';
export const TERMUX_BIN = join(TERMUX_PREFIX, 'bin');
// Termux home is the sibling of $PREFIX's parent dir
// (/data/data/com.termux/files/usr -> /data/data/com.termux/files/home) — the
// layout, not $HOME, decides: containers can export a foreign HOME (this
// repo's dev box has HOME=/root) while still exposing the Termux filesystem.
export const TERMUX_HOME = process.env.PREFIX
  ? join(dirname(TERMUX_PREFIX), 'home')
  : existsSync('/data/data/com.termux/files/usr/bin')
    ? '/data/data/com.termux/files/home'
    : process.env.HOME ?? '/data/data/com.termux/files/home';

export const GRADLE_VERSION = '9.7.0';
export const GRADLE_URL = `https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`;
export const CMDLINE_TOOLS_REV = '11076708';
export const SDK_PACKAGES = ['platform-tools', 'build-tools;34.0.0', 'platforms;android-34', 'platforms;android-36'];
export const TERMUX_LIB = join(TERMUX_PREFIX, 'lib');
export const TERMUX_AAPT2 = join(TERMUX_BIN, 'aapt2');

export interface HostInfo {
  os: 'linux' | 'darwin' | 'windows';
  arch: 'aarch64' | 'x86_64' | 'arm' | 'x86' | string;
  termux: boolean;
}

export function hostInfo(): HostInfo {
  const termux = !!process.env.TERMUX_VERSION || !!process.env.PREFIX || existsSync('/data/data/com.termux/files/usr/bin');
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch;
  return { os, arch, termux };
}

export function cmdlineToolsUrl(os: HostInfo['os']): string {
  const slug = os === 'darwin' ? 'mac' : os === 'windows' ? 'win' : 'linux';
  return `https://dl.google.com/android/repository/commandlinetools-${slug}-${CMDLINE_TOOLS_REV}_latest.zip`;
}

export function toolchainRoot(): string {
  if (process.env.VESK_HOME) return resolve(process.env.VESK_HOME);
  if (existsSync('/opt/vesk-native-toolchain')) return '/opt/vesk-native-toolchain';
  return join(homedir(), '.vesk-native');
}

export const TOOLCHAIN_ROOT = toolchainRoot();
export const DEFAULT_SDK = join(TOOLCHAIN_ROOT, 'sdk');
export const DEFAULT_GRADLE = join(TOOLCHAIN_ROOT, `gradle-${GRADLE_VERSION}`, 'bin', 'gradle');
export const AAPT2_OVERRIDE = join(TOOLCHAIN_ROOT, 'aapt2-veck', 'aapt2');
export function collectVskFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.vsk')) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out.sort();
}

export function usage(): void {
  console.log(`vesk-native — compile .vsk to Kotlin + Compose, build & install natively

Run from inside your vesk project (the CLI lives in its node_modules), so
every command operates on the current directory — no project name is ever
appended.

Usage:
  vesk-native init               Scaffold a native app in the current (empty) directory
  vesk-native build              Regenerate everything from source + gradle assembleDebug
  vesk-native bundle [ios|android]  Release packaging: AAB + signed APK (android, default), or the iOS app archive + .ipa (ios, macOS/Xcode 26+). Signing from veskconfig.signing
  vesk-native verify [pkg]       Check pinned libraries resolve (no arg: libraries; bundle: bundling/signing setup probe)
  vesk-native verify bundle [android|ios]  Probe signing + bundling setup (keys, env vars, macOS/Xcode) without building
  vesk-native setup              Install the toolchain (JDK check, Android SDK, Gradle) for this OS/arch
  vesk-native add <pkg>          Add a Kotlin library to libraries.json (id | id@version | group:artifact) — the single committed source of truth
  vesk-native update [pkg]       Bump installed library version(s) to the latest builtin registry version
  vesk-native remove <pkg>       Uninstall a Kotlin library (gradle dep + permissions drop on next build)
  vesk-native dev [--port N]     Web preview with per-file HMR (device.* maps to browser APIs; unmapped = warn no-op)
  vesk-native dev --desktop      Desktop preview: jvm() target + Compose Hot Reload (ms recomposition, cells preserved)
`);
}

export function log(step: string, msg: string): void {
  console.log(`  [${step}] ${msg}`);
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function colorLiteral(hex: string): string {
  const clean = hex.replace(/^#/, '');
  const value = Number.parseInt(clean, 16);
  const argb = ((0xff000000 | value) >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `Color(0x${argb})`;
}
