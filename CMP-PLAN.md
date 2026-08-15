# CMP migration plan (iOS via Compose Multiplatform) — verified 2026-08-15

Decision: go "full CMP" — the shared UI + runtime are Kotlin Multiplatform, Android
stays byte-identical, iOS is Compose Multiplatform via `iosApp`. Every fact below was
verified against real sources (JetBrains releases/docs, kotlinlang.org compat guide,
Apple/AndroidX docs, and a build spike in /tmp/opencode/cmpspike).

## Verified facts

### Version matrix (all confirmed by building a KMP+CMP project on this box)
- Compose Multiplatform latest stable: **1.11.0** (`org.jetbrains.compose` plugin 1.11.0, May 2026).
  CMP 1.10.3/1.9.3 are alternates; 1.9.3 is the first with AGP 9.0 support.
- CMP 1.11 requires Kotlin 2.3+ for native/web; vesk-native is already on **Kotlin 2.4.10**.
- KMP plugin 2.4.x supports Gradle 7.6.3–9.5.0 and AGP 8.5.2–9.1.0 **per the compat matrix**,
  but the spike proves **Gradle 9.7.0 + AGP 9.3.1 + KMP 2.4.10 + CMP 1.11.0 build green**
  (warnings only: `androidLibrary` block deprecated → use `kotlin { android {} }`; the
  `compose.runtime`/`foundation`/`material3`/`ui` accessors are deprecated → specify the
  `org.jetbrains.compose.*` coordinates directly).
- CMP 1.11 drops Apple x86_64 → iOS targets are **iosArm64 + iosSimulatorArm64**.
- Spike used `com.android.kotlin.multiplatform.library` 9.3.1 (bundled with AGP) +
  `com.android.application` 9.3.1 (built-in Kotlin, `enableKotlin`) + the existing
  `android.aapt2FromMavenOverride` from the real gradle.properties. **assembleDebug green.**

### Structure (official recommended, AGP9-native)
```
composeApp/shared module (KMP):  com.android.kotlin.multiplatform.library + org.jetbrains.kotlin.multiplatform
                                 + org.jetbrains.compose + org.jetbrains.kotlin.plugin.compose
  src/commonMain/kotlin/   all page .kt + Runtime.kt common core + expect decls + Router.kt
  src/androidMain/kotlin/  Android actuals (current implementations, unchanged behavior)
  src/iosMain/kotlin/      MainViewController() = ComposeUIViewController { App() } + iOS actuals
app module (Android):      com.android.application (built-in Kotlin), thin MainActivity, depends on :shared
iosApp/ (Xcode):           generated, embeds shared framework via embedAndSignAppleFrameworkForXcode;
                           ContentView.swift wraps MainViewController() in UIViewControllerRepresentable
```
`kotlin { android { namespace; compileSdk; compilerOptions } }` is the new (non-deprecated) block
with the AGP9 KMP library plugin. commonMain code uses `androidx.compose.*` imports — CMP ships
those packages in common.

### Platform facts
- **LocalContext is Android-only.** No common replacement. iOS side: `androidx.compose.ui.platform.LocalUIViewController`.
  All page/runtime Context use must route through an expect/actual or a per-platform CompositionLocal
  (VeskAppContext already exists — make it expect/actual, never `LocalContext` in commonMain).
- **Dispatchers.Main works on Darwin** (kotlinx-coroutines nativeDarwin: backed by the main queue,
  `createMainDispatcher = DarwinMainDispatcher`). VeskTimers/motion scopes are portable. Frame clock:
  the motion helpers should use the composition's `MonotonicFrameClock` (rememberCoroutineScope)
  rather than a raw `CoroutineScope`; AndroidUiDispatcher.Main is Android-only.
- **SQLite**: `androidx.sqlite:sqlite-framework` provides AndroidSQLiteDriver (Android) and
  NativeSQLiteDriver (iOS, needs `linkerOpts("-lsqlite3")`); `androidx.sqlite:sqlite-bundled`
  (BundledSQLiteDriver) is the consistent-across-platform option. Both replace the Android-only
  `androidx.sqlite.db` surface.
- **Images**: Coil3 is fully multiplatform (`io.coil-kt.coil3:coil-compose`, current 3.4.x/3.5.0).
  Network: `coil-network-okhttp` (Android) or `coil-network-ktor3` + `ktor-client-darwin` (iOS).
  vesk-native already uses Coil3 → the ImageAsync pipeline ports with per-platform network artifact.
- **Navigation**: androidx.navigation.compose in commonMain resolves to
  `org.jetbrains.androidx.navigation:navigation-compose:2.9.2` (CMP 1.11).
- **iOS entry**: `fun MainViewController(): UIViewController = ComposeUIViewController { App() }`
  (verified against compose-multiplatform-core source). SwiftUI wrapper = UIViewControllerRepresentable.
- **fetch**: synchronous in vesk-native today. iOS actual: NSURLSession + semaphore on a background
  thread (Darwin main queue must never block) — expect/actual seam.

## Android-only inventory (from generated test-app sources)
Runtime.kt imports 40+ android.* classes: Context, SharedPreferences (web storage), MediaPlayer/
AudioManager/AudioFocus (media + media-session broadcast), camera2/CameraManager (device.camera),
SensorManager, LocationManager, ClipboardManager, Vibrator, ConnectivityManager, WifiManager,
NfcAdapter, BluetoothAdapter, TelephonyManager, BatteryManager, StatFs, TextToSpeech, AlarmClock,
CalendarContract, CallLog, ContactsContract, Settings, ActivityInfo, WallpaperManager, MediaProjection,
Biometric (androidx.biometric), NotificationManager, PackageManager, KeyEvent, plus androidx.camera.*.
Pages also emit android.*/androidx.camera/androidx.biometric imports directly.

## Phased roadmap
1. **[done] Feasibility spike** — build graph proven (see Version matrix above).
2. **Runtime expect/actual seam** — compiler routes every platform call through runtime helpers;
   Android actuals = current implementations verbatim (Android behavior unchanged). commonMain gets
   expect decls + the pure-Kotlin core (timers, JS-semantics, cells, motion, Router).
3. **Pages → commonMain** — strip android.* from emitted page code; images via Coil3 (per-platform
   network artifact); LocalContext uses → VeskAppContext; device.* APIs → runtime helpers.
4. **Gradle generation** — generators emit shared/ (KMP+CMP build.gradle.kts, kotlin{android{}}
   block, CMP coordinates, iOS framework config) + thin app/ + iosApp/ Xcode project
   (replaces the SwiftUI shell in ios.ts with the CMP embedding). iOS targets registered only on
   macOS hosts so the Linux/Android build is untouched.
5. **iOS actuals** — NSUserDefaults (storage), NSURLSession (fetch), AVFoundation (media),
   SQLite driver (sqlite), CoreImage/Vision (QR), LocalAuthentication (biometric), Info.plist usage
   strings derived from API_PERMISSIONS (Android manifest permission → iOS usage key mapping).
6. **Verification** — Android assembleDebug stays green at every step; tsc typecheck; iOS build
   verified on macOS (this Linux box cannot link Apple targets).
