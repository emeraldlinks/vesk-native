# vesk-native — Roadmap

> Mission: Build complex native apps purely through `.vsk` files. Zero manual Kotlin.
> All native APIs exposed via vesk-native. Code preview included.

---

## Phase 0 — Foundation
**Goal:** Repo skeleton, toolchain, and proof that `.vsk` → native Kotlin works end-to-end.

- [x] Repo skeleton: workspaces (`compiler-native`, `cli-native`), template runtime, test-app
- [x] Android toolchain: JDK 17, Gradle 8.13, AGP, Compose BOM
- [x] Frontend reuse: `@vesk/compiler` IR reused for parsing + IR generation
- [x] Spike: parse real `.vsk` → `generateIR()` → dump IR tree
- [x] First device install: APK built and installed via system installer intent
- [x] `vesk-native init` / `build` / `run` CLI scaffolding

---

## Phase 1 — Walking Skeleton
**Goal:** Interactive counter on device. Proves reactivity, layout, and Tailwind basics work.

- [x] `js2kt.ts`: literals, arithmetic, unary/logical, member/call, arrow fns, string interpolation, ternary
- [x] `kotlin-codegen.ts`: StaticNode, TextNode, DynamicBinding, TrackDecl, RuntimeStatement
- [x] `elements.ts`: div/span/button/p/h1-h6 → Compose primitives; `onClick` → lambda
- [x] Compile-time Tailwind: class strings resolved at compile time → `Modifier` + `TextStyle` literals
- [x] Fully generated output: no hand-written `.kt` in user projects
- [x] `track` inlined to `remember { mutableStateOf(...) }`
- [x] `veskconfig.json` drives project generation (appId, colors, SDK levels, orientation)
- [x] Gradle project regenerated from source on every build
- [x] **Acceptance:** `vesk-native init demo && vesk-native run` → interactive Tailwind-styled counter on device

---

## Phase 2 — Full IR → Kotlin Parity
**Goal:** Any `.vsk` copied from Vesk web compiles and runs unchanged on Android.

### 2a — Expression Coverage
- [x] `??=`, `&&=`, `||=`, optional chaining `?.`, nullish coalescing `??`
- [x] All array/String methods: `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap`, `reduce`, `join`, `split`, `startsWith`, `endsWith`, `includes`, `indexOf`, `slice`, `reverse`, `sort`, `toUpperCase`, `toLowerCase`, `trim`, `concat`, `sortedBy`, `distinctBy`, `sortedWith`
- [x] Destructuring: object/array patterns in `val (...)`, rest elements
- [x] Spread in objects (`{...obj}`); spread in calls (`foo(...arr)`)
- [ ] Sequence expressions (`(a, b, c)` → `run { a; b; c }`)
- [x] `ChainExpression`, `TSNonNullExpression`, `TSAsExpression`, `TSTypeAssertion`, `TSSatisfiesExpression`

### 2b — IR Node Coverage
- [x] `MapRegion` (keyed lists) → `LazyColumn` with `items()` + `key()` blocks
- [x] `SlotNode` → `content()` lambda wired into every generated component signature
- [x] `ForLoop` / `WhileLoop` / `SwitchBlock` / `TryCatch` → `for` / `while` / `when` / `try-catch`
- [x] `HeadBlock` → warn + skip
- [x] `ClientBlock` → allowed; `ServerBlock` → compile error / runtime crash

### 2c — Component System
- [x] Component children passed as slot lambda (`content` parameter on every generated composable)
- [x] Cross-file component registry (componentsWithoutProps collected across all .vsk files)
- [x] Spread props: warn and drop
- [ ] `Image` composable: `<img src="...">` → `Image(painter = ...)` with resource loading
- [x] `textarea` → `OutlinedTextField` with `singleLine = false`
- [x] Property-specific bindings: `Checkbox` checked state via `bind:checked`, `Radio` mapped to `Checkbox`

