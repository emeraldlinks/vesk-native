# vesk library registry format (`.vsklib`)

The registry is the catalog of Kotlin/Android libraries the CLI resolves
`vesk add/update <pkg>` against. It is **data, never framework source**: one
`.vsklib` JSON record per library, loaded by `loadRegistry()` and validated at
load. The same format is used for the per-project `.vsklib/` cache that
`add/remove/update` write, so a fetched/auto-generated binding always lives in
data too.

Everything a library needs — Maven coordinates, permissions, typed exports,
markup tags — lives in the record. The compiler only reads what the app
installs; the registry only feeds `vesk add` and `vesk registry`.

## File layout

```
packages/cli-native/registry/
  README.md                <- this file
  essential/<id>.vsklib    <- the 10 can't-live-without libs
  network/<id>.vsklib      <- HTTP, JSON, API clients
  ui/<id>.vsklib           <- Compose components
  data/<id>.vsklib         <- persistence, prefs
  images/<id>.vsklib       <- image loading
  charts/<id>.vsklib       <- charting
  animation/<id>.vsklib    <- animation
  media/<id>.vsklib        <- audio/video/camera
  tools/<id>.vsklib        <- permissions, qr, utilities
```

One file per library, named `<id>.vsklib` where `<id>` is the `vesk add` alias.
New categories are just new subdirectories.

## Envelope

Every file is a single record in a versioned envelope:

```json
{
  "version": 1,
  "library": { ...VskLibRecord }
}
```

## Record fields

| field         | required | type              | meaning |
|---------------|----------|-------------------|---------|
| `id`          | yes      | string            | `vesk add <id>` alias; unique, kebab-case |
| `name`        | yes      | string            | human name |
| `description` | yes      | string            | one-liner |
| `group`       | yes      | string            | Maven group |
| `artifact`    | yes      | string            | Maven artifact |
| `version`     | yes      | string            | pinned version (exact) |
| `gradle`      | yes      | string[]          | one or more real coordinates `g:a:v` |
| `permissions` | yes      | string[]          | device permissions the lib needs at runtime |
| `exports`     | yes      | string[]          | every name importable as `import { X } from '@vesk/<id>'` |
| `tags`        | yes      | object            | markup tag map (see below) |
| `signatures`  | no       | object            | typed surface for exports (see below) |
| `minSdk`      | no       | number            | minimum SDK |
| `essential`   | no       | boolean           | true only for the 10 can't-live-without libs |
| `curated`     | no       | boolean           | true on hand-authored catalog entries — `vesk add` trusts the record as-is and skips auto-generation |

## `tags` — markup surface

Each tag maps a `.vsk` element to a Kotlin composable:

```json
"tags": {
  "CoilImage": {
    "composable": "AsyncImage",
    "imports": ["coil.compose.AsyncImage"],
    "attrs": { "src": "model", "alt": "contentDescription" },
    "container": false,
    "attrShapes": {}
  }
}
```

- `attrs` maps every `.vsk` prop name to the composable parameter name.
- `imports` are the page-file Kotlin imports the callable needs.
- `container: true` when children render into a trailing content lambda.
- `attrShapes` (optional) gives each prop a `LibParamSig` so the compiler can
  translate list literals, enum strings and numbers with the right Kotlin type.
- Only tags the compiler can map honestly go here. A composable with an opaque
  parameter (e.g. `LottieComposition?`) is **not** a tag — listing it would
  fail the build later, which is guessing.

## `signatures` — typed exports

`signatures` is `Record<name, LibExportSig>`. **Every export that is callable
from scripts must have a signature** — that is the "no guessing" rule. The
compiler uses exactly three callable kinds; anything else is an opaque value.

### LibExportSig

