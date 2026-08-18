# Device API Runtime Permission Prompts — Construction Plan

**Objective:** Device APIs (contacts, location, mic, …) return data only after the user
manually grants the permission in phone Settings. The system permission dialog must
appear naturally on first use, like it already does for notifications. test-app is the
case study; the runtime fix must land in the template so every generated app benefits.

**Status:** drafted (adversarial review applied, v2) · **Mode:** direct (commit to `main`,
repo convention — history has no feature branches; `git` + `gh` available but unused)

---

## Background (research summary — read this first)

Every permission-gated device API is wrapped by a `permissionRunner(perms, action, denied)`
gate in `Runtime.kt` (`test-app/shared/src/androidMain/kotlin/app/Runtime.kt:941`, generated
per-app from `packages/cli-native/src/runtime-templates.ts`). The gate checks
`checkSelfPermission`; if denied it stashes the pending action in Compose state and calls
`permLauncher.launch(perms)` (`rememberLauncherForActivityResult` +
`ActivityResultContracts.RequestMultiplePermissions`, line 813). Manifest permissions derive
from `API_PERMISSIONS` in `packages/cli-native/src/usage.ts:242` — verified correct.

So the plumbing exists, yet the dialog never shows for contacts/location/mic. Known facts
(verified, including reviewer findings):

1. **`rememberDeviceApi()` is instantiated per page AND per declarative element** — the
   pending-permission state (`pendingPerms`/`pendingPermAction`/`pendingPermDenied`,
   `remember { mutableStateOf(...) }`) is scoped to each composition, while all instances
   share the `ActivityResultRegistry` keyed by the launcher. Two requests in the same tick
   (a page + an element, or two elements) silently collide: the registry ignores the
   second launch while `pendingPerms` is overwritten — the first API's `action` AND
   `denied` never fire. A silent hang, same failure class commit 07aab67 fixed for bluetooth.
2. **The generated `MainActivity` issues `requestPermissions(READ_MEDIA_* +
   POST_NOTIFICATIONS)` at startup** whenever media/notify usage is detected
   (`packages/cli-native/src/generators.ts:660-754`). This — NOT an "Android 13 auto-prompt"
   — is the actual source of the working notification prompt. It is the only permission
   request outside the gate, it can race the gate's launcher (empty-result denial →
   dialog-less `PERM blocked` on a fresh install), and it pre-grants POST_NOTIFICATIONS
   before any first-use moment exists.
3. **`jsSafe` swallows gate exceptions into logcat** (`RuntimeCore.kt:659`,
   `Runtime.kt:2830` — `Log.e("vesk", ...)`), so a `permLauncher.launch()` from a
   non-main thread (`IllegalStateException`) looks like "nothing happened" in-app and
   leaves NO line in `/sdcard/Download/vesk-debug.txt`. The definitive evidence lives in
   logcat.
4. **`androidx.activity:activity-compose:1.13.0` (pinned) defers launches** when the
   lifecycle is not yet `STARTED` (its own observer re-fires on `ON_START`); it throws
   `IllegalStateException` only off the main thread. So the real requirement is: launch on
   the main thread + keep the pending request alive across the registry's internal
   deferral and across composition disposal (a launch deferred past page disposal fires
   after the launcher unregisters → crash or silently dropped action).
5. **In-flight (uncommitted) work** already covers: `notify` runtime request for
   POST_NOTIFICATIONS, a "permission blocked — grant it in app settings" Toast, and a
   MediaStore-based `veskDebugLine`. Good but incomplete: permanently-denied should route
   to the app Settings screen, not just Toast.
6. **test-app already exercises the declarative elements** `<location>`, `<contacts>`,
   `<bluetooth>`, `<bluetooth-toggle>`, `<bluetooth-scan>`, `<calendar>` on the media page
   (`test-app/app/media/page.vsk:168,193,240-242,308`); the Lab page's script-API usage
   (`device.*`) covers recording, pickers, QR, files, notify — but NOT script-style
   `device.listContacts`/`device.getLocation`.
7. App id for on-device testing: `com.vesk.demo3`. `test-app/scripts/install.sh` installs
   via the Android system installer over the existing app — **grant state is preserved
   across installs**; only a full uninstall resets it.

**Expected root causes (to confirm in Step 1):** a main-thread launch violation (silently
swallowed by jsSafe), and/or the per-composition gate state colliding across page/element
instances, and/or the startup `requestPermissions` racing the gate. Settings routing for
permanently-denied is a UX completion, not the primary bug.

