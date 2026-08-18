# ADR-0003: No regex in the compiler, parser, or code generator

**Date**: 2026-08-10 (formalized in AGENTS.md; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers (AGENTS.md rule set, commit `11e9674`)

## Context

Early structural analysis of markup, attributes, template literals, class
extraction, and head/link discovery was tempting to implement with regex.
Regex-based analysis of nested, quoted, and escaped source is fragile — it
mis-handles nesting and quoting and silently produces wrong compiles.

## Decision

All structural source analysis — attributes, elements, template literals,
class extraction, head/link discovery, CSS blocks — goes through AST/token
surfaces: `parse()` → `generateIR()` → `walkIR()` for markup, and the
script parser for scripts. Regex is acceptable only for diagnostics/UX
outside the toolchain (e.g. build-log scraping, docs).

## Alternatives Considered

### Alternative 1: Regex for everything
- **Pros**: fast to write, compact.
- **Cons**: breaks on quoting/nesting edge cases; the exact class of bug that caused the sqlite `bindArgs`/row-type runtime crash; unverifiable correctness.
- **Why not**: a compiler must be total over its input language; regex makes it partial in practice.

### Alternative 2: Third-party parser libraries everywhere
- **Pros**: battle-tested parsing.
- **Cons**: heavy dependencies; the script side was deliberately rebuilt by hand (ADR-0004) to control the token surface.
- **Why not**: the borrowed web-compiler `parse()` remains the markup parser, and the script compiler is hand-built; neither uses regex.

## Consequences

### Positive
- Structural analysis is compositional (visitors over IR, token streams) and robust to quoting/nesting.
- The same walkers power usage derivation (ADR-0009) and codegen, so one surface serves all passes.

### Negative
- More code to write per feature; some quick diagnostics need the full walker.
- Regex still appears in a few **codegen** spots (e.g. `BTN_PAD_RE` in `kotlin-codegen.ts`) — the rule is enforced by review, not mechanically.

### Risks
- Drift back to regex under time pressure; mitigation is the AGENTS.md rule and review.