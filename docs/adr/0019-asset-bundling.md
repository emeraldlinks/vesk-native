# ADR-0019: Project assets bundle to res/; device paths decode at runtime

**Date**: 2026-08-09 (`289ef73` images, `403aa0e` media; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

`<img src="/media/...">`, `<video src="...">`, `<audio src="...">` reference
project assets (web-style root-relative paths) or absolute device paths
(`/storage/...`, `content://`, `file://`). Both must render, and only
actually-referenced assets may ship (ADR-0009).

## Decision

Project assets referenced by pages are **bundled at build time**: images go
into `res/drawable-xxhdpi` and load via `painterResource`; media goes into
`res/raw` and plays via `android.resource://<authority>/` URIs at runtime
(`<video>`/`<audio>` map to VideoView/MediaPlayer runtime helpers with
controls/autoplay/loop/muted). Root-relative `/media/...` paths resolve
against the app root; `src`/`href` of any kind resolve against the app root.
Absolute on-device paths (`/storage/`, `/data/`, `content://`, `file://`) are
detected at compile time and decoded at runtime instead of bundled.
Storage permissions (`READ_MEDIA_*`/`READ_EXTERNAL_STORAGE`) are derived from
usage only when device-path media is used. Unused assets are never copied.

## Alternatives Considered

### Alternative 1: Asset pipeline at runtime (read project files from disk)
- **Pros**: no build-time copying.
- **Cons**: projects aren't on the device; apps ship without the files.
- **Why not**: bundling is the only honest way to ship app-owned assets.

### Alternative 2: All assets in raw/ or assets/ uniformly
- **Pros**: one mechanism.
- **Cons**: images need density handling; `painterResource` + `res/drawable-xxhdpi` is the Compose-idiomatic path.
- **Why not**: per-kind placement matches how Compose loads each type.

## Consequences

### Positive
- Referenced assets ship, unreferenced ones don't; web-style paths work unchanged.
- Device-path media keeps the storage-permission story usage-derived.

### Negative
- Asset rename/removal in `.vsk` requires regeneration to un-bundle (build is the source of truth).
- Density handling is coarse (single xxhdpi bucket).

### Risks
- Path resolution ambiguity between project assets and device paths; mitigation is the explicit device-path prefix detection in `isFileImageSrc`.