### Invariants (must hold after EVERY step)

- `npx tsc --noEmit -p tsconfig.json` passes (after any `packages/` change).
- Generated Kotlin compiles:
  `/opt/vesk-native-toolchain/gradle-9.7.0/bin/gradle -p test-app/app compileDebugKotlin --rerun-tasks`.
- No JS/TS in the APK; no workarounds/hardcoding in test-app; `.vsk` wins; generated
  files regenerated, never hand-edited outside the template workflow.
- Permission-request behavior never regresses to "silently drop the action" (commit
  07aab67 fixed exactly that).

### Dependency graph

```
Step 1 (diagnose) ──> Step 2 (harden gate) ──> Step 5 (rebuild + on-device acceptance)
        │                    │                       ▲
        │                    └──> Step 3 (audit) ─────┘
        │                                             │
        └──── (vsk edit only) ───────────────────────>│
        Step 4 (case-study .vsk) ─────────────────────>│
```

Step 4's `.vsk` edit is parallel-safe with Steps 1–2; its compile verification is
deferred to Step 5 (rebuilding regenerates `Runtime.kt` from the template Step 2 is
concurrently editing — never run the two builds interleaved).

---

## Step 1 — Reproduce and classify the failure mode on-device

**Tier:** default · **Depends on:** nothing · **Blocking:** Steps 2, 5

### Context brief

The current test-app build (keep the in-flight uncommitted changes — they are part of the
fix) has per-API debug logging to `/sdcard/Download/vesk-debug.txt` and gate exceptions in
logcat under the `vesk` tag. Application id: `com.vesk.demo3`. The media page already
drives contacts/location/bluetooth/calendar via declarative elements.

### Tasks

1. Build a debug APK from the CURRENT tree (keeps in-flight changes):
   `npx tsx packages/cli-native/src/index.ts build test-app` (from `test-app/`:
   `npx tsx ../packages/cli-native/src/index.ts build`).
2. **Clean install on the device** (in-place installs preserve grant state, so a fresh
   state is mandatory): uninstall first (`adb uninstall com.vesk.demo3`), then `npm run demo`.
3. **Capture both evidence channels:** start `adb logcat -s vesk:* -v time >
   /tmp/vesk-logcat.txt &` BEFORE touching the app.
4. Drive the gated surfaces on the media page: `<contacts>`, `<location>`,
   `<bluetooth-scan>`, then `device.startRecording` from the Lab page. Watch the screen
   after each tap.
5. Pull diagnostics: `adb pull /sdcard/Download/vesk-debug.txt /tmp/vesk-debug.txt` (do
   NOT browse it on-device — scoped storage on API 29+), and inspect the logcat capture
   for `IllegalStateException` / `Launcher has not been registered` / `PermissionLauncher`
   stack traces.
6. Classify the failure on the FRESH install (fresh state means a dialog-less denial
   cannot be "don't ask again" — it means the launch never reached the system UI):
   - **(A) No `PERM ...` line in vesk-debug.txt + `IllegalStateException` in logcat** →
     main-thread violation (or launcher-unregistered after disposal). Fix: Step 2 tasks 1+2.
   - **(B) No dialog + `PERM denied`/`PERM blocked` line on fresh install** →
     launch raced/suppressed (startup `requestPermissions` collision or registry
     same-key overwrite from a second concurrent request). Fix: Step 2 tasks 2+3.
   - **(C) Dialog appears on clean install** → the user's device carried stale deny state;
     Step 2 still lands (settings routing + single-flight), and Step 5's uninstall-first
     flow becomes the critical acceptance rule.
7. Record the classification (A/B/C) with the exact log lines in the Step 2 commit body.

### Verification

- Both evidence files (`/tmp/vesk-debug.txt`, `/tmp/vesk-logcat.txt`) exist and are
  quoted in the commit body.

### Exit criteria

- Failure mode classified as A, B, or C with concrete log evidence; the classification
  decides Step 2's emphasis.

### Rollback

None (read-only diagnosis).

---

## Step 2 — Harden the permission gate (template + generators + regenerated runtimes)

**Tier:** strongest · **Depends on:** Step 1 · **Blocking:** Steps 3, 5

### Context brief

