# ADR-0007: Browser/Web APIs map to Kotlin runtime equivalents, never JS shims

**Date**: 2026-08-10 (AGENTS.md; browser-API mapping commits `43e47d2`, `6f8d4f1`)
**Status**: accepted
**Deciders**: maintainers

## Context

`.vsk` scripts use browser globals: `window`, `document`, `navigator`,
`localStorage`, `fetch`, timers, events, and more. On Android these have no
native equivalent; the alternative of emulating them in JS is banned by
ADR-0002.

## Decision

Web/browser API semantics are provided by **Kotlin mappings**. `window`,
`document`, `navigator`, `localStorage`, `fetch`, timers, events map to
Android/Kotlin equivalents (activity, compose view tree, system services,
SharedPreferences, OkHttp/HttpURLConnection, coroutines, ...). Concretely:
`fetch()` → synchronous browser-shaped `VeskFetch` (HttpURLConnection, 8s
timeouts); `localStorage`/`sessionStorage` → `VeskWebStorage`
(SharedPreferences / in-memory); `setTimeout`/`setInterval` → `VeskTimers`
(coroutines on the main dispatcher); `openSqlite()` → `VeskSqlite`
(better-sqlite3-style handles); `alert` → non-blocking `jsAlert` AlertDialog;
WebSocket/EventSource → OkHttp-backed `VeskWebSocket`/`VeskEventSource`.
New browser APIs must register their Kotlin mapping in the compiler/runtime
like device APIs register in `API_PERMISSIONS` — never a JS shim. Signatures
are authored in `browser-api.ts` strictly from the runtime source
(`runtime-templates.ts` is the contract), and imports not in the surface fail
closed.

## Alternatives Considered

### Alternative 1: JS shims (implement fetch/localStorage in JS, run in a JS engine)
- **Pros**: fast to write.
- **Cons**: violates ADR-0002; duplicated semantics; blocked by the no-JS rule.
- **Why not**: native mappings give real platform behavior (real SQLite, real HTTP, real system dialogs).

### Alternative 2: Third-party multiplatform libs for everything
- **Pros**: less runtime code.
- **Cons**: each lib has its own surface; the browser-shaped API (synchronous fetch, storage keys, timers) still needs a wrapper; dependency bloat.
- **Why not**: the runtime helpers are thin, usage-pruned (ADR-0009), and exactly browser-shaped.

## Consequences

### Positive
- Browser semantics with native behavior underneath; the `@vesk/browser` module gives typed declarations (incl. the exact synchronous `fetch` signature).
- Usage-pruned helpers keep the APK lean.

### Negative
- Each new browser API needs an authored runtime mapping + declaration — the surface grows deliberately, not automatically.
- Synchronous `fetch` blocks the calling thread by design (browser-shaped), which surprises Android devs.

### Risks
- Declaration drift: a helper changed in the runtime but not `browser-api.ts` is a guessed signature; mitigation is the derive-from-runtime authoring rule and build-time import validation.