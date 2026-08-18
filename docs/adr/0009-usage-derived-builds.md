# ADR-0009: Usage-derived builds — permissions, deps, helpers, assets from .vsk usage

**Date**: 2026-08-10 (commit `0a2e0e2`; refined continuously; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers (rule in AGENTS.md)

## Context

Generated apps must not ship permissions, gradle dependencies, runtime
helpers, or assets the app never uses. Blanket inclusion bloats the APK,
triggers unnecessary runtime permission prompts, and hard-codes
"just in case" entries that reviewers question. The compiler already walks the
markup IR; the same walks can drive the project manifest and build files.

## Decision

The toolchain scans the `.vsk` pages (AST walks — `walkIR`, plus script
surfaces — never regex, per ADR-0003) and generates only what is used:

- **Manifest permissions** from `API_PERMISSIONS` (device-API calls + element
  tags) and installed `.vsklib` records; legacy permissions get
  `MAX_SDK_PERMS` `maxSdkVersion` scoping; `<queries>` and FileProvider/
  service declarations only when required.
- **Gradle dependencies** derived from usage: runtime helpers referenced by
  generated pages, device APIs, media elements, installed libraries — never
  "just in case".
- **Runtime code**: `Runtime.kt` helpers are pruned to the referenced subset
  (`usage.ts` maps helper names → template blocks, ordered by
  `RUNTIME_ORDER`).
- **Assets**: only images/media actually `src`-referenced by pages are
  bundled (ADR-0019).

## Alternatives Considered

### Alternative 1: Full template always emitted (all permissions, all helpers)
- **Pros**: simplest generator; nothing can be missing.
- **Cons**: APK bloat; scary permission lists; unused code paths to maintain; contradicts "ship only what the app uses".
- **Why not**: usage derivation is the product's differentiator.

### Alternative 2: Config-declared everything (user lists permissions/deps)
- **Pros**: explicit control.
- **Cons**: users must know Android's manifest model; violates "users never write build files" (ADR-0010).
- **Why not**: `config.permissions` remains only a manual escape hatch.

## Consequences

### Positive
- Minimal, honest manifests; small APKs; no unused code paths compiled in.
- Adding a device API is one table row (`API_PERMISSIONS`) plus the helper.

### Negative
- Usage derivation must stay exactly in sync with codegen — a missed mapping silently drops a permission or dangles an import.
- Pruning makes generated output harder to reason about at a glance.

### Risks
- Sync drift between usage mapping and templates; mitigation is the conformance gates and the regenerate-and-build-green workflow.