# ADR-0016: React-router-style file navigation with deep links and scroll-state registry

**Date**: 2026-08-08 (native navigation `1f8437a`; router surface `3e3a630`/`715106c`; backfilled 2026-08-18)
**Status**: accepted
**Deciders**: maintainers

## Context

Web `.vsk` uses file-based routing with `Link`/`NavLink`/`Outlet`,
`useNavigate`/`useParams`/`useSearchParams`. The native app needs the same
semantics: static routes, dynamic segments (`[slug]`), catch-alls
(`[...all]`), a back stack, deep links, and per-route scroll behavior.

## Decision

Navigation is a Kotlin port of the Vesk file-router with a
**react-router-style surface**: `Link`/`NavLink`/`Outlet` composables
(runtime components, the only non-`.vsk` callables emitted by
`componentCallLines`), plus script APIs `useRouter().push/back/refresh`,
`useQuery()`, destructured `useParams()`, `navigate`, `back`, `goBack`.
Layouts wrap pages via the navigation graph; route params flow into page
props; Android deep links are generated from route config (intent filters
only when `veskconfig.deepLinks` is set). A NavController per-route
**scroll-state registry** restores scroll offsets on back and starts fresh on
forward; page-level scroll applies only to the layout shell so nested
overflow rows stay independent. `useParams`/`useQuery` strip query and hash
with delimiter-present `substringBefore/After` semantics, matching web
behavior.

## Alternatives Considered

### Alternative 1: Use androidx.navigation directly (NavHost)
- **Pros**: battle-tested; native back stack.
- **Cons**: its graph model diverges from file-based `.vsk` routing; deep-link/params mapping would be reimplemented anyway.
- **Why not**: the ported file-router keeps route semantics identical to web `.vsk`.

### Alternative 2: Web-style hash routing
- **Pros**: trivial.
- **Cons**: not native; no deep links; no system back integration.
- **Why not**: navigation must be native (back button, deep links, scroll restoration).

## Consequences

### Positive
- Web `.vsk` routing code copies over unchanged; deep links and system back work natively.
- Scroll-state registry gives the expected browser-style back behavior.

### Negative
- Two sources of routing truth (port + androidx under the hood) must stay in sync; the router lives in the runtime template and is regenerated per app.

### Risks
- Params/query edge cases (delimiters absent/present) diverge from web; mitigation is the delimiter-present semantics fix and parity tests.