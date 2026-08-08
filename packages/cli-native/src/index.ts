import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compileVskResult } from '@compiler-native/index.ts';
import { parse } from '@vesk/compiler';
import { findComponentDecls } from '@compiler-native/props.ts';
import type { ComponentDecl } from '@compiler-native/props.ts';
import type { JsNode } from '@compiler-native/js2kt.ts';
import type { RouteConfig } from '@navigation-native/index.ts';

const MONOREPO = resolve(import.meta.dirname ?? process.cwd(), '..', '..', '..');
const TEMPLATE_DIR = join(MONOREPO, 'runtime', 'vesk-native-template');
const SAMPLE_VSK = join(MONOREPO, 'test-app', 'app');
const CONFIG_FILE = 'veskconfig.json';
const DEFAULT_SDK = '/opt/vesk-native-toolchain/sdk';
const DEFAULT_GRADLE = '/opt/vesk-native-toolchain/gradle-8.13/bin/gradle';
const TERMUX_BIN = '/data/data/com.termux/files/usr/bin';
const TERMUX_HOME = '/data/data/com.termux/files/home';

interface VeskColors {
  primary: string;
  background: string;
  surface: string;
  onPrimary: string;
  text: string;
}

interface VeskConfig {
  appId: string;
  appName: string;
  versionName: string;
  versionCode: number;
  compileSdk: number;
  minSdk: number;
  targetSdk: number;
  orientation: string;
  root: string;
  page?: string;
  routes?: RouteConfig[];
  colors: VeskColors;
}

const DEFAULT_CONFIG: VeskConfig = {
  appId: 'com.vesk.demo',
  appName: 'Vesk Demo',
  versionName: '0.1.0',
  versionCode: 1,
  compileSdk: 34,
  minSdk: 24,
  targetSdk: 34,
  orientation: 'portrait',
  root: '',
  page: '',
  colors: {
    primary: '#3B82F6',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
    text: '#1F2937',
  },
  routes: [],
};

