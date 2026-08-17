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
import { compileNpmModules } from '@cli-native/npm';
import { KtErrors } from '@compiler-native/js2kt';
import type { JsNode } from '@compiler-native/js2kt';
import type { VeskConfig } from '@vesk/native';
import { AAPT2_OVERRIDE, DEFAULT_SDK, NAVIGATION_KT, TEMPLATE_DIR, collectVskFiles, colorLiteral, log, slugify } from '@cli-native/constants';
import { API_PERMISSIONS, MAX_SDK_PERMS, collectBrowserApiUsage, collectDeviceApiUsage, collectRuntimeUsage } from '@cli-native/usage';
import { BIOMETRIC_AUTH_BODY, BIOMETRIC_CHECK_BODY, IOS_RUNTIME_IMPORTS, QRGEN_BODY, QR_OVERLAY_BLOCK, RUNTIME_COMMON_IMPORTS, RUNTIME_CORE, RUNTIME_HELPERS, RUNTIME_ORDER, runtimeImports } from '@cli-native/runtime-templates';
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
include(":app", ":shared")
`,
  );
  log('gen', 'settings.gradle.kts (rootProject.name from appName; :app + :shared)');
}

// Generated Kotlin and bundled resources live in the :shared module (a KMP
// com.android.kotlin.multiplatform.library — the future home of commonMain +
// iosMain once the runtime expect/actual seam lands). The :app module keeps
// only the Android chrome: manifest, MainActivity, app-level res.
function sharedKotlinDir(target: string): string {
  return join(target, 'shared', 'src', 'androidMain', 'kotlin', 'app');
}

// The portable runtime core lives in commonMain: pure Kotlin + compose
// foundation/ui/coroutines only. Platform seams (expect) are declared here
// with their Android actuals in androidMain (Runtime.kt), so nothing in this
// directory ever references android.*.
function sharedCommonKotlinDir(target: string): string {
  return join(target, 'shared', 'src', 'commonMain', 'kotlin', 'app');
}

// The iOS actuals (Phase 5) mirror the androidMain layout: Runtime.ios.kt
// carries every expect/actual seam the app uses, MainViewController.kt is the
// Compose Multiplatform entry point the Swift shell embeds, and navigation
// actuals sit in iosMain/app/navigation.
function sharedIosKotlinDir(target: string): string {
  return join(target, 'shared', 'src', 'iosMain', 'kotlin', 'app');
}

function sharedResDir(target: string): string {
  return join(target, 'shared', 'src', 'androidMain', 'res');
}

// Gradle dependencies derived from actual usage — the same conditions that
// gate the Runtime.kt imports and code, so no reference ever dangles and no
// library ships "just in case". deviceApis is the set of device.* calls in
// page scripts/elements; used is the set of pruned runtime helpers actually
// referenced by the generated pages; hasMedia covers media elements.
// libs are the installed .vsklib libraries — registered verbatim (their
// permissions are wired into the manifest by generateManifest).
// These land in the :shared module's androidMain (usage-derived deps are page/
// runtime concerns; the :app module only hosts the Android chrome).
function usageDeps(deviceApis: Set<string>, hasMedia: boolean, used: Set<string>, libs: VskLibRecord[]): string[] {
  // Explicit versions, not the compose BOM — the KMP module's androidMain
  // source-set dependency handler has no platform() helper. The versions are
  // exactly what compose-bom:2026.06.01 pins (ui 1.11.4, material3 1.4.0), so
  // the app keeps the identical androidx artifacts it resolves today.
  const deps = [
    'implementation("androidx.compose.ui:ui:1.11.4")',
    'implementation("androidx.compose.ui:ui-tooling-preview:1.11.4")',
    'implementation("androidx.compose.material3:material3:1.4.0")',
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
  return deps;
}

export function generateSharedBuildGradleKts(target: string, config: VeskConfig, deviceApis: Set<string>, hasMedia: boolean, used: Set<string>, libs: VskLibRecord[]): void {
  const deps = usageDeps(deviceApis, hasMedia, used, libs);
  const minSdk = Math.max(config.minSdk ?? 24, ...libs.map((l) => l.minSdk ?? 0));
  // CMP iOS targets + the org.jetbrains.compose.* coordinate switch are gated
  // on the host: macOS emits the iOS framework configuration and CMP deps,
  // every other host (Linux/CI) emits exactly the pre-CMP build.gradle.kts so
  // the Android build stays byte-identical.
  const isMac = process.platform === 'darwin';
  const cmpCommonDeps = [
    'implementation("org.jetbrains.compose.runtime:runtime:1.11.0")',
    'implementation("org.jetbrains.compose.ui:ui:1.11.0")',
    'implementation("org.jetbrains.compose.foundation:foundation:1.11.0")',
    'implementation("org.jetbrains.compose.animation:animation:1.11.0")',
    'implementation("org.jetbrains.compose.material3:material3:1.9.0")',
    'implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")',
  ];
  // material3 is 1.9.0 on macOS too: CMP 1.11.0's own dependency mapping
  // resolves compose.material3 to org.jetbrains.compose.material3:material3:1.9.0
  // (the material3 stable line trails the CMP releases — there is no 1.11.0).
  const commonDeps = isMac ? cmpCommonDeps : [
    'implementation("androidx.compose.runtime:runtime:1.11.4")',
    'implementation("androidx.compose.ui:ui:1.11.4")',
    'implementation("androidx.compose.foundation:foundation:1.11.4")',
    'implementation("androidx.compose.foundation:foundation-layout:1.11.4")',
    'implementation("androidx.compose.animation:animation-core:1.11.4")',
    'implementation("androidx.compose.material3:material3:1.4.0")',
    'implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")',
  ];
  const commonNote = isMac
    ? `        // The portable core (RuntimeCore.kt) + navigation Router.kt are plain
        // Kotlin + compose ui/foundation/runtime/animation + coroutines only —
        // no LocalContext, no platform APIs. macOS hosts resolve these from the
        // CMP 1.11 org.jetbrains.compose.* artifacts (the multiplatform
        // variants that carry the iOS targets; foundation and animation pull
        // foundation-layout / animation-core transitively).`
    : `        // The portable core (RuntimeCore.kt) + navigation Router.kt are plain
        // Kotlin + compose ui/foundation/runtime/animation-core + coroutines
        // only — no LocalContext, no platform APIs. The versions match what
        // the android source set resolves (ui/foundation 1.11.4, material3
        // 1.4.0 from the app BOM, kotlinx-coroutines-core 1.9.0 transitively).
        // material3 carries a common variant, so portable pages compile here.`;
  // macOS-only emission: the iOS targets + shared framework and the iosMain
  // dependency block. Every other host leaves these strings empty.
  const iosTargetsBlock = isMac
    ? `    // Compose Multiplatform iOS targets — macOS hosts only. CMP 1.11 drops
    // Apple x86_64, so iosArm64 + iosSimulatorArm64 are the full target set.
    // The framework baseName "Shared" mirrors the :shared module name — the
    // iosApp Xcode embedding resolves the framework by this convention.
    listOf(iosArm64(), iosSimulatorArm64()).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }
`
    : '';
  const iosMainBlock = isMac
    ? `        iosMain.dependencies {
${cmpCommonDeps.map((l) => `            ${l}`).join('\n')}
        }
`
    : '';
  writeFileSync(
    join(target, 'shared', 'build.gradle.kts'),
    `import org.jetbrains.kotlin.gradle.ExperimentalKotlinGradlePluginApi

plugins {
    id("com.android.kotlin.multiplatform.library")
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.kotlin.plugin.compose")
}

// The :shared KMP module is the framework's home: generated pages live in
// src/androidMain today (R class + LocalContext), and the runtime splits
// between commonMain (pure-Kotlin core + expect seams) and androidMain
// (android actuals). iOS targets are added macOS-gated with the CMP
// milestone — never configured on Linux; when they land, the commonMain
// androidx compose coordinates below switch to their org.jetbrains.compose
// equivalents.
@OptIn(ExperimentalKotlinGradlePluginApi::class)
kotlin {
    android {
        namespace = "${config.appId}.shared"
        compileSdk = ${config.compileSdk}
        minSdk = ${minSdk}
        androidResources { enable = true }
        compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 }
    }

${iosTargetsBlock}    sourceSets {
${commonNote}
        commonMain.dependencies {
${commonDeps.map((l) => `            ${l}`).join('\n')}
        }
${iosMainBlock}        androidMain.dependencies {
${deps.join('\n')}
        }
    }
}
`,
  );
  log('gen', isMac
    ? `shared/build.gradle.kts (macOS: iosArm64 + iosSimulatorArm64, Shared static framework; ${deps.length} androidMain dependencies; commonMain/iosMain: CMP 1.11 org.jetbrains.compose.* coords)`
    : `shared/build.gradle.kts (${deps.length} androidMain dependencies, ${deps.length - 6} usage-derived; commonMain: runtime + ui + foundation + animation-core + coroutines-core)`);
}

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

