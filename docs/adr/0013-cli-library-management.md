# ADR-0013: vesk add/update/remove with libraries.json as the single source of truth

**Date**: 2026-08-13 (CLI library management MVP; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

Installed Kotlin libraries must be tracked per project so builds can wire
gradle dependencies and manifest permissions. Without a committed record,
installs are ephemeral, versions unpinned, and removal impossible.

## Decision

`vesk add|update|remove <pkg>` manage the per-project `.vsklib/libraries.json`
— the single committed source of truth. Each record pins exact coordinates
(`group:artifact@version`), gradle deps, permissions, exports, and tags.
`vesk add` resolves (builtin registry → best-effort Maven Central verify),
appends the pinned record, and **derives permissions at add time**
(`deriveLibraryPermissions`: AAR-declared manifest permissions merged with
`LIBRARY_PERMISSION_RULES`, Maven-group rules for network clients like
coil/glide/okhttp/retrofit2/ktor that ship without declaring `INTERNET`).
`vesk remove` drops the record and the next build prunes the gradle dep +
manifest permissions; `vesk update` bumps pins. `config.permissions` remains
the manual escape hatch. Build-time wiring emits `implementation(...)` deps
and `<uses-permission>` entries from the installed records; the generated
`vesk-env.d.ts` declares the `@vesk/<id>` modules for editor/tsc support.

## Alternatives Considered

### Alternative 1: Store libraries in veskconfig.ts
- **Pros**: one config file.
- **Cons**: config is app-level; library metadata (exports/tags/permissions) is catalog-level and auto-derived; mixing them fights the derive-at-add-time rule.
- **Why not**: separate record keeps app config thin and library data machine-managed.

### Alternative 2: Re-resolve the registry on every build (no committed file)
- **Pros**: nothing to keep in sync.
- **Cons**: offline builds break; versions drift silently; `remove` becomes meaningless; no per-app pinning.
- **Why not**: a committed, pinned file is reproducible.

## Consequences

### Positive
- One command to install a Kotlin library with correct permissions and typed surface; reproducible builds from a committed file.

### Negative
- `libraries.json` must be regenerated on upgrade paths; version bumps can break builds (user runs `vesk update` deliberately).

### Risks
- Permission derivation missing a rule; mitigation is the group-rule table plus config escape hatch, verified in the test-app manifest (zero manual entries).