The single source of truth is `packages/cli-native/src/runtime-templates.ts` — the
`rememberDeviceApi()` composable (the gate is around template lines 806–980 in the
working tree, uncommitted edits included) and `packages/cli-native/src/generators.ts`
(the `MainActivity` startup `requestPermissions`, lines ~660–754).
`test-app/shared/src/androidMain/kotlin/app/Runtime.kt` and
`aero-app/shared/src/androidMain/kotlin/app/Runtime.kt` are checked-in generated copies:
edit the template, then regenerate. Do NOT hand-edit the generated copies (regenerated on
every build).

### Tasks

1. **Main-thread launch only.** Before `permLauncher.launch(perms)`: if
   `Looper.myLooper() != Looper.getMainLooper()`, re-post the whole request to
   `Handler(Looper.getMainLooper())` (if/else — never a no-op `assert`, which is stripped
   in release). The registry already defers not-yet-STARTED launches itself (1.13.0), so no
   custom lifecycle deferral is needed — but see task 2 for the lifetime problem that
   makes the registry's deferral dangerous.
2. **Activity-lifetime gate state (fixes the composition-lifetime hole).** The pending
   request must NOT live in per-page/per-element `remember` state. Hoist it: one
   `rememberDeviceApi()` instance created at the App root (where the activity's launcher
   lives for the whole activity lifetime), passed down — via parameter or CompositionLocal —
   to pages and elements so script APIs, declarative elements, and the gate share ONE
   `permLauncher` + ONE pending queue. Every existing call site that builds its own
   instance (pages, elements) must consume the shared one. If hoisting proves too invasive
   for one PR, the minimal alternative is a process-wide pending-request holder
   (object/singleton) that the launcher callback reads, re-filing a still-pending request
   when a page re-enters composition — but the shared-instance approach is preferred
   (reviewer finding 2: a launch deferred past disposal fires after the launcher
   unregisters → crash/drop).
3. **Single-flight that never drops.** `ActivityResultRegistry` ignores a second launch on
   the same key while one is in flight. On collision: invoke the NEW request's `denied()`
   immediately (with a `PERM request ignored (one already pending)` log line) — never
   overwrite the pending action, never queue-and-forget. Every caller must get exactly one
   `action`/`denied` callback.
