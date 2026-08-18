# AGENTS.md

## Project

vesk-native: a compiler that translates `.vsk` components (Markup + Tailwind
+ scripts) into native Kotlin/Compose Android apps. The compiler lives in
`packages/compiler-native`, driven by `packages/cli-native`. `test-app` is the
proof-of-concept workload; the framework is the product, so missing primitives
get real compiler/JVM mappings, never workarounds in the demo app.

## Rules

- **Never guess in registry signatures.** No library signature, browser API
  surface, parameter type, enum member, or return shape in the `.vsklib`
  registry (or in `@vesk/*` declarations) may be invented from memory or
  assumed from the name.
- **Never guess in the registry.** The registry records themselves are not
  invented either: every field in a `.vsklib` file — library id, artifact
  `group:artifact@<version>`, category, tags, essential/curated flags, and
  every signature —   must come from a real, accessed source.
  Access the real source to author each entry — the
  installed AAR/JAR metadata via `binding-gen.ts`, the actual class/function
  declarations, the library's GitHub repo/source
  (e.g. GitHub releases, API docs, README examples, or the checked-out
  source of a dependency), or the runtime source for browser APIs. Guessing has caused
  runtime crashes before (e.g. the sqlite `bindArgs`/row-type mismatch); a
  wrong signature is worse than a missing one. If a surface cannot be
  verified, leave it out and fail closed — never fill it in.
- **No regex in the compiler, parser, or code generator.** All structural
  source analysis (attributes, elements, template literals, class extraction,
  head/link discovery, CSS blocks) must go through the AST/token surfaces:
  `parse()` -> `generateIR()` -> `walkIR()` for markup, and the parser for
  scripts. Regex is only acceptable for diagnostics/UX outside the toolchain.
- **No JS/TS ever ships in a built app.** The output of a vesk-native build
  is 100% Kotlin bytecode: zero bytes of JavaScript or TypeScript may end up
  in the APK (no bundled JS, no interpreter, no `.js`/`.ts` assets, no
  transpiled-to-Kotlin-by-runtime). User script code is translated at build
  time by the compiler; anything the compiler cannot translate yet is a
  hard build error — never a runtime fallback to a JS engine.
- **The script compiler is being rebuilt bottom-up on a real token surface.**
  The end state is a hand-written, regex-free JS/TS lexer + recursive-descent
  parser in `packages/compiler-native/src/lexer.ts` / `parser.ts` producing a
  token stream and AST that replace the borrowed `parse()` from the web
  compiler. The compiler's goal is full client-side coverage: every program
  that runs in a browser (window/document DOM APIs, Web APIs, timers,
  storage, network, events) and every app buildable with Kotlin/Compose in
  Android Studio must be expressible and correctly translated to native
  Kotlin — browser APIs are mapped to their Android/Kotlin equivalents by the
  compiler and runtime, never emulated in JS.
- **Web/browser API semantics are provided by Kotlin mappings.** `window`,
  `document`, `navigator`, `localStorage`, `fetch`, timers, events, and
  friends map to Android/Kotlin equivalents (activity, compose view tree,
  system services, SharedPreferences/DataStore, OkHttp/HttpURLConnection,
  coroutines, etc.). New browser APIs must register their Kotlin mapping in
  the compiler/runtime like device APIs register in `API_PERMISSIONS` —
  never a JS shim.
- **Correctness rule for translation:** every JS/TS construct the compiler
  accepts must produce the exact result the browser JS engine would, using
  the JS-semantics runtime (coercion, truthiness, equality, property
  lookup) where native Kotlin types cannot express it. Constructs the
  compiler cannot translate yet are hard build errors (`TODO(...)` fails
  the build), not silent miscompiles.
- `.vsk` files must win, not the generated Kotlin — regenerate and rebuild
  after compiler changes, verify green `BUILD SUCCESSFUL`, then commit.
- `test-app` is proof-of-concept: no workarounds, no hardcoding — everything
  through framework features.
- **Users never write or edit build files.** No XML, no Kotlin/Java, no
  `build.gradle.kts`, no `gradle.properties`, no manifest — every generated
  file is owned by vesk-native and regenerated on every build. All app
  configuration lives in `veskconfig.ts`/`veskconfig.json`; all app code and
  markup lives in `.vsk` component files. The CLI templates in
  `runtime/vesk-native-template/` and the generators in
  `packages/cli-native/src/index.ts` are the only places these files are
  authored.
- **Ship only what the app uses.** The manifest, permissions, and gradle
  dependencies are derived from actual usage (device-API calls + element tags
  in `.vsk` files, media elements, media broadcast). Never add a permission or
  dependency "just in case": new device APIs must register their required
  permissions in `API_PERMISSIONS` and their dependencies in the usage-derived
  gradle dependency map, and the runtime must not compile in code paths the
  app never reaches. Per-app native code (Runtime.kt helpers, imports) is
  pruned by usage the same way.
- All styling is done in markup (`<style>` blocks are component-scoped;
  `<link rel="stylesheet" href="...">` in a head is global). CSS files are
  read relative to the `.vsk` that references them.
- Build commands: `npx tsx packages/cli-native/src/index.ts build test-app`
  (slow, ~5 min), direct Kotlin diagnostics via
  `/opt/vesk-native-toolchain/gradle-9.7.0/bin/gradle -p test-app/app compileDebugKotlin --rerun-tasks`.
  **Never redirect a build to a log file, background it, or pipe it through
  `tail`/silent — always run the build command directly so the full log
  streams to the terminal.** A silent or file-veiled build looks hung and
  hides the progress the user wants to see.
  The CLI is cwd-based (it runs from a project's node_modules): from inside
  `test-app/` the equivalent is `npx tsx ../packages/cli-native/src/index.ts build`,
  and `bundle [android|ios]` takes the platform as its only positional.
  Demo install scripts live in `test-app/`: `npm run demo` (install debug)
  and `npm run release` (install the prebuilt release APK) run
  `test-app/scripts/demo.sh` / `release.sh`, which wrap
  `test-app/scripts/install.sh` — the APK install path lives in the scripts,
  not the CLI (`vesk install`/`vesk run` no longer exist; the CLI's job stops
  at `build`/`bundle`).
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