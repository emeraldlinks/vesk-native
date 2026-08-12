import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const MONOREPO = resolve(import.meta.dirname ?? process.cwd(), '..', '..', '..');
export const TEMPLATE_DIR = join(MONOREPO, 'runtime', 'vesk-native-template');
export const SAMPLE_VSK = join(MONOREPO, 'test-app', 'app');
export const CONFIG_TS = 'veskconfig.ts';
export const CONFIG_JSON = 'veskconfig.json';
export const TERMUX_BIN = '/data/data/com.termux/files/usr/bin';
export const TERMUX_HOME = '/data/data/com.termux/files/home';

export const GRADLE_VERSION = '9.7.0';
export const GRADLE_URL = `https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`;
export const CMDLINE_TOOLS_REV = '11076708';
export const SDK_PACKAGES = ['platform-tools', 'build-tools;34.0.0', 'platforms;android-34', 'platforms;android-36'];
export const TERMUX_LIB = '/data/data/com.termux/files/usr/lib';
export const TERMUX_AAPT2 = '/data/data/com.termux/files/usr/bin/aapt2';

export interface HostInfo {
  os: 'linux' | 'darwin' | 'windows';
  arch: 'aarch64' | 'x86_64' | 'arm' | 'x86' | string;
  termux: boolean;
}

export function hostInfo(): HostInfo {
  const termux = existsSync('/data/data/com.termux/files/usr/bin');
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

Usage:
  vesk-native init <dir>       Scaffold a native app in <dir> (from veskconfig.ts + .vsk sources)
  vesk-native build [dir]      Regenerate everything from source + gradle assembleDebug (default: .)
  vesk-native install [dir]    Regenerate .vsklib from libraries.json, build + install the APK (default: .)
  vesk-native run [dir]        Build, stage APK, open the on-device installer, launch (default: .)
  vesk-native setup            Install the toolchain (JDK check, Android SDK, Gradle) for this OS/arch
  vesk-native add <pkg> [dir]  Add a Kotlin library to libraries.json (id | id@version | group:artifact) — the single committed source of truth
  vesk-native update [pkg] [dir]  Bump installed library version(s) to the latest builtin registry version
  vesk-native remove <pkg> [dir]  Uninstall a Kotlin library (gradle dep + permissions drop on next build)
  vesk-native dev [dir]        (not yet implemented — Phase 7)
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