function collectVskFiles(dir: string): string[] {
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

function usage(): void {
  console.log(`vesk-native — compile .vsk to Kotlin + Compose, build & install natively

Usage:
  vesk-native init <dir>       Scaffold a native app in <dir> (from veskconfig.json + .vsk sources)
  vesk-native build [dir]      Regenerate everything from source + gradle assembleDebug (default: .)
  vesk-native run [dir]        Build, stage APK, open the on-device installer, launch (default: .)
  vesk-native dev [dir]        (not yet implemented — Phase 7)
`);
}

function log(step: string, msg: string): void {
  console.log(`  [${step}] ${msg}`);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function colorLiteral(hex: string): string {
  const clean = hex.replace(/^#/, '');
  const value = Number.parseInt(clean, 16);
  const argb = ((0xff000000 | value) >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `Color(0x${argb})`;
}

function loadConfig(target: string): VeskConfig {
  const path = join(target, CONFIG_FILE);
  if (!existsSync(path)) {
    console.error(`  [config] ${CONFIG_FILE} not found in ${target}`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<VeskConfig>;
  return { ...DEFAULT_CONFIG, ...raw, colors: { ...DEFAULT_CONFIG.colors, ...raw.colors } };
}

function generateSettingsGradleKts(target: string, config: VeskConfig): void {
  const name = slugify(config.appName);
  writeFileSync(
    join(target, 'settings.gradle.kts'),
    `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${name}"
include(":app")
`,
  );
  log('gen', 'settings.gradle.kts (rootProject.name from appName)');
}

function generateAppBuildGradleKts(target: string, config: VeskConfig): void {
  writeFileSync(
    join(target, 'app', 'build.gradle.kts'),
    `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${config.appId}"
    compileSdk = ${config.compileSdk}

    defaultConfig {
        applicationId = "${config.appId}"
        minSdk = ${config.minSdk}
        targetSdk = ${config.targetSdk}
        versionCode = ${config.versionCode}
        versionName = "${config.versionName}"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
}
`,
  );
  log('gen', 'app/build.gradle.kts (appId, sdk levels, version from config)');
}

function generateManifest(target: string, config: VeskConfig): void {
  const orientationAttr = config.orientation === 'unspecified' ? '' : `\n            android:screenOrientation="${config.orientation}"`;
  writeFileSync(
    join(target, 'app', 'src', 'main', 'AndroidManifest.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.appId}">

    <application
        android:label="${config.appName}"
        android:theme="@style/Theme.VeskApp"
        android:allowBackup="false">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|keyboard"${orientationAttr}>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`,
  );
  log('gen', 'AndroidManifest.xml (appName, orientation from config)');
}

function generateThemes(target: string, config: VeskConfig): void {
  const c = config.colors;
  writeFileSync(
    join(target, 'app', 'src', 'main', 'res', 'values', 'themes.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.VeskApp" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:colorPrimary">${c.primary}</item>
        <item name="android:colorPrimaryDark">${c.primary}</item>
        <item name="android:colorAccent">${c.primary}</item>
        <item name="android:colorBackground">${c.background}</item>
        <item name="android:statusBarColor">${c.primary}</item>
        <item name="android:windowBackground">${c.background}</item>
    </style>
</resources>
`,
  );
  log('gen', 'themes.xml (colors from config)');
}

function generateMainActivity(target: string, config: VeskConfig): void {
  const pkgPath = config.appId.split('.').join('/');
  const outDir = join(target, 'app', 'src', 'main', 'kotlin', pkgPath);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'MainActivity.kt'),
    `package ${config.appId}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import app.App
import app.VeskTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VeskTheme {
                Surface(modifier = Modifier) {
                    App()
                }
            }
        }
    }
}
`,
  );
  log('gen', `MainActivity.kt (package ${config.appId})`);
}

function generateThemeKt(target: string, config: VeskConfig): void {
  const c = config.colors;
  const args = [
    `primary = ${colorLiteral(c.primary)}`,
    `background = ${colorLiteral(c.background)}`,
    `surface = ${colorLiteral(c.surface)}`,
    `onPrimary = ${colorLiteral(c.onPrimary)}`,
    `onBackground = ${colorLiteral(c.text)}`,
  ].join(',\n        ');
  writeFileSync(
    join(target, 'app', 'src', 'main', 'kotlin', 'app', 'Theme.kt'),
    `package app

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val VeskColors = lightColorScheme(
        ${args},
    )

@Composable
fun VeskTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = VeskColors, content = content)
}
`,
  );
  log('gen', 'Theme.kt (colorScheme from config)');
}

function generateRuntimeKt(appDir: string): void {
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'Runtime.kt'),
    `package app

import androidx.compose.runtime.Composable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Modifier
import app.navigation.*

// Native counterparts of @vesk/runtime exports referenced by copied .vsk files.

fun truthy(v: Any?): Boolean = when (v) {
    null -> false
    is Boolean -> v
    is String -> v.isNotEmpty()
    is Number -> v != 0
    else -> true
}

fun num(v: Any?): Double = when (v) {
    is Number -> v.toDouble()
    is String -> v.toDoubleOrNull() ?: 0.0
    is Boolean -> if (v) 1.0 else 0.0
    else -> 0.0
}

data class LinkProps(
    val href: String = "",
    val \`class\`: String = "",
)

@Composable
fun Link(props: LinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = Modifier.clickable(onClick = { nav.navigate(props.href) })) {
        content()
    }
}

data class NavLinkProps(
    val href: String = "",
    val \`class\`: String = "",
)

@Composable
fun NavLink(props: NavLinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = Modifier.clickable(onClick = { nav.navigate(props.href) })) {
        content()
    }
}

@Composable
fun Outlet(content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    val route = nav.currentRoute.value
    if (route.isNotEmpty()) {
        content()
    }
}
`,
  );
  log('gen', 'Runtime.kt (Link/NavLink/Outlet native stubs)');
}

function generateRouterKt(appDir: string): void {
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  mkdirSync(outDir, { recursive: true });
  const src = join(process.cwd(), 'packages', 'navigation-native', 'src', 'Router.kt');
  if (existsSync(src)) {
    const navDir = join(outDir, 'navigation');
    mkdirSync(navDir, { recursive: true });
    writeFileSync(join(navDir, 'Router.kt'), readFileSync(src, 'utf8'));
    log('gen', 'navigation/Router.kt (from @navigation-native)');
  } else {
    log('warn', `navigation module not found at ${src}; skipping Router.kt`);
  }
}

function compileVskFiles(appDir: string): void {
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  mkdirSync(outDir, { recursive: true });

  const KEEP = new Set(['App.kt', 'Runtime.kt', 'Router.kt', 'Theme.kt', 'MainActivity.kt']);
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.kt') && !KEEP.has(f)) unlinkSync(join(outDir, f));
  }

  const vskFiles = collectVskFiles(appDir);
  if (vskFiles.length === 0) {
    console.error('  [compile] no .vsk files found under app/ — nothing to compile');
    process.exit(1);
  }

  const componentsWithoutProps = new Set<string>();
  for (const file of vskFiles) {
    const ast = parse(readFileSync(file, 'utf8')) as unknown as JsNode;
    for (const d of findComponentDecls(ast)) {
      const p = d.params[0];
      if (!p || (p.type === 'Identifier' && p.name === 'content')) componentsWithoutProps.add(d.name);
    }
  }

  const seen = new Map<string, number>();
  for (const file of vskFiles) {
    const source = readFileSync(file, 'utf8');
    const result = compileVskResult(source, file, { componentsWithoutProps });
    if (result.errors.length > 0) {
      console.error(`  [compile] errors in ${relative(appDir, file)}:`);
      for (const e of result.errors) console.error(`    ! ${e}`);
      process.exit(1);
    }
    for (const n of result.notes) console.error(`  [compile] warning: ${n} (in ${relative(appDir, file)})`);
    const kt = result.kt;
    const decls = findComponentDecls(parse(source) as unknown as JsNode);
    const name = decls[0]?.name ?? 'Component';
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    const outName = count === 0 ? name : `${name}_${count}`;
    writeFileSync(join(outDir, `${outName}.kt`), kt);
    log('compile', `${relative(appDir, file)} -> app/${outName}.kt`);
  }
}

function generateAppKt(appDir: string, config: VeskConfig): void {
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  const files = collectVskFiles(appDir);
  let root: ComponentDecl | null = null;

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const decls = findComponentDecls(parse(source) as unknown as JsNode);
    if (config.root) {
      const found = decls.find((d) => d.name === config.root);
      if (found) {
        root = found;
        break;
      }
    } else if (!root && decls.length > 0) {
      root = decls[0]!;
    }
  }
  if (!root) {
    console.error(`  [gen] root component ${config.root || '(first)'} not found`);
    process.exit(1);
  }

  const pages = files
    .map((f) => relative(appDir, f))
    .filter((r) => !r.includes('layout.vsk'))
    .map((r) => {
      const source = readFileSync(join(appDir, r), 'utf8');
      const decls = findComponentDecls(parse(source) as unknown as JsNode);
      const compName = (decls[0]?.name ?? r.replace(/\.vsk$/, '').replace(/\/page$/, '')) || 'Page';
      const relPath = r === 'page.vsk' ? '' : (r.replace(/\.vsk$/, '').replace(/\/page$/, '')) || 'page';
      const path = '/' + relPath;
      return { path, component: compName };
    });

  const routes = (config.routes && config.routes.length > 0)
    ? config.routes
    : pages;

  const routeLines = routes
    .map((p) => {
      const routePath = (p.path || '').replace(/\[([^\]]+)\]/g, '{$1}');
      return `Route("${routePath}") { ${p.component}() }`;
    })
    .join(',\n        ');

  writeFileSync(
    join(outDir, 'App.kt'),
    `package app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider
import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()
    LaunchedEffect(Unit) { nav.navigate("/") }
    CompositionLocalProvider(LocalNavController provides nav) {
        Layout {
            AppRouter(start = "/", routes = listOf(
                ${routeLines}
            ))
        }
    }
}
`,
  );
  log('gen', `App.kt -> renders ${pages.length} routed pages`);
}

function generateProject(target: string, config: VeskConfig): void {
  const appDir = join(target, 'app');
  mkdirSync(join(appDir, 'src', 'main', 'kotlin', 'app'), { recursive: true });
  mkdirSync(join(appDir, 'src', 'main', 'res', 'values'), { recursive: true });
  mkdirSync(join(target), { recursive: true });

  for (const f of ['build.gradle.kts', 'gradle.properties', 'settings.gradle.kts']) {
    const src = join(TEMPLATE_DIR, f);
    const dest = join(target, f);
    if (!existsSync(src)) continue;
    if (!existsSync(dest)) cpSync(src, dest);
  }
  if (!existsSync(join(target, 'local.properties'))) {
    writeFileSync(join(target, 'local.properties'), `sdk.dir=${DEFAULT_SDK}\n`);
  }

  generateSettingsGradleKts(target, config);
  generateAppBuildGradleKts(target, config);
  generateManifest(target, config);
  generateThemes(target, config);
  generateMainActivity(target, config);
  generateThemeKt(target, config);
  generateRuntimeKt(appDir);
  generateRouterKt(appDir);
  compileVskFiles(appDir);
  generateAppKt(appDir, config);
}

function writeDefaultConfig(target: string): void {
  const path = join(target, CONFIG_FILE);
  if (existsSync(path)) {
    log('init', `${CONFIG_FILE} already exists — keeping it`);
    return;
  }
  writeFileSync(path, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  log('init', `${CONFIG_FILE} written (edit appId, appName, colors ...)`);
}

function initApp(dir: string): void {
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
  const config = loadConfig(target);

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

function findGradle(): string {
  if (process.env.GRADLE_HOME) return join(process.env.GRADLE_HOME, 'bin', 'gradle');
  const found = spawnSync('which', ['gradle'], { encoding: 'utf8' });
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  if (existsSync(DEFAULT_GRADLE)) return DEFAULT_GRADLE;
  return 'gradle';
}

function buildApp(dir: string): void {
  const target = resolve(dir);
  const config = loadConfig(target);
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

function runApp(dir: string): void {
  const target = resolve(dir);
  const config = loadConfig(target);
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

function main(): void {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case 'init':
      if (!arg) {
        usage();
        process.exit(1);
      }
      initApp(arg);
      break;
    case 'build':
      buildApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'run':
      runApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'install':
      runApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'dev':
      console.log('  [dev] not implemented yet (Phase 7)');
      break;
    default:
      usage();
  }
}

main();
