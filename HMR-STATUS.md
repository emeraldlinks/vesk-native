# Desktop Hot Reload (HMR) — Status Summary

**Date:** 2026-08-19  
**Branch:** main  
**Session:** proot/Termux aarch64 environment

---

## What's working

### Web preview (`vesk dev` / `vesk dev --web`)
- ms-HMR via `@vesk/compiler` + browser device.* shim (`web-preview-shim.ts`)
- Thin preview server in cli-native reuses `@vesk/compiler` (not the separate `/root/vesk` repo's `@vesk/cli`)
- Route registry (new pages never touch `App.kt`)
- **Status: fully working**

### Desktop generation-time support (devDesktop flag)
- `generateProject(target, config, { devDesktop: true })` emits:
  - `settings.gradle.kts`: foojay toolchain resolver plugin (auto-downloads JBR)
  - `shared/build.gradle.kts`: `org.jetbrains.compose` 1.11.0 + `org.jetbrains.compose.hot-reload` 1.1.1 plugins (dev-gated, normal builds untouched)
  - `runDesktop` task (recompiles jvmMain + launches app via JBR)
  - `hotRunJvm` task mainClass wired (`app.MainKt`)
  - `skiko-awt-runtime-{platform}:0.144.6` added to jvmMain deps (was missing from CMP module metadata)
- `settings.gradle.kts` ordering fixed: `pluginManagement {}` must precede `plugins {}` (Gradle 9.7 enforces)
- `workingDir` type error fixed: `rootProject.layout.projectDirectory.asFile` (not bare `.projectDirectory`)
- **Status: generation verified, gradle tasks registered, compiles clean**

### CLI integration
- `commands.ts`: `devDesktop()` watch loop (file watcher → gen → compileKotlinJvm), `devApp(dir, port, desktop)` routing
- `--desktop` flag on `vesk dev`, projectModules watch for all shared targets
- `index.ts` dev case dispatches to `devDesktop()` when `--desktop`
- **Status: implemented, tsc clean**

### JBR 21 provisioning
- foojay auto-downloads JBR 21 JCEF for linux-aarch64 (523MB tarball)
- Cached at `/root/.gradle/jdks/jetbrains_s_r_o_-21-aarch64-linux.2/`
- CHR plugin reads `compose.reload.jbr.version` / `compose.reload.jbr.binary` via gradle property / system property / env var

### jvm runtime fixes (completed in this session)
- 21 DeviceApi actuals → block bodies (not expression bodies)
- `exec(sql)` returns `Unit` (not `Any?`)
- WebSocket `onText`/`onClose` return `CompletionStage<*>` (JDK 17 API)
- EventSource fields are platform-compatible
- `veskFileImage` jvm: `Bitmap().apply { allocPixels(...) }` + `img.readPixels(bmp)` + `Bitmap.asComposeImageBitmap()` (no `toBitmap()` in skiko 0.144.6)
- `jsHandleError`/`jsDecodeURIComponent`/`jsParseJson` jvm actuals added
- Router.jvm.kt: jvm router seams for all `expect` declarations

---

## What's NOT working (blocked)

### Desktop CHR runtime launch — orchestration socket failure
The app JVM dies at startup in `ComposeHotReloadAgent.premain()`:
```
Application Orchestration closed
java.net.SocketException: Broken pipe / Connection reset by peer
```
The agent's `OrchestrationClient` opens a socket to the CHR devtools process, but the connection is reset immediately. Both the app and devtools processes die within seconds.

**What we know:**
- First run (before skiko-awt-runtime dep was added) got past premain, ran `main()`, then crashed at EDT with `LibraryLoadException` (missing native lib)
- After adding `skiko-awt-runtime-linux-arm64:0.144.6`, the native loads but orchestration handshake fails
- Two JBR processes appear (app + devtools) and both die within seconds
- `--auto` mode has the same failure
- Fresh daemon with DISPLAY=:99 has the same failure
- The devtools' own stdout/stderr is swallowed by the gradle daemon (not visible in client log)
- No stale processes or ports detected

**Not yet investigated:**
- Devtools process spawn output (in daemon log, not client log)
- Whether the devtools AWT init fails silently on this environment
- Whether the CHR orchestration protocol has an incompatibility with the proot/arm64 environment
- The exact devtools process command line during the current failing runs

**Resolution path:** needs a desktop machine (not proot/Termux) or deeper investigation of the devtools spawn lifecycle. The generation-time code is complete and correct; only the runtime orchestration is broken.

---

## What's next

1. **On a real desktop machine** (x86_64 Linux or macOS):
   - Verify CHR orchestration works (the generation code is ready)
   - Test the full edit→regen→compile→push loop
   - Debug any remaining runtime issues with a proper display server

2. **CLI polish:**
   - Add `vesk dev --desktop` to the CLI help text
   - Document the desktop preview flow in create-vesk-native AGENTS.md
   - Add `dev:web` and `dev:desktop` scripts to generated package.json

3. **On-device fast reload** (Slice 5, not started):
   - ADB-based dex push for sub-second reload on physical devices
   - In-memory cell-state loss acceptable initially

4. **Build speed** (not started):
   - Gradle configuration cache
   - Incremental compilation
   - Module-level builds

---

## Key files

| File | Purpose |
|------|---------|
| `packages/cli-native/src/generators.ts` | `generateSettingsGradleKts` (~:132), `generateSharedBuildGradleKts` (~:249), `skikoRuntime()` (~:400), `generateProject` (~:2391) |
| `packages/cli-native/src/runtime-templates.ts` | All jvm actual fixes (jsHandleError ~:5016, veskFileImage ~:4527, etc.) |
| `packages/cli-native/src/commands.ts` | `devDesktop()` + `devApp()` (~:87) |
| `packages/cli-native/src/index.ts` | dev case dispatch |
| `packages/cli-native/src/constants.ts` | `projectModules` helper |
| `plans/vesk-native-preview-hmr.md` | Full construction plan with all slices |
| `docs/adr/0022-desktop-preview-target.md` | Architecture decision record |
