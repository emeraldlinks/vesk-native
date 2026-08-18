# ADR-0005: Exact JS semantics or a hard build error — never a silent miscompile

**Date**: 2026-08-09 (honest-JS-semantics work, commit `e282624`; formalized in AGENTS.md 2026-08-10)
**Status**: accepted
**Deciders**: maintainers

## Context

Translating JS to Kotlin invites approximation: Kotlin's type system and
stdlib differ from JS semantics in coercion, truthiness, equality, and
property lookup. A translation that merely "looks right" for the demo
produces wrong results for real programs — worse than failing.

## Decision

Every JS/TS construct the compiler accepts must produce the **exact result
the browser JS engine would**, using the JS-semantics runtime (coercion,
truthiness, equality, property lookup — e.g. `jsString()`, `truthy()`,
`jsMapGet`, JS-precedence parenthesization, no double evaluation of
expressions) where native Kotlin types cannot express it. Constructs the
compiler cannot translate yet are hard build errors (`TODO(...)` fails the
build), never silent miscompiles. Handler/timer errors follow browser
`onerror` semantics via `jsSafe`: a throw never crashes the app.

## Alternatives Considered

### Alternative 1: Best-effort translation with warnings
- **Pros**: more programs compile; faster progress on demos.
- **Cons**: silently wrong results for coercion/truthiness edge cases; users can't trust output.
- **Why not**: wrong output is worse than a missing feature; the sqlite `bindArgs`/row-type mismatch crash is the canonical example.

### Alternative 2: Strict typing at the boundary (require TS types, reject untyped)
- **Pros**: simpler runtime.
- **Cons**: rejects most real-world `.vsk` scripts, which are untyped JS.
- **Why not**: full client-side coverage is the goal; the JS-semantics runtime exists precisely to make untyped code correct.

## Consequences

### Positive
- Translated code is trustworthy — the browser engine result is the spec.
- Fail-closed errors drive real compiler mappings (ADR-0002).

### Negative
- The JS-semantics runtime helpers must be authored and pruned per use (ADR-0009); each new helper needs parity care.

### Risks
- Coercion subtleties (e.g. `||`/`&&` short-circuit results, template-literal `toString`) can regress; mitigation is the parity/coverage harnesses and the conformance gates.