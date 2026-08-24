# vesk-native

A compiler that translates `.vsk` components (Markup + Tailwind + scripts)
into native Kotlin/Compose Android apps. No Android Studio needed — every
feature comes from the framework and every app is built exactly from what the
`.vsk` pages use: code, permissions, and manifest entries are derived from
usage, never copied wholesale.

## What you can build

Anything you would normally open Android Studio for — same three styles on
every capability:

- **A — state:** `device.lastPhoto` bindings recompose the UI.
- **B — callbacks:** `device.pickImage((uri) => { ... })` hands results to
  vesk cells.
- **C — markup elements:** `<camera video />`, `<battery-status />`,
  `<qr-scanner />`, ... compile to native composables.

### Media
| Without permissions | With runtime grant | With user consent |
| --- | --- | --- |
| Photo/audio/file pickers (system UI) | Mic recording (RECORD_AUDIO) | Camera photo/video (system camera) |
| Media playback (video/audio elements) | | Screen recording (MediaProjection) |
| | | Notifications with tap callbacks |

### System capabilities
| Group | APIs |
| --- | --- |
| Identity & screen | `getDeviceInfo` (model · Android · resolution), `listApps`, `openApp` |
| Power | `getBattery` (level, charging), `setKeepAwake` |
| Storage & memory | `refreshStorage`/RAM free+total, app-file `writeFile`/`readFile`/`listFiles`/`deleteFile` |
| Network | `refreshNetwork` (wifi/cellular/offline+online), wifi state |
| Location | `getLocation` (GPS/network fix), `openMaps` |
| Display | `setScreenBrightness`, `lockOrientation`, `setKeepAwake` |
| Audio | `refreshVolume`, `setVolume`, `setRingerMode`, `playSound`, `speak` (TTS) |
| Security | `checkBiometrics`, `authenticate` (fingerprint/face) |
| Connectivity | Bluetooth adapter/bonded devices/discovery, NFC state, `openSettings` sections |
| Communication | `dial`, `sendSms`, `sendEmail`, `shareText`/`shareFile`, `openUrl` |
| Personal data | `listContacts`, `listCallLogs`, `listMessages`, `listAccounts`, `listCalendarEvents` |
| Input | `readClipboard`, `copyToClipboard`, `toast`, `vibrate` |
| Sensors | `readSensor` (light, proximity, accelerometer, gyroscope, temperature) |
| Imaging | `captureScreenshot`, `generateQrCode` (ZXing), QR/barcode scan (CameraX + ML Kit), `setWallpaper`, torch |
| Time & intent | `setAlarm`, SIM/carrier state, drag & drop (`draggable` + `ondrop`) |

## Drag & drop

Markup-level, native Android drag & drop:

```html
<span draggable dragdata="hello">drag me</span>
<div ondrop={(text) => { dropped = text }}>drop zone</div>
```

Dragged payloads also land in other apps (`DRAG_FLAG_GLOBAL`); the `ondrop`
callback receives the dropped text.

## Usage-derived builds

The toolchain scans the `.vsk` pages (AST walks — no regex) and generates only:

- Kotlin helpers actually called (video/audio, media player internals only
  when a page uses `<video>`/`<audio>`, device runtime only when a device API
  or element appears, …)
- Manifest permissions per used API (e.g. `READ_CONTACTS` only when
  `device.listContacts()` or `<contacts>` is used; legacy `BLUETOOTH`
  permissions are `maxSdkVersion`-scoped)
- `<queries>` and FileProvider/service declarations only when required
- Assets actually `src`-referenced by pages

## Build

```sh
npx tsx packages/cli-native/src/index.ts build test-app
```

Diagnose Kotlin directly:

```sh
/opt/vesk-native-toolchain/gradle-9.7.0/bin/gradle -p test-app/app compileDebugKotlin --rerun-tasks
```

## Dev server (HMR / fast reload)

`vesk dev` has three modes — pick the one that fits your setup:

### On-device fast reload (default)

Plug in a phone or start an emulator, then:

```sh
vesk dev
```

Watches `.vsk` files and project modules. On change it regenerates, runs
`gradle installDebug`, and relaunches the app via `adb`. Cell state is lost on
each reload. Target reload time: 5–15 s.

Requires: `adb` on PATH, a connected device or running emulator.

### Browser preview

```sh
vesk dev --web
```

Opens a browser-based preview with ms HMR. Edits to `.vsk` files push
instantly to the browser via WebSocket. `device.*` APIs map to real browser
APIs where possible; unmapped calls warn no-op. Good for layout and styling
iteration — not a substitute for on-device testing.

### Desktop JVM preview

```sh
vesk dev --desktop
```

Runs the app as a desktop JVM window under Compose Hot Reload. Edits push in
ms with cell state preserved. Requires JetBrains Runtime (auto-provisioned via
foojay on first run). The desktop target is a preview convenience — the app
ships as an Android APK.

### Flags

| Flag | Effect |
|------|--------|
| `--port N` | Web preview port (default 5173) |
| `--web` | Force browser preview |
| `--desktop` | Force desktop JVM preview |
| *(none)* | On-device fast reload |

## Rules

- No regex in the compiler, parser, or code generator — structural source
  analysis goes through `parse()` → `generateIR()` → `walkIR()` (and the
  script parser); regex is only acceptable for diagnostics/UX outside the
  toolchain.
- Tracked state is vesk cells, not React state: `track(init)` returns a Cell
  (`get/peek/set/update`), never a tuple; `const &[name] = track(init)`
  declares a virtual name, `const &[name, cell] = track(init)` also binds the
  raw cell. Reads auto-`get()`, writes are plain assignment (`name = v`) —
  rewritten to `set(name, v)`; only function-form `get(x)`/`set(a, b)` map to
  `.value`/`.value =`.