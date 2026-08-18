# ADR-0002: 100% Kotlin output — zero JS/TS bytes in the APK

**Date**: 2026-08-10 (formalized in AGENTS.md; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers (AGENTS.md rule set, commit `11e9674`)

## Context

With script code translated to Kotlin, a temptation exists to ship a small JS
interpreter or a bundled JS engine for the hard-to-translate leftovers, or to
bundle original `.js`/`.ts` assets alongside the generated code.

## Decision

The output of a vesk-native build is 100% Kotlin bytecode. Zero bytes of
JavaScript or TypeScript may end up in the APK — no bundled JS, no
interpreter, no `.js`/`.ts` assets, no transpiled-to-Kotlin-at-runtime. User
script code is translated at build time; anything the compiler cannot
translate yet is a **hard build error** — never a runtime fallback to a JS
engine.

## Alternatives Considered

### Alternative 1: Ship a JS interpreter (QuickJS/Duktape) for fallback
- **Pros**: unblocks untranslated constructs instantly.
- **Cons**: two runtimes, ~MBs of native code, JS↔Kotlin marshalling, and a permanent escape hatch that hides compiler gaps.
- **Why not**: it undermines the "framework is the product" rule — gaps would rot instead of getting real mappings.

### Alternative 2: Bundle original .js/.ts assets + eval at runtime
- **Pros**: trivial for imports.
- **Cons**: ships non-Kotlin code; violates the native-only guarantee; review/security surface.
- **Why not**: same class of problem as the interpreter, with worse performance.

## Consequences

### Positive
- APK is pure native code; every path is debuggable in Kotlin.
- Compiler gaps surface immediately as build errors, driving real mappings.
- App store/review story is clean.

### Negative
- The compiler must chase full client-side coverage; unsupported constructs block builds.
- npm ecosystem integration is limited to what the compiler can express (ADR-0015).

### Risks
- Coverage pressure: mitigation is a strict error taxonomy (package → file → construct → reason) and the exactness gate in ADR-0005.