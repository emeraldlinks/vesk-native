# ADR-0006: Tracked state is vesk cells, not React state

**Date**: 2026-08-02 (original; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers (rule in AGENTS.md)

## Context

The web runtime (`/root/vesk/packages/runtime/src/track.ts`) exposes
`track(init)`, which returns a **Cell object** with `get()/peek()/set()/
update()`. A naive native port might emulate React's `useState` tuple
`[value, setter]`, which would diverge from the web surface and break `.vsk`
code copied from the web. Compiler rewrites already exist for `get(...)`/
`set(...)` function forms (`transformTracked` in the web client-codegen, and
`trackDecl`/`callExpr` in `kotlin-codegen.ts:545` / `js2kt.ts:204`).

## Decision

Tracked state stays vesk cells. `track(init)` returns a **Cell object**
(`get()/peek()/set()/update()`), never a `[value, setter]` tuple, and there is
no `setName` function. `.vsk` sugar: `const &[name] = track(init)` declares a
virtual name whose reads auto-`get()`; `const &[name, cell] = track(init)`
additionally binds the raw cell. Writes use plain assignment (`name = v`,
`name += 1`, `name++`), which the compiler rewrites to `set(name, v)` and maps
to `.value =` on the native `MutableState`. Only function-form `get(x)` /
`set(a, b)` and `.value` are mapped; member calls like `cell.set(v)` pass
through unchanged and fail on `MutableState` — no React-style tuple APIs are
invented in helpers or examples.

## Alternatives Considered

### Alternative 1: useState tuple `[value, setter]`
- **Pros**: familiar to React devs.
- **Cons**: diverges from the vesk web surface; copied web `.vsk` breaks; double API surface.
- **Why not**: web parity of `.vsk` is a hard goal — the cell object IS the API.

### Alternative 2: `setName` function per track
- **Pros**: explicit writes.
- **Cons**: invents an API that doesn't exist in the web runtime; compiler rewrite machinery already assumes assignment semantics.
- **Why not**: the web contract is authoritative.

## Consequences

### Positive
- `.vsk` from the web compiles unchanged; one API to teach and document.
- Compiler rewrites are simple: name reads → `get()`, name writes → `set()`.

### Negative
- React devs need to learn the cell API; assignment-based writes are a compiler convention that must be preserved.

### Risks
- Someone adds a React-style helper or example; mitigation is the AGENTS.md verification note and code review.