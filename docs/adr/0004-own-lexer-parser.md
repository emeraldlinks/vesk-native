# ADR-0004: Hand-written regex-free JS/TS lexer + recursive-descent parser

**Date**: 2026-08-10 (commit `4b258ea`; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

The script compiler initially borrowed `parse()` from the web compiler
(`@vesk/compiler`). That parser is tailored to the web pipeline and opaque to
the native toolchain, making it impossible to control the token surface,
error positions, and coverage of JS/TS constructs the Kotlin translator
(`js2kt.ts`) needs. Per AGENTS.md the script compiler is being rebuilt
bottom-up on a real token surface.

## Decision

The end state is a hand-written, regex-free JS/TS **lexer**
(`packages/compiler-native/src/lexer.ts`) and **recursive-descent parser**
(`packages/compiler-native/src/parser.ts`) producing a token stream and AST
that replace the borrowed `parse()` for all script fragments. The lexer is a
streaming scanner (`new Lexer(src)` + `next()`/`peek()`) driven by the parser
so template-literal substitutions and regex literals stay context-accurate;
TS contextual keywords stay `Ident` tokens and the parser decides by position,
matching TypeScript scanner behavior. Markup parsing keeps the borrowed
`parse()` → `generateIR()` → `walkIR()` pipeline (ADR-0003).

## Alternatives Considered

### Alternative 1: Keep using the web compiler's parse()
- **Pros**: zero work; web parity by construction.
- **Cons**: opaque AST; hard to extend for native-specific constructs; error positions unusable for the Kotlin translator.
- **Why not**: the native compiler needs full control of the script surface and coverage accounting.

### Alternative 2: Vendor a full TypeScript compiler (typescript API)
- **Pros**: complete language coverage.
- **Cons**: enormous dependency; its AST is far larger than what `js2kt` translates; hard error classification becomes harder.
- **Why not**: a hand-written parser for the translated subset gives precise "construct X cannot be translated" errors.

## Consequences

### Positive
- Lexer/parser/translator share one surface; coverage gaps are identified by construct, not by accident.
- Regex-free by construction (ADR-0003).

### Negative
- Sustained maintenance cost; the parser is 1900+ lines and grows with each new construct.

### Risks
- Parser coverage lag behind the language; mitigation is the smoke/parity harnesses (`parser-smoke.ts`, `fragment-coverage.ts`) and the exactness gate (ADR-0005).