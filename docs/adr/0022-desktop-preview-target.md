# ADR-0022: desktop preview target — jvm() with explicit CMP coordinates

**Date**: 2026-08-19
**Status**: accepted
**Deciders**: maintainers

## Context

Phase 3.1 of the preview/HMR plan (ms-HMR via Compose Hot Reload) requires a
JVM desktop target in generated KMP projects. Two preconditions differed from
the blueprint:

- **jvmTarget**: the blueprint said 21; the build box runs OpenJDK 17.0.20 and
  Gradle 9.7 with no JDK 21 installed. Staying on 17 keeps the toolchain
  machine-independent and matches what `java -version` reports today.
- **Coordinates**: the blueprint allowed either `org.jetbrains.compose.*` or
  the compose-multiplatform plugin. The plugin (`org.jetbrains.compose`) is
  not applied; every dependency is an explicit coordinate on all hosts
  (androidTarget `implementation(platform(...))`-style aliases aside), so
  resolution never depends on plugin-provided defaults.

## Decision

Generated `shared/build.gradle.kts` declares a `jvm("desktop")` target with
`jvmTarget = JVM_17`, and commonMain/jvmMain dependencies use explicit
`org.jetbrains.compose.*` coordinates (runtime, foundation, material3, ui,
desktop/ui, desktop/current-os, desktop/skia; 1.11.0). jvmMain gets
`compose.desktop 1.11.0` + `org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.9.0`.

Companion decisions from implementing the slice:

- **Portable route tables**: `Routes.jvm.kt`/`Routes.ios.kt` list only pages
  whose whole module graph compiles in commonMain (verified per-page
  `portableByRel`; android-only imports disqualify a page, with a warning).
  `Routes.android.kt` keeps every page.
- **`App()` lives in commonMain** with `start`/`routes` parameters; platform
  seams are explicit expects: `veskBarsPadding(pad)` (android pads with a
  full `statusBarsPadding`+`navigationBarsPadding` and a SDK 35 guard; ios/jvm
  no-op) and the existing `veskAppSetup()`. Deep-link start passes through the
  `start` parameter instead of reaching into MainActivity internals.
- **jvmMain actuals are real implementations, not stubs where trivially
  portable** (storage, fetch, timers, clipboard, image decode, WebSocket,
  EventSource, JSON.parse via the hand-rolled RFC 8259 parser shared with
  iOS); device-only APIs no-op with callbacks resolved. Every signature was
  verified against the installed artifacts (javap: JDK 17
  `WebSocket.Listener` returns `CompletionStage<*>`; skiko
  `makeRaster`/`readPixels`/`allocPixels`; `Bitmap.asComposeImageBitmap`).
- **Router seams for jvm** (`PlatformBackHandler` no-op, `veskToast` console,
  `veskExitApp` = `exitProcess(0)`) ship as `Router.jvm.kt` inside
  `@vesk/navigation-native` (preview host has no back key; `exitApplication`
  is an `ApplicationScope` member unavailable outside `application {}`).
- **Desktop entry**: jvmMain `Main.kt` — `application { Window(420x900,
  title "<app> (vesk preview)") { App(routes = appRoutes) } }`.
- **No `org.jetbrains.compose` plugin, no Hot Reload plugin yet** — hot reload
  is dev-gated and lands in the next slice.

## Consequences

- Desktop and Android targets both compile green for test-app (full rebuilds
  only — KGP fragment IC is still blocked).
- jvmTarget stays 17 until a JDK 21 is provisioned; upgrading is a one-line
  template change.
- `ImageBitmap(1, 1)` (android-only construct) was replaced by a skia raster
  on jvm; `asImageBitmap` vs `asComposeImageBitmap` differ per platform and
  must not be cross-imported.
- New pages that import android-only code silently drop off the desktop/iOS
  route tables with a warning — intended fail-open behavior for the preview,
  not a silent miscompile.
