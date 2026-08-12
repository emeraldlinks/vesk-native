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

- [x] Tokenizer-driven Tailwind v3 coverage: value tables (spacing/sizes/shadow/weights/etc.) + declarative `UTILITIES` spec table in `tailwind.ts`
  - Adding a utility = one row (name + bucket + value namespace + one-line render); matching, ordering, arbitrary values, variants are generic
  - Arbitrary values `[4px]`, `[#ff0000]`, `[50%]`; color opacity `bg-blue-500/50`; fractions `w-1/2`, `w-full`, `w-screen`
  - Negative utilities (`-m-4`) skipped (not expressible in Compose)
- [x] Responsive utilities: `sm:`/`md:`/`lg:` applied at compile time; state variants (`hover:`, `dark:` etc.) dropped
- [x] `<style>` blocks in `.vsk` (custom class extraction → `Modifier` equivalents, cross-file via `collectCustomCss`)
  - CSS variables (`var(--token)`) skipped with a note
  - `@-rules` ignored with a note
- [x] Dark mode via `veskconfig.json` `darkColors` → `darkColorScheme` in `Theme.kt`
- [x] System dark mode listener → auto-switch theme (`isSystemInDarkTheme`)
- [x] Typography from config: `fontFamily`, `fontSize` base values
- [ ] **Acceptance:** Copied Tailwind-styled page matches web layout under both light and dark modes

---

## Phase 5 — Native APIs (`@vesk/native`)
**Goal:** All common native mobile APIs callable directly from `.vsk`.

### 5a — Core APIs
- [x] **Browser API mappings (storage, auth, fetch, sqlite):** `localStorage`/`sessionStorage` → SharedPreferences `VeskWebStorage`; `fetch()` → native `VeskFetch`/`VeskResponse` (synchronous, browser-shaped); `signUp`/`signIn`/`signOut`/`currentUser`/`isSignedIn` → `VeskAuth` (SHA-256 users in sqlite, session in localStorage); `openSqlite()` → `VeskSqlite`/`VeskSqliteDb` (better-sqlite3-style exec/run/get/all/close). Usage-derived: fetch → `INTERNET` permission only when a page calls it; helpers pruned unless used. Demo at `test-app/app/labs/page.vsk` (reachable via home button).
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
- [x] Edge-to-edge display, system bars theming — `edgeToEdge` in `veskconfig.ts`: `enabled` (classic layout on Android < 15, with SDK-35+ runtime fallback padding), `paddingBars` (full-bleed), `statusBarStyle`/`navigationBarStyle` (`auto`/`light`/`dark` → `SystemBarStyle`), plus luminance-derived `windowLightStatusBar`/`windowLightNavigationBar` and bar colors in themes.xml
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

## Phase 9 — Library Ecosystem: npm Packages & Kotlin Libraries
**Goal:** Vanilla-JS npm packages compile to Kotlin; native Kotlin libraries install and are used from `.vsk` via (auto-generated) bindings. Full design: `vsklibs.md`.

### 9a — npm Tier 1: Static ESM (in progress)
- [ ] Four acorn-blocking mechanisms: per-instance overrides, `this`-binding (`.call`/`.apply` → binding-arg), static object props + method aliases, dynamic-flags `jsRegExp`
- [ ] Module object model: map-builder constructor rewriting; module-mode `jsMapGet`/`jsMapSet` member routing; `this.X`/class-name receivers stay raw
- [ ] acorn compiles clean (0 errors); lab imports `parse`/`version` from acorn; Gradle green
- [ ] Recursive dep-graph resolution: cycles, realpath dedupe, one `app.vmod.<pkg>` per package
- [ ] `exports` condition maps (`browser`/`node`/subpaths), dual CJS/ESM preference, `type` field
- [ ] Lockfile-pinned, deterministic resolution (npm/pnpm/yarn agnostic)
- [ ] Conformance fixtures `fixtures/npm/` (one package per pattern, assert-clean)
- [ ] Pre-flight package scanner (all blockers reported in one pass)
- [ ] Hard-error taxonomy: package → file → construct → reason

### 9b — npm Tier 2: CJS Packages
- [ ] `module.exports`/`exports.x`/`require()` → ESM-shaped AST reuse of the module compiler
- [ ] `require` specifiers resolved through `resolveNpmTarget`
- [ ] CJS fixture conformance; hard error for truly unportable shapes

