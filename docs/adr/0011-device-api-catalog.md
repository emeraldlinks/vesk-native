# ADR-0011: Device APIs — three usage kinds, API_PERMISSIONS, natural permission prompts

**Date**: 2026-08-10 (full device catalog, commit `0a2e0e2`; prompt fix `d6707c2` 2026-08-18; backfilled)
**Status**: accepted
**Deciders**: maintainers

## Context

Apps need device capabilities: battery, location, contacts, camera, sensors,
biometrics, media projection, and more. Every capability needs a JS-facing
API shape, a Kotlin implementation, manifest permissions, and correct Android
runtime-permission behavior. A wrong permission flow hangs the app silently
(permission state scoped per-composition while launchers share one
ActivityResultRegistry — two concurrent requests collided and neither
callback fired).

## Decision

Device APIs expose **three usage kinds**: **A — state** (`device.lastPhoto`
bindings recompose the UI), **B — callbacks** (`device.pickImage((uri) =>
...)` hands results to vesk cells), **C — markup elements**
(`<camera video />`, `<battery-status />`, `<qr-scanner />`) that compile to
native composables. Each API registers its manifest permissions in
`API_PERMISSIONS` (usage-derived, ADR-0009) and its Kotlin mapping in the
runtime — never a JS shim. Runtime permission requests happen **naturally on
first use** via a `permissionRunner(perms, action, denied)` gate using
`rememberLauncherForActivityResult` + `RequestMultiplePermissions`, with the
denied path surfaced to the app; the startup pre-grant of media/notification
permissions was removed so no request races the gate. Legacy perms
(`BLUETOOTH`, `READ_EXTERNAL_STORAGE`) are `maxSdkVersion`-scoped via
`MAX_SDK_PERMS`.

## Alternatives Considered

### Alternative 1: Request all permissions at app startup
- **Pros**: simple; everything available immediately.
- **Cons**: hostile UX; races with first-use gates; violates usage-derived rule.
- **Why not**: the plan (plans/vesk-native-device-permission-prompts.md) and fix commit show it was the actual bug source — the notification prompt worked only because of this pre-grant.

### Alternative 2: Fail closed on denial (throw without user feedback)
- **Pros**: simple runtime.
- **Cons**: dead UI paths; browser-shaped APIs should return a denied result.
- **Why not**: the gate surfaces `denied` callbacks so `.vsk` code can react.

### Alternative 3: Device APIs only as functions (no markup elements)
- **Pros**: one surface to maintain.
- **Cons**: `<camera>`/`<qr-scanner>` are the most ergonomic forms for declarative UIs.
- **Why not**: markup tags are a core vesk idiom (web parity).

## Consequences

### Positive
- Natural, per-feature permission UX; honest `denied` results; per-API debug logs.
- New device API = one `API_PERMISSIONS` row + one runtime helper + usage map entry.

### Negative
- The permission gate must handle concurrent requests (multi-perm batching) and per-element instances — subtle Compose state scoping.
- Element tags must also emit `onDone`/error callbacks for parity with script forms.

### Risks
- Silent-hang class of bugs (colliding launchers); mitigation is the plan doc's adversarial review and the verified fix in `d6707c2`.