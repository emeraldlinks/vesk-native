import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compileVskResult, collectCustomCss } from '@compiler-native/index.ts';
import { parse } from '@vesk/compiler';
import { findComponentDecls } from '@compiler-native/props.ts';
import type { ComponentDecl } from '@compiler-native/props.ts';
import type { JsNode } from '@compiler-native/js2kt.ts';
import type { VeskConfig } from 'vesk-native';
import { pathToFileURL } from 'node:url';

const MONOREPO = resolve(import.meta.dirname ?? process.cwd(), '..', '..', '..');
const TEMPLATE_DIR = join(MONOREPO, 'runtime', 'vesk-native-template');
const SAMPLE_VSK = join(MONOREPO, 'test-app', 'app');
const CONFIG_TS = 'veskconfig.ts';
const CONFIG_JSON = 'veskconfig.json';
const DEFAULT_SDK = '/opt/vesk-native-toolchain/sdk';
const DEFAULT_GRADLE = '/opt/vesk-native-toolchain/gradle-8.13/bin/gradle';
const TERMUX_BIN = '/data/data/com.termux/files/usr/bin';
const TERMUX_HOME = '/data/data/com.termux/files/home';

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
  darkColors: {
    primary: '#60A5FA',
    background: '#0F172A',
    surface: '#1E293B',
    onPrimary: '#0F172A',
    text: '#E2E8F0',
  },
  theme: 'system',
  routes: [],
  back: {
    mode: 'stack',
    doubleBackToExit: true,
    exitDelayMs: 2000,
  },
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

async function loadConfig(target: string): Promise<VeskConfig> {
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
  };
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
  const orientationAttr = config.orientation ? `\n            android:screenOrientation="${config.orientation}"` : '';
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
        <item name="android:statusBarColor">${c.background}</item>
        <item name="android:windowBackground">${c.background}</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowLightNavigationBar">true</item>
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

function fontFamilyKt(name?: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('mono')) return 'FontFamily.Monospace';
  if (n.includes('serif')) return 'FontFamily.Serif';
  if (n.includes('cursive')) return 'FontFamily.Cursive';
  return 'FontFamily.SansSerif';
}

function generateThemeKt(target: string, config: VeskConfig): void {
  const c = config.colors;
  const d = config.darkColors;
  const lightArgs = [
    `primary = ${colorLiteral(c.primary)}`,
    `background = ${colorLiteral(c.background)}`,
    `surface = ${colorLiteral(c.surface)}`,
    `onPrimary = ${colorLiteral(c.onPrimary)}`,
    `onBackground = ${colorLiteral(c.text)}`,
  ].join(',\n        ');
  const darkArgs = [
    `primary = ${colorLiteral(d.primary)}`,
    `background = ${colorLiteral(d.background)}`,
    `surface = ${colorLiteral(d.surface)}`,
    `onPrimary = ${colorLiteral(d.onPrimary)}`,
    `onBackground = ${colorLiteral(d.text)}`,
  ].join(',\n        ');

  let typoBlock = '';
  if (config.typography?.fontSize || config.typography?.fontFamily) {
    const fam = fontFamilyKt(config.typography.fontFamily);
    const size = config.typography.fontSize ?? 16;
    typoBlock = `private val VeskTypography = Typography(
        bodyLarge = TextStyle(
            fontFamily = ${fam},
            fontSize = ${size}.sp,
        ),
    )\n`;
  }

  const themeExpr =
    config.theme === 'dark' ? 'true'
      : config.theme === 'light' ? 'false'
        : 'isSystemInDarkTheme()';

  const themeArgs: string[] = [`colorScheme = if (dark) VeskDarkColors else VeskLightColors`];
  if (config.typography?.fontSize || config.typography?.fontFamily) themeArgs.push('typography = VeskTypography');
  themeArgs.push('content = content');

  writeFileSync(
    join(target, 'app', 'src', 'main', 'kotlin', 'app', 'Theme.kt'),
    `package app

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import app.navigation.findActivity

private val VeskLightColors = lightColorScheme(
        ${lightArgs},
    )

private val VeskDarkColors = darkColorScheme(
        ${darkArgs},
    )

${typoBlock}@Composable
fun VeskTheme(content: @Composable () -> Unit) {
    val dark = ${themeExpr}
    val colors = if (dark) VeskDarkColors else VeskLightColors
    // Keep system bars in sync with the app theme (status bar color + icon
    // luminance, navigation bar color + icon luminance).
    val activity = LocalContext.current.findActivity()
    if (activity != null) {
        SideEffect {
            val window = activity.window
            window.statusBarColor = colors.background.toArgb()
            window.navigationBarColor = colors.background.toArgb()
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            controller.isAppearanceLightStatusBars = !dark
            controller.isAppearanceLightNavigationBars = !dark
        }
    }
    MaterialTheme(
        ${themeArgs.join(',\n        ')},
    )
}
`,
  );
  log('gen', 'Theme.kt (light/dark colorScheme, theme mode, typography from config)');
}