4. **Route the startup `requestPermissions` through the gate.** In `generators.ts`, remove
   the MainActivity startup `requestPermissions(READ_MEDIA_* + POST_NOTIFICATIONS)`; instead
   let first-use drive it (media pickers via Photo Picker need no permission on 13+; the
   gate handles POST_NOTIFICATIONS on first `notify`, READ_MEDIA_* only if an API needs it —
   verify each READ_MEDIA_* case against the actual API and keep only what's needed). This
   kills the race in Background fact 2 and makes the notification prompt a true first-use
   prompt.
5. **Permanently-denied → app settings.** In the launcher callback, when
   `missing.all { !ActivityCompat.shouldShowRequestPermissionRationale(activity, it) }`:
   `activity.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
   Uri.fromParts("package", context.packageName, null)))` with the existing Toast as a
   hint, still logging `PERM blocked`, still firing `denied?.invoke()` (scripts must never
   hang). (On fresh installs a first denial has rationale available, so this only triggers
   after "don't ask again".)
6. **Keep the in-flight notify work** (uncommitted): `notifyAction` requesting
   POST_NOTIFICATIONS via the gate, MediaStore `veskDebugLine`, `usage.ts` `notify` →
   POST_NOTIFICATIONS. Rewrite `notifyAction` to use the shared gate instead of duplicating
   pending-state plumbing.
7. **Regenerate:** run the full build for BOTH apps:
   `npx tsx packages/cli-native/src/index.ts build test-app` and
   `npx tsx packages/cli-native/src/index.ts build aero-app` (or cwd-equivalents). The
   regenerated `Runtime.kt` diffs (test-app + aero-app) must match the template change
   exactly — both files identical modulo usage pruning.
8. Verify `npx tsc --noEmit` and that the regenerated `Runtime.kt` still wires
   `permissionRunner` to every gated API.

### Verification

- `npx tsc --noEmit -p tsconfig.json`
- `/opt/vesk-native-toolchain/gradle-9.7.0/bin/gradle -p test-app/app compileDebugKotlin --rerun-tasks`
- `grep -c "permissionRunner" test-app/shared/src/androidMain/kotlin/app/Runtime.kt` —
  count matches the Step 3 matrix.
- `grep -c "requestPermissions" test-app/app/src/androidMain/kotlin/app/MainActivity.kt` — 0.

### Exit criteria

- One shared gate instance per activity; launches only on the main thread; collisions
  call `denied()` exactly once; no startup permission request outside the gate;
  permanently-denied opens app settings; test-app + aero-app regenerated and matching.

### Rollback

`git checkout -- packages/cli-native/src/runtime-templates.ts packages/cli-native/src/generators.ts`
then rebuild. (In-flight uncommitted work: keep a copy of the working-tree files first.)

---

## Step 3 — Audit every gated API routes through the hardened gate

**Tier:** default · **Depends on:** Step 2 · **Blocking:** Step 5

### Context brief

`API_PERMISSIONS` (`packages/cli-native/src/usage.ts:242`) lists every API↔permission
pair. Every dangerous-permission API and every declarative element must end at the shared
gate (Step 2) — no API may query data or touch a protected resource before the gate
grants, and no element may build its own `DeviceApi` (they must consume the shared
instance).

### Tasks

1. Build the audit matrix from `API_PERMISSIONS` — one row per gated API:
   `startRecording` (RECORD_AUDIO), `notify` (POST_NOTIFICATIONS), `scanQr` (CAMERA),
   `getLocation` (ACCESS_FINE_LOCATION — runtime requests FINE only), `listContacts`
   (READ_CONTACTS), `listCallLogs` (READ_CALL_LOG), `listMessages` (READ_SMS),
   `listAccounts` (GET_ACCOUNTS), `refreshBluetooth`/`toggleBluetooth`/`scanBluetooth`
   (BLUETOOTH_*), `listCalendarEvents` (READ_CALENDAR). Confirm each implementation in the
   regenerated `Runtime.kt` is wrapped in `permissionRunner(...)` and the `action` closure
   performs the actual resource access. Flag any API touching the resource before/outside
   the gate.
2. Declarative elements: `<recorder>`, `<location>`, `<contacts>`, `<call-log>`,
   `<messages>`, `<accounts>`, `<calendar>`, `<bluetooth>`, `<bluetooth-toggle>`,
   `<bluetooth-scan>`, `<qr-scanner>`, `<notification>` — confirm each loads data through
   the shared gate (same `DeviceApi` instance as script calls). An element building its own
   instance is a bug (inconsistent pending state).
3. Special paths (no `permissionRunner`, but audit that they are intentional):
   `capturePhoto`/`captureVideo` (system camera app, no permission), `startScreenRecord`
   (own MediaProjection consent launcher — separate dialog path, must still fire exactly
   one callback), `readClipboard`/`dial`/`sendSms`/`sendEmail`/`launchSafe` intents (check
   whether any needs a runtime permission; dial/sendSms via ACTION intents need none).
4. Non-dangerous (normal) permissions — no gate needed, verify list:
   `vibrate`, `setVolume`, `setRingerMode`, `setWallpaper`, `checkBiometrics`/`authenticate`
   (USE_BIOMETRIC), INTERNET, ACCESS_NETWORK_STATE/WIFI_STATE, FOREGROUND_SERVICE*.
5. Fix any bypass found in the template, then regenerate. No new manifest permissions
   "just in case" — usage-derived only (AGENTS.md).

### Verification

- Audit matrix (with pass/fail per row) recorded in the commit body; grep-verifiable in
  the regenerated `Runtime.kt`.
- tsc + Kotlin compile green.

### Exit criteria

- No script API or declarative element touches a protected resource without the shared
  gate; special paths confirmed intentional; non-gated APIs confirmed correctly un-gated.

### Rollback

Revert template edits + regenerate.

---

## Step 4 — test-app case-study: script-style permission demos

**Tier:** default · **Depends on:** nothing (only the `.vsk` edit is parallel-safe with
Steps 1–2; no build) · **Blocking:** Step 5

### Context brief

test-app is the case study. The media page already drives the declarative elements
(contacts/location/bluetooth/calendar); the Lab page drives script APIs but never
`device.listContacts`/`device.getLocation`. Everything must be expressed in `.vsk` — no
generated-Kotlin workarounds.

### Tasks

1. Add a "Permissions" section to `test-app/app/lab/page.vsk` mirroring the existing
   section style, with script-driven buttons:
   - **Contacts**: `device.listContacts` → show row count + first few `name · number` rows.
   - **Location**: `device.getLocation` → show `lat, lng` or "denied".
   - **Notify**: `device.notify` (exercises POST_NOTIFICATIONS via the gate on API 33+).
2. Use existing device-API patterns already in the page (callbacks + page state). No
   hardcoded results.
3. DO NOT rebuild here — compile verification happens in Step 5 against the settled
   template (rebuilding now would regenerate `Runtime.kt` from a template Step 2 is still
   editing).

### Verification

- `grep -n "device.listContacts\|device.getLocation\|device.notify" test-app/app/lab/page.vsk`
  — present, script-driven.

### Exit criteria

- Lab page has the Permissions section exercising contacts + location + notify via
  script APIs; `.vsk` diff only.

### Rollback

Revert the `.vsk` diff.

---

## Step 5 — Full rebuild + on-device acceptance matrix

**Tier:** default · **Depends on:** Steps 1–4 · **Blocking:** nothing

### Context brief

Everything lands together: hardened shared gate (Step 2), audited surface (Step 3),
case-study page (Step 4). Acceptance uses **clean installs** — grant state survives
in-place updates. App id `com.vesk.demo3`; diagnostics in `/sdcard/Download/vesk-debug.txt`
and logcat `vesk` tag.

### Tasks

1. `npx tsc --noEmit -p tsconfig.json`; fix any compiler errors.
2. Full builds: `npx tsx packages/cli-native/src/index.ts build test-app` and
   `npx tsx packages/cli-native/src/index.ts build aero-app` — both must end
   `BUILD SUCCESSFUL`. Regenerated files stay in the commit.
3. **Clean install:** `adb uninstall com.vesk.demo3` (ignore "not installed") → `npm run demo`
   from `test-app/`. `adb logcat -s vesk:* -v time > /tmp/vesk-logcat.txt &` before
   launching.
4. Acceptance matrix (fresh install, in order; note preconditions):
   - **Contacts first use:** dialog appears → Allow → rows render. (Precondition: the
     contacts section on Lab or media page reachable.)
   - **Contacts re-entry:** renders immediately, no second dialog.
   - **Location first use:** dialog → Allow → lat,lng renders. (Precondition: Location
     services ON on the device — `getLastKnownLocation` returns null otherwise, which is
     NOT a permission failure.)
   - **Deny path (fresh install again):** dialog → Deny → clean in-page "denied"/empty
     result, no hang, no crash; `PERM denied:` logged.
   - **Permanently-denied path:** deny twice on a fresh install (API 30–: "don't ask again"
     checkbox; API 31+: second deny auto-permanents) → app Settings screen opens, Toast
     hint, `PERM blocked` logged.
   - **Notify:** first `notify` prompts POST_NOTIFICATIONS on API 33+ (below 33 it's
     auto-granted — row N/A); after grant, notification posts; after denial, next `notify`
     re-requests via gate.
   - **Record:** first `startRecording` shows RECORD_AUDIO dialog.
   - **No startup dialog:** fresh install shows NO permission dialog before first use
     (startup `requestPermissions` removal verified).
5. After each interaction, check `/sdcard/Download/vesk-debug.txt` (pull via adb) — every
   step must have its `PERM ...` line; a missing line = launch bug (Step 2 incomplete).
   Correlate with logcat for any `IllegalStateException`.
6. Commit everything (template, generators, usage.ts, regenerated test-app + aero-app
   output, the `.vsk` case-study page). Repo convention: direct commit to `main`, message
   style per `git log` (e.g. `fix device runtime: ...`). Include the Step 1 classification
   and the Step 3 audit matrix in the body.

### Verification

- All 8 matrix rows pass on-device with log evidence.
- `BUILD SUCCESSFUL` on fresh builds of both apps.
- `git status` clean after commit.

### Exit criteria

- First use of every dangerous-permission API shows the system dialog; grants/denials
  behave like a normal Android app; permanently-denied routes to settings; no dialogs at
  startup. Bug report closed: contacts/location no longer require manual Settings visits.

### Rollback

`git revert` the commit; reinstalling the reverted APK requires the uninstall-first flow
(grant state persists).

---

## Plan mutation notes

- Step 1 classification decides Step 2 emphasis: (A) → tasks 1+2 are the core; (B) → tasks
  3+4 are the core. Settings routing (task 5) lands either way.
- If the audit finds a new gated surface, add it to `API_PERMISSIONS` (verified from a
  real source, per AGENTS.md) and to the Step 3 matrix, then regenerate.
- If no device is available for clean installs, acceptance may move to an emulator (API
  33+ for the POST_NOTIFICATIONS row); record that in the commit body.
- If hoisting the shared `DeviceApi` (Step 2 task 2) turns out to be multi-PR-sized, split
  it: PR-A lands the process-wide pending-request holder + main-thread launch + settings
  routing; PR-B lands the single shared instance. Step 3/5 must then run against PR-B.