| field           | type    | meaning |
|-----------------|---------|---------|
| `name`          | string  | JS-visible name (matches a key of `exports`) |
| `target`        | string  | Kotlin reference at the call site (simple name) |
| `qualified`     | string  | fully-qualified Kotlin class/function for the import |
| `jsdoc`         | string? | doc comment emitted above the `@vesk/*` declaration — write it whenever the call form isn't obvious |
| `isConstructor` | boolean | object-literal factory |
| `isEnum`        | boolean | member access maps to constants |
| `enumValues`    | string[]? | constant names when `isEnum` |
| `params`        | LibParamSig[] | parameters in declaration order — **every one fully typed** |
| `defaultParams` | string[] | param names with Kotlin defaults (optional in the call) |
| `returnShape`   | shape    | shape of the returned value |

### Callable kinds

1. **Object-literal constructor** — `isConstructor: true`, `params.length > 0`.
   Called as `X({ a: 1, b: 's' })`; each param is a named Kotlin argument.
   Emits `interface X {}` + `function X(props: {...}): X`.
   Example: `LineChartData({ ... })`, `OkHttpClient({})`.

2. **Zero-arg constructor** — `isConstructor: true`, `params: []`. Called as
   `X()`. Emits `interface X {}` + `function X(): X`.
   Example: `Gson()`, `Moshi()`, `OkHttpClient()`.

3. **Callable function** — `isConstructor: false`, `isEnum: false`, **all**
   params in `{number, string, boolean, any}` and return in
   `{void, number, string, boolean, any}`. Called positionally:
   `X(a, b)`. Emits `function X(a: number, b?: string): void`.
   This is exactly the compiler's `libCallable` gate — a signature that passes
   it is guaranteed translatable. Anything object/array/enum shaped is not a
   script call yet.

4. **Enum** — `isEnum: true` with `enumValues`. Emits a typed const map plus
   a union type: `X.A | X.B`. Members and string values are validated at build.

Everything else (composables, provider objects, delegates) is an **opaque
value**: `const X: any`. It exists in the module and type-checks as an
annotation, but the compiler refuses to call it — that refusal is the guard
against silent miscompiles. Do not give a non-callable export a function
signature; the compiler will not emit the call.

### LibParamSig — full typing of every argument

| field          | type        | meaning |
|----------------|-------------|---------|
| `name`         | string      | parameter name (must match the Kotlin declaration) |
| `shape`        | shape       | `number` `string` `boolean` `array` `object` `enum` `function` `any` `void` `other` |
| `typeName`     | string?     | dotted Kotlin type; **required for** `number` (e.g. `kotlin.Float`), `enum`, `object` |
| `elem`         | LibParamSig? | element signature when `shape: 'array'` |
| `pairElements` | LibParamSig[]? | two element signatures when `object` is a `kotlin.Pair` map |
| `enumValues`   | string[]?   | constant names when `shape: 'enum'` |

The compiler coerces each argument by shape: numbers to the exact Kotlin type
via `typeName` (`kotlin.Int`/`kotlin.Long`/`kotlin.Float`/`kotlin.Double`/
`kotlin.Short`/`kotlin.Byte`), strings via `jsString`, booleans via `truthy`,
arrays to `listOf(...)` of the element signature, enums to validated
`Enum.MEMBER` references, objects to constructor calls or `mapOf` pairs.

## Browser API surface (not in the registry)

Browser APIs are **not** Maven libraries: `fetch`, `localStorage`, `openSqlite`,
auth, and timers have no AAR behind them. They map to Kotlin runtime helpers
(`VeskFetch`, `VeskWebStorage`, `VeskSqlite`, `VeskAuth`, `VeskTimers`,
`jsAlert`, `JsConsole` in `runtime-templates.ts`), and the compiler translates
the JS names to those helpers in `js2kt.ts`. No `.vsklib` record exists for
them — but their signatures are still authored, not guessed, in
`packages/compiler-native/src/browser-api.ts`, derived from the runtime source.

### Three usage kinds — never confuse them

1. **Markup tags** (`<CoilImage src={...}>`): composables imported from
   `@vesk/<lib>`, used in markup. Declared via `tags` in the record.
