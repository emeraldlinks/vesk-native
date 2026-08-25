// create-vesk-native — create-vite-style scaffolding for vesk-native apps.
//
// Machine-aware by design: it detects the host (OS/arch/Termux), resolves the
// Android SDK dynamically (never hardcoding /opt or any other path in
// generated files), checks the toolchain (JDK 17+, Android SDK, Gradle), and
// reuses the shared setupToolchain()/syncAapt2Override()/detectToolchain()
// implementations from @cli-native/toolchain instead of forking them.
// Every scaffolded app gets an AGENTS.md describing the app conventions and
// the generated framework structure for AI agents.

import { existsSync, mkdirSync, cpSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { GRADLE_VERSION, TERMUX_PREFIX, hostInfo, slugify, toolchainRoot } from '@cli-native/constants';
import { detectToolchain, setupToolchain, syncAapt2Override } from '@cli-native/toolchain';
import type { ToolchainDetection } from '@cli-native/toolchain';

const VERSION = '0.1.0'; // keep in sync with package.json
const TEMPLATES_DIR = join(import.meta.dirname, '..', 'templates');
const DEFAULT_TEMPLATE = 'starter';
const DEFAULT_PROJECT_NAME = 'my-vesk-app';
const DEFAULT_PRIMARY = '#3B82F6';
const DEFAULT_THEME = 'system';
const TEMPLATE_ORDER = ['blank', 'starter', 'demo'];

// ---------------------------------------------------------------------------
// Output helpers (colors off when piped or NO_COLOR is set)
// ---------------------------------------------------------------------------

const colorEnabled = stdout.isTTY && !process.env.NO_COLOR;
function paint(code: number, s: string): string {
  return colorEnabled ? `\u001b[${code}m${s}\u001b[0m` : s;
}
const bold = (s: string) => paint(1, s);
const dim = (s: string) => paint(2, s);
const green = (s: string) => paint(32, s);
const yellow = (s: string) => paint(33, s);
const red = (s: string) => paint(31, s);
const cyan = (s: string) => paint(36, s);

function log(step: string, msg: string): void {
  console.log(`  [${step}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Argument parsing (hand-rolled; no dependency)
// ---------------------------------------------------------------------------

interface CliArgs {
  projectName?: string;
  yes: boolean;
  template?: string;
  appName?: string;
  appId?: string;
  primary?: string;
  theme?: string;
  help: boolean;
  version: boolean;
}

const VALUE_FLAGS = new Set(['--template', '-t', '--app-name', '--app-id', '--primary', '--theme']);
const BOOL_FLAGS = new Set(['--yes', '-y', '--help', '-h', '--version', '-v']);

interface Parsed {
  args: CliArgs;
  error: string | null;
}

function parseArgs(argv: string[]): Parsed {
  const args: CliArgs = { yes: false, help: false, version: false };
  const positionals: string[] = [];
  let i = 2;
  while (i < argv.length) {
    const raw = argv[i]!;
    let name = raw;
    let inline: string | undefined;
    const eq = raw.indexOf('=');
    if (raw.startsWith('-') && eq !== -1) {
      name = raw.slice(0, eq);
      inline = raw.slice(eq + 1);
    }
    if (VALUE_FLAGS.has(name)) {
      const value = inline ?? argv[i + 1];
      if (value === undefined || value.startsWith('-')) return { args, error: `option ${name} requires a value` };
      switch (name) {
        case '--template':
        case '-t':
          args.template = value;
          break;
        case '--app-name':
          args.appName = value;
          break;
        case '--app-id':
          args.appId = value;
          break;
        case '--primary':
          args.primary = value;
          break;
        case '--theme':
          args.theme = value;
          break;
      }
      i += inline !== undefined ? 1 : 2;
    } else if (BOOL_FLAGS.has(name)) {
      if (inline !== undefined) return { args, error: `option ${name} does not take a value` };
      if (name === '--yes' || name === '-y') args.yes = true;
      else if (name === '--help' || name === '-h') args.help = true;
      else args.version = true;
      i++;
    } else if (raw.startsWith('-')) {
      return { args, error: `unknown option: ${raw}` };
    } else {
      positionals.push(raw);
      i++;
    }
  }
  if (positionals.length > 1) return { args, error: `expected at most one project name, got ${positionals.length}` };
  if (positionals[0] !== undefined) args.projectName = positionals[0];
  return { args, error: null };
}

function usage(): void {
  console.log(`create-vesk-native ${VERSION} — scaffold a new vesk-native app (compile .vsk to native Kotlin/Compose Android)

Usage:
  create-vesk-native [project-name] [options]

Options:
  -y, --yes               non-interactive; use defaults for anything not supplied
  -t, --template <name>   template to scaffold: blank | starter | demo (default: starter)
      --app-name <name>   app display name (launcher label; default: derived from project name)
      --app-id <id>       Android application id, e.g. com.example.app (default: com.vesk.<name>)
      --primary <hex>     primary color as #RGB or #RRGGBB (default: ${DEFAULT_PRIMARY})
      --theme <mode>      color scheme: system | light | dark (default: system)
  -h, --help              show this help and exit
  -v, --version           print the version and exit

Exit codes:
  0  success
  1  target directory exists, invalid input, or a required check failed
`);
}

// ---------------------------------------------------------------------------
// Validation (char-set based, never regex)
// ---------------------------------------------------------------------------

function isLetter(c: string): boolean {
  const code = c.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isLetterOrDigit(c: string): boolean {
  return isLetter(c) || (c >= '0' && c <= '9');
}

function isJavaIdentifier(s: string): boolean {
  if (s.length === 0) return false;
  if (!(isLetter(s[0]!) || s[0] === '_' || s[0] === '$')) return false;
  return [...s.slice(1)].every((c) => isLetterOrDigit(c) || c === '_' || c === '$');
}

function validAppId(id: string): boolean {
  if (!id.includes('.') || id.startsWith('.') || id.endsWith('.') || id.includes('..')) return false;
  return id.split('.').every(isJavaIdentifier);
}

function validProjectName(name: string): boolean {
  if (name.length === 0 || name === '.' || name === '..') return false;
  if (name !== name.trim()) return false;
  return ![...name].some((c) => c === '/' || c === '\\' || c === '\u0000');
}

const HEX = new Set('0123456789abcdefABCDEF'.split(''));
function parseHexColor(raw: string): string | null {
  let h = raw.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 || [...h].some((c) => !HEX.has(c))) return null;
  return '#' + h.toLowerCase();
}

function fail(message: string): never {
  console.error(red(`error: ${message}`));
  console.error(dim(`run 'create-vesk-native --help' for usage`));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Templates (blank / starter / demo)
// ---------------------------------------------------------------------------

interface TemplateChoice {
  name: string;
  description: string;
}

function loadTemplateChoices(): TemplateChoice[] {
  const dir = TEMPLATES_DIR;
  const names = readdirSync(dir).filter((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() && existsSync(join(full, 'template.json'));
  });
  names.sort((a, b) => {
    const ia = TEMPLATE_ORDER.indexOf(a);
    const ib = TEMPLATE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a < b ? -1 : 1;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return names.map((name) => {
    const meta = JSON.parse(readFileSync(join(dir, name, 'template.json'), 'utf8')) as { description?: string };
    return { name, description: meta.description ?? '' };
  });
}

// ---------------------------------------------------------------------------
// Answers / defaults
// ---------------------------------------------------------------------------

interface Answers {
  projectName: string;
  appName: string;
  appId: string;
  template: string;
  primaryColor: string;
  theme: string;
}

function javaPackageName(name: string): string {
  const base = slugify(name).replaceAll('-', '_');
  const ident = base.length > 0 && isLetterOrDigit(base[0]!) ? base : '_' + base;
  return ident;
}

function titleCase(name: string): string {
  return name.split('-').filter((w) => w.length > 0).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function defaultAnswers(projectName: string): Answers {
  return {
    projectName,
    appName: titleCase(projectName),
    appId: `com.vesk.${javaPackageName(projectName)}`,
    template: DEFAULT_TEMPLATE,
    primaryColor: DEFAULT_PRIMARY,
    theme: DEFAULT_THEME,
  };
}

// ---------------------------------------------------------------------------
// Interactive prompts (readline; at most: project name, then template)
// ---------------------------------------------------------------------------

async function promptText(rl: ReturnType<typeof createInterface>, message: string, initial: string): Promise<string> {
  const answer = await rl.question(`${message} ${dim(`(${initial})`)} `);
  return answer.trim().length > 0 ? answer.trim() : initial;
}

async function promptTemplate(rl: ReturnType<typeof createInterface>, choices: TemplateChoice[]): Promise<string> {
  console.log('  Template:');
  for (const [i, c] of choices.entries()) {
    const marker = c.name === DEFAULT_TEMPLATE ? dim(' (default)') : '';
    console.log(`    ${i + 1}) ${c.name}${c.description ? dim(` — ${c.description}`) : ''}${marker}`);
  }
  const answer = await rl.question(`  Select a template ${dim(`(${choices.findIndex((c) => c.name === DEFAULT_TEMPLATE) + 1})`)}: `);
  const n = Number.parseInt(answer.trim(), 10);
  if (!Number.isNaN(n) && n >= 1 && n <= choices.length) return choices[n - 1]!.name;
  return DEFAULT_TEMPLATE;
}

// ---------------------------------------------------------------------------
// Host / SDK resolution — never hardcodes a path; VESK_HOME → /opt
// vesk-native-toolchain → ~/.vesk-native → Termux $PREFIX, and local.properties
// is omitted entirely when ANDROID_HOME/ANDROID_SDK_ROOT already resolves.
// ---------------------------------------------------------------------------

function looksLikeSdk(dir: string): boolean {
  return (
    existsSync(dir) &&
    (existsSync(join(dir, 'cmdline-tools')) ||
      existsSync(join(dir, 'platform-tools')) ||
      existsSync(join(dir, 'platforms')) ||
      existsSync(join(dir, 'build-tools')))
  );
}

interface SdkResolution {
  sdkDir: string;
  omitLocalProperties: boolean;
}

function resolveSdk(): SdkResolution {
  const envSdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (envSdk) {
    if (looksLikeSdk(envSdk)) return { sdkDir: envSdk, omitLocalProperties: true };
    console.warn(yellow(`  [sdk] ${envSdk} is set but does not look like an Android SDK — ignoring it`));
  }
  const host = hostInfo();
  const root = toolchainRoot();
  const candidates = [join(root, 'sdk')];
  if (host.termux) candidates.push(join(TERMUX_PREFIX, 'sdk'), TERMUX_PREFIX);
  for (const c of candidates) {
    if (looksLikeSdk(c)) return { sdkDir: c, omitLocalProperties: false };
  }
  // Nothing installed yet: point local.properties at the location `vesk
  // setup` installs into, so the first build resolves once provisioning runs.
  return { sdkDir: join(root, 'sdk'), omitLocalProperties: false };
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

function generateVeskConfig(a: Answers): string {
  return `import { defineConfig } from '@vesk/native'

export default defineConfig({
  // ── Identity ──────────────────────────────────────────────────────────
  appId: '${a.appId}',
  appName: '${a.appName}',
  versionName: '1.0.0',
  versionCode: 1,

  // ── SDK targets ───────────────────────────────────────────────────────
  compileSdk: 37,
  minSdk: 24,
  targetSdk: 36,

  // ── Layout ────────────────────────────────────────────────────────────
  orientation: 'portrait',
  device: 'phone',               // 'phone' | 'tablet'

  // ── Root component (first component when omitted) ─────────────────────
  // root: 'MyComponent',

  // ── Theme ─────────────────────────────────────────────────────────────
  theme: '${a.theme}',           // 'system' | 'light' | 'dark'
  colors: {
    primary: '${a.primaryColor}',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
    text: '#1F2937',
  },
  darkColors: {
    primary: '${a.primaryColor}',
    background: '#0F172A',
    surface: '#1E293B',
    onPrimary: '#0F172A',
    text: '#E2E8F0',
  },

  // ── Typography (optional; platform defaults when omitted) ─────────────
  // typography: {
  //   fontFamily: 'sans-serif',  // Android font family
  //   fontSize: 16,              // base sp size
  // },

  // ── Back navigation ──────────────────────────────────────────────────
  back: {
    mode: 'stack',               // 'stack' (history pop) | 'system' (OS default)
    doubleBackToExit: true,
    exitDelayMs: 2000,
    exitRoutes: [],              // routes where double-back exits (default: root)
  },

  // ── Edge-to-edge / system bars ────────────────────────────────────────
  edgeToEdge: {
    enabled: true,
    paddingBars: true,
    statusBarStyle: 'auto',      // 'auto' | 'light' | 'dark'
    navigationBarStyle: 'auto',
  },

  // ── Media ─────────────────────────────────────────────────────────────
  media: {
    broadcast: true,             // system media session + lock screen controls
  },

  // ── Extra permissions (auto-derived from usage; add only what's missing)
  permissions: [],

  // ── Per-screen props ──────────────────────────────────────────────────
  // screens: {
  //   '/my-page': { props: { title: 'Hello' } },
  // },

  // ── Additional routes (file-based routes are automatic) ───────────────
  // routes: [
  //   { path: '/custom', component: 'CustomPage' },
  // ],

  // ── Splash screen ─────────────────────────────────────────────────────
  // splash: {
  //   enabled: false,
  //   backgroundColor: '#FFFFFF',
  //   logo: 'assets/splash-logo.png',
  //   animationDurationMs: 0,
  // },

  // ── App icon ──────────────────────────────────────────────────────────
  // icon: {
  //   foreground: 'assets/icon.png',   // 432x432 PNG recommended
  //   backgroundColor: '${a.primaryColor}',
  // },

  // ── Deep links ────────────────────────────────────────────────────────
  // deepLinks: {
  //   scheme: '${a.appId.split('.').slice(1).join('.')}',  // derived from appId when omitted
  //   host: '',
  //   pathPrefix: '',
  // },

  // ── Release signing (dev builds use debug keystore) ───────────────────
  // signing: {
  //   android: {
  //     storeFile: 'keystore.jks',
  //     storePassword: 'env:KEYSTORE_PASSWORD',
  //     keyAlias: 'upload',
  //     keyPassword: 'env:KEY_PASSWORD',
  //   },
  //   ios: {
  //     teamId: 'XXXXXXXXXX',
  //     style: 'automatic',
  //   },
  // },

  // ── Release packaging ─────────────────────────────────────────────────
  // bundle: {
  //   android: ['aab', 'apk'],
  //   ios: {
  //     method: 'app-store-connect',
  //     destination: 'export',
  //     uploadSymbols: true,
  //     scheme: 'VeskApp',
  //   },
  // },
})
`;
}

function generatePackageJson(a: Answers, veskRoot: string | null): string {
  const inMonorepo = veskRoot !== null;
  const deps = inMonorepo
    ? {
        '@vesk/native': `file:${join(veskRoot!, 'packages', 'native')}`,
        '@vesk/native-compiler': `file:${join(veskRoot!, 'packages', 'compiler-native')}`,
        '@vesk/native-cli': `file:${join(veskRoot!, 'packages', 'cli-native')}`,
      }
    : {
        '@vesk/native': '^0.1.9',
      };
  const devDeps = inMonorepo
    ? {}
    : {
        '@vesk/native-cli': '^0.1.9',
        '@vesk/native-compiler': '^0.1.9',
      };
  return (
    JSON.stringify(
      {
        name: slugify(a.projectName) || a.projectName,
        private: true,
        type: 'module',
        scripts: {
          build: 'vesk-native build',
          dev: 'vesk-native dev',
          'dev:web': 'vesk-native dev --web',
          'dev:desktop': 'vesk-native dev --desktop',
          clean: 'rm -rf app/build shared/build build .gradle',
        },
        dependencies: deps,
        devDependencies: devDeps,
      },
      null,
      2,
    ) + '\n'
  );
}

function copyRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

// Resolve the vesk-native monorepo root from the create-native package
// location (packages/create-native → two levels up) for file: dependency
// links and the asset fallback. In published mode this resolves to a
// workspace root that does not exist — callers fall back to their own assets.
function resolveVeskRoot(): string | null {
  const fromSrc = resolve(import.meta.dirname, '..', '..', '..');
  if (existsSync(join(fromSrc, 'packages', 'cli-native'))) return fromSrc;
  const sibling = resolve(import.meta.dirname, '..', '..', 'cli-native');
  if (existsSync(sibling)) return resolve(import.meta.dirname, '..', '..');
  return null;
}

// The gradle scaffolding ships in this package's assets (published tarball,
// synced by scripts/sync-assets.mjs); when running from source without a
// build, fall back to the monorepo cli-native assets.
function gradleTemplateDir(): string {
  const own = join(import.meta.dirname, '..', 'assets', 'template');
  if (existsSync(join(own, 'settings.gradle.kts'))) return own;
  const root = resolveVeskRoot();
  if (root) {
    const fromCli = join(root, 'packages', 'cli-native', 'assets', 'template');
    if (existsSync(join(fromCli, 'settings.gradle.kts'))) return fromCli;
  }
  return own;
}

function scaffoldGradleFiles(projectDir: string): void {
  const assetDir = gradleTemplateDir();
  for (const f of ['build.gradle.kts', 'gradle.properties', 'settings.gradle.kts']) {
    const src = join(assetDir, f);
    if (existsSync(src)) cpSync(src, join(projectDir, f));
  }
  // The template's aapt2 override line (if any) points at this machine's
  // toolchain, or is dropped when no override exists — same sync every build
  // performs, so no stale /opt path ever ships in the scaffold.
  syncAapt2Override(join(projectDir, 'gradle.properties'));
}

// ---------------------------------------------------------------------------
// AGENTS.md — app conventions + framework structure for AI agents
// ---------------------------------------------------------------------------

function generateAgentsMd(a: Answers, sdk: SdkResolution): string {
  const sdkLine =
    sdk.omitLocalProperties
      ? `- Android SDK: resolved from \`ANDROID_HOME\`/\`ANDROID_SDK_ROOT\` at build time (no \`local.properties\` is generated).`
      : `- Android SDK: \`local.properties\` points at the resolved vesk toolchain SDK (\`${sdk.sdkDir}\`). Never hardcode another SDK path in generated files; the create CLI and \`vesk setup\` resolve it dynamically.`;
  return `# AGENTS.md — ${a.appName}

${a.appName} is a vesk-native app: Markup + Tailwind + scripts in \`.vsk\`
components, compiled at build time to native Kotlin/Compose Android (and a
Kotlin Multiplatform module that also targets iOS).

## Build and install

- Commands run from THIS directory: the CLI lives in this project's
  node_modules and is cwd-based — never pass a project name to it.
- \`npm install\` — install dependencies once, after scaffolding.
- \`npx vesk-native install\` — materialize every library pinned in
  \`libraries.json\` (the template ships it; run once after scaffolding).
- \`npx vesk-native build\` — regenerate everything from source, then run
  gradle assembleDebug. This is the only way to build: edit \`.vsk\`, rebuild,
  verify \`BUILD SUCCESSFUL\`, commit.
- \`npx vesk-native dev\` — start the web preview server with per-file ms HMR
  (opens in browser; edit \`.vsk\` and see changes instantly).
- \`npx vesk-native dev --web\` — same as \`dev\` (explicit web flag).
- \`npx vesk-native dev --desktop\` — desktop preview via Compose Hot Reload
  (JVM target; requires JBR 21, auto-provisioned via foojay on first run).
- \`npx vesk-native bundle android\` — release packaging (AAB + signed APK);
  \`npx vesk-native setup\` — provision the toolchain (JDK 17+, Android SDK,
  Gradle) for this machine.
- After a compiler or toolchain change, rebuild this project so its generated
  output is fresh.

## Configuration — veskconfig.ts is the ONLY surface

- All app configuration lives in \`veskconfig.ts\` (appId, appName, theme,
  colors, ...). There is no other config file and no per-app build config.
- Users never write or edit build files: no XML, no Kotlin/Java, no
  \`build.gradle.kts\`, no \`gradle.properties\`, no manifest. Every generated
  file is owned by the vesk-native toolchain and regenerated on every build —
  never edit them.

## Source of truth — .vsk files

- App code and markup live in \`.vsk\` component files under \`app/\`. Each
  file declares one or more \`component Name(...)\` blocks with an optional
  component-scoped \`<style>\` block and markup.
- All styling happens in markup: \`<style>\` blocks are component-scoped; a
  \`<link rel="stylesheet" href="...">\` in a head is global.
- Permissions, gradle dependencies, and runtime helpers are derived from
  actual usage (device-API calls + element tags in \`.vsk\` files). Never add
  a permission or dependency "just in case".

## State — vesk cells, not React state

- \`const &[name] = track(init)\` declares a virtual tracked name; reads of
  \`name\` auto-\`get()\`. \`const &[name, cell] = track(init)\` additionally
  binds the raw cell object.
- Write with plain assignment: \`name = v\`, \`name += 1\`, \`name++\`.
- There is no \`[value, setter]\` tuple and no \`setName\` function — never use
  React-style state APIs.

## Framework structure

The generated project is a Gradle build with two modules:

- \`:app\` — thin Android chrome: MainActivity, AndroidManifest.xml, and
  resources (launcher icons, themes). Everything else is generated from
  \`.vsk\` files.
- \`:shared\` — Kotlin Multiplatform module:
  - \`commonMain/kotlin/app/\` — one \`.kt\` per \`.vsk\` component (page .kt
    files), \`RuntimeCore.kt\` (JS-semantics runtime), \`navigation/Router.kt\`
    (file-route navigation).
  - \`androidMain/kotlin/app/\` — \`App.kt\` (Compose entry), \`Runtime.kt\`
    (browser/device API mappings, pruned by usage), \`Theme.kt\`.
  - \`iosMain/kotlin/app/\` — \`MainViewController.kt\`, \`Runtime.ios.kt\`.

Where each part comes from:

- \`build.gradle.kts\`, \`gradle.properties\`, \`settings.gradle.kts\` — the
  vesk-native template (\`runtime/vesk-native-template/\`), refreshed on every
  build; the aapt2 override line is synced to this machine's toolchain.
${sdkLine}
- Manifest, resources, \`MainActivity.kt\` — the CLI's generators
  (\`packages/cli-native/src/generators.ts\`), derived from \`veskconfig.ts\`
  and \`.vsk\` usage.
- \`shared/.../Router.kt*\` — \`packages/navigation-native\` (file-route
  navigation).
- \`shared/.../Runtime*.kt\` — \`packages/cli-native/src/runtime-templates.ts\`,
  pruned to what the app uses.
- Page \`.kt\` files — the Kotlin code generator
  (\`packages/compiler-native/src/kotlin-codegen.ts\`), one per component.

Regeneration workflow: edit \`.vsk\` → \`npx vesk-native build\` → verify
\`BUILD SUCCESSFUL\` → commit.

Generated by create-vesk-native on scaffolding; edits belong in \`.vsk\` files
and \`veskconfig.ts\` only.
`;
}

// ---------------------------------------------------------------------------
// Toolchain check + provisioning
// ---------------------------------------------------------------------------

function toolchainReport(det: ToolchainDetection, sdk: SdkResolution): void {
  console.log(`  ${bold('Toolchain:')}`);
  if (det.javaMajor !== null) {
    console.log(`    ${green('✓')} JDK ${det.javaMajor} (${det.java})`);
  } else {
    console.log(`    ${red('✗')} JDK 17+ not found (JAVA_HOME/bin/java or java on PATH)`);
  }
  if (sdk.omitLocalProperties) {
    console.log(`    ${green('✓')} Android SDK via ${process.env.ANDROID_HOME ? 'ANDROID_HOME' : 'ANDROID_SDK_ROOT'} (${sdk.sdkDir})`);
  } else if (det.sdkmanager !== null) {
    console.log(`    ${green('✓')} Android SDK (${sdk.sdkDir})`);
  } else {
    console.log(`    ${red('✗')} Android SDK not installed (expected at ${sdk.sdkDir})`);
  }
  if (det.gradle !== null) {
    console.log(`    ${green('✓')} Gradle ${GRADLE_VERSION} (${det.gradle})`);
  } else {
    console.log(`    ${red('✗')} Gradle ${GRADLE_VERSION} not installed`);
  }
}

function installSteps(): string[] {
  const host = hostInfo();
  const lines: string[] = ['  Missing pieces can be installed as follows:'];
  if (host.termux) {
    lines.push(`    JDK 17+:    pkg install openjdk-17`);
  } else if (host.os === 'linux') {
    lines.push(`    JDK 17+:    apt install openjdk-17-jdk   (debian/ubuntu)`);
    lines.push(`                pacman -S jdk17-openjdk      (arch)`);
  } else if (host.os === 'darwin') {
    lines.push(`    JDK 17+:    brew install --cask temurin@17`);
  } else {
    lines.push(`    JDK 17+:    winget install Microsoft.OpenJDK.17`);
  }
  lines.push(`    SDK+Gradle: npx vesk-native setup    (run inside the project after npm install)`);
  return lines;
}

async function confirmToolchainInstall(det: ToolchainDetection): Promise<boolean> {
  if (det.sdkmanager !== null && det.gradle !== null) return false;
  if (!stdin.isTTY || !stdout.isTTY) return false;
  const rl = createInterface({ input: stdin, output: stdout });
  rl.on('SIGINT', () => {
    console.error(red('Operation cancelled.'));
    process.exit(130);
  });
  try {
    const answer = await rl.question('  Install the missing toolchain (Android SDK + Gradle) now? (y/N) ');
    return answer.trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Scaffolding
// ---------------------------------------------------------------------------

async function scaffold(answers: Answers): Promise<void> {
  const target = resolve(process.cwd(), answers.projectName);
  if (existsSync(target)) {
    console.error(red(`Directory "${answers.projectName}" already exists.`));
    process.exit(1);
  }

  console.log(cyan(`\nScaffolding vesk-native app "${answers.appName}" (template: ${answers.template})...`));
  const veskRoot = resolveVeskRoot();
  const sdk = resolveSdk();

  mkdirSync(target, { recursive: true });
  log('scaffold', 'gradle scaffolding copied');
  scaffoldGradleFiles(target);

  if (!sdk.omitLocalProperties) {
    writeFileSync(join(target, 'local.properties'), `sdk.dir=${sdk.sdkDir}\n`);
    log('scaffold', `local.properties → sdk.dir=${sdk.sdkDir}`);
  } else {
    log('scaffold', 'local.properties omitted (ANDROID_HOME/ANDROID_SDK_ROOT resolves the SDK)');
  }

  writeFileSync(join(target, 'veskconfig.ts'), generateVeskConfig(answers));
  log('scaffold', 'veskconfig.ts written');

  const srcTemplate = join(TEMPLATES_DIR, answers.template);
  if (!existsSync(srcTemplate)) {
    console.error(red(`Template "${answers.template}" not found`));
    process.exit(1);
  }
  if (existsSync(join(srcTemplate, 'app'))) {
    copyRecursive(join(srcTemplate, 'app'), join(target, 'app'));
    log('scaffold', `.vsk template files copied (${answers.template})`);
  }

  // The template's pinned libraries travel with it: libraries.json is the
  // single committed source of truth, and `vesk-native install` (next step)
  // materializes the .vsklib surface from it — offline and idempotent.
  const tplLibraries = join(srcTemplate, 'libraries.json');
  let scaffoldedLibraryCount = 0;
  if (existsSync(tplLibraries)) {
    cpSync(tplLibraries, join(target, 'libraries.json'));
    try {
      scaffoldedLibraryCount = Object.keys(JSON.parse(readFileSync(tplLibraries, 'utf8')).libraries ?? {}).length;
    } catch {
      scaffoldedLibraryCount = 0;
    }
    log('scaffold', `libraries.json copied (${scaffoldedLibraryCount} template-pinned ${scaffoldedLibraryCount === 1 ? 'library' : 'libraries'})`);
  }

  writeFileSync(join(target, 'package.json'), generatePackageJson(answers, veskRoot));
  log('scaffold', `package.json written (${veskRoot ? 'monorepo file: links' : 'published ^0.1.0 versions'})`);

  writeFileSync(join(target, 'AGENTS.md'), generateAgentsMd(answers, sdk));
  log('scaffold', 'AGENTS.md written');

  const det = detectToolchain(toolchainRoot(), hostInfo());
  toolchainReport(det, sdk);

  if (det.sdkmanager === null || det.gradle === null) {
    if (await confirmToolchainInstall(det)) {
      setupToolchain(toolchainRoot());
    } else {
      for (const line of installSteps()) console.log(yellow(line));
    }
  } else if (det.javaMajor === null || det.javaMajor < 17) {
    for (const line of installSteps()) console.log(yellow(line));
  }

  console.log(`\n${green(`Done! Created "${answers.appName}" in ./${answers.projectName}`)}\n`);
  console.log('Next steps:');
  console.log(`  cd ${answers.projectName}`);
  console.log('  npm install');
  if (scaffoldedLibraryCount > 0) {
    console.log(`  npx vesk-native install${scaffoldedLibraryCount >= 5 ? dim(`   # installs all ${scaffoldedLibraryCount} template libraries`) : ''}`);
  }
  console.log('  npx vesk-native build');
  console.log(`  ${dim('(AGENTS.md in the project root explains the conventions + framework structure)')}\n`);
}

async function main(): Promise<void> {
  const { args, error } = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (args.version) {
    console.log(`create-vesk-native ${VERSION}`);
    process.exit(0);
  }
  if (error !== null) fail(error);

  const interactive = stdin.isTTY && !args.yes;
  let answers: Answers;

  if (interactive) {
    const rl = createInterface({ input: stdin, output: stdout });
    rl.on('SIGINT', () => {
      console.error(red('Operation cancelled.'));
      process.exit(130);
    });
    try {
      const name = args.projectName ?? (await promptText(rl, 'Project name:', DEFAULT_PROJECT_NAME));
      if (!validProjectName(name)) fail(`invalid project name: ${name}`);
      if (existsSync(resolve(process.cwd(), name))) {
        console.error(red(`Directory "${name}" already exists.`));
        process.exit(1);
      }
      const template = args.template ?? (await promptTemplate(rl, loadTemplateChoices()));
      answers = { ...defaultAnswers(name), template };
    } catch (err) {
      if ((err as { code?: string } | null)?.code === 'ABORT_ERR') {
        console.error(red('Operation cancelled.'));
        process.exit(1);
      }
      throw err;
    } finally {
      rl.close();
    }
  } else {
    const name = args.projectName ?? DEFAULT_PROJECT_NAME;
    if (!validProjectName(name)) fail(`invalid project name: ${name}`);
    answers = { ...defaultAnswers(name), template: args.template ?? DEFAULT_TEMPLATE };
  }

  if (args.template !== undefined) answers.template = args.template;
  if (args.appName !== undefined) answers.appName = args.appName;
  if (args.appId !== undefined) {
    if (!validAppId(args.appId)) fail(`invalid app id: ${args.appId} (expected dot-separated Java identifiers, e.g. com.example.app)`);
    answers.appId = args.appId;
  }
  if (args.primary !== undefined) {
    const hex = parseHexColor(args.primary);
    if (hex === null) fail(`invalid color: ${args.primary} (expected #RGB or #RRGGBB)`);
    answers.primaryColor = hex;
  }
  if (args.theme !== undefined) {
    if (!['system', 'light', 'dark'].includes(args.theme)) fail(`invalid theme: ${args.theme} (expected system | light | dark)`);
    answers.theme = args.theme;
  }

  const choices = loadTemplateChoices();
  if (!choices.some((c) => c.name === answers.template)) {
    fail(`invalid template: ${answers.template} (expected ${choices.map((c) => c.name).join(' | ')})`);
  }

  await scaffold(answers);
}

main().catch((err) => {
  if ((err as { code?: string } | null)?.code === 'ABORT_ERR') {
    console.error(red('Operation cancelled.'));
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
