import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VeskConfig } from '@vesk/native';
import { CONFIG_JSON, CONFIG_TS, log } from '@cli-native/constants';

const DEFAULT_CONFIG: VeskConfig = {
  appId: 'com.vesk.demo',
  appName: 'Vesk Demo',
  versionName: '0.1.0',
  versionCode: 1,
  compileSdk: 37,
  minSdk: 24,
  targetSdk: 36,
  orientation: 'portrait',
  root: '',
  page: '',
  media: {
    broadcast: true,
  },
  colors: {
    primary: '#3B82F6',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
    text: '#1F2937',
  },
  darkColors: {
    primary: '#60A5FA',
    background: '#0F172A',
    surface: '#1E293B',
    onPrimary: '#0F172A',
    text: '#E2E8F0',
  },
  theme: 'system',
  routes: [],
  permissions: [],
  device: 'phone',
  edgeToEdge: {
    enabled: true,
    paddingBars: true,
    statusBarStyle: 'auto',
    navigationBarStyle: 'auto',
  },
  back: {
    mode: 'stack',
    doubleBackToExit: true,
    exitDelayMs: 2000,
  },
  // Deep links are disabled by default: no intent-filter is emitted and
  // launch intents are not handled until veskconfig.ts sets `deepLinks`.
  deepLinks: undefined,
};
export async function loadConfig(target: string): Promise<VeskConfig> {
  const tsPath = join(target, CONFIG_TS);
  const jsonPath = join(target, CONFIG_JSON);
  let raw: Partial<VeskConfig>;
  if (existsSync(tsPath)) {
    const mod = await import(pathToFileURL(tsPath).href);
    const exported = (mod && (mod.default ?? mod)) as Partial<VeskConfig> | undefined;
    raw = exported && typeof exported === 'object' ? exported : {};
    log('config', `${CONFIG_TS} (module: vesk-native defineConfig)`);
  } else if (existsSync(jsonPath)) {
    raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as Partial<VeskConfig>;
    log('config', `${CONFIG_JSON} (legacy — migrate to ${CONFIG_TS})`);
  } else {
    console.error(`  [config] ${CONFIG_TS} or ${CONFIG_JSON} not found in ${target}`);
    process.exit(1);
  }
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    colors: { ...DEFAULT_CONFIG.colors, ...raw.colors },
    darkColors: { ...DEFAULT_CONFIG.darkColors, ...raw.darkColors },
    edgeToEdge: { ...DEFAULT_CONFIG.edgeToEdge, ...raw.edgeToEdge },
  };
}
export function writeDefaultConfig(target: string): void {
  const tsPath = join(target, CONFIG_TS);
  const jsonPath = join(target, CONFIG_JSON);
  if (existsSync(tsPath) || existsSync(jsonPath)) {
    log('init', `${CONFIG_TS} or ${CONFIG_JSON} already exists — keeping it`);
    return;
  }
  const c = DEFAULT_CONFIG;
  writeFileSync(
    tsPath,
    `import { defineConfig } from '@vesk/native'

export default defineConfig({
  // ── Identity ──────────────────────────────────────────────────────────
  appId: '${c.appId}',
  appName: '${c.appName}',
  versionName: '${c.versionName}',
  versionCode: ${c.versionCode},

  // ── SDK targets ───────────────────────────────────────────────────────
  compileSdk: ${c.compileSdk},
  minSdk: ${c.minSdk},
  targetSdk: ${c.targetSdk},

  // ── Layout ────────────────────────────────────────────────────────────
  orientation: '${c.orientation}',
  device: '${c.device}',          // 'phone' | 'tablet'

  // ── Root component (first component when omitted) ─────────────────────
  // root: '',

  // ── Theme ─────────────────────────────────────────────────────────────
  theme: '${c.theme}',            // 'system' | 'light' | 'dark'
  colors: {
    primary: '${c.colors.primary}',
    background: '${c.colors.background}',
    surface: '${c.colors.surface}',
    onPrimary: '${c.colors.onPrimary}',
    text: '${c.colors.text}',
  },
  darkColors: {
    primary: '${c.darkColors.primary}',
    background: '${c.darkColors.background}',
    surface: '${c.darkColors.surface}',
    onPrimary: '${c.darkColors.onPrimary}',
    text: '${c.darkColors.text}',
  },

  // ── Typography (optional; platform defaults when omitted) ─────────────
  // typography: {
  //   fontFamily: 'sans-serif',
  //   fontSize: 16,
  // },

  // ── Back navigation ──────────────────────────────────────────────────
  back: {
    mode: 'stack',
    doubleBackToExit: true,
    exitDelayMs: 2000,
    exitRoutes: [],
  },

  // ── Edge-to-edge / system bars ────────────────────────────────────────
  edgeToEdge: {
    enabled: true,
    paddingBars: true,
    statusBarStyle: 'auto',
    navigationBarStyle: 'auto',
  },

  // ── Media ─────────────────────────────────────────────────────────────
  media: {
    broadcast: true,
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
  //   foreground: 'assets/icon.png',
  //   backgroundColor: '${c.colors.primary}',
  // },

  // ── Deep links ────────────────────────────────────────────────────────
  // deepLinks: {
  //   scheme: '',
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
`,
  );
  log('init', `${CONFIG_TS} written (defineConfig from vesk-native)`);
}
