import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname, basename, extname } from 'node:path';
import { compileVskResult, collectCustomCss, extractStylesheetLinks, extractMediaSources, parseCssClasses } from '@compiler-native/index';
import type { VskLibSurface } from '@compiler-native/index';
import type { LibExportSig, LibParamSig } from '@compiler-native/elements';
import { browserGlobalDecl, browserModuleDecl } from '@compiler-native/browser-api';
import { setAdaptiveDark } from '@compiler-native/tailwind';
import type { ModifierParts } from '@compiler-native/tailwind';
import { parse } from '@vesk/compiler';
import { findComponentDecls, propsDataType, inferPropsFromUsage } from '@compiler-native/props';
import type { ComponentDecl } from '@compiler-native/props';
import { buildModuleRegistry, slugFor, toPosix } from '@compiler-native/modules';
import type { ModuleExport } from '@compiler-native/modules';
import { compileProjectModule } from '@compiler-native/kotlin-codegen';
import { KtErrors } from '@compiler-native/js2kt';
import type { JsNode } from '@compiler-native/js2kt';
import type { VeskConfig } from 'vesk-native';
import { AAPT2_OVERRIDE, DEFAULT_SDK, MONOREPO, TEMPLATE_DIR, collectVskFiles, colorLiteral, log, slugify } from '@cli-native/constants';
import { API_PERMISSIONS, MAX_SDK_PERMS, collectBrowserApiUsage, collectDeviceApiUsage, collectRuntimeUsage } from '@cli-native/usage';
import { BIOMETRIC_AUTH_BODY, BIOMETRIC_CHECK_BODY, QRGEN_BODY, QR_OVERLAY_BLOCK, RUNTIME_CORE, RUNTIME_HELPERS, RUNTIME_ORDER, runtimeImports } from '@cli-native/runtime-templates';
import { installedLibraries } from '@cli-native/vsklib';
import type { VskLibRecord } from '@cli-native/vsklib';