2. **Script functions/constructors from a library** (`Gson()`,
   `LineChartData({...})`): imported from `@vesk/<lib>`, typed via
   `signatures` in the record.
3. **Browser-API script functions/values** (`fetch()`, `openSqlite()`,
   `localStorage.getItem(...)`, `signUp()`): no import needed — bare globals.
   The exact vesk-native signatures are available by importing from the
   built-in `@vesk/browser` module.

### The surface

| JS name | Kotlin mapping | Notes |
| --- | --- | --- |
| `openSqlite(name, version?)` | `VeskSqlite.openDatabase` | better-sqlite3-style `VeskSqliteDb` handle (`exec`/`run`/`get`/`all`/`close`); cached per name; `run` returns `{ lastInsertRowid, changes }`; rows are plain objects |
| `signUp`/`signIn`/`signOut`/`currentUser`/`isSignedIn` | `VeskAuth` | users in native sqlite (`vesk_auth`), SHA-256 hashes, session persisted in localStorage |
| `fetch(url, init?)` | `VeskFetch.fetch` | **synchronous** (blocks), 8s timeouts, needs INTERNET permission (added on use); returns `VeskResponse` (`url`/`status`/`statusText`/`ok`/`headers`/`text()`/`json()`) |
| `localStorage`/`sessionStorage` | `VeskWebStorage` | values stored as strings; `local` persists in SharedPreferences, `session` in memory |
| `setTimeout`/`setInterval`/`clearTimeout`/`clearInterval` | `VeskTimers` | coroutines on the main dispatcher; ids are `number` |
| `alert(message?)` | `jsAlert` | non-blocking native AlertDialog (Android cannot block the main thread) |
| `console.*` | println / `JsConsole` | see the `Console` interface |
| `JSON.parse`/`JSON.stringify` | `jsParseJson`/`jsStringify` | JS-semantics coercion |
| `window.*` | member mappings | only `alert`, `fetch`, timers; anything else is a hard build error |

Declarations are emitted into `vesk-env.d.ts` (the `@vesk/browser` module) and
`vesk-browser.d.ts` (`openSqlite` + auth as bare globals). The standard browser
globals (fetch, timers, storage, alert, console, JSON, window) resolve to their
DOM-lib types when used bare; only the `@vesk/browser` module carries the exact
vesk-native signatures (notably the synchronous `fetch`). Import validation in
`kotlin-codegen.ts` fails closed on names that are not in `browser-api.ts`.

Authoring rule: **derive from the runtime source.** `runtime-templates.ts` is
the contract. If a helper changes, `browser-api.ts` must change with it — a
declaration that promises a signature the runtime does not provide is a
guessed signature.

## Rules for adding a library

1. **Real coordinates.** `group`, `artifact`, `version` and every `gradle`
   entry must be real. `vesk add` verifies the pinned version against Maven
   Central — a typo fails loudly.
2. **Every callable export is typed.** Each export the compiler can call
   (constructor, zero-arg constructor, primitive free function, enum) has a
   signature. No `any` for anything callable. Exports are honest names from
   the library's actual API — never invented helpers.
3. **Every parameter is fully typed.** `shape` always set; `typeName` on every
   `number`/`enum`/`object`; `elem` on arrays; `enumValues` on enums. A
   missing type means the compiler refuses the call — that is correct.
4. **Tags are truthful.** Only composables whose parameters all map are tags.
   Opaque params (like `LottieComposition?`) are not tags; note them in the
   record's `description` instead.
5. **Permissions are real.** List the permissions the library needs at
   runtime. Network clients also get the group rules applied
   (`LIBRARY_PERMISSION_RULES`) — never add permissions "just in case".
6. **JSDoc when the call form isn't obvious.** `jsdoc` is emitted verbatim
   above the `@vesk/*` declaration. Write it whenever a param needs a unit,
   an enum needs a caveat, or the Kotlin target differs from the JS name.
7. **`essential` is only the 10.** One flag per lib; the loader sorts them
   first and `vesk add` help surfaces them. Everything else is catalog data.
