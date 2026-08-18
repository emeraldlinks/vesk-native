# ADR-0017: Compose Multiplatform for iOS via a shared KMP module + expect/actual seams

**Date**: 2026-08-15 (CMP-PLAN.md verified; slices `2a43f7d`→`f218aa1`, `d211f82`; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers (decided "full CMP", plan doc in `CMP-PLAN.md`)

## Context

iOS support was on the roadmap. Options were a SwiftUI shell with a shared
core, or full Compose Multiplatform. Every fact in the plan was verified
against real sources plus a build spike on this box before deciding.

## Decision

Go **full CMP**: the generated project splits into a `:shared` KMP module
(`com.android.kotlin.multiplatform.library`, commonMain + androidMain +
iosMain) holding all pages, the runtime core (cells, timers, JS-semantics,
Router) and expect declarations, plus a thin `:app` Android module (manifest,
MainActivity, app-level res) and a generated `iosApp` Xcode project embedding
the shared framework (`embedAndSignAppleFrameworkForXcode`).
`MainViewController() = ComposeUIViewController { App() }` is the iOS entry,
wrapped in `UIViewControllerRepresentable`. Android behavior stays
byte-identical (actuals are the current implementations verbatim). Version
matrix (spike-verified): Gradle 9.7.0 + AGP 9.3.1 + Kotlin 2.4.10 + CMP
1.11.0; iOS targets are iosArm64 + iosSimulatorArm64 (CMP 1.11 drops Apple
x86_64), registered only on macOS hosts so Linux/Android builds are
untouched. `LocalContext` is never used in commonMain — `VeskAppContext` is
the expect/actual seam; images use Coil3 with per-platform network artifacts;
navigation resolves to `org.jetbrains.androidx.navigation:navigation-compose`.

## Alternatives Considered

### Alternative 1: SwiftUI shell + shared logic only (web-native style)
- **Pros**: less shared surface; Swift expertise usable.
- **Cons**: two UIs to maintain; `.vsk` markup would need a second renderer; Compose semantics lost on iOS.
- **Why not**: `.vsk` is the product — one UI definition must render both platforms.

### Alternative 2: Flutter-style engine / JS bridge
- **Pros**: unified runtime.
- **Cons**: violates ADR-0002 and the native-Kotlin decision (ADR-0001).
- **Why not**: the entire toolchain emits Kotlin; CMP is the natural extension.

## Consequences

### Positive
- Same `.vsk` → Android + iOS; Android is byte-identical today; commonMain code is portable by construction.

### Negative
- 40+ android.* imports in Runtime.kt must move behind expect/actual seams (12 units done, iOS actuals pending: NSUserDefaults, NSURLSession, AVFoundation, SQLite driver, LocalAuthentication, Info.plist usage keys from `API_PERMISSIONS`).
- iOS linking cannot be verified on this Linux box — requires macOS.

### Risks
- Android-only APIs leaking into commonMain; mitigation is the phase discipline (Android assembleDebug stays green at every step) and the expect/actual seam inventory in CMP-PLAN.md.