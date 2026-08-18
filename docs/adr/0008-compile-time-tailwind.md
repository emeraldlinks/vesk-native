# ADR-0008: Tailwind classes compiled at build time to Modifier/TextStyle

**Date**: 2026-08-08 (Phase 4 styling; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

`.vsk` styling is Tailwind class strings (`"flex flex-col items-center
p-4 bg-blue-500/50"`). Two execution models were possible: ship a runtime
class parser that interprets classes at app runtime, or resolve classes at
compile time into Compose `Modifier`/`TextStyle` literals.

## Decision

Tailwind is resolved **at compile time** (`tailwind.ts`): class strings become
`Modifier` + `TextStyle` literals in the generated Kotlin. The implementation
is a tokenizer-driven declarative `UTILITIES` spec table — one row per
utility (name + bucket + value namespace + one-line render); matching,
ordering, arbitrary values, and variants are generic, so adding a utility is
one row. Arbitrary values (`[4px]`, `[#ff0000]`, `[50%]`), color opacity
(`bg-blue-500/50`), and fractions (`w-1/2`, `w-full`) work; responsive
variants (`sm:`/`md:`/`lg:`) apply at compile time; state variants
(`hover:`, `dark:`) are dropped; negative utilities (`-m-4`) are skipped as
not expressible in Compose. `<style>` blocks are component-scoped and
`<link rel="stylesheet">` in a head is global; CSS files are read relative to
the referencing `.vsk` and custom classes are extracted via AST walk
(`collectCustomCss`).

## Alternatives Considered

### Alternative 1: Runtime class interpreter (parse classes in the app)
- **Pros**: one interpreter covers all classes; dynamic class strings work.
- **Cons**: ships a mini-CSS engine; app runtime cost; dynamic class strings are already a web anti-pattern.
- **Why not**: compile time is zero-cost at runtime and catches bad classes at build.

### Alternative 2: Port Tailwind's own PostCSS pipeline
- **Pros**: full Tailwind fidelity.
- **Cons**: heavy dependency; output is CSS, which still must be translated to Modifiers — the hard part remains.
- **Why not**: the tokenizer-driven table is a fraction of the size and exactly matches Compose's surface.

## Consequences

### Positive
- Zero runtime styling cost; unknown classes fail or no-op at build time.
- One-row utility addition keeps coverage cheap.

### Negative
- CSS features without Modifier equivalents (negatives, some state variants, `@-rules`, `var()` tokens) are skipped — documented with notes.
- Web layout fidelity (flex main-axis semantics, shrink-to-fit) requires continuous parity fixes.

### Risks
- Divergence from web Tailwind behavior; mitigation is the parity harness (`smoke-tailwind.ts`) and per-feature notes.