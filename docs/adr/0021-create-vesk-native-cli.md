# ADR-0021: create-vesk-native — machine-aware scaffolding CLI

**Date**: 2026-08-18
**Status**: accepted
**Deciders**: maintainers

## Context

`packages/create-native` was a minimal prompt-based scaffold that didn't fit
how vesk-native apps are built: it guessed an SDK path, produced no guidance
for AI agents, and forked toolchain logic from `packages/cli-native` instead
of reusing it. A new CLI was needed with create-vite-style UX (name + template
prompts, `--yes`, exit codes), machine-aware SDK resolution that never
hardcodes `/opt` or any other path into generated files, and a per-app
`AGENTS.md` documenting conventions and the generated framework structure.

## Decision

Rebuild `packages/create-native` as a zero-dependency CLI (readline prompts
only; the `prompts` dependency is dropped):

- **Hand-rolled arg parser** with `--flag=value` and `--flag value` forms,
  `-y/--yes`, `-t/--template`, `--app-name`, `--app-id`, `--primary`,
  `--theme`, `-h`, `-v`. Exit codes: `0` success/help/version, `1` errors.
- **Reuse, don't fork**: `setupToolchain`, `syncAapt2Override`, and the new
  `detectToolchain` are extracted into `packages/cli-native/src/toolchain.ts`
  (moved from `commands.ts`/`generators.ts`, unchanged public surface) and
  imported by the create CLI. SDK resolution lives in the create CLI:
  `ANDROID_HOME`/`ANDROID_SDK_ROOT` (valid only) → omit `local.properties`;
  otherwise `VESK_HOME` → toolchain root → Termux `$PREFIX`, with
  `sdk.dir=<resolved path>` written to `local.properties`. No path literals
  for a specific machine ever appear in generated files.
- **Templates** (`blank`/`starter`/`demo`) ship as files under
  `packages/create-native/templates/`, selected interactively (numbered menu,
  default marked) or via `-t`. Every app must include a `layout.vsk` with
  `props.children` because generated `App.kt` always renders `Layout {
  AppRouter(...) }`. Device APIs are user-space bindings — a component using
  `device.notify(...)` declares `const device = rememberDeviceApi()` in its
  script (usage-derived permissions still flow from `usage.ts`).
- **Per-app AGENTS.md** generated at scaffold time: cwd-based CLI usage,
  "`.vsk` files win" workflow, `veskconfig.ts` as the only config surface,
  vesk-cell state rules, and the generated framework structure.
- **Packaging**: esbuild bundle with `#!/usr/bin/env node` banner (source
  shebang removed — a double banner broke `node dist/index.js`), templates and
  gradle assets read from the package at runtime (`import.meta.dirname`), so
  template edits don't require a dist rebuild. Published mode (`file:` links
  absent) falls back to `^0.1.0` deps.

## Alternatives Considered

### Alternative 1: Keep `prompts` and inline everything
- **Pros**: less code; familiar prompt library.
- **Cons**: extra dependency for two prompts; library prompt flows can't be
  made to match the CLI's exit-code and non-TTY contract without wrapping.
- **Why not**: readline/promises covers the surface with zero deps and full
  control over Ctrl+C/Ctrl+D behavior.

### Alternative 2: Have the compiler inject the `device` binding on use
- **Pros**: components could call `device.*` without a declaration.
- **Cons**: touching the compiler codegen is out of scope here; the
  user-space `const device = rememberDeviceApi()` declaration is the existing
  pattern (`test-app` media page) and keeps the compiler surface unchanged.
- **Why not**: the declaration is explicit and already proven.

## Consequences

### Positive
- Scaffolds work identically from repo source (tsx, root tsconfig paths) and
  the bundled dist (cwd-independent); verified end-to-end: gate scaffold,
  `npm install`, `vesk-native build` green for starter and blank templates,
  device install, and `vesk setup` behavior unchanged.
- Toolchain knowledge lives in one module (`toolchain.ts`); the create CLI,
  `vesk setup`, and build-time aapt2 sync all share it.

### Negative
- `tsx` dev-mode resolves tsconfig paths from CWD, so source runs must start
  from the repo root (dist is cwd-independent).
- Interactive prompting requires a TTY; piped stdin takes the non-interactive
  default path instead.

### Risks
- Published-mode `file:`-link detection relies on `resolveVeskRoot()`
  heuristics (monorepo layout); a consumer whose project happens to contain
  `packages/cli-native` would get monorepo links — acceptable, that layout
  implies the monorepo workflow.