### 2d — Style + Tailwind
- [ ] Full Tailwind v3 utility table (spacing, typography, colors, borders, shadows, layout)
- [ ] Ignored utilities implemented: `flex`, `flex-row`, `flex-col`, `items-*`, `justify-*`, `gap-*`, `w-screen`, `h-screen`, `inset-0`, `fixed`, `hidden`, `overflow-hidden`
- [ ] `border` + `border-{color}` merged into single `border(...)` call
- [ ] Modifier ordering: shadow → clip → background → border → size → padding

### 2e — Code Preview (CLI)
- [ ] `vesk-native preview <file.vsk>`: compile single file and print generated Kotlin to stdout
- [ ] `vesk-native build --watch`: file watcher → incremental recompile → Gradle assemble
- [ ] Generated Kotlin files annotated with `// Generated from: page.vsk` comments
- [ ] `--dry-run` flag: compile without building APK

- [ ] **Acceptance:** A Vesk web demo `.vsk` copied verbatim compiles, runs, and looks correct on Android

---

## Phase 3 — Navigation & Routing
**Goal:** File-based routing with back stack, deep links, and navigation primitives.

- [x] Kotlin port of Vesk file-router: static routes, dynamic segments `[slug]`, catch-all `[...all]`
- [x] `Link` / `NavLink` composables with real navigation behavior (not stubs)
- [x] `Outlet` composable for nested layout rendering
- [x] Navigation state machine: back stack, push/pop, replace
- [x] `useNavigate`, `useParams`, `usePathname`, `useSearchParams` runtime hooks
- [x] Deep link intent filters generated from route config
- [x] Page/layout nesting: layouts wrap pages via navigation graph
- [x] **Acceptance:** Multi-page blog app with back/forward navigation copied from web runs on device

---

## Phase 4 — Styling, Theme & CSS
**Goal:** Copied Tailwind-styled pages match web layout. Dark mode and theming via config.

- [ ] Full Tailwind v3 utility coverage (extend Phase 2d table)
- [ ] Responsive utilities: `md:`, `lg:` prefixes (compile-time variants or documented limitation)
- [ ] `global.css` / `<style>` blocks in `.vsk`:
  - Custom class extraction → inline `Modifier` equivalents where possible
  - CSS variables (`var(--token)`) → Compose theme tokens
  - `@theme` / `@layer` → error or documented limitation
- [ ] Dark mode via `veskconfig.json` theme tokens → emitted as `darkColorScheme` in `Theme.kt`
- [ ] System dark mode listener → auto-switch theme
- [ ] Typography scale from config: `fontFamily`, `fontSize` base values
- [ ] **Acceptance:** Copied Tailwind-styled page matches web layout under both light and dark modes

---

## Phase 5 — Native APIs (`@vesk/native`)
**Goal:** All common native mobile APIs callable directly from `.vsk`.

### 5a — Core APIs
- [ ] Biometrics: `BiometricPrompt` (fingerprint, face) via `@vesk/native/biometrics`
- [ ] Notifications: channels, `POST_NOTIFICATIONS` permission, `@vesk/native/notifications`
- [ ] Clipboard: read/write text, `@vesk/native/clipboard`
- [ ] Haptics: light/medium/heavy, `@vesk/native/haptics`
- [ ] Permissions: request/check runtime permissions, `@vesk/native/permissions`

### 5b — Media & Sensors
- [ ] Image picker: gallery/camera capture, `@vesk/native/image-picker`
- [ ] Camera preview: `CameraX` composable, `@vesk/native/camera`
- [ ] Location: FusedLocationProvider, `@vesk/native/location`
- [ ] Sensors: accelerometer, gyroscope, `@vesk/native/sensors`

### 5c — System Integration
- [ ] Share sheet, `@vesk/native/share`
- [ ] Deep link handling from `.vsk` router
- [ ] App info: version, package name, `@vesk/native/device`
- [ ] File system: scoped storage read/write, `@vesk/native/storage`
- [ ] URL launcher: open links in browser, `@vesk/native/url`