8. **`curated` means trusted.** Every catalog entry is `curated: true`, which
   skips the auto-generated metadata fallback at `vesk add` — the authored
   surface is what installs. Auto-generated bindings never set it.
9. **Fail closed, never guess.** If the compiler cannot express a surface,
   leave it out of the record rather than invent a shape. The conformance
   gate regenerates and asserts known libraries — a record that degrades the
   generated surface is a build failure.
10. **One file per library.** `<id>.vsklib`, unique id, kebab-case. `vesk add`
    resolves by id or by `group:artifact`.
11. **Verify after authoring.** `npx tsc --noEmit -p tsconfig.json`, then
    `vesk add <id>` in a scratch app, then the conformance gate. A registry
    entry that cannot install or generate is not committed.

## Template

```json
{
  "version": 1,
  "library": {
    "id": "example-lib",
    "name": "Example Library",
    "description": "What it does, in one line",
    "group": "com.example",
    "artifact": "example",
    "version": "1.2.3",
    "gradle": ["com.example:example:1.2.3"],
    "permissions": ["android.permission.INTERNET"],
    "minSdk": 23,
    "essential": false,
    "curated": true,
    "exports": ["Client", "Config", "LogLevel", "formatBytes"],
    "tags": {
      "ExampleView": {
        "composable": "ExampleView",
        "imports": ["com.example.ExampleView"],
        "attrs": { "value": "value", "label": "label" },
        "container": true
      }
    },
    "signatures": {
      "Client": {
        "name": "Client",
        "target": "Client",
        "qualified": "com.example.Client",
        "jsdoc": "Creates a client. Call init() first via Example.init().",
        "isConstructor": true,
        "params": [
          { "name": "baseUrl", "shape": "string" },
          { "name": "timeoutMs", "shape": "number", "typeName": "kotlin.Long" },
          { "name": "level", "shape": "enum", "typeName": "com.example.LogLevel", "enumValues": ["DEBUG", "INFO", "ERROR"] }
        ],
        "defaultParams": ["timeoutMs"],
        "returnShape": "other"
      },
      "Config": {
        "name": "Config",
        "target": "Config",
        "qualified": "com.example.Config",
        "isConstructor": true,
        "params": [],
        "defaultParams": [],
        "returnShape": "other"
      },
      "LogLevel": {
        "name": "LogLevel",
        "target": "LogLevel",
        "qualified": "com.example.LogLevel",
        "isEnum": true,
        "enumValues": ["DEBUG", "INFO", "ERROR"],
        "params": [],
        "defaultParams": [],
        "returnShape": "string"
      },
      "formatBytes": {
        "name": "formatBytes",
        "target": "formatBytes",
        "qualified": "com.example.formatBytes",
        "jsdoc": "Human-readable byte size.",
        "isConstructor": false,
        "params": [
          { "name": "bytes", "shape": "number", "typeName": "kotlin.Long" }
        ],
        "defaultParams": [],
        "returnShape": "string"
      }
    }
  }
}
```

That record generates this `@vesk/example-lib` module in `vesk-env.d.ts`:

```ts
declare module '@vesk/example-lib' {
  export declare interface Client {}
  /** Creates a client. Call init() first via Example.init(). */
  export declare function Client(props: {
    baseUrl: string;
    timeoutMs?: number;
    level: 'DEBUG' | 'INFO' | 'ERROR';
  }): Client;
  export declare interface Config {}
  export declare function Config(): Config;
  export declare const LogLevel: {
    readonly DEBUG: 'DEBUG';
    readonly INFO: 'INFO';
    readonly ERROR: 'ERROR';
  };
  export declare type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
  /** Human-readable byte size. */
  export declare function formatBytes(bytes: number): string;
  export declare const ExampleView: any; // tag-only: used as markup, not a script call
}
```

Every callable export is fully typed with real args; `ExampleView` stays a
value because it is a markup tag, and the compiler guards anything else that
has no script surface yet.
