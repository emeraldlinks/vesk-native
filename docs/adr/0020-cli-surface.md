# ADR-0020: cwd-based CLI that stops at build/bundle; install lives in project scripts

**Date**: 2026-08-14 (commits `4c12987`, `46d12cc`, `44b74aa`; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

The CLI originally had `vesk install`/`vesk run` verbs, plus root-level
demo/release scripts. Install behavior (device detection, ADB paths, Termux
quirks) is inherently environment-specific, and every command took a project
name positional that conflicted with the natural workflow of running inside a
project.

## Decision

The CLI is **cwd-based** — it lives in the project's `node_modules`, so every
command operates on the current directory (no project-name positional ever;
`vesk build`, `vesk bundle ios`, never `vesk build myapp`). The CLI's job
stops at **build/bundle**: `vesk install`/`vesk run` no longer exist. APK
install paths live in the project's own scripts (`test-app/scripts/install.sh`
wrapped by `demo.sh`/`release.sh`, driven by `npm run demo` / `npm run
release`). The CLI surface is: `init`, `build`, `bundle [android|ios]`,
`verify [pkg]` / `verify bundle [android|ios]`, `setup`, `add`/`update`/
`remove <pkg>`. The toolchain installer is arch-aware with portable
keytool/Termux paths, and the CLI resolves its shipped assets from its own
package location so a packed tarball is self-contained.

## Alternatives Considered

### Alternative 1: Keep install/run in the CLI
- **Pros**: one command to install.
- **Cons**: ADB/device logic duplicates what project scripts need; Termux-specific paths pollute the CLI; `run` semantics (app launch) need an activity shell per platform.
- **Why not**: install is environment glue, not compiler logic — it belongs beside the demo tooling.

### Alternative 2: Global CLI with project-name positional
- **Pros**: familiar npm-style UX.
- **Cons**: project discovery and `node_modules` resolution get complicated; cwd-based is simpler and matches how the compiler runs (tsx from a project).
- **Why not**: the cwd model removes an entire class of path bugs.

## Consequences

### Positive
- Simple, predictable commands; no install/launch logic to maintain in the toolchain; demo install is one `npm run demo`.
- The programmatic surface (`generators`, `config`, `usage` exports) supports tooling without spawning the CLI.

### Negative
- Users must cd into the project; install automation varies per repo (each project owns its scripts).

### Risks
- Script drift between demo and release install paths; mitigation is the shared `install.sh` wrapper both scripts call.