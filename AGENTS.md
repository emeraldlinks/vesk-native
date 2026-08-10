# AGENTS.md

## Project

vesk-native: a compiler that translates `.vsk` components (Markup + Tailwind
+ scripts) into native Kotlin/Compose Android apps. The compiler lives in
`packages/compiler-native`, driven by `packages/cli-native`. `test-app` is the
proof-of-concept workload; the framework is the product, so missing primitives
get real compiler/JVM mappings, never workarounds in the demo app.

## Rules

- **No regex in the compiler, parser, or code generator.** All structural
  source analysis (attributes, elements, template literals, class extraction,
  head/link discovery, CSS blocks) must go through the AST/token surfaces:
  `parse()` -> `generateIR()` -> `walkIR()` for markup, and the parser for
  scripts. Regex is only acceptable for diagnostics/UX outside the toolchain.
- `.vsk` files must win, not the generated Kotlin — regenerate and rebuild
  after compiler changes, verify green `BUILD SUCCESSFUL`, then commit.
- `test-app` is proof-of-concept: no workarounds, no hardcoding — everything
  through framework features.
- All styling is done in markup (`<style>` blocks are component-scoped;
  `<link rel="stylesheet" href="...">` in a head is global). CSS files are
  read relative to the `.vsk` that references them.
- Build commands: `npx tsx packages/cli-native/src/index.ts build test-app`
  (slow, ~5 min), direct Kotlin diagnostics via
  `/opt/vesk-native-toolchain/gradle-9.7.0/bin/gradle -p test-app/app compileDebugKotlin --rerun-tasks`.
- `npx tsc --noEmit -p tsconfig.json` after any compiler change.
- **Tracked state is vesk cells, not React state.** Verification source:
  `/root/vesk/packages/runtime/src/track.ts` (web runtime), the `&[...]`
  parse in `/root/vesk/packages/compiler/src/ir-generator.ts:684`, the
  `set(...)`/`get(...)` rewrites in
  `/root/vesk/packages/compiler/src/client-codegen.ts:73` (transformTracked),
  and the native mapping in `kotlin-codegen.ts:545` `trackDecl` +
  `js2kt.ts:204` `callExpr`. `track(init)` returns a **Cell object**
  (`get()/peek()/set()/update()`) — never a `[value, setter]` tuple, and
  there is no `setName` function. `.vsk` sugar: `const &[name] = track(init)`
  declares a virtual name (reads auto-`get()`); `const &[name, cell] =
  track(init)` additionally binds the raw cell. Read by using the name
  directly; write with plain assignment (`name = v`, `name += 1`, `name++`)
  — the compiler rewrites reads/writes to `get(name)`/`set(name, v)`, which
  js2kt maps to `.value`/`.value =`. Do not invent React-style tuple APIs in
  helpers or examples, and verify native compile behavior of any cell member
  call (only `get(x)`/`set(a, b)` function forms and `.value` are mapped;
  `cell.set(v)` member calls pass through unchanged and fail on
  `MutableState`).