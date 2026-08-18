# Architecture Decision Records

Architectural decisions for vesk-native, recorded from the codebase, AGENTS.md
rules, design docs (`CMP-PLAN.md`, `vsklibs.md`, `plans/`), and commit history.
Backfilled on 2026-08-18; each ADR notes its original decision date.

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-native-kotlin-compilation.md) | .vsk compiles to native Kotlin/Compose — no WebView or bridge | accepted | 2026-08-02 |
| [0002](0002-zero-js-in-apk.md) | 100% Kotlin output — zero JS/TS bytes in the APK | accepted | 2026-08-10 |
| [0003](0003-no-regex-in-toolchain.md) | No regex in the compiler, parser, or code generator | accepted | 2026-08-10 |
| [0004](0004-own-lexer-parser.md) | Hand-written regex-free JS/TS lexer + recursive-descent parser | accepted | 2026-08-10 |
| [0005](0005-exact-js-semantics.md) | Exact JS semantics or a hard build error — never a silent miscompile | accepted | 2026-08-09 |
| [0006](0006-vesk-cells-not-react-state.md) | Tracked state is vesk cells, not React state | accepted | 2026-08-02 |
| [0007](0007-browser-apis-map-to-kotlin.md) | Browser/Web APIs map to Kotlin runtime equivalents, never JS shims | accepted | 2026-08-10 |
| [0008](0008-compile-time-tailwind.md) | Tailwind classes compiled at build time to Modifier/TextStyle | accepted | 2026-08-08 |
| [0009](0009-usage-derived-builds.md) | Usage-derived builds — permissions, deps, helpers, assets from .vsk usage | accepted | 2026-08-10 |
| [0010](0010-generated-build-files.md) | Users never author build files; all config lives in veskconfig.ts | accepted | 2026-08-09 |
| [0011](0011-device-api-catalog.md) | Device APIs: three usage kinds + API_PERMISSIONS + natural permission prompts | accepted | 2026-08-10 |
| [0012](0012-vsklib-no-guessing.md) | .vsklib registry — never guess; verify every record against real sources | accepted | 2026-08-12 |
| [0013](0013-cli-library-management.md) | vesk add/update/remove with libraries.json as the single source of truth | accepted | 2026-08-13 |
| [0014](0014-metadata-bindings.md) | Auto-generated library bindings from kotlinx-metadata | accepted | 2026-08-14 |
| [0015](0015-npm-packages-to-kotlin.md) | Vanilla-JS npm packages compile to Kotlin (app.vmod) — no JS engine | accepted | 2026-08-11 |
| [0016](0016-file-router.md) | React-router-style file navigation with deep links and scroll-state registry | accepted | 2026-08-08 |
| [0017](0017-compose-multiplatform.md) | Compose Multiplatform for iOS via a shared KMP module + expect/actual seams | accepted | 2026-08-15 |
| [0018](0018-framework-components.md) | Missing primitives become framework components, never demo-app workarounds | accepted | 2026-08-17 |
| [0019](0019-asset-bundling.md) | Project assets bundle to res/; device paths decode at runtime | accepted | 2026-08-09 |
| [0020](0020-cli-surface.md) | cwd-based CLI that stops at build/bundle; install lives in project scripts | accepted | 2026-08-14 |