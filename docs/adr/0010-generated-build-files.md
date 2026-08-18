# ADR-0010: Users never author build files; all config lives in veskconfig.ts

**Date**: 2026-08-09 (defineConfig commit `d4f64ec`; formalized in AGENTS.md; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

Generated projects contain many build artifacts: `build.gradle.kts`,
`settings.gradle.kts`, `gradle.properties`, AndroidManifest.xml, res files,
and Kotlin sources. If users edit these, regeneration overwrites their edits
and the source of truth fragments. The project's mission is "zero manual
Kotlin, no Android Studio".

## Decision

Users never write or edit build files. No XML, no Kotlin/Java, no
`build.gradle.kts`, no `gradle.properties`, no manifest — every generated file
is owned by vesk-native and regenerated on every build. All app configuration
lives in `veskconfig.ts` (via `defineConfig` from `@vesk/native`;
`veskconfig.json` is legacy and auto-migrated); all app code and markup lives
in `.vsk` component files. The CLI templates (`runtime/vesk-native-template/`)
and the generators (`packages/cli-native/src/generators.ts`) are the only
places these files are authored.

## Alternatives Considered

### Alternative 1: Partially generated (scaffold once, user maintains)
- **Pros**: users can customize gradle freely.
- **Cons**: regeneration clobbers or diverges; upgrade path breaks; Android Studio required for the gradle parts.
- **Why not**: contradicts the no-Android-Studio goal and the regenerate-every-build workflow.

### Alternative 2: Config file that mirrors build-file structures 1:1
- **Pros**: flexible.
- **Cons**: users effectively write gradle in a new syntax.
- **Why not**: the config surface is deliberately small: appId, SDK levels, colors, theme, routes, permissions, media, edge-to-edge, back behavior, signing.

## Consequences

### Positive
- Regeneration is lossless; builds are reproducible from `.vsk` + config alone.
- Framework changes propagate to every app by regenerating.

### Negative
- Anything not expressible in `veskconfig.ts` is unavailable (escape hatch: `config.permissions`, signing block).
- Generator bugs affect every app at once.

### Risks
- Feature pressure to expose raw gradle hooks; mitigation is keeping the config surface curated and the templates canonical.