### 5d — Runtime & Imports
- [ ] `@vesk/native` import remap in compiler
- [ ] `expect/actual` stubs for iOS parity (implementations empty for P6)
- [ ] Compile-time validation of native API signatures

- [ ] **Acceptance:** Demo page uses biometrics, notifications, haptics, and image picker from `.vsk` without manual Kotlin

---

## Phase 6 — iOS via Kotlin Multiplatform
**Goal:** Same `.vsk` compiles to iOS app. True cross-platform native.

- [ ] Add `iosMain` source set to template
- [ ] Compose Multiplatform iOS target wired into Gradle
- [ ] iOS `MainActivity.kt` → `MainViewController.kt` equivalent
- [ ] `expect/actual` implementations for:
  - Biometrics (Face ID / Touch ID via `LocalAuthentication`)
  - Notifications (iOS UNUserNotificationCenter)
  - Haptics (`UIImpactFeedbackGenerator`)
  - Clipboard (`UIPasteboard`)
  - Permissions (`AVFoundation`, `PhotoLibrary`, etc.)
- [ ] Build pipeline: Xcode / Gradle `linkDebugFrameworkIos`
- [ ] App icon + splash screen for iOS
- [ ] **Acceptance:** Same `.vsk` app runs on iOS simulator with native APIs functional

---

## Phase 7 — Developer Experience
**Goal:** Fast iteration, great tooling, production-ready app generation.

### 7a — Dev Loop
- [ ] `vesk-native dev`: file watcher → incremental Kotlin compile → Gradle install
- [ ] Hot reload / Compose hot-swap research
- [ ] Error overlay in app when compilation fails
- [ ] Fast rebuild (< 30s for small apps)

### 7b — Code Preview & IDE
- [ ] VS Code extension:
  - `.vsk` syntax highlighting, IntelliSense
  - Live preview panel: side-by-side `.vsk` ↔ generated Kotlin
  - "Compile & Run" button
  - Error diagnostics inline
- [ ] CLI `vesk-native preview <file>`: print generated Kotlin
- [ ] CLI `vesk-native preview --watch <dir>`: live-updating preview

### 7c — Project Polish
- [ ] App icons: generated from `veskconfig.json` (adaptive icons Android, iOS)
- [ ] Splash screen: configurable color + logo
- [ ] Edge-to-edge display, system bars theming
- [ ] ProGuard/R8 rules generated for Compose + native APIs
- [ ] Play Store / App Store signing config scaffold
- [ ] Documentation site: getting started, API reference, examples

- [ ] **Acceptance:** New developer clones repo, runs `vesk-native init myapp`, edits `.vsk`, sees live preview, builds and installs in under 5 minutes

---

## Phase 8 — Advanced UI & Extensibility (Stretch)
**Goal:** Rich component library, animations, and extensibility for power users.

- [ ] Animation primitives: `animate*AsState`, `updateTransition` exposed via `.vsk`
- [ ] Gesture detection: `detectTapGestures`, `drag`, `scroll`, `zoom`
- [ ] Custom component library: `Card`, `Dialog`, `BottomSheet`, `Snackbar`, `TabRow`
- [ ] `@vesk/components` package: pre-built native components callable from `.vsk`
- [ ] Plugin system: third-party `.vsk` component packs
- [ ] SSR parity for web (shared `.vsk` between vesk-web and vesk-native)

---

## Current Sprint Recommendation

**Phase 3 is complete.** File-based routing and manual route configs both work, with `Link`/`NavLink`/`Outlet` wired to a native `NavController`.

Next priority: **Phase 4 — Styling, Theme & CSS**. This unblocks visual fidelity because:
- Full Tailwind v3 coverage is needed for copied Vesk web demos to look correct
- Dark mode and theme tokens make the generated apps feel native
- Phase 5 (native APIs) and Phase 6 (iOS) can proceed in parallel once styling is solid.
