# ADR-0001: .vsk compiles to native Kotlin/Compose — no WebView or bridge

**Date**: 2026-08-02 (original decision; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: project founders (initial commit `1a56229`)

## Context

Vesk is a web framework whose `.vsk` components (Markup + Tailwind + scripts)
run in browsers. The goal was the same `.vsk` syntax producing real mobile
apps without Android Studio. The core question was the execution model: how
does a `.vsk` page become an app?

## Decision

`.vsk` files are **compiled** at build time into native Kotlin and Compose UI
code. The compiler translates markup to composables, Tailwind classes to
`Modifier`/`TextStyle` literals, and scripts to Kotlin. The product is a
compiler plus a native runtime template — never a web wrapper.

## Alternatives Considered

### Alternative 1: WebView wrapper (Cordova-style)
- **Pros**: trivial to build; full browser compatibility; instant web-parity.
- **Cons**: not a real app; performance, feel, and API access are second-class; ships a browser engine.
- **Why not**: the mission is "build complex native apps purely through `.vsk` files" — a WebView is an emulation, not a native app.

### Alternative 2: JS bridge with a runtime interpreter (React Native-style)
- **Pros**: reuse of JS code; simpler script support.
- **Cons**: requires shipping a JS engine and a bridge layer; the "no JS/TS in the APK" rule forbids it; two language runtimes to debug.
- **Why not**: rejected by ADR-0002 — the output must be 100% Kotlin bytecode.

### Alternative 3: Manual Kotlin scaffolds + codegen for markup only
- **Pros**: least compiler work.
- **Cons**: users still write Kotlin for logic; violates "zero manual Kotlin".
- **Why not**: the acceptance bar is a fully generated app with no hand-written Kotlin in user projects.

## Consequences

### Positive
- Apps are real native Compose apps with full device API access.
- No Android Studio, no manual Kotlin — everything comes from `.vsk` + config.
- The framework is the product: missing primitives get compiler/runtime mappings (ADR-0018).

### Negative
- Every JS/TS construct and every browser API needs a translation path — the compiler surface is the hard part.
- Layout fidelity (web flexbox semantics on Compose) requires constant parity work.

### Risks
- Compiler coverage lag: constructs without a mapping must fail the build loudly, never miscompile (ADR-0005).