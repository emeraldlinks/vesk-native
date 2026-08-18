# ADR-0015: Vanilla-JS npm packages compile to Kotlin (app.vmod) — no JS engine

**Date**: 2026-08-11 (module imports commit `c2343e7`; design in `vsklibs.md`; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

The library ecosystem must include the npm world: pure-logic packages
(nanoid, date-fns, zod, ...). Running them requires translating JS to Kotlin
at build time; ADR-0002 bans runtime JS. The compiler already translates
project JS/TS modules; extending it to `node_modules` packages needs a
resolution + transform + codegen pipeline.

## Decision

The npm pipeline compiles the **reachable subgraph** of installed vanilla-JS
packages (imported from `.vsk` headers via bare specifiers) into Kotlin files
in `app.vmod.<pkg>` packages, translating JS semantics per ADR-0005. Entry
modules keep their exports under their own names; package-internal files get
`slugOfRelInPkg_`-prefixed names to avoid collisions; cross-package imports
recurse into their own `app.vmod` packages. CJS files (`.cjs`/`.cts`/`.cjsx`)
are hard errors, never silently skipped. Scope is limited to **vanilla JS**:
React/DOM component kits are not importable (→ `.vsk` kits instead); Node
built-ins (`fs`, `net`, `stream`, `buffer`) are hard errors until a real
Android mapping exists; native/WASM is never. Render bridges (`vesk.render`,
`vesk.icon`, `vesk.canvas`, `vesk.animate`) translate content/math kits'
output into Compose surfaces.

## Alternatives Considered

### Alternative 1: Run npm packages in a JS engine (ADR-0002 alternative)
- **Pros**: everything works instantly.
- **Cons**: banned by ADR-0002; two runtimes; marshalling.
- **Why not**: exactness over coverage.

### Alternative 2: Whitelist a tiny set of hand-ported packages
- **Pros**: zero pipeline.
- **Cons**: no ecosystem; every package hand-ported.
- **Why not**: the compiler machinery already exists (js2kt); the pipeline generalizes it.

## Consequences

### Positive
- Real npm packages usable from `.vsk` with zero manual Kotlin.
- The exactness gate (package → file → construct → reason errors) makes progress measurable (acorn stress-compiles 578 files → 27 blockers).

### Negative
- Every JS construct a package uses must be translatable; complicated packages stay blocked.
- Resolution (exports maps, dual CJS/ESM, symlinks) is real engineering.

### Risks
- Packages reaching into React/DOM internals passing the gate; mitigation is the coupling test enforced as a hard error, and the module object model (`jsMapGet`/`jsMapSet` member routing) for static-object props.