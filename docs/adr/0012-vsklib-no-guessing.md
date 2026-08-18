# ADR-0012: .vsklib registry — never guess; verify every record against real sources

**Date**: 2026-08-12 (registry work `92fa183`/`43e47d2`; conformance gate `a2e4700`; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers (rule in AGENTS.md)

## Context

The registry maps Kotlin/Android libraries to a JS surface (`@vesk/<id>`
imports and markup tags) via `.vsklib` records: Maven coordinates,
permissions, exports, signatures. Inventing a record from memory caused
runtime crashes before (e.g. the sqlite `bindArgs`/row-type mismatch). The
record is a contract the compiler translates against — a wrong signature is
worse than a missing one.

## Decision

Registry records are **never guessed**; every field comes from a real,
accessed source: the installed AAR/JAR metadata via `binding-gen.ts`, actual
class/function declarations, or the library's GitHub/repo/docs. `vesk add`
verifies pinned versions against Maven Central (404/missing version = hard
error, offline = warn), follows Gradle `.module` metadata redirects
(`-android`/`-jvm` variants), tolerates facade AARs without `classes.jar`,
captures Java classes and `*Kt` file facades, and resolves exports living in
transitive providers via an explicit table. A **conformance gate**
(`registry-conformance.ts`) regenerates every record and asserts each export
is real, each signature machine-backed, and each tag matches the artifact.
If a surface cannot be verified, it is left out and the compiler **fails
closed** — never filled in.

## Alternatives Considered

### Alternative 1: Author records from documentation/knowledge
- **Pros**: fast; broad coverage.
- **Cons**: docs lie, versions drift, names change (vico 2.x names vs 1.14.0; `rememberGlideImageState` in a beta). Proven wrong by the fixes table in SESSION_SUMMARY.md.
- **Why not**: the wrong-signature crash class is real and already paid for.

### Alternative 2: No registry — require users to write bindings per app
- **Pros**: no catalog to maintain.
- **Cons**: defeats "install a library with one command"; each app redoes the work.
- **Why not**: the ecosystem story (ADR-0013/0014) depends on a shared, trustworthy catalog.

## Consequences

### Positive
- 34/34 records machine-verified; every callable export fully typed (exact kinds: object-literal constructor, zero-arg constructor, primitive callable, enum — anything else is an opaque value the compiler refuses to call).
- Adding a library is a mechanical, verifiable process.

### Negative
- Coverage grows slowly — each library requires real artifact access and conformance; some surfaces stay unlisted.
- Metadata parsing (kotlinx-metadata, classfiles, aapt2/axml) is real engineering.

### Risks
- Conformance gate rot; mitigation is the regenerate-and-assert workflow and the fail-closed compiler.