export function generateSettingsGradleKts(target: string, config: VeskConfig): void {
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

// Gradle dependencies derived from actual usage — the same conditions that
// gate the Runtime.kt imports and code, so no reference ever dangles and no
// library ships "just in case". deviceApis is the set of device.* calls in
// page scripts/elements; used is the set of pruned runtime helpers actually
// referenced by the generated pages; hasMedia covers media elements.
// libs are the installed .vsklib libraries — registered verbatim (their
// permissions are wired into the manifest by generateManifest).
// A signing password may be given inline or as `env:NAME` to read the value
// from the environment at build time (secrets never land in generated files).
// The env lookup is lenient (empty string) so plain debug builds configure
// fine without release secrets; the CLI validates env: values up front in the
// bundle flow, where missing secrets fail with a clear message before gradle.
function signingValue(value: string): string {
  if (value.startsWith('env:')) {
    const name = value.slice(4);
    return `System.getenv("${name}") ?: ""`;
  }
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export function generateAppBuildGradleKts(target: string, config: VeskConfig, deviceApis: Set<string>, hasMedia: boolean, used: Set<string>, libs: VskLibRecord[]): void {
  const deps = [
    'implementation(platform("androidx.compose:compose-bom:2026.06.01"))',
    'implementation("androidx.compose.ui:ui")',
    'implementation("androidx.compose.ui:ui-tooling-preview")',
    'implementation("androidx.compose.material3:material3")',
    'implementation("androidx.activity:activity-compose:1.13.0")',
    'implementation("androidx.core:core-ktx:1.19.0")',
    'implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")',
  ];
  if (deviceApis.has('scanQr')) {
    deps.push(
      'implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")',
      'implementation("com.google.mlkit:barcode-scanning:17.3.0")',
      'implementation("androidx.camera:camera-core:1.4.1")',
      'implementation("androidx.camera:camera-camera2:1.4.1")',
      'implementation("androidx.camera:camera-lifecycle:1.4.1")',
      'implementation("androidx.camera:camera-view:1.4.1")',
    );
  }
  if (deviceApis.has('checkBiometrics') || deviceApis.has('authenticate')) {
    // Kotlin implementation per developer.android.com/jetpack/androidx/releases/biometric
    // (the Java-only artifact 1.1.0 predates the Kotlin rewrite and its
    // BiometricPrompt path is the common source of runtime crashes here).
    deps.push('implementation("androidx.biometric:biometric:1.4.0-alpha02")');
  }
  if (deviceApis.has('generateQrCode') || used.has('veskQr')) {
    deps.push('implementation("com.google.zxing:core:3.5.3")');
  }
  if (hasMedia || used.has('veskMediaHub') || used.has('veskAudio') || used.has('veskVideo')) {
    deps.push('implementation("androidx.media:media:1.7.0")');
  }
  for (const lib of libs) {
    for (const coord of lib.gradle) deps.push(`implementation("${coord}")`);
  }
  // Release signing is driven by veskconfig.signing.android (upload key for
  // Play App Signing). Passwords may reference environment variables with
  // `env:NAME` so secrets never land in generated files. When the config is
  // absent or incomplete, release artifacts fall back to the debug keystore
  // (dev flow).
  const androidSigning = config.signing?.android;
  const signingReady = Boolean(
    androidSigning?.storeFile && (androidSigning.storePassword ?? '') !== '' && (androidSigning.keyAlias ?? '') !== '' && (androidSigning.keyPassword ?? '') !== '',
  );
  const signingBlock = signingReady
    ? `signingConfigs {
        create("release") {
            storeFile = file("${resolve(target, androidSigning!.storeFile!).replaceAll('\\', '/')}")
            storePassword = ${signingValue(androidSigning!.storePassword!)}
            keyAlias = "${androidSigning!.keyAlias}"
            keyPassword = ${signingValue(androidSigning!.keyPassword!)}
        }
    }
`
    : '';
  const releaseSigning = signingReady
    ? `            // Upload-key signing from veskconfig.signing.android (Play App
            // Signing upload key).
            signingConfig = signingConfigs.getByName("release")`
    : `            // No veskconfig.signing.android — release artifacts sign with the
            // debug keystore (dev flow; never upload these to a store).`;
  writeFileSync(
    join(target, 'app', 'build.gradle.kts'),
    `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "${config.appId}"
    compileSdk = ${config.compileSdk}
    // AGP built-in Kotlin (the org.jetbrains.kotlin.android plugin is not
    // applied); jvmTarget follows compileOptions.
    enableKotlin = true

    defaultConfig {
        applicationId = "${config.appId}"
        minSdk = ${Math.max(config.minSdk ?? 24, ...libs.map((l) => l.minSdk ?? 0))}
        targetSdk = ${config.targetSdk}
        versionCode = ${config.versionCode}
        versionName = "${config.versionName}"
    }

${signingBlock}    buildTypes {
        release {
            isMinifyEnabled = false
${releaseSigning}
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
${deps.join('\n')}
}
`,
  );
  log('gen', `app/build.gradle.kts (${deps.length} dependencies, ${deps.length - 7} usage-derived)`);
}

export function generateManifest(target: string, config: VeskConfig, mediaReadPerms: boolean, mediaNotifyPerms: boolean, mediaButtonReceiver: boolean, deviceApis: Set<string>, libs: VskLibRecord[] = [], browserApis: Set<string> = new Set()): void {
  const orientationAttr = config.orientation ? `\n            android:screenOrientation="${config.orientation}"` : '';
  const autoPerms = new Set<string>();
  if (mediaReadPerms) {
    autoPerms.add('android.permission.READ_MEDIA_IMAGES');
    autoPerms.add('android.permission.READ_MEDIA_VIDEO');
    autoPerms.add('android.permission.READ_MEDIA_AUDIO');
    autoPerms.add('android.permission.READ_EXTERNAL_STORAGE');
  }
  if (mediaNotifyPerms) autoPerms.add('android.permission.POST_NOTIFICATIONS');
  // Permissions derived from device API usage in page scripts/elements,
  // mirroring how storage permissions are derived from media elements.
  for (const api of deviceApis) {
    for (const p of API_PERMISSIONS[api] ?? []) autoPerms.add(p);
  }
  // Browser API usage (fetch -> INTERNET) derives permissions the same way —
  // never "just in case".
  for (const api of browserApis) {
    for (const p of API_PERMISSIONS[api] ?? []) autoPerms.add(p);
  }
  // Installed .vsklib libraries register the permissions their APIs require
  // (e.g. INTERNET for network clients) the same way at generation time.
  for (const lib of libs) {
    for (const p of lib.permissions) autoPerms.add(p);
  }
  // Package visibility on 11+: every implicit intent the toolchain can launch
  // needs a <queries> declaration (no broad QUERY_ALL_PACKAGES permission).
  const queriesBlock = `    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
        <intent>
            <action android:name="android.intent.action.DIAL" />
            <data android:scheme="tel" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SENDTO" />
            <data android:scheme="smsto" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SENDTO" />
            <data android:scheme="mailto" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="http" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="geo" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SET_ALARM" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SEND" />
        </intent>
    </queries>
`;
  const userPerms = (config.permissions ?? []).filter((p) => !autoPerms.has(p));
  const permLines = [...autoPerms, ...userPerms]
    .map((p) => `    <uses-permission android:name="${p}"${MAX_SDK_PERMS[p] ? ` android:maxSdkVersion="${MAX_SDK_PERMS[p]}"` : ''} />`)
    .join('\n');
  // MediaProjection screen recording needs a foreground service declared
  // with the mediaProjection type (enforced on API 34+).
  const screenRecordBlock = deviceApis.has('startScreenRecord')
    ? `    <service
        android:name="app.VeskScreenRecordService"
        android:exported="false"
        android:foregroundServiceType="mediaProjection" />
`
    : '';
  const autoPermsBlock = permLines.length > 0 ? `${permLines}\n` : '';
  const receiverBlock = mediaButtonReceiver
    ? `    <receiver android:name="app.VeskMediaReceiver" android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MEDIA_BUTTON" />
        </intent-filter>
    </receiver>
`
    : '';
  // Camera capture writes through a FileProvider so the system camera app can
  // deposit the photo/video into our cache dir (content:// authories avoid
  // storage permissions entirely).
  const needsProvider = deviceApis.has('capturePhoto') || deviceApis.has('captureVideo');
  const providerBlock = needsProvider
    ? `    <provider
        android:name="androidx.core.content.FileProvider"
        android:authorities="${config.appId}.fileprovider"
        android:exported="false"
        android:grantUriPermissions="true">
        <meta-data
            android:name="android.support.FILE_PROVIDER_PATHS"
            android:resource="@xml/file_paths" />
    </provider>
`
    : '';
  if (needsProvider) {
    mkdirSync(join(target, 'app', 'src', 'main', 'res', 'xml'), { recursive: true });
    writeFileSync(
      join(target, 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<paths>
    <cache-path name="vesk_cache" path="." />
</paths>
`,
    );
  }
  writeFileSync(
    join(target, 'app', 'src', 'main', 'AndroidManifest.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
${autoPermsBlock}${queriesBlock}    <application
        android:label="${config.appName}"
        android:theme="@style/Theme.VeskApp"
        android:allowBackup="false">
${receiverBlock}${providerBlock}${screenRecordBlock}        <activity
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

// Perceived luminance of a '#RRGGBB' color; true for dark backgrounds that
// need light system-bar icons. Hand-rolled hex scan (no regex in the
// generator).
function isDarkColor(hex: string): boolean {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

// `androidx.activity.SystemBarStyle` expression for an edge-to-edge bar
// preference, with scrim colors drawn from the light/dark theme backgrounds.
function systemBarStyleExpr(style: 'auto' | 'light' | 'dark' | undefined, lightBg: string, darkBg: string): string {
  const parse = (c: string): string => `android.graphics.Color.parseColor("${c}")`;
  switch (style ?? 'auto') {
    case 'dark':
      return `SystemBarStyle.dark(${parse(darkBg)})`;
    case 'light':
      return `SystemBarStyle.light(${parse(lightBg)}, ${parse(darkBg)})`;
    default:
      return `SystemBarStyle.auto(${parse(darkBg)}, ${parse(lightBg)})`;
  }
}

export function generateThemes(target: string, config: VeskConfig): void {
  const c = config.colors;
  // System bar icon contrast follows the bar background: dark bars (light
  // icons) when the background is dark, light bars (dark icons) otherwise.
  const darkBar = isDarkColor(c.background);
  const lightFlags = darkBar ? 'false' : 'true';
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
        <item name="android:navigationBarColor">${c.background}</item>
        <item name="android:windowBackground">${c.background}</item>
        <item name="android:windowLightStatusBar">${lightFlags}</item>
        <item name="android:windowLightNavigationBar">${lightFlags}</item>
    </style>
</resources>
`,
  );
  log('gen', 'themes.xml (colors, system-bar contrast from config)');
}

export function generateMainActivity(target: string, config: VeskConfig, mediaReadPerms: boolean, mediaNotifyPerms: boolean): void {
  const pkgPath = config.appId.split('.').join('/');
  const outDir = join(target, 'app', 'src', 'main', 'kotlin', pkgPath);
  mkdirSync(outDir, { recursive: true });
  const e2e = config.edgeToEdge ?? {};
  const e2eEnabled = e2e.enabled !== false;
  const e2eImports = e2eEnabled ? `import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
` : '';
  const e2eCall = e2eEnabled
    ? `        enableEdgeToEdge(
            statusBarStyle = ${systemBarStyleExpr(e2e.statusBarStyle, config.colors.background, config.darkColors.background)},
            navigationBarStyle = ${systemBarStyleExpr(e2e.navigationBarStyle, config.colors.background, config.darkColors.background)},
        )\n`
    : '';
  const permImports = (mediaReadPerms || mediaNotifyPerms)
    ? `import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
`
    : '';
  const permLaunch = (mediaReadPerms || mediaNotifyPerms)
    ? `
    private val mediaPermLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Thread.getDefaultUncaughtExceptionHandler() !is DebugCrashLog) {
            Thread.setDefaultUncaughtExceptionHandler(DebugCrashLog(Thread.getDefaultUncaughtExceptionHandler()))
        }
${e2eCall}        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
        if (Build.VERSION.SDK_INT >= 33) {
            mediaPermLauncher.launch(arrayOf(
                ${[
                  mediaReadPerms && 'android.Manifest.permission.READ_MEDIA_IMAGES',
                  mediaReadPerms && 'android.Manifest.permission.READ_MEDIA_VIDEO',
                  mediaReadPerms && 'android.Manifest.permission.READ_MEDIA_AUDIO',
                  mediaNotifyPerms && 'android.Manifest.permission.POST_NOTIFICATIONS',
                ]
                  .filter((p): p is string => !!p)
                  .map((p) => `                ${p},`)
                  .join('\n')}
            ))
        } else {
            mediaPermLauncher.launch(arrayOf(android.Manifest.permission.READ_EXTERNAL_STORAGE))
        }
        setContent {`
    : `
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Thread.getDefaultUncaughtExceptionHandler() !is DebugCrashLog) {
            Thread.setDefaultUncaughtExceptionHandler(DebugCrashLog(Thread.getDefaultUncaughtExceptionHandler()))
        }
${e2eCall}        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
        setContent {`;
  writeFileSync(
    join(outDir, 'DebugCrashLog.kt'),
    `package ${config.appId}

import android.os.Environment
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Date

// Permanent crash diagnostics: writes the stack trace of any uncaught
// exception to /sdcard/Download/vesk-crash.txt so on-device crashes can be
// inspected without logcat access. Kept until vesk-native is stable.
class DebugCrashLog(private val previous: Thread.UncaughtExceptionHandler?) : Thread.UncaughtExceptionHandler {
    override fun uncaughtException(t: Thread, e: Throwable) {
        try {
            val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val out = File(dir, "vesk-crash.txt")
            val sw = StringWriter()
            val pw = PrintWriter(sw)
            pw.println("=== crash ${'$'}{Date()} on ${'$'}{t.name} ===")
            e.printStackTrace(pw)
            pw.close()
            out.writeText(sw.toString())
        } catch (_: Throwable) {
        }
        previous?.uncaughtException(t, e)
    }
}
`,
  );
  writeFileSync(
    join(outDir, 'MainActivity.kt'),
    `package ${config.appId}

${permImports}${e2eImports}import android.os.Bundle
import android.content.Intent
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import app.App
import app.VeskDeviceSession
import app.VeskTheme
import app.jsSafe

class MainActivity : FragmentActivity() {${permLaunch}
            VeskTheme {
                Surface(modifier = Modifier) {
                    App()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
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

export function generateThemeKt(target: string, config: VeskConfig): void {
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

export function generateRuntimeKt(appDir: string, config: VeskConfig): Set<string> {
  const used = collectRuntimeUsage(appDir);
  const deviceApis = collectDeviceApiUsage(appDir);
  const broadcast = config.media?.broadcast ?? true;
  const body: string[] = [];
  const emitted = new Set<string>();
  const emit = (name: string): void => {
    if (emitted.has(name)) return;
    emitted.add(name);
    const unit = RUNTIME_HELPERS[name];
    if (!unit) return;
    for (const dep of unit.deps) emit(dep);
    // Media broadcast is configurable per app (media.broadcast, default on);
    // the boolean is baked into the generated helpers as their default param.
    // Usage-pruned device APIs (biometrics, zxing, camera overlay) get their
    // real bodies inlined only when called; stubs keep the methods callable
    // without the library on the classpath.
    let src = name === 'veskAudio' || name === 'veskVideo'
      ? unit.src.split('__BROADCAST__').join(String(broadcast))
      : unit.src;
    if (name === 'veskDeviceApi') {
      src = src
        .split('__BIOMETRIC_CHECK_BODY__')
        .join(deviceApis.has('checkBiometrics') ? BIOMETRIC_CHECK_BODY : 'onDone?.invoke(false, null)')
        .split('__BIOMETRIC_AUTH_BODY__')
        .join(deviceApis.has('authenticate') ? BIOMETRIC_AUTH_BODY : 'onDone?.invoke(false, "Not available")')
        .split('__QRGEN_BODY__')
        .join(deviceApis.has('generateQrCode') ? QRGEN_BODY : 'onDone?.invoke(null)')
        .split('__QR_OVERLAY__')
        .join(deviceApis.has('scanQr') ? QR_OVERLAY_BLOCK : '');
    }
    body.push(src);
  };
  for (const name of RUNTIME_ORDER) {
    if (used.has(name)) emit(name);
  }
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'Runtime.kt'), `${runtimeImports(deviceApis, used)}${RUNTIME_CORE}${body.join('\n')}`);
  log('gen', `Runtime.kt (${body.length} helpers used of ${RUNTIME_ORDER.length}, media broadcast ${broadcast ? 'on' : 'off'})`);
  return used;
}

export function generateRouterKt(appDir: string): void {
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  mkdirSync(outDir, { recursive: true });
  // Resolved from the CLI's own package location (not cwd) so it works from
  // inside the user's project, where `packages/navigation-native` does not
  // exist relative to the working directory.
  const src = join(MONOREPO, 'packages', 'navigation-native', 'src', 'Router.kt');
  if (existsSync(src)) {
    const navDir = join(outDir, 'navigation');
    mkdirSync(navDir, { recursive: true });
    writeFileSync(join(navDir, 'Router.kt'), readFileSync(src, 'utf8'));
    log('gen', 'navigation/Router.kt (from @navigation-native)');
  } else {
    log('warn', `navigation module not found at ${src}; skipping Router.kt`);
  }
}

function isFileImageSrc(src: string): boolean {
  return src.startsWith('/storage/') || src.startsWith('/data/') || src.startsWith('content://') || src.startsWith('file://');
}

// Project JS/TS source extensions compiled to Kotlin. CommonJS forms (.cjs,
// .cts) are rejected by the resolver with a hard error, never silently
// compiled with wrong semantics.
const JS_TS_EXTS = new Set(['.ts', '.js', '.mjs', '.tsx', '.jsx']);

// Recursively collect project JS/TS modules under the app directory. The
// generated `src/` tree and gradle `build/` output are not source.
function collectProjectModules(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'build' || entry === 'src' || entry === 'node_modules') continue;
        walk(full);
      } else {
        const dot = entry.lastIndexOf('.');
        const ext = dot > 0 ? entry.slice(dot) : '';
        if (JS_TS_EXTS.has(ext)) out.push(full);
      }
    }
  };
  walk(dir);
  return out.sort();
}

// Compile every project JS/TS module into Kotlin (Modules.kt) and its export
// registry (rel path -> export name -> { pkg, name }). Errors are collected —
// a module that fails to compile is a hard build failure, never a runtime
// fallback.
function compileProjectModules(appDir: string): { registry: Map<string, Map<string, ModuleExport>>; kt: string; errors: string[] } {
  const files = collectProjectModules(appDir);
  const registry = new Map<string, Map<string, ModuleExport>>();
  const blocks: string[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const rel = toPosix(relative(appDir, file));
    const err = new KtErrors();
    const compiled = compileProjectModule(readFileSync(file, 'utf8'), rel, err);
    for (const e of err.errors) errors.push(`${rel}: ${e}`);
    if (compiled.kt.trim()) blocks.push(compiled.kt);
    if (compiled.registryEntry.size > 0) registry.set(rel, compiled.registryEntry);
    log('module', `${rel} -> ${compiled.registryEntry.size} export(s)`);
  }
  return { registry, kt: blocks.join('\n\n'), errors };
}

export function compileVskFiles(appDir: string, config: VeskConfig, target: string): void {
  const outDir = join(appDir, 'src', 'main', 'kotlin', 'app');
  mkdirSync(outDir, { recursive: true });

  const KEEP = new Set(['App.kt', 'Runtime.kt', 'Router.kt', 'Theme.kt', 'MainActivity.kt', 'DebugCrashLog.kt']);
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.kt') && !KEEP.has(f)) unlinkSync(join(outDir, f));
  }

  const vskFiles = collectVskFiles(appDir);
  if (vskFiles.length === 0) {
    console.error('  [compile] no .vsk files found under app/ — nothing to compile');
    process.exit(1);
  }

  const componentsWithoutProps = new Set<string>();
  const componentNames = new Set<string>();
  const componentNamesByFile = new Map<string, string[]>();
  for (const file of vskFiles) {
    const rel = toPosix(relative(appDir, file));
    const ast = parse(readFileSync(file, 'utf8')) as unknown as JsNode;
    const names: string[] = [];
    for (const d of findComponentDecls(ast)) {
      names.push(d.name);
      componentNames.add(d.name);
      const p = d.params[0];
      if (!p || (p.type === 'Identifier' && p.name === 'content')) componentsWithoutProps.add(d.name);
    }
    if (names.length) componentNamesByFile.set(rel, names);
  }

  const { registry: moduleRegistry, slugs: moduleSlugs } = buildModuleRegistry(appDir, vskFiles, componentNamesByFile);

  // Project JS/TS modules (imported from .vsk headers with relative paths)
  // compile to Kotlin declarations in Modules.kt; the registry maps each
  // module's rel path to its compiled exports so headers can import them.
  const projectModules = compileProjectModules(appDir);
  for (const e of projectModules.errors) console.error(`  [compile] error in project module: ${e}`);
  if (projectModules.errors.length > 0) process.exit(1);
  const projectModuleRegistry = projectModules.registry;
  if (projectModules.kt.trim()) {
    writeFileSync(join(outDir, 'Modules.kt'), `package app\n\n${projectModules.kt.trimEnd()}\n`);
    log('module', `project JS/TS modules -> app/Modules.kt`);
  }

  // npm specifier -> exported name -> { pkg, name }. Populated by the npm
  // module compiler (packages/cli-native/src/npm.ts) once a bare import is
  // seen; empty for apps that only import .vsk files.
  const npmRegistry = new Map<string, Map<string, { pkg: string; name: string }>>();

  const { scoped: scopedClasses, skipped: cssSkipped } = collectCustomCss(
    vskFiles.map((f) => ({ source: readFileSync(f, 'utf8'), filename: relative(appDir, f) })),
  );
  const customClasses = new Map<string, ModifierParts>();
  const linkSkipped: string[] = [];
  for (const file of vskFiles) {
    const source = readFileSync(file, 'utf8');
    for (const href of extractStylesheetLinks(source)) {
      const cssPath = href.startsWith('/') ? resolve(appDir, href.slice(1)) : resolve(dirname(file), href);
      if (!existsSync(cssPath)) {
        linkSkipped.push(`${relative(appDir, file)}: <link rel="stylesheet" href="${href}"> file not found`);
        continue;
      }
      const r = parseCssClasses(readFileSync(cssPath, 'utf8'));
      for (const [k, v] of r.classes) customClasses.set(k, v);
      linkSkipped.push(...r.skipped);
      log('css', `${relative(appDir, file)} -> ${href}`);
    }
  }
  for (const s of new Set([...cssSkipped, ...linkSkipped])) log('css', s);

  // <img src="/media/..."> project assets -> bundled into res/drawable-xxhdpi;
  // <video>/<audio> project media -> bundled into res/raw (android.resource://
  // at runtime). Resource names share one namespace, so dedupe across both.
  const imageResources = new Map<string, string>();
  const mediaResources = new Map<string, string>();
  const usedNames = new Set<string>();
  const resDir = join(appDir, 'src', 'main', 'res');
  for (const e of readdirSync(resDir, { withFileTypes: true })) {
    if (e.name.startsWith('drawable') && e.isDirectory()) rmSync(join(resDir, e.name), { recursive: true, force: true });
  }
  const rawDir = join(resDir, 'raw');
  if (existsSync(rawDir)) rmSync(rawDir, { recursive: true, force: true });
  const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  const MEDIA_EXTS = new Set(['.mp4', '.webm', '.mp3', '.m4a', '.aac', '.ogg', '.wav']);
  for (const file of vskFiles) {
    const source = readFileSync(file, 'utf8');
    for (const { src, element } of extractMediaSources(source)) {
      if (isFileImageSrc(src)) continue;
      const mediaPath = src.startsWith('/') ? resolve(appDir, src.slice(1)) : resolve(dirname(file), src);
      if (!existsSync(mediaPath)) {
        log('media', `${relative(appDir, file)}: <${element} src="${src}"> file not found`);
        continue;
      }
      const ext = extname(mediaPath).toLowerCase();
      const isImage = element === 'img';
      if (!(isImage ? IMAGE_EXTS : MEDIA_EXTS).has(ext)) {
        log('media', `${relative(appDir, file)}: unsupported ${element} type ${ext} for "${src}"`);
        continue;
      }
      const base = basename(mediaPath, ext).toLowerCase().replace(/[^a-z0-9_]/g, '_') || (isImage ? 'img' : 'media');
      let name = base;
      let i = 1;
      while (usedNames.has(name)) name = `${base}_${i++}`;
      usedNames.add(name);
      if (isImage) {
        const drawable = join(resDir, 'drawable-xxhdpi');
        mkdirSync(drawable, { recursive: true });
        cpSync(mediaPath, join(drawable, `${name}${ext === '.jpeg' ? '.jpg' : ext}`));
        imageResources.set(src, name);
        log('img', `${relative(appDir, file)} -> drawable-xxhdpi/${name}${ext}`);
      } else {
        mkdirSync(rawDir, { recursive: true });
        cpSync(mediaPath, join(rawDir, `${name}${ext}`));
        mediaResources.set(src, name);
        log('media', `${relative(appDir, file)} -> res/raw/${name}${ext}`);
      }
    }
  }

  const seen = new Map<string, number>();
  // Installed .vsklib libraries resolve only through explicit header imports
  // (`import { CoilImage } from '@vesk/coil'`), so a library's tags are never
  // implicitly in scope for files that don't import them.
  const vsklibRegistry = new Map<string, VskLibSurface>();
  for (const lib of installedLibraries(target)) {
    const exports = new Map<string, import('@compiler-native/elements').LibExportSig>();
    for (const sig of Object.values(lib.signatures ?? {})) exports.set(sig.name, sig);
    for (const name of lib.exports ?? []) {
      if (!exports.has(name)) exports.set(name, { name, target: name, qualified: name, isConstructor: false, params: [], defaultParams: [], returnShape: 'any' });
    }
    vsklibRegistry.set(lib.id, { exports, tags: lib.tags ?? {} });
  }
  for (const file of vskFiles) {
    const source = readFileSync(file, 'utf8');
    const result = compileVskResult(source, file, { componentsWithoutProps, componentNames, customClasses, scopedCustomClasses: scopedClasses, imageResources, mediaResources, rClass: `${config.appId}.R`, rootName: config.root ?? '', fileRel: relative(appDir, file), appDir, moduleRegistry, moduleSlugs, projectModuleRegistry, npmRegistry, vsklibRegistry });
    if (result.errors.length > 0) {
      console.error(`  [compile] errors in ${relative(appDir, file)}:`);
      for (const e of result.errors) console.error(`    ! ${e}`);
      process.exit(1);
    }
    for (const n of result.notes) console.error(`  [compile] warning: ${n} (in ${relative(appDir, file)})`);
    const kt = result.kt;
    const decls = findComponentDecls(parse(source) as unknown as JsNode);
    const name = decls[0]?.name ?? `s_${slugFor(toPosix(relative(appDir, file)))}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    const outName = count === 0 ? name : `${name}_${count}`;
    writeFileSync(join(outDir, `${outName}.kt`), kt);
    log('compile', `${relative(appDir, file)} -> app/${outName}.kt`);
  }
}

function ktString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

// JSON config value -> Kotlin literal, coerced to the page component's typed
// props. Returns null (and warns) when the value cannot be represented.
// Type strings come from propsDataType ("List<...>" wrapping an element type),
// so plain string slicing is safe here — no regex.
function coercePropValue(type: string, value: unknown): string | null {
  if (type.startsWith('List<') && type.endsWith('>')) {
    if (!Array.isArray(value)) return null;
    const inner = type.slice(5, -1);
    const items: string[] = [];
    for (const v of value) {
      const kt = coercePropValue(inner, v);
      if (kt === null) return null;
      items.push(kt);
    }
    return `listOf(${items.join(', ')})`;
  }
  if (type === 'String') return typeof value === 'string' ? ktString(value) : null;
  if (type === 'Int' || type === 'Double' || type === 'Float' || type === 'Long') {
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
  }
  if (type === 'Boolean') return typeof value === 'boolean' ? String(value) : null;
  if (type === 'Any' || type === 'Any?') {
    if (typeof value === 'string') return ktString(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (const v of value) {
        const kt = coercePropValue('Any', v);
        if (kt === null) return null;
        items.push(kt);
      }
      return `listOf(${items.join(', ')})`;
    }
    return null;
  }
  return null;
}

// `export const pageProps = { ... }` in a page file: in-file default props for
// file-based routing (pages own their defaults; config screens override).
// Evaluated from AST literals only — no regex, no text scanning.
function pageDefaultProps(ast: JsNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const body = (ast.body as JsNode[]) ?? [];
  for (const stmt of body) {
    if (stmt.type !== 'ExportNamedDeclaration') continue;
    const decl = stmt.declaration as JsNode | null;
    if (!decl || decl.type !== 'VariableDeclaration') continue;
    const d = ((decl.declarations as JsNode[]) ?? [])[0];
    if (!d || d.type !== 'VariableDeclarator') continue;
    const id = d.id as JsNode | null;
    if (!id || id.type !== 'Identifier' || id.name !== 'pageProps') continue;
    const init = d.init as JsNode | null;
    if (!init || init.type !== 'ObjectExpression') break;
    for (const prop of (init.properties as JsNode[]) ?? []) {
      if (!prop || (prop.type !== 'Property' && prop.type !== 'ObjectProperty')) continue;
      const key = prop.key as JsNode | null;
      const keyName = key?.type === 'Identifier' ? (key.name as string) : key?.type === 'StringLiteral' ? (key.value as string) : null;
      if (!keyName) continue;
      const v = literalValue(prop.value as JsNode | null);
      if (v !== undefined) out[keyName] = v;
    }
    break;
  }
  return out;
}

// Scalar JSON-compatible values only; anything else (object literals, member
// expressions, ...) is skipped (undefined).
function literalValue(node: JsNode | null): unknown {
  if (!node) return undefined;
  switch (node.type) {
    case 'Literal': return node.value;
    case 'StringLiteral': return node.value;
    case 'NumericLiteral': return node.value;
    case 'BooleanLiteral': return node.value;
    case 'ArrayExpression': {
      const items: unknown[] = [];
      for (const e of (node.elements as JsNode[] | undefined) ?? []) {
        const v = literalValue(e);
        if (v === undefined) return undefined;
        items.push(v);
      }
      return items;
    }
    default: return undefined;
  }
}

// config.screens[path].props (plus the page's own pageProps defaults) ->
// "Home(props = HomeProps(promo = "..."))". Typed props coerce to declared
// Kotlin types; untyped `component Home(props)` pages pass any scalar-compatible
// value (fields inferred from usage). Pages without a props param are ignored
// with a warning so the config stays the source of truth.
function screenPropsArg(page: { path: string; component: string; props: Array<{ name: string; type: string }>; hasProps: boolean; inferredProps: string[]; defaultProps: Record<string, unknown> }, config: VeskConfig): string {
  const configValues = config.screens?.[page.path]?.props;
  const values: Record<string, unknown> = { ...page.defaultProps, ...(configValues ?? {}) };
  const keys = Object.keys(values);
  if (keys.length === 0) return '';
  if (!page.hasProps) {
    log('warn', `screens props ignored: ${page.component} declares no props parameter`);
    return '';
  }
  const typedByName = new Map(page.props.map((p) => [p.name, p.type]));
  const args: string[] = [];
  for (const name of keys) {
    const value = values[name];
    if (value === undefined || value === null) continue;
    let type = typedByName.get(name);
    if (type === undefined) {
      if (!page.inferredProps.includes(name)) {
        log('warn', `screens props: ${page.component} does not use a prop named "${name}" — skipped`);
        continue;
      }
      type = 'Any';
    }
    const kt = coercePropValue(type, value);
    if (kt === null) {
      log('warn', `screens props: ${page.component}.${name} = ${JSON.stringify(value)} not coercible to ${type} — skipped`);
      continue;
    }
    args.push(`${name} = ${kt}`);
  }
  if (args.length === 0) return `${page.component}Props()`;
  return `props = ${page.component}Props(${args.join(', ')})`;
}

export function generateAppKt(appDir: string, config: VeskConfig): void {
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
      const ast = parse(source) as unknown as JsNode;
      const decls = findComponentDecls(ast);
      const compName = (decls[0]?.name ?? r.replace(/\.vsk$/, '').replace(/\/page$/, '')) || 'Page';
      const relPath = r === 'page.vsk' ? '' : (r.replace(/\.vsk$/, '').replace(/\/page$/, '')) || 'page';
      const path = '/' + relPath;
      // A page can mark itself as an exit page via a typed exitBack prop:
      // component Contact(props: { exitBack?: boolean }).
      const propsParam = decls[0]?.params[0] ?? null;
      const hasProps = !!propsParam && !(propsParam.type === 'Identifier' && propsParam.name === 'content');
      const props = propsParam ? propsDataType(propsParam) ?? [] : [];
      const inferredProps = hasProps && props.length === 0
        ? inferPropsFromUsage((decls[0]?.node.body as JsNode | undefined) ?? null)
        : [];
      const exitBack = decls.some(
        (d) => (d.params[0] ? propsDataType(d.params[0]) ?? [] : []).some((p) => p.name === 'exitBack'),
      );
      return { path, component: compName, exitBack, props, hasProps, inferredProps, defaultProps: pageDefaultProps(ast) };
    });

  const routes = (config.routes && config.routes.length > 0)
    ? config.routes
    : pages;

  const routeLines = routes
    .map((p) => {
      const routePath = (p.path || '').replace(/\[([^\]]+)\]/g, '{$1}');
      const page = pages.find((pg) => pg.component === p.component);
      const propsArg = page ? screenPropsArg(page, config) : '';
      return `Route("${routePath}") { ${p.component}(${propsArg}) }`;
    })
    .join(',\n        ');

  // Exit pages: the root, back.exitRoutes from config, routes flagged
  // exitOnBack, and components declaring the exitBack prop.
  const exitPaths = new Set<string>(['/']);
  for (const r of config.back?.exitRoutes ?? []) exitPaths.add(r);
  for (const r of routes) if ('exitOnBack' in r && r.exitOnBack) exitPaths.add('/' + (r.path || '').replace(/^\/+/, '').replace(/\[([^\]]+)\]/g, '{$1}'));
  for (const p of pages) if (p.exitBack) exitPaths.add(p.path);

  const back = config.back ?? {};
  const backArgs = `\n            back = BackBehavior(mode = "${back.mode ?? 'stack'}", doubleBackToExit = ${back.doubleBackToExit ?? true}, exitDelayMs = ${back.exitDelayMs ?? 2000}, exitRoutes = listOf(${[...exitPaths].map((p) => `"${p}"`).join(', ')})),`;

  const tablet = config.device === 'tablet';
  const tabletImports = tablet
    ? `import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.Alignment
`
    : '';
  // Edge-to-edge preference drives both the window setup (MainActivity) and
  // how much room the content reserves for the system bars. With edge-to-edge
  // disabled the classic window keeps content out of the bars on Android < 15,
  // but Android 15+ (targetSdk 35) forces edge-to-edge, so the bars still need
  // padding there.
  const e2e = config.edgeToEdge ?? {};
  const e2eEnabled = e2e.enabled !== false;
  const padBars = e2eEnabled ? e2e.paddingBars !== false : true;
  const padDecl = e2eEnabled
    ? (padBars
        ? `    val barsPadding = Modifier.statusBarsPadding().navigationBarsPadding()`
        : `    val barsPadding = Modifier`)
    : `    val barsPadding = if (Build.VERSION.SDK_INT >= 35) Modifier.statusBarsPadding().navigationBarsPadding() else Modifier`;
  const buildImport = e2eEnabled ? '' : `import android.os.Build\n`;
  const contentBox = tablet
    ? `        // Tablet layout: content is constrained to a centered 840dp column.
        Box(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxSize().then(barsPadding).widthIn(max = 840.dp).align(Alignment.Center)) {
                Layout {
                    AppRouter(start = "/", routes = listOf(
                        ${routeLines}
                    ),${backArgs})
                }
            }
        }`
    : `        // System bars are drawn edge-to-edge (or, on Android 15+, the OS
        // forces them to be); push the app content below the status bar and
        // above the navigation bar.
        Box(modifier = Modifier.fillMaxSize().then(barsPadding)) {
            Layout {
                AppRouter(start = "/", routes = listOf(
                    ${routeLines}
                ),${backArgs})
            }
        }`;

  writeFileSync(
    join(outDir, 'App.kt'),
    `package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
${buildImport}${tabletImports}import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()
    LaunchedEffect(Unit) { nav.navigate("/") }
    // Register the current activity for browser-API dialogs (alert).
    val veskContext = LocalContext.current
    SideEffect { veskAppSetup(veskContext) }
${padDecl}
    CompositionLocalProvider(LocalNavController provides nav) {
        ${contentBox.replace('\n', '\n        ')}
    }
}
`,
  );
  log('gen', `App.kt -> renders ${pages.length} routed pages${tablet ? ' (tablet layout)' : ''}`);
}