export function generateAppBuildGradleKts(target: string, config: VeskConfig, libs: VskLibRecord[]): void {
  // The :app module hosts only the Android chrome (MainActivity, manifest,
  // app-level res). The compose BOM stays here for the chrome's few compose
  // references; the usage-derived dependencies live in :shared (usageDeps).
  const deps = [
    'implementation(project(":shared"))',
    'implementation(platform("androidx.compose:compose-bom:2026.06.01"))',
    'implementation("androidx.compose.ui:ui")',
    'implementation("androidx.compose.material3:material3")',
    'implementation("androidx.activity:activity-compose:1.13.0")',
    'implementation("androidx.core:core-ktx:1.19.0")',
    'implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")',
    // MainActivity extends FragmentActivity (the runtime's ActivityResult
    // launchers require it). The shared module gets fragment transitively via
    // androidx.biometric; this pins the same 1.2.5 on the app chrome's own
    // compile classpath so both modules resolve identically.
    'implementation("androidx.fragment:fragment:1.2.5")',
    // Splash screen backward-compat (only when splash is enabled).
    ...(config.splash?.enabled ? ['implementation("androidx.core:core-splashscreen:1.0.1")'] : []),
  ];
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
  log('gen', `app/build.gradle.kts (${deps.length} chrome dependencies; usage-derived deps live in :shared)`);
}