// Runtime.kt is pruned to only the helpers referenced by the generated app
// code, so apps ship exactly the tailwind runtime they use. Symbols are
// collected from every generated .kt file except Runtime.kt itself; helpers
// are emitted with their transitive dependencies (e.g. any color filter also
// emits the private veskColorFilter base). truthy/num are core JS->Kotlin
// runtime helpers always included.

const RUNTIME_IMPORTS = `package app

import androidx.compose.runtime.Composable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import app.navigation.*
`;

const RUNTIME_CORE = `
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
`;

const RUNTIME_HELPERS: Record<string, { deps: string[]; src: string }> = {
  'veskColorFilter': { deps: [], src: `
// Tailwind color filter base: color-matrix saveLayer; works on all API levels.
private fun Modifier.veskColorFilter(matrix: ColorMatrix): Modifier = drawWithContent {
    val paint = Paint().apply { colorFilter = ColorFilter.colorMatrix(matrix) }
    drawContext.canvas.saveLayer(Rect(0f, 0f, size.width, size.height), paint)
    drawContent()
    drawContext.canvas.restore()
}
` },
  'veskBrightness': { deps: ['veskColorFilter'], src: `
fun Modifier.veskBrightness(mult: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        mult, 0f, 0f, 0f, 0f,
        0f, mult, 0f, 0f, 0f,
        0f, 0f, mult, 0f, 0f,
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskContrast': { deps: ['veskColorFilter'], src: `
fun Modifier.veskContrast(c: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        c, 0f, 0f, 0f, 128f * (1f - c),
        0f, c, 0f, 0f, 128f * (1f - c),
        0f, 0f, c, 0f, 128f * (1f - c),
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskGrayscale': { deps: ['veskColorFilter'], src: `
fun Modifier.veskGrayscale(factor: Float): Modifier = veskColorFilter(
    ColorMatrix().also { it.setToSaturation(1f - factor) }
)
` },
  'veskSaturate': { deps: ['veskColorFilter'], src: `
fun Modifier.veskSaturate(s: Float): Modifier = veskColorFilter(
    ColorMatrix().also { it.setToSaturation(s) }
)
` },
  'veskInvert': { deps: ['veskColorFilter'], src: `
fun Modifier.veskInvert(factor: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        -factor, 0f, 0f, 0f, 255f * factor,
        0f, -factor, 0f, 0f, 255f * factor,
        0f, 0f, -factor, 0f, 255f * factor,
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskSepia': { deps: ['veskColorFilter'], src: `
fun Modifier.veskSepia(factor: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        0.393f * factor + (1f - factor), 0.769f * factor, 0.189f * factor, 0f, 0f,
        0.349f * factor, 0.686f * factor + (1f - factor), 0.168f * factor, 0f, 0f,
        0.272f * factor, 0.534f * factor, 0.131f * factor + (1f - factor), 0f, 0f,
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskHueRotate': { deps: ['veskColorFilter'], src: `
fun Modifier.veskHueRotate(degrees: Float): Modifier {
    val rad = degrees * kotlin.math.PI / 180.0
    val cosA = kotlin.math.cos(rad).toFloat()
    val sinA = kotlin.math.sin(rad).toFloat()
    return veskColorFilter(
        ColorMatrix(floatArrayOf(
            0.213f + cosA * 0.787f - sinA * 0.213f, 0.715f - cosA * 0.715f - sinA * 0.715f, 0.072f - cosA * 0.072f + sinA * 0.928f, 0f, 0f,
            0.213f - cosA * 0.213f + sinA * 0.143f, 0.715f + cosA * 0.285f + sinA * 0.140f, 0.072f - cosA * 0.072f - sinA * 0.283f, 0f, 0f,
            0.213f - cosA * 0.213f - sinA * 0.787f, 0.715f - cosA * 0.715f + sinA * 0.715f, 0.072f + cosA * 0.928f + sinA * 0.072f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f,
        ))
    )
}
` },
  'veskDashedBorder': { deps: [], src: `
// Dashed/dotted borders (border-dashed / border-dotted) drawn as strokes
// behind the element content.
fun Modifier.veskDashedBorder(width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val stroke = Stroke(width = width.toPx(), pathEffect = PathEffect.dashPathEffect(dashes))
    drawRoundRect(color = color, style = stroke)
}
` },
  'veskSideBorder': { deps: [], src: `
// Per-side borders (border-t/r/b/l, border-x/y).
fun Modifier.veskSideBorder(top: Dp, end: Dp, bottom: Dp, start: Dp, color: Color): Modifier = drawBehind {
    val w = floatArrayOf(top.toPx(), end.toPx(), bottom.toPx(), start.toPx())
    val s = size
    if (w[0] > 0f) drawLine(color, Offset(0f, w[0] / 2f), Offset(s.width, w[0] / 2f), w[0])
    if (w[1] > 0f) drawLine(color, Offset(s.width - w[1] / 2f, 0f), Offset(s.width - w[1] / 2f, s.height), w[1])
    if (w[2] > 0f) drawLine(color, Offset(0f, s.height - w[2] / 2f), Offset(s.width, s.height - w[2] / 2f), w[2])
    if (w[3] > 0f) drawLine(color, Offset(w[3] / 2f, 0f), Offset(w[3] / 2f, s.height), w[3])
}
` },
  'veskDivideLine': { deps: [], src: `
// Single dashed/dotted divider line (divide-dashed / divide-dotted).
fun Modifier.veskDivideLine(horizontal: Boolean, width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val w = width.toPx()
    if (horizontal) {
        drawLine(color, Offset(0f, w / 2f), Offset(size.width, w / 2f), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    } else {
        drawLine(color, Offset(w / 2f, 0f), Offset(w / 2f, size.height), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    }
}
` },
  'veskSkew': { deps: [], src: `
// Skew transform (skew-x / skew-y) via canvas transform.
fun Modifier.veskSkew(sx: Float, sy: Float): Modifier = drawWithContent {
    val canvas = drawContext.canvas
    canvas.save()
    canvas.skew(sx, sy)
    drawContent()
    canvas.restore()
}
` },
  'Link': { deps: [], src: `
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
` },
  'NavLink': { deps: [], src: `
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
` },
  'Outlet': { deps: [], src: `
@Composable
fun Outlet(content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    val route = nav.currentRoute.value
    if (route.isNotEmpty()) {
        content()
    }
}
` },
};

const RUNTIME_ORDER = ['veskColorFilter', 'veskBrightness', 'veskContrast', 'veskGrayscale', 'veskSaturate', 'veskInvert', 'veskSepia', 'veskHueRotate', 'veskDashedBorder', 'veskSideBorder', 'veskDivideLine', 'veskSkew', 'Link', 'NavLink', 'Outlet'];

function collectRuntimeUsage(appDir: string): Set<string> {
  const used = new Set<string>();
  const scanDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  if (!existsSync(scanDir)) return used;
  const files: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.kt') && e.name !== 'Runtime.kt') files.push(p);
    }
  };
  walk(scanDir);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\b(vesk[A-Z]\w+|Link|NavLink|Outlet)(?=\s*\()/g)) used.add(m[1]!);
  }
  return used;
}

function generateRuntimeKt(appDir: string): void {
  const used = collectRuntimeUsage(appDir);
  const body: string[] = [];
  const emit = (name: string): void => {
    const unit = RUNTIME_HELPERS[name];
    if (!unit || body.includes(unit.src)) return;
    for (const dep of unit.deps) emit(dep);
    body.push(unit.src);
  };
  for (const name of RUNTIME_ORDER) {
    if (used.has(name)) emit(name);
  }
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'Runtime.kt'), `${RUNTIME_IMPORTS}${RUNTIME_CORE}${body.join('\n')}`);
  log('gen', `Runtime.kt (${body.length} helpers used of ${RUNTIME_ORDER.length})`);
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

function compileVskFiles(appDir: string, rootName: string): void {
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

  const { classes: customClasses, skipped: cssSkipped } = collectCustomCss(
    vskFiles.map((f) => ({ source: readFileSync(f, 'utf8'), filename: relative(appDir, f) })),
  );
  for (const s of new Set(cssSkipped)) log('css', s);

  const seen = new Map<string, number>();
  for (const file of vskFiles) {
    const source = readFileSync(file, 'utf8');
    const result = compileVskResult(source, file, { componentsWithoutProps, customClasses, rootName });
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

  const back = config.back ?? {};
  const backArgs = `\n            back = BackBehavior(mode = "${back.mode ?? 'stack'}", doubleBackToExit = ${back.doubleBackToExit ?? true}, exitDelayMs = ${back.exitDelayMs ?? 2000}),`;

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
            ),${backArgs})
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
  generateRouterKt(appDir);
  compileVskFiles(appDir, config.root ?? '');
  generateAppKt(appDir, config);
  // Last: Runtime.kt is pruned to the helpers the generated pages actually use.
  generateRuntimeKt(appDir);
}

function writeDefaultConfig(target: string): void {
  const tsPath = join(target, CONFIG_TS);
  const jsonPath = join(target, CONFIG_JSON);
  if (existsSync(tsPath) || existsSync(jsonPath)) {
    log('init', `${CONFIG_TS} or ${CONFIG_JSON} already exists — keeping it`);
    return;
  }
  const c = DEFAULT_CONFIG;
  writeFileSync(
    tsPath,
    `import { defineConfig } from 'vesk-native'

export default defineConfig({
  appId: '${c.appId}',
  appName: '${c.appName}',
  versionName: '${c.versionName}',
  versionCode: ${c.versionCode},
  compileSdk: ${c.compileSdk},
  minSdk: ${c.minSdk},
  targetSdk: ${c.targetSdk},
  orientation: '${c.orientation}',
  theme: '${c.theme}',
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
  back: {
    mode: 'stack',
    doubleBackToExit: true,
    exitDelayMs: 2000,
  },
})
`,
  );
  log('init', `${CONFIG_TS} written (defineConfig from vesk-native)`);
}

async function initApp(dir: string): Promise<void> {
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

function findGradle(): string {
  if (process.env.GRADLE_HOME) return join(process.env.GRADLE_HOME, 'bin', 'gradle');
  const found = spawnSync('which', ['gradle'], { encoding: 'utf8' });
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  if (existsSync(DEFAULT_GRADLE)) return DEFAULT_GRADLE;
  return 'gradle';
}

async function buildApp(dir: string): Promise<void> {
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

async function runApp(dir: string): Promise<void> {
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

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case 'init':
      if (!arg) {
        usage();
        process.exit(1);
      }
      await initApp(arg);
      break;
    case 'build':
      await buildApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'run':
      await runApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'install':
      await runApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'dev':
      console.log('  [dev] not implemented yet (Phase 7)');
      break;
    default:
      usage();
  }
}

main();
