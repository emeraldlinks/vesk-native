# ADR-0018: Missing primitives become framework components, never demo-app workarounds

**Date**: 2026-08-17 (PullToRefresh/SwipeToDismiss/CardStack, commit `f99bfaa`; rule in AGENTS.md; backfilled)
**Status**: accepted
**Deciders**: maintainers

## Context

When a UI primitive doesn't exist yet, the cheapest path is to fake it in the
demo app or hand-write Kotlin in `test-app`. That violates "users never write
build files" (ADR-0010) and makes the framework's gaps invisible.

## Decision

`test-app` is proof-of-concept: no workarounds, no hardcoding — everything
goes through framework features. Missing primitives get **real compiler/JVM
mappings**: framework components live in the runtime template and are
callable from `.vsk` like any other element. Examples: `PullToRefresh`
(Material3 `PullToRefreshBox`), `SwipeToDismiss` (`SwipeToDismissBox` with
the `slot='background'` convention), `CardStack` (Tinder-style swipe stack —
`BoxWithConstraints` + `Animatable` + `detectDragGestures`, 0.28-width
threshold, tween fly-out, spring snap-back). These are the only non-`.vsk`
callables besides router components (the `FRAMEWORK_COMPONENT_CALLS` set in
`kotlin-codegen.ts`); anything else must be a custom component or an imported
`.vsklib` tag — otherwise a hard build error.

## Alternatives Considered

### Alternative 1: Hand-written Kotlin in test-app
- **Pros**: fast demo.
- **Cons**: hides framework gaps; users can't benefit; contradicts zero-manual-Kotlin.
- **Why not**: the framework is the product; the demo is the proof.

### Alternative 2: Third-party .vsklib for every primitive
- **Pros**: leverage the registry.
- **Cons**: not every primitive exists as a library; core gestures deserve first-class treatment.
- **Why not**: framework components are exactly the "missing primitive → real mapping" path AGENTS.md demands.

## Consequences

### Positive
- New primitives ship to every generated app automatically (regeneration picks them up).
- The demo proves the framework, not bespoke code.

### Negative
- Every new component needs scripted props via `exprOf` + `jsSafe` handlers — more runtime template surface to maintain.

### Risks
- Component API drift from web `.vsk` conventions; mitigation is keeping names/conventions (e.g. `slot='background'`) aligned with web idioms.