### 9c — Vanilla JS UI Kits (render bridge)
- [ ] `vesk.render(html)` → Compose `Text`/`AnnotatedString` (marked/micromark/markdown-it)
- [ ] `vesk.icon(paths)` → `ImageVector` bridge (lucide-style path data)
- [ ] `vesk.canvas(ops)` → Compose `Canvas` bridge (chart.js layout/scale math)
- [ ] `vesk.animate(...)` → Compose `animate*`/spring bridge (motion.js easing math)
- [ ] Coupling test enforced: kits reaching into React/DOM internals = hard error → `.vsk` kit instead

### 9d — npm Tier 3: Node Built-ins
- [ ] Register Kotlin mappings per API (never JS shims): `events`, `util`, `assert`, `path`, `process.env` → config
- [ ] `crypto` → Keystore/`MessageDigest` where semantics match; unmappable → hard error
- [ ] `fs`/`stream`/`buffer`/`net` → hard errors until a real Android mapping exists

### 9e — npm Tier 4: Language Features
- [ ] Promises/`async`/`await` → coroutines
- [ ] Generators, `Symbol`, `Proxy`/`Reflect`, `WeakMap`, typed arrays, `BigInt` — exact-or-error

### 9f — Kotlin Libraries: `.vsklib`
- [ ] Binding format (`.vsklib`): exports, tags, coercions, glue helpers, gradle deps, permissions
- [x] `.vsklib/libraries.json` installed-library registry + CLI library management (see 9f1)
- [ ] Import resolution branch: relative file → npm compiled → `.vsklib` registry
- [ ] Tag + script usage from `.vsk` and `.ts` (virtual JS module surface); unbound API = hard error
- [ ] Coercion glue at the JS↔Kotlin boundary (Map facades for object-returning APIs)
- [ ] Builtin registry growth: Room/SQLite, WorkManager, location, notifications, charts, typed HTTP (MVP: coil/retrofit/okhttp/gson/moshi/serialization/datastore/lottie/zxing/flexbox/palette)
- [ ] Third-party `.vsklib` publish format

### 9f1 — CLI library management (`vesk [command] [pkg] [dir]`) — **MVP landed**
- [x] `.vsklib/libraries.json` schema: `{ version, libraries: { id: { id, name, group, artifact, version, gradle[], permissions[], exports[], tags[] } } }`
- [x] Builtin registry (`LIBRARY_REGISTRY` in `packages/cli-native/src/vsklib.ts`): real Maven coordinates + permissions, registered like `API_PERMISSIONS`
- [x] `vesk add <pkg>`: registry resolve (builtin) → best-effort Maven Central verify (404/missing version = hard error, offline = warn) → append pinned record → print exports/tags
- [x] `vesk add`/`update` derive library permissions **at add/update time** (never manual-after-add): `deriveLibraryPermissions` merges the AAR's declared manifest permissions with `LIBRARY_PERMISSION_RULES` (Maven-group rules for network clients — coil/glide/okhttp/okhttp3/retrofit2/picasso/ktor → `INTERNET` — which ship without declaring it); `config.permissions` remains the manual escape hatch. test-app manifest verified: INTERNET derived from coil+glide records, zero manual entries.
- [x] `vesk update <pkg>` / `vesk update`: bump pin (`id@version` or latest registry version), all libs when no pkg
- [x] `vesk remove <pkg>`: drop record; next build prunes gradle dep + manifest permissions
- [x] `[pkg]` forms `id | id@version | group:artifact`; app-dir positional detection for `[dir]`
- [x] Build-time wiring in `generateProject`: gradle `implementation(...)` deps + manifest `<uses-permission>` entries emitted from installed records
- [x] Editor/LSP + `tsc` support for the `@vesk/<id>` virtual module surface: generated `vesk-env.d.ts` (regenerated on every build and on add/update/remove) declares `declare module '@vesk/<id>'` per installed library, typed from `libraries.json` — constructors as opaque `interface X {}` + object-literal-call `function X(props): X`, enums as const map + `(typeof X)[keyof typeof X]` type alias, tags/plain exports as `const X: any`. Demo call forms type-check clean under repo tsc.
- [ ] Third-party `.vsklib` sources (registry URL / local path) in the resolve chain
- [ ] Usage-derived pruning of installed deps/perms/helpers once the binding compiler lands
- [ ] Same `[command] [pkg]` verbs extended to npm packages (`vesk add marked`) once Tier 1/2 land