function isTsIdentifier(name: string): boolean {
  if (name.length === 0) return false;
  const c0 = name.charCodeAt(0);
  const first = (c0 >= 97 && c0 <= 122) || (c0 >= 65 && c0 <= 90) || c0 === 95 || c0 === 36;
  if (!first) return false;
  for (let i = 1; i < name.length; i++) {
    const c = name.charCodeAt(i);
    const ok = (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95 || c === 36;
    if (!ok) return false;
  }
  return true;
}

function tsTypeOf(sig: LibParamSig | undefined): string {
  if (!sig) return 'any';
  switch (sig.shape) {
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'void':
      return 'void';
    case 'function':
      return '(...args: any[]) => any';
    case 'array':
      return `Array<${tsTypeOf(sig.elem)}>`;
    case 'enum': {
      const values = (sig.enumValues ?? []).filter(isTsIdentifier);
      return values.length > 0 ? values.map((v) => `'${v}'`).join(' | ') : 'string';
    }
    default:
      return 'any';
  }
}

// A library export is script-callable when its whole surface is primitive —
// must match the compiler's `libCallable` gate so a declared TS signature can
// never promise a call the compiler refuses to emit.
function libCallable(sig: LibExportSig): boolean {
  if (sig.isEnum) return false;
  if (!sig.qualified || sig.target.length === 0) return false;
  if (!sig.params.every((p) => p.shape === 'number' || p.shape === 'string' || p.shape === 'boolean' || p.shape === 'any')) return false;
  return sig.returnShape === 'void' || sig.returnShape === 'number' || sig.returnShape === 'string' || sig.returnShape === 'boolean' || sig.returnShape === 'any';
}

function tsReturnType(sig: LibExportSig): string {
  switch (sig.returnShape) {
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'void':
      return 'void';
    default:
      return 'any';
  }
}

function libJsdoc(sig: LibExportSig): string[] {
  if (!sig.jsdoc || sig.jsdoc.length === 0) return [];
  const lines = sig.jsdoc.split('\n').map((l) => ` * ${l}`.trimEnd());
  return ['/**', ...lines, ' */'];
}

function libExportDecl(sig: LibExportSig): string[] {
  const doc = libJsdoc(sig);
  if (sig.isEnum) {
    const values = (sig.enumValues ?? []).filter(isTsIdentifier);
    if (values.length === 0) return [...doc, `export declare const ${sig.name}: any;`];
    const members = values.map((v) => `    readonly ${v}: '${v}';`).join('\n');
    return [
      ...doc,
      `export declare const ${sig.name}: {\n${members}\n  };`,
      `export declare type ${sig.name} = (typeof ${sig.name})[keyof typeof ${sig.name}];`,
    ];
  }
  // Fully-typed free functions: all-primitive params and a primitive/void
  // return — exactly the surface the compiler's libCallable gate can emit.
  if (!sig.isConstructor && libCallable(sig)) {
    const params = sig.params
      .map((p, i) => `${isTsIdentifier(p.name) ? p.name : `arg${i}`}${sig.defaultParams.includes(p.name) ? '?' : ''}: ${tsTypeOf(p)}`)
      .join(', ');
    return [...doc, `export declare function ${sig.name}(${params}): ${tsReturnType(sig)};`];
  }
  // Non-constructor, non-enum exports are opaque values (the compiler only
  // translates constructors, callable primitive functions and markup tags
  // into Kotlin calls).
  if (!sig.isConstructor) return [...doc, `export declare const ${sig.name}: any;`];
  // Zero-parameter constructors (`Gson()`, `OkHttpClient()`) are plain
  // function calls; instance types still serve as annotations.
  if (sig.params.length === 0) {
    return [
      `export declare interface ${sig.name} {}`,
      ...doc,
      `export declare function ${sig.name}(): ${sig.name};`,
    ];
  }
  // Library constructors are called with a single object literal
  // (LineChartData({ ... })), and their instance type also serves as a type
  // annotation (const chart: LineChartData). Emit an opaque interface for the
  // type space plus a function declaration for the call form the compiler
  // accepts — required params match the Kotlin params without defaults.
  const props = sig.params
    .map((p, i) => `    ${isTsIdentifier(p.name) ? p.name : `arg${i}`}${sig.defaultParams.includes(p.name) ? '?' : ''}: ${tsTypeOf(p)};`)
    .join('\n');
  return [
    `export declare interface ${sig.name} {}`,
    ...doc,
    `export declare function ${sig.name}(props: {\n${props}\n  }): ${sig.name};`,
  ];
}

// The per-library TS declaration lines for one library record, in the same
// shape the compiler accepts: typed `export declare` lines for every signature,
// plus opaque `export declare const` fallbacks for exports/tags without a typed
// signature. Shared by the ambient module generator (`vesk-env.d.ts`) and the
// per-library standalone typing files committed in the registry, so the two
// never drift.
export function vskLibDeclarationLines(record: VskLibRecord): string[] {
  const decls = new Map<string, string[]>();
  const sigs = record.signatures ?? {};
  for (const name of Object.keys(sigs)) {
    const sig = sigs[name];
    if (sig) decls.set(name, libExportDecl(sig));
  }
  for (const name of record.exports) {
    if (!decls.has(name)) decls.set(name, [`export declare const ${name}: any;`]);
  }
  for (const name of Object.keys(record.tags ?? {})) {
    if (!decls.has(name)) decls.set(name, [`export declare const ${name}: any;`]);
  }
  return [...decls.values()].flat();
}

// A standalone, exportable `.ts` typing file for a library's `@vesk/<id>` virtual
// module — the concrete type surface a library maintainer can ship alongside the
// `.vsklib` binding. The compiler resolves names from the record (not this
// file), but keeping this file next to the record gives editors, tsc and tooling
// a real importable module instead of a synthesized ambient blob.
export function vskLibTypingFile(record: VskLibRecord): string {
  const lines = vskLibDeclarationLines(record);
  const tags = Object.keys(record.tags ?? {});
  const header = [
    `// Generated by vesk-native from ${record.id}.vsklib — do not edit by hand.`,
    `// Type surface for the \`@vesk/${record.id}\` virtual module (${record.name} ${record.version}).`,
    `// Regenerate with packages/cli-native/src/metadata/regenerate-typings.ts.`,
    `// The compiler resolves these names from the .vsklib record, not this file.`,
    tags.length > 0 ? `// Markup tags: ${tags.map((t) => `<${t}>`).join(', ')}.` : '',
  ].filter(Boolean);
  return `${header.join('\n')}\n\n${lines.join('\n\n')}\n`;
}

// Ambient TypeScript declarations for the `@vesk/<id>` virtual modules the
// compiler resolves at build time. There is no npm package behind them, so a
// TS type-check or an IDE/LSP that parses the script sections would fail with
// "Cannot find module '@vesk/<id>'". This generated .d.ts declares each
// installed library's exports + markup tags from libraries.json — the same
// source the compiler reads — so imports resolve with useful types. It is
// regenerated on every build and after `vesk add/remove/update`; users never
// edit it, and it never ships in the APK (type-only).
export function generateVskLibDeclarations(target: string): void {
  const libs = installedLibraries(target);
  const modules: string[] = [];
  for (const lib of libs) {
    const body = vskLibDeclarationLines(lib).map((d) => `  ${d}`).join('\n');
    modules.push(`declare module '@vesk/${lib.id}' {\n${body}\n}`);
  }
  const browserModule = browserModuleDecl();
  const browserGlobal = browserGlobalDecl();
  writeFileSync(
    join(target, 'vesk-env.d.ts'),
    `// Generated by vesk-native from libraries.json. The @vesk/* imports the
// compiler resolves at build time are virtual modules with no npm package, so
// editors, LSP and tsc resolve them against these ambient declarations.
// Regenerated on every build and after 'vesk add/remove/update'.
// Do not edit by hand.

${modules.join('\n\n')}

${browserModule}
`,
  );
  if (browserGlobal) {
    // The browser globals (openSqlite, auth) augment the global scope, which
    // requires a module file; ambient @vesk module declarations require a
    // script file — so the two live in separate generated files.
    writeFileSync(
      join(target, 'vesk-browser.d.ts'),
      `// Generated by vesk-native. The vesk browser-API globals (openSqlite,
// signUp/signIn/signOut/currentUser/isSignedIn + their interfaces) augment the
// global scope here so they resolve without imports; standard browser globals
// keep their DOM-lib types. Regenerated on every build. Do not edit by hand.

${browserGlobal}

// Makes this file a module so the declare-global surface above actually
// augments the global scope.
export {};
`,
    );
  }
  log('gen', `vesk-env.d.ts (${libs.length} virtual @vesk modules + @vesk/browser), vesk-browser.d.ts (browser globals)`);
}

export function generateProject(target: string, config: VeskConfig): void {
  const appDir = join(target, 'app');
  mkdirSync(join(appDir, 'src', 'main', 'kotlin', 'app'), { recursive: true });
  mkdirSync(join(appDir, 'src', 'main', 'res', 'values'), { recursive: true });
  mkdirSync(join(target), { recursive: true });

  // Build scaffolding is framework-owned: the template is the single source of
  // truth and is refreshed on every generation. Users never edit gradle files.
  for (const f of ['build.gradle.kts', 'gradle.properties', 'settings.gradle.kts']) {
    const src = join(TEMPLATE_DIR, f);
    const dest = join(target, f);
    if (!existsSync(src)) continue;
    cpSync(src, dest);
  }
  // Point the aapt2 override at this machine's toolchain (or drop the line
  // when no custom aapt2 is needed — AGP ships a bundled one for x86_64).
  syncAapt2Override(join(target, 'gradle.properties'));
  if (!existsSync(join(target, 'local.properties'))) {
    writeFileSync(join(target, 'local.properties'), `sdk.dir=${DEFAULT_SDK}\n`);
  }

  // What the app actually uses drives everything below: media elements decide
  // storage permissions + the media broadcast dependency, device-API calls
  // decide runtime permissions and gradle dependencies.
  const mediaRefs = collectVskFiles(appDir).flatMap((f) =>
    extractMediaSources(readFileSync(f, 'utf8')),
  );
  const deviceMedia = mediaRefs.some(({ src }) => isFileImageSrc(src));
  const hasMedia = mediaRefs.length > 0;
  const deviceApis = collectDeviceApiUsage(appDir);
  const browserApis = collectBrowserApiUsage(appDir);
  // Installed Kotlin libraries (root libraries.json — the committed source of
  // truth): their gradle coordinates and permissions are registered here, at
  // generation time.
  const libs = installedLibraries(target);
  // The @vesk/* virtual modules need type declarations for editors/LSP — emit
  // them from the same installed-library records the compiler resolves.
  generateVskLibDeclarations(target);

  generateSettingsGradleKts(target, config);
  // Semantic Tailwind neutrals (surface/onSurface/outline tokens) activate when
  // the project declares darkColors — same .vsk matches web in light and dark.
  setAdaptiveDark(!!config.darkColors);
  // device.* API usage in page scripts derives native needs (RECORD_AUDIO,
  // FileProvider, POST_NOTIFICATIONS) the same way elements derive storage.
  const deviceNotify = deviceApis.has('notify');
  generateManifest(target, config, deviceMedia, hasMedia || deviceNotify, hasMedia, deviceApis, libs, browserApis);
  generateThemes(target, config);
  generateMainActivity(target, config, deviceMedia, hasMedia || deviceNotify);
  generateThemeKt(target, config);
  generateRouterKt(appDir);
  compileVskFiles(appDir, config, target);
  generateAppKt(appDir, config);
  // Last: Runtime.kt is pruned to the helpers the generated pages actually use.
  // Gradle dependencies are derived from the same usage so they stay in lock
  // step with the pruned imports and code.
  const used = generateRuntimeKt(appDir, config);
  generateAppBuildGradleKts(target, config, deviceApis, hasMedia, used, libs);
}

export function syncAapt2Override(gradleProperties: string): void {
  if (!existsSync(gradleProperties)) return;
  const lines = readFileSync(gradleProperties, 'utf8').split('\n');
  const kept = lines.filter((l) => !l.startsWith('android.aapt2FromMavenOverride'));
  if (existsSync(AAPT2_OVERRIDE)) kept.push(`android.aapt2FromMavenOverride=${AAPT2_OVERRIDE}`);
  writeFileSync(gradleProperties, `${kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
}

