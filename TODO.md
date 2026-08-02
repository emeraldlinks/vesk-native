# vesk-native — TODO

> Living task tracker. Read at start of every session. Update after every unit of work.
> **Mission:** Same `.vsk` syntax as Vesk web, compiled to Kotlin + Compose Multiplatform.
> True native rendering (Skia, no WebView/JS bridge). Users copy existing Vesk web UI
> into a vesk-native project and it compiles unchanged. All server stuff stripped.

---

## Phase 0 — Scaffolding + Toolchain

- [x] Repo skeleton: package.json (TS workspaces), packages/compiler-native, packages/cli-native, runtime/vesk-native-template, test-app
- [x] `@vesk/compiler` exports extended (remaining IR classes + `collectTrackedNames`), file: dependency wired
- [x] Spike: parse a real `.vsk` → `generateIR()` → dump IR tree (proves frontend reuse)
- [x] Android toolchain: JDK 17, gradle 8.13, cmdline-tools, build-tools;34.0.0, platform-tools, platforms;android-34, licenses (under `/opt/vesk-native-toolchain`)
- [x] Device install path solved: `pm install` is blocked under proot (no real root / no adb) → on-device install via system package-installer intent (storage grant + one tap)

---

## Phase 1 — Walking Skeleton (Counter → device)

- [x] `js2kt.ts` core: literals, arithmetic, unary/logical, member/call, arrow fns, string interpolation, ternary
- [x] `kotlin-codegen.ts` core: StaticNode, TextNode, DynamicBinding, TrackDecl, RuntimeStatement
- [x] `elements.ts` core map: div/span/button/p/h1-h6 → Box/Text/Button; onClick → lambda
- [x] Compiler validated end-to-end: `page.vsk` Counter → `.kt` compiles clean under kotlinc
- [x] APK built (AGP 8.2.2 + Kotlin 1.9.22 + Compose BOM) and **installed on device** via installer UI; counter is interactive
- [x] **Compile-time Tailwind:** class strings resolved in `kotlin-codegen.ts` → emit literal `Modifier.padding(16.dp).background(Color(0xFF3B82F6))...` + `TextStyle(...)`; NO runtime string parsing
- [x] **Fully generated output:** no hand-written `.kt` anywhere in a project. `track` inlined (`remember { mutableStateOf(...) }`); template ships only `veskconfig.json` + `.vsk` sources; `vesk-native build` regenerates everything from source
- [x] **`veskconfig.json` project config** (appId, appName, version, colors/theme, sdk levels): CLI generates settings.gradle.kts, app/build.gradle.kts, AndroidManifest.xml, themes.xml, MainActivity.kt, Theme.kt, App.kt from it. Nothing hardcoded; `build` rewrites them from source
- [x] CLI `run`: build → stage APK to Termux home → system-installer intent (`am start --user 0`) → launch command
- [x] **ACCEPT:** `vesk-native init demo && vesk-native run` → Tailwind-styled interactive Counter on device (install tap is the only manual step, proot has no real root)

---

## Phase 2 — Broad IR → Kotlin Coverage

- [x] Parity gap catalog: **all 38 upstream `.vsk` files now compile to Kotlin without errors** (7 × `test-app/app`, 6 × `test2/app`, 2 × adapter fixtures, 23 × compiler fixtures). Fixed: `ComponentCall` props with `.ast === null` (literal/`true` attrs) crashed `exprOf` → `ensureAst()` re-parses `Expression.raw`; `ComponentCall` inside text elements (e.g. `<h2><Link/></h2>`) → wrap in `Column { Text(...); <children> }`; `new Error(...)` → `Exception(...)`; object literals → `mapOf(...)`; `HeadBlock` → silent skip. Fixed Tailwind bugs while here: `border`+`border-color` merge into ONE border (also `border-2`/`border-px` widths), modifier ordering `shadow → clip → background → border → size → padding`, `overflow-hidden` → clip
- [ ] Full `js2kt`: all operators (`??=`, `&&=`, `||=`, `?.`), remaining array/String methods (find, join, split, startsWith, includes, reduce…), destructuring patterns (ObjectPattern in `val (…)`), spread in calls, `new` (whitelist)
- [ ] MapRegion (keyed reconciliation) → `items.forEach { key(it) { … } }`; `SlotNode` → render `props.children` (needs `children` field in generated props class)
- [ ] ForLoop / WhileLoop / SwitchBlock / TryCatch → for / while / when / try-catch (TryCatch catch `Exception` ok; `Throwable` for errors)
- [ ] ComponentCall children → pass through as a slot (currently dropped); cross-file component registry; spread attributes
- [ ] Property-specific bindings: TextFieldValue, Checkbox, Slider, Switch
- [ ] `{#client}` → allowed; `{#server}` → compile error; `<Head>` → warn + skip
- [ ] Import remap: `@vesk/runtime` → `vesk.native.runtime` (Link/NavLink etc. need native implementations — see Phase 3)
- [ ] Parity `test-app/` copied verbatim from `/root/vesk/test-app` + `joe/`, gated by Gradle compile
- [ ] **ACCEPT:** a `.vsk` file copied verbatim from Vesk web compiles and runs natively

---

## Phase 3 — Router + Navigation

- [ ] Kotlin port of `matchUrl` / file-router (dynamic segments, catch-all)
- [ ] `Link` / `NavLink` / `Outlet` composables; `useNavigate` / `useParams` / `usePathname` / `useSearchParams`
- [ ] page/layout nesting via Compose Navigation (or custom backstack)
- [ ] **ACCEPT:** copied Vesk router demo runs on device with back/forward

---

## Phase 4 — Tailwind Full + CSS Theme

- [ ] Full Tailwind v3 utility table, resolved **at compile time** in codegen (was: runtime `tailwind.kt` string parsing)
- [ ] Dynamic class strings (whole/partial) → compile error or documented limitation for P2; revisit in P7
- [ ] Dark mode via `veskconfig.json` theme tokens (colors, spacing, typography) → emitted into generated theme file
- [ ] `global.css` / `<style>` blocks → Compose theme tokens subset
- [ ] **ACCEPT:** copied Tailwind-styled page matches web layout closely

---

## Phase 5 — Native Mobile APIs

- [ ] Biometrics (fingerprint + face via BiometricPrompt)
- [ ] Notifications (channels, POST_NOTIFICATIONS permission)
- [ ] Clipboard, haptics, permissions, device info
- [ ] Share sheet, deep links, camera roll / storage
- [ ] Exposed as `@vesk/native` imports usable from `.vsk`; expect/actual-ready for iOS
- [ ] **ACCEPT:** demo page uses fingerprint + notification + haptics from `.vsk`

---

## Phase 6 — iOS via KMP (later)

- [ ] iosMain targets in template; Face ID (LocalAuthentication); iOS notifications
- [ ] Build via Xcode / gradle

---

## Phase 7 — Dev UX (later)

- [ ] `vesk-native dev`: watch → incremental Gradle rebuild → install
- [ ] Native HMR research (Compose hot reload / recomposition-over-devtool)
- [ ] App icons (from `veskconfig.json`), edge-to-edge, splash