// Android deep-link scheme: config.deepLinks.scheme wins; otherwise the
// appId-derived scheme ('com.vesk.demo3' -> 'vesk.demo3', the two trailing
// reverse-DNS segments in order). Plain string ops only.
function deepLinkScheme(config: VeskConfig): string {
  const dl = config.deepLinks;
  if (dl?.scheme) return dl.scheme;
  const segs = config.appId.split('.').filter((s) => s.length > 0);
  if (segs.length >= 2) return segs[segs.length - 2] + '.' + segs[segs.length - 1];
  return segs[0] ?? config.appId;
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
  // Deep links: when configured, MainActivity declares a VIEW intent-filter
  // (DEFAULT + BROWSABLE) so an external URL opens the app at the matching
  // route. App Links verification (autoVerify) is out of scope — the filter
  // matches app-scheme and http(s) links alike without web verification.
  const deepLinkBlock = config.deepLinks
    ? `        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="${deepLinkScheme(config)}"${config.deepLinks.host ? ` android:host="${config.deepLinks.host}"` : ''}${config.deepLinks.pathPrefix ? ` android:pathPrefix="${config.deepLinks.pathPrefix}"` : ''} />
        </intent-filter>
`
    : '';
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
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/Theme.VeskApp"
        android:allowBackup="false">
${receiverBlock}${providerBlock}${screenRecordBlock}        <activity
            android:name=".MainActivity"
            android:exported="true"${config.splash?.enabled ? '\n            android:theme="@style/Theme.VeskApp.Splash"' : ''}
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|keyboard"${orientationAttr}>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
${deepLinkBlock}        </activity>
    </application>

</manifest>
`,
  );
  log('gen', `AndroidManifest.xml (appName, orientation${config.deepLinks ? ', deep links' : ''} from config)`);
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

export function generateIconResources(target: string, config: VeskConfig): void {
  const resDir = join(target, 'app', 'src', 'main', 'res');
  const icon = config.icon;
  const bgColor = icon?.backgroundColor ?? config.colors.primary;
  // Auto-detect assets/icon.png if no explicit config
  const foreground = icon?.foreground ?? (existsSync(join(target, 'assets', 'icon.png')) ? 'assets/icon.png' : undefined);

  // Adaptive icon XML (API 26+)
  const anydpiDir = join(resDir, 'mipmap-anydpi-v26');
  mkdirSync(anydpiDir, { recursive: true });

  const fgRef = foreground ? '@mipmap/ic_launcher_foreground' : '@drawable/ic_launcher_foreground';
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="${fgRef}"/>
</adaptive-icon>`;

  writeFileSync(join(anydpiDir, 'ic_launcher.xml'), adaptiveXml);
  writeFileSync(join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml);

  // Background color resource
  const valuesDir = join(resDir, 'values');
  mkdirSync(valuesDir, { recursive: true });
  writeFileSync(join(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${bgColor}</color>\n</resources>\n`
  );

  if (foreground) {
    // Copy user's foreground PNG into mipmap buckets
    const srcPath = resolve(target, foreground);
    if (existsSync(srcPath)) {
      const densities: Array<[string, number]> = [
        ['mipmap-mdpi', 48], ['mipmap-hdpi', 72], ['mipmap-xhdpi', 96],
        ['mipmap-xxhdpi', 144], ['mipmap-xxxhdpi', 192],
      ];
      for (const [dir] of densities) {
        const outDir = join(resDir, dir);
        mkdirSync(outDir, { recursive: true });
        cpSync(srcPath, join(outDir, 'ic_launcher.png'));
        cpSync(srcPath, join(outDir, 'ic_launcher_round.png'));
      }
      // Full-size for adaptive
      cpSync(srcPath, join(anydpiDir, 'ic_launcher_foreground.png'));
    }
  } else {
    // Default: letter-on-color vector drawable
    const drawableDir = join(resDir, 'drawable');
    mkdirSync(drawableDir, { recursive: true });
    writeFileSync(join(drawableDir, 'ic_launcher_foreground.xml'),
      `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="108dp" android:height="108dp"\n    android:viewportWidth="108" android:viewportHeight="108">\n    <group android:translateX="22" android:translateY="22">\n        <path\n            android:fillColor="#FFFFFF"\n            android:pathData="M32,0 L64,0 A32,32 0 1,1 0,32 L0,0 Z"/>\n    </group>\n</vector>\n`
    );
  }
  log('gen', 'icon resources (adaptive icon + background color)');
}

export function generateSplashTheme(target: string, config: VeskConfig): void {
  // Auto-detect assets/splash.png or splash.vsk — enable splash if either exists
  const hasSplashImage = existsSync(join(target, 'assets', 'splash.png'));
  const hasSplashVsk = existsSync(join(target, 'app', 'splash.vsk'));
  const splashEnabled = config.splash?.enabled ?? (hasSplashImage || hasSplashVsk);
  if (!splashEnabled && !hasSplashImage && !hasSplashVsk) return;

  const resDir = join(target, 'app', 'src', 'main', 'res');
  mkdirSync(join(resDir, 'values'), { recursive: true });

  const bgColor = config.splash?.backgroundColor ?? config.colors.background;

  // Determine the splash logo reference
  let logoRef: string;
  if (config.splash?.logo) {
    // Explicit config takes priority
    logoRef = '@drawable/splash_logo';
  } else if (hasSplashImage) {
    // Auto-detected assets/splash.png
    logoRef = '@drawable/splash_bg';
  } else if (config.icon?.foreground) {
    logoRef = '@mipmap/ic_launcher_foreground';
  } else {
    logoRef = '@drawable/ic_launcher_foreground';
  }

  // Copy splash.png to drawable resources if present
  if (hasSplashImage) {
    const drawableDir = join(resDir, 'drawable');
    mkdirSync(drawableDir, { recursive: true });
    cpSync(join(target, 'assets', 'splash.png'), join(drawableDir, 'splash_bg.png'));
  }

  writeFileSync(join(resDir, 'splash_theme.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <style name="Theme.VeskApp.Splash" parent="Theme.SplashScreen">\n        <item name="windowSplashScreenBackground">${bgColor}</item>\n        <item name="windowSplashScreenAnimatedIcon">${logoRef}</item>\n        <item name="postSplashScreenTheme">@style/Theme.VeskApp</item>\n    </style>\n</resources>\n`
  );
  log('gen', `splash_theme.xml (${hasSplashImage ? 'auto-detected splash.png' : hasSplashVsk ? 'splash.vsk component' : 'config.splash'})`);
}

export function generateMainActivity(target: string, config: VeskConfig, mediaReadPerms: boolean, mediaNotifyPerms: boolean): void {
  const pkgPath = config.appId.split('.').join('/');
  const kotlinRoot = join(target, 'app', 'src', 'main', 'kotlin');
  // The app module's Kotlin is entirely generated (MainActivity, DebugCrashLog);
  // wipe stale package dirs from previous appId values (e.g. a renamed bundle id).
  rmSync(kotlinRoot, { recursive: true, force: true });
  const outDir = join(kotlinRoot, pkgPath);
  mkdirSync(outDir, { recursive: true });
  const e2e = config.edgeToEdge ?? {};
  const e2eEnabled = e2e.enabled !== false;
  const e2eImports = e2eEnabled ? `import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
` : '';
  const splashImport = config.splash?.enabled
    ? 'import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen\n'
    : '';
  const splashCall = config.splash?.enabled
    ? 'val splashScreen = installSplashScreen()\n        '
    : '';
  const e2eCall = e2eEnabled
    ? `        enableEdgeToEdge(
            statusBarStyle = ${systemBarStyleExpr(e2e.statusBarStyle, config.colors.background, config.darkColors.background)},
            navigationBarStyle = ${systemBarStyleExpr(e2e.navigationBarStyle, config.colors.background, config.darkColors.background)},
        )\n`
    : '';
  // Deep links: when configured, ACTION_VIEW launch intents are translated to
  // a route path (Uri.parse(...).path, e.g. '/flight/123') delivered to App()
  // so AppRouter restarts at the matching route. When not configured, nothing
  // is emitted — the generated code stays byte-identical to today.
  const deepLinks = config.deepLinks;
  const deepLinkImports = deepLinks ? 'import androidx.compose.runtime.mutableStateOf\n' : '';
  const deepLinkField = deepLinks
    ? `
    // Deep-link target: path of the last ACTION_VIEW intent, forwarded to
    // App() so AppRouter restarts at the matching route.
    private val deepLinkPath = mutableStateOf<String?>(null)

    private fun handleDeepLink(intent: Intent) {
        if (intent.action == Intent.ACTION_VIEW) {
            val path = intent.data?.path
            if (path != null && path.isNotEmpty()) deepLinkPath.value = path
        }
    }
`
    : '';
  const deepLinkCall = deepLinks ? `        handleDeepLink(intent)\n` : '';
  const deepLinkNewIntent = deepLinks ? `        setIntent(intent)
        handleDeepLink(intent)
` : '';
  const appCall = deepLinks ? 'App(deepLink = deepLinkPath.value)' : 'App()';
  const permImports = (mediaReadPerms || mediaNotifyPerms)
    ? `import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
`
    : '';
  const permLaunch = (mediaReadPerms || mediaNotifyPerms)
    ? `
    private val mediaPermLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        ${splashCall}super.onCreate(savedInstanceState)
        if (Thread.getDefaultUncaughtExceptionHandler() !is DebugCrashLog) {
            Thread.setDefaultUncaughtExceptionHandler(DebugCrashLog(Thread.getDefaultUncaughtExceptionHandler()))
        }
${e2eCall}        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
${deepLinkCall}        if (Build.VERSION.SDK_INT >= 33) {
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
        ${splashCall}super.onCreate(savedInstanceState)
        if (Thread.getDefaultUncaughtExceptionHandler() !is DebugCrashLog) {
            Thread.setDefaultUncaughtExceptionHandler(DebugCrashLog(Thread.getDefaultUncaughtExceptionHandler()))
        }
${e2eCall}        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
${deepLinkCall}        setContent {`;
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

${deepLinkImports}${permImports}${splashImport}${e2eImports}import android.os.Bundle
import android.content.Intent
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import app.App
import app.VeskDeviceSession
import app.VeskTheme
import app.jsSafe

class MainActivity : FragmentActivity() {${deepLinkField}${permLaunch}
            VeskTheme {
                Surface(modifier = Modifier) {
                    ${appCall}
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
${deepLinkNewIntent}        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
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
    join(sharedKotlinDir(target), 'Theme.kt'),
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

// The runtime is pruned to only the helpers referenced by the generated app
// code, so apps ship exactly the tailwind runtime they use. Symbols are
// collected from every generated .kt file except Runtime.kt itself; helpers
// are emitted with their transitive dependencies (e.g. any color filter also
// emits the private veskColorFilter base). truthy/num are core JS->Kotlin
// runtime helpers always included.
//
// CMP split: pure-Kotlin helpers, RUNTIME_CORE, and the expect declarations
// of platform seams go to commonMain (RuntimeCore.kt); everything with an
// android.* reference stays in the androidMain Runtime.kt together with the
// seam actuals. Each half carries only the imports it needs.

export function generateRuntimeKt(
  appDir: string,
  config: VeskConfig,
  bundledResources?: { imageResources: Map<string, string>; mediaResources: Map<string, string> },
): Set<string> {
  const used = collectRuntimeUsage(appDir);
  const deviceApis = collectDeviceApiUsage(appDir);
  const broadcast = config.media?.broadcast ?? true;
  // The bundled-asset seams (veskBundledImage / veskBundledMediaUrl) map each
  // resource name the compiler embedded in page code to the app's own R class
  // constants — the android actuals are generated with those mappings baked
  // in, so commonMain pages never reference the R class directly.
  const imageCases = bundledResources
    ? [...bundledResources.imageResources.values()].map((res) => `        "${res}" -> painterResource(__R_CLASS__.drawable.${res})`).join('\n')
    : '';
  const mediaCases = bundledResources
    ? [...bundledResources.mediaResources.values()].map((res) => `        "${res}" -> "android.resource://__RESOURCE_AUTHORITY__/" + __R_CLASS__.raw.${res}`).join('\n')
    : '';
  const commonBody: string[] = [];
  const androidBody: string[] = [];
  const iosBody: string[] = [];
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
    // without the library on the classpath. ios-only units (e.g. iosUiKit)
    // have no android body, so the substitution/split only applies to units
    // with an android src.
    let src = unit.src ?? '';
    if (name === 'veskAudio' || name === 'veskVideo') {
      src = src.split('__BROADCAST__').join(String(broadcast));
      if (unit.expect != null) {
        unit.expect = unit.expect.split('__BROADCAST__').join(String(broadcast));
      }
    }
    if (name === 'veskBundledImage') {
      src = src.split('__BUNDLED_IMAGE_CASES__').join(imageCases);
    }
    if (name === 'veskBundledMediaUrl') {
      src = src.split('__BUNDLED_MEDIA_CASES__').join(mediaCases);
    }
    // Resolve the app's R class / resource authority inside the seam actuals.
    if (src.includes('__R_CLASS__')) {
      src = src.split('__R_CLASS__').join(`${config.appId}.shared.R`);
    }
    if (src.includes('__RESOURCE_AUTHORITY__')) {
      src = src.split('__RESOURCE_AUTHORITY__').join(config.appId);
    }
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
    // Platform routing: expect/actual seams emit the expect declaration to
    // commonMain and the actual (verbatim android implementation) to
    // androidMain; tagged 'common' helpers go entirely to commonMain;
    // everything else stays in the android Runtime.kt. Units that also carry
    // an ios actual emit it to the iosMain Runtime.ios.kt (same usage
    // pruning; ios-only units like iosUiKit have no android body at all).
    if (unit.ios != null) iosBody.push(unit.ios);
    if (unit.expect != null) {
      commonBody.push(unit.expect);
      androidBody.push(src);
    } else if (unit.platform === 'common') {
      commonBody.push(src);
    } else if (unit.src != null) {
      androidBody.push(src);
    }
  };
  for (const name of RUNTIME_ORDER) {
    if (used.has(name)) emit(name);
  }
  const outDir = sharedKotlinDir(dirname(appDir));
  const commonOutDir = sharedCommonKotlinDir(dirname(appDir));
  const iosOutDir = sharedIosKotlinDir(dirname(appDir));
  mkdirSync(outDir, { recursive: true });
  mkdirSync(commonOutDir, { recursive: true });
  mkdirSync(iosOutDir, { recursive: true });
  writeFileSync(join(commonOutDir, 'RuntimeCore.kt'), `${RUNTIME_COMMON_IMPORTS}\n${RUNTIME_CORE}\n${commonBody.join('\n')}\n`);
  writeFileSync(join(outDir, 'Runtime.kt'), `${runtimeImports(deviceApis, used)}${androidBody.join('\n')}\n`);
  if (iosBody.length > 0) {
    writeFileSync(join(iosOutDir, 'Runtime.ios.kt'), `${IOS_RUNTIME_IMPORTS}${iosBody.join('\n')}\n`);
  }
  log('gen', `Runtime.kt (${androidBody.length} android helpers, ${commonBody.length} common helpers of ${RUNTIME_ORDER.length}, media broadcast ${broadcast ? 'on' : 'off'}${iosBody.length ? `, ${iosBody.length} ios helpers` : ''})`);
  return used;
}

export function generateRouterKt(appDir: string): void {
  const outDir = sharedKotlinDir(dirname(appDir));
  const commonOutDir = sharedCommonKotlinDir(dirname(appDir));
  mkdirSync(outDir, { recursive: true });
  mkdirSync(commonOutDir, { recursive: true });
  // Resolved from the CLI's own package location (not cwd) so it works from
  // inside the user's project, where `packages/navigation-native` does not
  // exist relative to the working directory.
  const src = NAVIGATION_KT;
  if (existsSync(src)) {
    // The portable router (commonMain) plus its platform actuals. Android
    // actuals follow Kotlin's Platform.android.kt naming and sit beside the
    // common file in the assets/navigation directory.
    const commonNavDir = join(commonOutDir, 'navigation');
    mkdirSync(commonNavDir, { recursive: true });
    writeFileSync(join(commonNavDir, 'Router.kt'), readFileSync(src, 'utf8'));
    const androidSrc = join(dirname(src), 'Router.android.kt');
    if (existsSync(androidSrc)) {
      const navDir = join(outDir, 'navigation');
      mkdirSync(navDir, { recursive: true });
      // The router moved to commonMain; drop any stale androidMain Router.kt
      // from an earlier generation so the two source sets never both define
      // Route/AppRouter/LocalNavController.
      rmSync(join(navDir, 'Router.kt'), { force: true });
      writeFileSync(join(navDir, 'Router.android.kt'), readFileSync(androidSrc, 'utf8'));
      log('gen', 'navigation/Router.kt (common) + Router.android.kt (actuals, from @navigation-native)');
    } else {
      log('warn', `navigation android actuals not found at ${androidSrc}; Router.kt emitted without back-handler seams`);
    }
    // iOS actuals (CMP milestone) land in iosMain/app/navigation so the same
    // common Router.kt compiles for the iosMain source set.
    const iosSrc = join(dirname(src), 'Router.ios.kt');
    if (existsSync(iosSrc)) {
      const iosNavDir = join(sharedIosKotlinDir(dirname(appDir)), 'navigation');
      mkdirSync(iosNavDir, { recursive: true });
      writeFileSync(join(iosNavDir, 'Router.ios.kt'), readFileSync(iosSrc, 'utf8'));
      log('gen', 'navigation/Router.ios.kt (ios actuals, from @navigation-native)');
    } else {
      log('warn', `navigation ios actuals not found at ${iosSrc}; Router.kt emitted without ios back-handler seams`);
    }
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

export function compileVskFiles(appDir: string, config: VeskConfig, target: string): { imageResources: Map<string, string>; mediaResources: Map<string, string> } {
  const outDir = sharedKotlinDir(target);
  const commonOutDir = sharedCommonKotlinDir(target);
  mkdirSync(outDir, { recursive: true });
  mkdirSync(commonOutDir, { recursive: true });

  const KEEP = new Set(['App.kt', 'Runtime.kt', 'Router.kt', 'Theme.kt']);
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.kt') && !KEEP.has(f)) unlinkSync(join(outDir, f));
  }
  // The commonMain dir hosts the runtime core + router (KEEP), any stale page
  // files from a previous placement, and project/npm module output that a
  // portable page imports (written after the page pass below).
  const COMMON_KEEP = new Set(['RuntimeCore.kt', 'Router.kt', 'Modules.kt']);
  for (const f of readdirSync(commonOutDir)) {
    if (f.endsWith('.kt') && !COMMON_KEEP.has(f)) unlinkSync(join(commonOutDir, f));
  }
  if (!existsSync(join(outDir, 'navigation'))) mkdirSync(join(outDir, 'navigation'), { recursive: true });
  if (!existsSync(join(commonOutDir, 'navigation'))) mkdirSync(join(commonOutDir, 'navigation'), { recursive: true });

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
  // The file itself is written after the page pass, to the source set that
  // actually imports it (commonMain when a portable page does).
  const projectModules = compileProjectModules(appDir);
  for (const e of projectModules.errors) console.error(`  [compile] error in project module: ${e}`);
  if (projectModules.errors.length > 0) process.exit(1);
  const projectModuleRegistry = projectModules.registry;

  // npm specifier -> exported name -> { pkg, name }. Translated at build time
  // by the npm module compiler (packages/cli-native/src/npm.ts); the reachable
  // subgraph of installed npm packages becomes Kotlin files in app/vmod/.
  // Like Modules.kt, the files land after the page pass based on which source
  // set imports them.
  const { registry: npmRegistry, files: npmFiles, errors: npmErrors } = compileNpmModules(appDir);
  for (const e of npmErrors) console.error(`  [compile] error in npm module: ${e}`);
  if (npmErrors.length > 0) process.exit(1);

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
  const resDir = sharedResDir(target);
  if (!existsSync(resDir)) mkdirSync(resDir, { recursive: true });
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
  const installedLibs = installedLibraries(target);
  const vsklibRegistry = new Map<string, VskLibSurface>();
  for (const lib of installedLibs) {
    const exports = new Map<string, import('@compiler-native/elements').LibExportSig>();
    for (const sig of Object.values(lib.signatures ?? {})) exports.set(sig.name, sig);
    for (const name of lib.exports ?? []) {
      if (!exports.has(name)) exports.set(name, { name, target: name, qualified: name, isConstructor: false, params: [], defaultParams: [], returnShape: 'any' });
    }
    vsklibRegistry.set(lib.id, { exports, tags: lib.tags ?? {} });
  }

  // Usage-based page placement: a page (and the components it imports) compiles
  // to commonMain iff none of its `@vesk/<libId>` imports resolve to a library
  // that is android-only. Portability is transitive over `.vsk` component
  // imports (a page importing a non-portable component cannot be commonMain),
  // so a first pass compiles every file, then a fixed-point pass marks
  // portability, then the files are written to their source set.
  interface PageResult {
    file: string;
    rel: string;
    kt: string;
    outName: string;
    result: import('@compiler-native/kotlin-codegen').CompileResult;
  }
  const pageResults: PageResult[] = [];
  for (const file of vskFiles) {
    const source = readFileSync(file, 'utf8');
    const result = compileVskResult(source, file, { componentsWithoutProps, componentNames, customClasses, scopedCustomClasses: scopedClasses, imageResources, mediaResources, rootName: config.root ?? '', fileRel: relative(appDir, file), appDir, moduleRegistry, moduleSlugs, projectModuleRegistry, npmRegistry, vsklibRegistry });
    if (result.errors.length > 0) {
      console.error(`  [compile] errors in ${relative(appDir, file)}:`);
      for (const e of result.errors) console.error(`    ! ${e}`);
      process.exit(1);
    }
    for (const n of result.notes) console.error(`  [compile] warning: ${n} (in ${relative(appDir, file)})`);
    const decls = findComponentDecls(parse(source) as unknown as JsNode);
    const name = decls[0]?.name ?? `s_${slugFor(toPosix(relative(appDir, file)))}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    pageResults.push({ file, rel: toPosix(relative(appDir, file)), kt: result.kt, outName: count === 0 ? name : `${name}_${count}`, result });
  }

  // Fixed-point: a page is portable iff every library it imports is installed
  // and multiplatform, and every `.vsk` component it imports is portable.
  const multiPlatformIds = new Set(installedLibs.filter((l) => l.multiplatform === true).map((l) => l.id));
  const portableByRel = new Map<string, boolean>();
  const markPortable = (rel: string): boolean => {
    const cached = portableByRel.get(rel);
    if (cached !== undefined) return cached;
    const page = pageResults.find((p) => p.rel === rel);
    if (!page) {
      portableByRel.set(rel, false);
      return false;
    }
    // Guard against import cycles while the closure is computed.
    portableByRel.set(rel, false);
    const portable = page.result.libraryIds.every((id) => multiPlatformIds.has(id)) && page.result.vskTargets.every((t) => markPortable(t));
    portableByRel.set(rel, portable);
    return portable;
  };
  for (const p of pageResults) markPortable(p.rel);

  // Project JS/TS modules land in the source set that imports them. If any
  // commonMain page imports a project module, Modules.kt must be commonMain
  // too (commonMain cannot depend on androidMain). npm modules likewise.
  let modulesInCommon = false;
  let npmInCommon = false;
  for (const p of pageResults) {
    if (!portableByRel.get(p.rel)) continue;
    if (p.result.jsTsTargets.length > 0) modulesInCommon = true;
    if (p.result.npmTargets.length > 0) npmInCommon = true;
  }
  if (projectModules.kt.trim()) {
    const kt = `package app\n\n${projectModules.kt.trimEnd()}\n`;
    writeFileSync(join(modulesInCommon ? commonOutDir : outDir, 'Modules.kt'), kt);
    log('module', `project JS/TS modules -> ${modulesInCommon ? 'commonMain' : 'androidMain'}/app/Modules.kt`);
  }
  const vmodOutDir = join(npmInCommon ? commonOutDir : outDir, 'vmod');
  if (existsSync(vmodOutDir)) rmSync(vmodOutDir, { recursive: true, force: true });
  if (npmInCommon) {
    const stale = join(outDir, 'vmod');
    if (existsSync(stale)) rmSync(stale, { recursive: true, force: true });
  }
  for (const f of npmFiles) {
    const t = join(vmodOutDir, f.rel);
    writeFileSync(t, f.kt);
    log('module', `npm module -> ${npmInCommon ? 'commonMain' : 'androidMain'}/app/${f.rel}`);
  }

  for (const p of pageResults) {
    const portable = portableByRel.get(p.rel) === true;
    const dir = portable ? commonOutDir : outDir;
    writeFileSync(join(dir, `${p.outName}.kt`), p.kt);
    log('compile', `${p.rel} -> ${portable ? 'commonMain' : 'androidMain'}/app/${p.outName}.kt`);
  }
  return { imageResources, mediaResources };
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
// with a warning so the config stays the source of truth. routeOverrides maps
// prop names to Kotlin expressions from dynamic route params ({id} segments);
// they are appended after the static values and win for same-name props
// (browser semantics: URL params override config).
function screenPropsArg(page: { path: string; component: string; props: Array<{ name: string; type: string }>; hasProps: boolean; inferredProps: string[]; defaultProps: Record<string, unknown> }, config: VeskConfig, routeOverrides: ReadonlyMap<string, string> = new Map()): string {
  const configValues = config.screens?.[page.path]?.props;
  const values: Record<string, unknown> = { ...page.defaultProps, ...(configValues ?? {}) };
  const keys = Object.keys(values).filter((name) => !routeOverrides.has(name));
  if (keys.length === 0 && routeOverrides.size === 0) return '';
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
  for (const [name, expr] of routeOverrides) args.push(`${name} = ${expr}`);
  if (args.length === 0) return `${page.component}Props()`;
  return `props = ${page.component}Props(${args.join(', ')})`;
}

// Route paths in veskconfig.json may use "[id]" or "{id}" for dynamic
// segments; both are route-param syntax. Convert "[name]" segments to
// "{name}" by plain string scanning — no regex. Other segments pass through
// untouched, so "a[b]c" stays as authored.
function routePathToBraces(path: string): string {
  const segments = path.split('/');
  const out: string[] = [];
  for (const s of segments) {
    if (s.length >= 3 && s.startsWith('[') && s.endsWith(']')) out.push(`{${s.slice(1, -1)}}`);
    else out.push(s);
  }
  return out.join('/');
}

// "{name}" segment names in a (already braced) route path, in path order.
function routeParamNames(path: string): string[] {
  const names: string[] = [];
  for (const s of path.split('/')) {
    if (s.length >= 3 && s.startsWith('{') && s.endsWith('}')) names.push(s.slice(1, -1));
  }
  return names;
}

function stripLeadingSlashes(path: string): string {
  let out = path;
  while (out.startsWith('/')) out = out.slice(1);
  return out;
}

// Route params ("{name}" segments in the path) that bind into the page's
// props call. Params are always strings (web semantics), so String-typed
// props take the raw value with an empty-string fallback and Any/Any? props
// take the raw value as-is. Any other declared type (Int, Boolean, list,
// custom) cannot be coerced from a runtime string — coercePropValue only maps
// build-time literal values — so the binding is skipped with a warning
// (fail closed, never guess).
function routeParamBindings(page: { path: string; component: string; props: Array<{ name: string; type: string }>; hasProps: boolean; inferredProps: string[]; defaultProps: Record<string, unknown> }, paramNames: string[]): Map<string, string> {
  const typedByName = new Map(page.props.map((p) => [p.name, p.type]));
  const bindings = new Map<string, string>();
  for (const name of paramNames) {
    let type = typedByName.get(name);
    if (type === undefined) {
      if (!page.inferredProps.includes(name)) continue;
      type = 'Any';
    }
    if (type === 'String') {
      bindings.set(name, `params["${name}"] ?: ""`);
    } else if (type === 'Any' || type === 'Any?') {
      bindings.set(name, `params["${name}"]`);
    } else {
      log('warn', `route param {${name}} -> ${page.component}.${name}: string params cannot coerce to ${type} — skipped`);
    }
  }
  return bindings;
}

// The page→route computation shared by the Android App.kt and the iosMain
// MainViewController.kt: collect pages, resolve the effective route list from
// config, render the Route(...) lines, and derive the exit-path/back-args.
// Both entry points must present the identical AppRouter(start, routes, back)
// call so navigation behaves the same on every platform.
function computeRouteList(appDir: string, config: VeskConfig): { routeLines: string; backArgs: string; pages: ReturnType<typeof collectVskPages> } {
  const pages = collectVskPages(appDir);

  const routes = (config.routes && config.routes.length > 0)
    ? config.routes
    : pages;

  const routeLines = routes
    .map((p) => {
      const routePath = routePathToBraces(p.path || '');
      const page = pages.find((pg) => pg.component === p.component);
      const paramNames = routeParamNames(routePath);
      if (paramNames.length === 0) {
        const propsArg = page ? screenPropsArg(page, config) : '';
        return `Route("${routePath}") { ${p.component}(${propsArg}) }`;
      }
      if (!page || !page.hasProps) {
        if (page) log('warn', `route params ignored: ${p.component} declares no props parameter`);
        return `Route("${routePath}") { ${p.component}() }`;
      }
      const propsArg = screenPropsArg(page, config, routeParamBindings(page, paramNames));
      return `Route("${routePath}") { params -> ${p.component}(${propsArg}) }`;
    })
    .join(',\n        ');

  // Exit pages: the root, back.exitRoutes from config, routes flagged
  // exitOnBack, and components declaring the exitBack prop.
  const exitPaths = new Set<string>(['/']);
  for (const r of config.back?.exitRoutes ?? []) exitPaths.add(r);
  for (const r of routes) {
    if ('exitOnBack' in r && r.exitOnBack) exitPaths.add('/' + stripLeadingSlashes(routePathToBraces(r.path || '')));
  }
  for (const p of pages) if (p.exitBack) exitPaths.add(p.path);

  const back = config.back ?? {};
  const backArgs = `\n            back = BackBehavior(mode = "${back.mode ?? 'stack'}", doubleBackToExit = ${back.doubleBackToExit ?? true}, exitDelayMs = ${back.exitDelayMs ?? 2000}, exitRoutes = listOf(${[...exitPaths].map((p) => `"${p}"`).join(', ')})),`;

  return { routeLines, backArgs, pages };
}

// Collect the .vsk page components under the app directory with the route
// metadata the App.kt / MainViewController.kt generators need.
function collectVskPages(appDir: string) {
  return collectVskFiles(appDir)
    .map((f) => relative(appDir, f))
    .filter((r) => !r.includes('layout.vsk') && r !== 'splash.vsk')
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
}

export function generateAppKt(appDir: string, config: VeskConfig): void {
  const outDir = sharedKotlinDir(dirname(appDir));
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

  const { routeLines, backArgs, pages } = computeRouteList(appDir, config);

  // Detect splash.vsk component
  const splashVskPath = join(appDir, 'splash.vsk');
  let splashComponent: string | null = null;
  let splashHasProps = false;
  if (existsSync(splashVskPath)) {
    const splashSource = readFileSync(splashVskPath, 'utf8');
    const splashAst = parse(splashSource) as unknown as JsNode;
    const splashDecls = findComponentDecls(splashAst);
    if (splashDecls.length > 0 && splashDecls[0]) {
      splashComponent = splashDecls[0].name;
      const params = splashDecls[0].params as JsNode[];
      splashHasProps = params.some((p) => !(p.type === 'Identifier' && p.name === 'content'));
    }
  }

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
  const padDeclNewline = splashComponent ? padDecl + '\n' : padDecl;
  const buildImport = e2eEnabled ? '' : `import android.os.Build\n`;

  // Deep-link entry: when configured, App() receives the ACTION_VIEW path
  // from MainActivity and AppRouter starts there (a changing start re-runs
  // LaunchedEffect(start) -> nav.start). When not configured, App() keeps the
  // plain signature and the start literal stays "/".
  const deepLinks = config.deepLinks;
  const appFunSig = deepLinks ? 'fun App(deepLink: String? = null) {' : 'fun App() {';
  const startExpr = deepLinks ? 'deepLink ?: "/"' : '"/"';

  // Build content box AFTER routeLines/backArgs are available
  const contentBox = tablet
    ? `        // Tablet layout: content is constrained to a centered 840dp column.
        Box(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxSize().then(barsPadding).widthIn(max = 840.dp).align(Alignment.Center)) {
                Layout {
                    AppRouter(start = ${startExpr}, routes = listOf(
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
                AppRouter(start = ${startExpr}, routes = listOf(
                    ${routeLines}
                ),${backArgs})
            }
        }`;

  // Splash screen handling: if splash.vsk exists, show it first then transition
  const splashStateDecl = splashComponent
    ? `    var splashDone by remember { mutableStateOf(false) }\n    // Auto-dismiss after 3 seconds if splash doesn't call onReady\n    LaunchedEffect(Unit) { kotlinx.coroutines.delay(3000); splashDone = true }\n`
    : '';
  const splashCall = splashComponent
    ? splashHasProps
      ? `${splashComponent}(props = ${splashComponent}Props(onReady = { splashDone = true }))`
      : `${splashComponent}()`
    : '';
  const splashContent = splashComponent
    ? `        if (splashDone) {
            ${contentBox.replace('\n', '\n            ')}
        } else {
            ${splashCall}
        }`
    : contentBox;

  const splashImports = splashComponent
    ? `import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
`
    : '';

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
${splashImports}${buildImport}${tabletImports}import app.navigation.*

@Composable
${appFunSig}
    val nav = rememberNavController()
    LaunchedEffect(Unit) { nav.navigate("/") }
    // Register the current activity for browser-API dialogs (alert).
    val veskContext = LocalContext.current
    SideEffect { veskAppSetup(veskContext) }
${padDeclNewline}${splashStateDecl}
    CompositionLocalProvider(LocalNavController provides nav) {
        ${splashContent.replace('\n', '\n        ')}
    }
}
`,
  );
  log('gen', `App.kt -> renders ${pages.length} routed pages${splashComponent ? ` + splash screen (${splashComponent})` : ''}${tablet ? ' (tablet layout)' : ''}`);
}

// iOS Compose Multiplatform entry point: the Swift shell (ContentView.swift)
// calls MainViewControllerKt.MainViewController(), which returns a
// ComposeUIViewController hosting the same AppRouter(start, routes, back) the
// Android App.kt renders. iOS has no system bars to inset like Android 15, so
// the content fills the screen.
export function generateMainViewControllerKt(appDir: string, config: VeskConfig): void {
  const iosOutDir = sharedIosKotlinDir(dirname(appDir));
  mkdirSync(iosOutDir, { recursive: true });
  const { routeLines, backArgs } = computeRouteList(appDir, config);

  // Detect splash.vsk component (same logic as App.kt)
  const splashVskPath = join(appDir, 'splash.vsk');
  let splashComponent: string | null = null;
  let splashHasProps = false;
  if (existsSync(splashVskPath)) {
    const splashSource = readFileSync(splashVskPath, 'utf8');
    const splashAst = parse(splashSource) as unknown as JsNode;
    const splashDecls = findComponentDecls(splashAst);
    if (splashDecls.length > 0 && splashDecls[0]) {
      splashComponent = splashDecls[0].name;
      const params = splashDecls[0].params as JsNode[];
      splashHasProps = params.some((p) => !(p.type === 'Identifier' && p.name === 'content'));
    }
  }

  const tablet = config.device === 'tablet';
  const tabletImports = tablet
    ? `import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.Alignment
`
    : '';
  const contentBox = tablet
    ? `        // Tablet layout: content is constrained to a centered 840dp column.
        Box(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxSize().widthIn(max = 840.dp).align(Alignment.Center)) {
                Layout {
                    AppRouter(start = "/", routes = listOf(
                        ${routeLines}
                    ),${backArgs})
                }
            }
        }`
    : `        Box(modifier = Modifier.fillMaxSize()) {
            Layout {
                AppRouter(start = "/", routes = listOf(
                    ${routeLines}
                ),${backArgs})
            }
        }`;

  // Splash screen handling for iOS
  const splashStateDecl = splashComponent
    ? `    var splashDone by remember { mutableStateOf(false) }\n    LaunchedEffect(Unit) { kotlinx.coroutines.delay(3000); splashDone = true }\n`
    : '';
  const splashCall = splashComponent
    ? splashHasProps
      ? `${splashComponent}(props = ${splashComponent}Props(onReady = { splashDone = true }))`
      : `${splashComponent}()`
    : '';
  const splashContent = splashComponent
    ? `        if (splashDone) {
            ${contentBox.replace('\n', '\n            ')}
        } else {
            ${splashCall}
        }`
    : contentBox;

  const splashImports = splashComponent
    ? `import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
`
    : `import androidx.compose.runtime.LaunchedEffect
`;

  writeFileSync(
    join(iosOutDir, 'MainViewController.kt'),
    `package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController
${splashImports}${tabletImports}import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()
${splashStateDecl}
    CompositionLocalProvider(LocalNavController provides nav) {
        ${splashContent.replace('\n', '\n        ')}
    }
}

fun MainViewController(): UIViewController = ComposeUIViewController { App() }
`,
  );
  log('gen', `MainViewController.kt (iosMain entry)${splashComponent ? ` + splash screen (${splashComponent})` : ''}`);
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
  mkdirSync(join(appDir, 'src', 'main', 'res', 'values'), { recursive: true });
  mkdirSync(sharedKotlinDir(target), { recursive: true });
  mkdirSync(sharedResDir(target), { recursive: true });
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
  generateIconResources(target, config);
  generateSplashTheme(target, config);
  generateMainActivity(target, config, deviceMedia, hasMedia || deviceNotify);
  generateThemeKt(target, config);
  generateRouterKt(appDir);
  const bundledResources = compileVskFiles(appDir, config, target);
  generateAppKt(appDir, config);
  // iosMain Compose Multiplatform entry: the Swift shell is generated by
  // ios.ts (additive); MainViewController.kt mirrors the Android App.kt
  // routing so the same AppRouter renders on iOS.
  generateMainViewControllerKt(appDir, config);
  // Last: Runtime.kt is pruned to the helpers the generated pages actually use.
  // Gradle dependencies are derived from the same usage so they stay in lock
  // step with the pruned imports and code.
  const used = generateRuntimeKt(appDir, config, bundledResources);
  generateSharedBuildGradleKts(target, config, deviceApis, hasMedia, used, libs);
  generateAppBuildGradleKts(target, config, libs);
}

export function syncAapt2Override(gradleProperties: string): void {
  if (!existsSync(gradleProperties)) return;
  const lines = readFileSync(gradleProperties, 'utf8').split('\n');
  const kept = lines.filter((l) => !l.startsWith('android.aapt2FromMavenOverride'));
  if (existsSync(AAPT2_OVERRIDE)) kept.push(`android.aapt2FromMavenOverride=${AAPT2_OVERRIDE}`);
  writeFileSync(gradleProperties, `${kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
}

