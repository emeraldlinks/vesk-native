# Preview / HMR + Build-Speed — Construction Plan

**Objective:** `vesk dev` — a three-tier feedback system: browser preview with ms
HMR, desktop preview with ms HMR (Compose Hot Reload), on-device seconds fast
reload — plus a route registry (new pages never touch `App.kt`) and gradle
builds cut from ~5 min to seconds.

**Status:** drafted · **Mode:** direct to `main` (repo convention) · **Decisions:**
desktop JVM target + on-device fast reload (ms-HMR is JVM-only); thin preview
server in cli-native (reuse `@vesk/compiler`, not the separate `/root/vesk`
repo's `@vesk/cli`); on-device reload accepts in-memory cell-state loss
initially.

---

## Verified facts (file:line anchors)

1. **Builds pay full cold start every time**: `spawnSync(gradle, ['assembleDebug',
   '--console=plain', '--no-daemon'])` (`packages/cli-native/src/commands.ts:70`,
   same at `:128` for bundle) → the "single-use Daemon will be forked" message in
   every build log. Template sets `org.gradle.jvmargs`/`kotlin.daemon.jvmargs`
   (`runtime/vesk-native-template/gradle.properties:1-2`),
   `org.gradle.caching=false` (`:4`), no configuration cache.
2. **Route table is inline in App.kt**: `Layout { AppRouter(start = "/", routes =
   listOf(<page lines>)) }` (`packages/cli-native/src/generators.ts:1758-1768`)
   → every new page rewrites App.kt → `:app` recompiles. Routes are file-based
   (page walk: `app/page.vsk` → `/`, `app/shop/page.vsk` → `/shop`,
   `flights/[id]/page.vsk` → params) AND config-based (`veskconfig.ts`: `root`,
   `back.mode`/`exitRoutes`/`exitDelayMs`, deep links, tablet) — the registry
   keeps both surfaces intact; App.kt keeps the config-driven args.
3. **Compose Hot Reload is JVM-only**: stable + bundled in the CMP Gradle plugin
   since Compose Multiplatform 1.10.0 (Jan 2026); requires Kotlin ≥2.1.20, JVM
   target ≤21, JetBrains Runtime (enhanced class redefinition). ART can't
   class-redefine → on-device ms-HMR is impossible without Studio's Live Edit
   (IDE-bound). Android gets a seconds-level reload; ms-HMR lives on a desktop
   JVM target.
4. **`:shared` is KMP with only the `android` target**; commonMain uses
   `androidx.compose.*` coordinates (`test-app/shared/build.gradle.kts:34-38`);
   the build file's own comment (lines 14-28) anticipates switching to
   `org.jetbrains.compose.*` when non-Android targets land.
5. **jvmMain actuals scope**: `expect fun rememberDeviceApi()` + `expect class
   DeviceApi` (`packages/cli-native/src/runtime-templates.ts:504-506`) + ~20
   `Vesk*` declarative-element composables (`:624-668`) + navigation actuals
   (`@navigation-native`) + remaining commonMain expects (enumerate at
   implementation).
6. **Web compiler is already a hard dependency of the native toolchain**
   (`packages/compiler-native/src/kotlin-codegen.ts:1-2` imports
   `@vesk/compiler/src/parser`, `ir-generator`, `client-codegen`) — same
   parse/IR frontend, so a browser preview is a codegen choice, not a fork. The
   HMR dev-server pattern is proven in
   `/root/vesk/packages/cli/src/dev-server.ts` (node:http + ws + esbuild
   `transformSync` + `compileClient`); web routes scan via `scanRoutes(appDir)`
   (`/root/vesk/packages/compiler/src/router.ts:111`).
7. Usage-derived deps/manifest come from `packages/cli-native/src/usage.ts`
   (per-build diff can classify reload class).

## Architecture

### Phase 0 — Build speed (enabler; do first)
- **0.1 Persistent daemon**: drop `--no-daemon` (commands.ts:70,128); align
  template jvmargs with the launcher env (no `GRADLE_OPTS`/`JAVA_OPTS` mismatch
  in the `env` spread) so one daemon is reused across builds.
- **0.2 Configuration cache + build cache**: `org.gradle.configuration-cache=true`,
  `org.gradle.caching=true` in the template; verify AGP 9.3.1 / Kotlin 2.4.10
  compat; watch usage-derived `build.gradle.kts` churn (identical content
  rewrites are safe; differing content invalidates config cache → Phase 1's
  content-stable files matter).
- **0.3 Content-stable writes**: skip-if-identical in generators' file writes
  (mtime churn alone can invalidate incremental compile).
- **0.4 Dev install path**: `vesk dev` uses `:app:installDebug` (dex-incremental);
  manifest-only changes → full reinstall (detect via merged-manifest hash).
- **Gates (test-app, this machine)**: cold ≤90s (from ~5 min), no-op warm ≤10s,
  single-page edit ≤20s.

### Phase 1 — Route registry (Tier-3 item)
- New generated `Routes.kt` in `:shared/commonMain` carrying the route list;
  App.kt becomes `Layout { AppRouter(start, routes = veskRoutes) }`, regenerated
  only on config change. Requires a small `@navigation-native` API addition —
  verify `AppRouter`'s real signature first (no guessing rule). File-based and
  config-based route semantics (params, root, back args, deep links, exitRoutes)
  unchanged.
- **Gate**: adding a page recompiles only `:shared` changed files; `:app`
  untouched.

### Phase 2 — Tier 1: web preview (ms HMR in browser)
- New `vesk dev --web` verb (ADR-0022 extends ADR-0020's cwd-based surface).
- Thin server in `packages/cli-native/src/preview-server.ts`: node:http + ws +
  esbuild + `@vesk/compiler` `compileClient`/`client-codegen`, route walk over
  `app/` mirroring `scanRoutes` semantics.
- **Native-only surface mapping table** (explicit, verified per entry, fails
  closed): `device.*` → real browser equivalents only where a genuine Web API
  exists (Notification, clipboard, geolocation — each verified against the live
  spec before inclusion); everything unmapped → no-op + console warning.
  Declarative `<notification>` etc. → button that no-ops.
- `veskconfig.ts` → web adapter (theme/colors → CSS vars).
- HMR: per-file recompile + WebSocket push; vesk cells already work in the web
  runtime (`track.ts`).
- Dev-only tooling — ships nowhere; AGENTS.md clarifying line (no-JS rule
  applies to *built apps*).
- **Gate**: class edit visible <100ms; counter state survives HMR; unmapped API
  warns, never crashes.

### Phase 3 — Tier 2: native
- **3.1 Desktop ms-HMR (primary)**: switch commonMain to `org.jetbrains.compose`
  coordinates (sequence: coords first with Android still green → then `jvm()`
  target, jvmTarget 21) → generated jvmMain actuals (DeviceApi stub: no-op
  members; trivially portable ones — clipboard, timers, storage, fetch — real
  JVM impls, each verified; `Vesk*` elements → Button + no-op) → commonMain-safe
  `App()` (move from androidMain; platform-neutral barsPadding/deep-link seams)
  → desktop entry `main()` → CMP Hot Reload plugin (bundled ≥CMP 1.10) + JBR
  provisioning (foojay resolver), dev-gated. `vesk dev --desktop`: .vsk edit →
  per-file regen → incremental compile → CHR push → ms recomposition, cells
  preserved.
- **3.2 On-device fast reload**: `vesk dev` default: watch → regen changed files
  + Routes.kt → `:shared:compileDebugKotlin :app:installDebug` → adb relaunch.
  Target 5–15s. Cell state loss on relaunch accepted (decision); SavedState
  wrapper noted as follow-up. Reload classes: body/style/script → fast path; new
  device API/lib → full build (usage diff detects it).

### Phase 4 — Ergonomics
Compile-error overlays (web) / CHR error stream (desktop) / inline errors
(device loop); `--port`; dev status line with per-phase timings.

## Verification plan
Per-phase gates above; test-app is the workload; starter/my-app rebuild green;
AGENTS.md build-commands section updated (dev verbs; no-log-file rule stands);
ADR-0022 (CLI surface) + ADR-0023 (desktop target/coordinate switch); tsc after
toolchain changes; committed generated output regenerated.

## Phase 0 results (measured 2026-08-18, test-app on this machine)
- Daemon reuse: removed `--no-daemon` (build+bundle). Cold build 2m11s gradle (was
  ~4-5min); warm no-op 19s; no-op with regen ~1m; `FROM-CACHE` restores observed
  (build cache on).
- **Generation cache shipped**: per-page compiles keyed on sha256(toolchain +
  veskconfig + all css + page source); cache in `<target>/.vesk/cache.json`
  (never committed). Single-page edit → 1 miss / 22 hits, regen ~2-3s for
  unchanged projects. Prune moved after the placement pass; misplaced hits
  (portability flip) recompile at the new source set. Toolchain-source hashing
  auto-invalidates on compiler edits (no version bumps).
- Content-stable writes (`writeIfChanged`) ship; byte-identical regen leaves
  files untouched.
- **Configuration cache: OFF.** KGP disables incremental compilation under CC;
  single-page edit was 5m18s full recompile. Trade: no-op builds ~19-60s
  (CC would give ~19s) in exchange for any chance at incremental.
- **Blocked: KGP 2.4.10 incremental for KMP fragment compilation.** Daemon log:
  `-Xfragments=androidMain,commonMain`, `enableUnsafeIncrementalCompilationForMultiplatform=false`,
  dirty set = all files even with Known source changes and a clean IC baseline;
  `kotlin.incremental.multiplatform=true` did not help. Single-page edit lands
  at ~2m55s gradle (was 5m49s). Phase 3.1 (desktop JVM target) and 3.2's
  installDebug loop sidestep this; revisit KGP IC with 2.5+.
- Phase 0 gates: not fully met (cold ≤90s ✗ 2m11s; no-op ≤10s ✗ 19s; single-page
  ≤20s ✗ ~3min). Gen-side gates met. Gradle-side work deferred to Phase 3.2
  (loop) + possible Kotlin upgrade.

## Risks
- **Coordinate switch** (3.1) touches every generated app — mitigated by the
  sequenced landing (coords → green → jvm()).
- **CHR Android gap**: if JetBrains adds Android support later, adopt it;
  desktop is the honest ceiling today.
- **Web/native drift**: shared frontend → low; the stub table is the control
  surface.
- **Caching × usage-derived regeneration**: content-stable writes + config-cache
  verification.

## Effort (rough)
Phase 0: 1–2d · Phase 1: 1d · Phase 2: 2–3d · Phase 3.1: 3–5d · Phase 3.2: 1–2d
· Phase 4: 1d
