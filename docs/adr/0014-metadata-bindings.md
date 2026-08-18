# ADR-0014: Auto-generated library bindings from kotlinx-metadata

**Date**: 2026-08-14 (9g milestone; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

Hand-authoring `.vsklib` records (ADR-0012) is thorough but slow, and the
catalog cannot cover every Maven artifact. For arbitrary libraries,
`vesk add com.github.bumptech.glide:compose@1.0.0-beta01` should produce a
working binding from the published AAR, without guessing (the ADR-0012 rule
still applies to what is emitted).

## Decision

`binding-gen.ts` extracts the API model from the installed artifact using the
**kotlinx-metadata** decoder (plus classfile parsing for Java-authored libs,
`*Kt` file facades, and public no-arg constructors), then generates a
`.vsklib` record with typed export signatures and tag `attrShapes` via a rule
table: Kotlin type → JS type; `@Composable` → markup tags; nullable/
`hasDefault` → optional; sealed-object types → enums; object-literal
constructors → named-arg Kotlin calls with numeric/enum/list coercion.
`@RequiresOptIn` marker classes are detected from classfile annotations and
propagated as `optIn` on tags, emitted as `@file:OptIn(...)`. Anything
unmappable (`suspend`/reified/inline/opaque) becomes a **hard-error stub** —
never an invented shape. A conformance harness generates probe calls against
the real library (coil 2.7.0, ycharts 2.1.0, glide 1.0.0-beta01 verified).

## Alternatives Considered

### Alternative 1: Only hand-curated records (no auto-generation)
- **Pros**: maximal quality control.
- **Cons**: arbitrary libraries unusable; catalog growth is the bottleneck; contradicts the one-command install goal.
- **Why not**: auto-generation with a strict gate gives both breadth and honesty.

### Alternative 2: Reflection-based runtime bindings (in-app)
- **Pros**: no build-time extraction.
- **Cons**: violates 100%-Kotlin build-time translation; reflection at runtime is slower and obfuscation-fragile.
- **Why not**: bindings are compile-time data by design.

## Consequences

### Positive
- Any published AAR can be installed and called from `.vsk`/markup with verified signatures.
- The conformance gate keeps auto-generated records honest.

### Negative
- Metadata decoding is version-sensitive (Kotlin 2.0 metadata format gaps — mitigated by classfile facade parsing).
- Opaque params (e.g. `LottieComposition?`) still block some libraries until real compiler/JVM mappings land (script-callable composables, sealed-class factories).

### Risks
- Metadata format drift breaking extraction; mitigation is the conformance harness and the fail-closed stub path.