### 9g — Auto-generated Bindings (@Metadata)
- [x] `kotlinx-metadata` extractor → API model (classes/functions/composables/params/types/nullability)
- [x] Rule table: Kotlin type → JS type; `@Composable` → tags; nullable/`hasDefault` → optional; sealed-object types → enums
- [x] Generate `.vsklib` + typed export signatures (`VskLibRecord.signatures`, tag `attrShapes`)
- [x] Compiler-side translation: JS object-literal constructor calls → Kotlin named-arg calls with numeric/enum/list coercion; `attrShapes`-driven markup attr coercion
- [x] Conservative fallback: `suspend`/reified/inline/unmappable → hard-error stubs
- [ ] Java-class fallback (JVM signature extractor or unsupported)
- [x] Conformance harness: generated probe calls verified against the real library (coil 2.7.0 + ycharts 2.1.0 + glide compose 1.0.0-beta01)

- [ ] **Acceptance:** Lab app imports one npm package (acorn) and installs one Kotlin library (Coil or Room), both used from `.vsk` with zero manual Kotlin; full gates green (tsc, lexer/parser/fragment smokes, Gradle `assembleDebug`)

- [x] **9g milestone:** `vesk add co.yml:ycharts@2.1.0` auto-generates a signature-backed binding (39 exports: 34 constructors + 3 enums + 2 sealed-enums); script-side `LineChartData({ linePlotData: LinePlotData({ plotType: PlotType.Line, lines: [Line({ dataPoints: [Point({ x, y })] })] }) })` translates to typed Kotlin constructor calls and `<LineChart lineChartData={chart}>` renders in the app. `BUILD SUCCESSFUL` verified.
- [x] **9g arbitrary-lib evidence:** `vesk add com.github.bumptech.glide:compose@1.0.0-beta01` (not in the builtin registry) auto-generates a binding from the published AAR — `<GlideImage>`/`<GlideSubcomposition>` tags with `model`/`contentDescription`/`alpha` attrShapes. Experimental-API opt-in propagation added end-to-end: `@RequiresOptIn` marker classes are detected from classfile annotations, tags carry `optIn`, and generated files emit `@file:OptIn(...)` before `package`. `BUILD SUCCESSFUL` verified; conformance gate extended to glue + glide.

- [ ] **9g next primitive — script-callable composables + sealed-class factories (lottie determination):** `vesk add lottie` binds `<LottieAnimation>` (71 classes, 5 exports, 65 skipped), but it cannot animate end-to-end: the required `composition: LottieComposition?` param is opaque and filtered out of the markup attrs (verified hard error `has no attribute "composition"`), and the loader `rememberLottieComposition` (a value-returning `@Composable`) plus `LottieCompositionSpec.Url/.Asset` (nested sealed-interface factories) are not expressible — so no script can construct a `LottieComposition`. Unblock = real compiler/JVM mapping: (a) export value-returning `@Composable` functions as script-callable (valid: .vsk script compiles inside the composable body), (b) surface nested sealed-interface factory constructors like `LottieCompositionSpec.Url({ url })`/`.Asset({ assetName })` so `rememberLottieComposition({ spec })` is constructible, then `<LottieAnimation composition={comp}>` works.

---

## Current Sprint Recommendation

**npm module imports work for project files** (`.vsk`/`.ts`/`.js`); the npm
package pipeline is in progress. Acorn (self-contained ESM) stress-compiles
578 → 27 errors; the remaining blockers are Tier 1 mechanisms documented in
`vsklibs.md` §A4.

Next priority: **Phase 9a — finish the acorn milestone**. This unblocks the whole library ecosystem because:
- It proves the npm pipeline (resolution → transform → codegen → pruned runtime helpers) end-to-end on a real package
- Each fixed pattern (per-instance overrides, `this`-binding, method aliasing) is one more class of real-world package
- `.vsklib` (9f/9g) and CJS (9b) build directly on the same compiler machinery

After 9a: **Phase 9f1 — CLI library management** (`vesk add|update|remove <pkg>`,
design in `vsklibs.md` §B1.5) landed: `.vsklib/libraries.json` tracks installed
Kotlin libraries and `generateProject` registers their gradle deps + manifest
permissions at build time. Next in 9f is the binding compiler + import branch
that makes installed libraries callable from `.vsk`/`.ts`.
