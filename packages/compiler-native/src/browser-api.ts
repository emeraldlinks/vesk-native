// The script-callable browser-API surface, authored from the exact Kotlin
// runtime in packages/cli-native/src/runtime-templates.ts — never from memory.
// Every name, parameter, and return shape below maps 1:1 to a Vesk* runtime
// helper (VeskTimers, VeskWebStorage, VeskFetch, VeskSqlite, VeskAuth,
// jsAlert, JsConsole). The compiler translates the JS names to those helpers
// (js2kt.ts), so the declarations are the contract both sides share.
//
// The surface is exposed two ways:
//   - as a `@vesk/browser` virtual module (typed imports for IDE/tooling),
//     covering the full surface including the standard browser globals
//     (fetch/alert/timers/storage/console/JSON/window) with the exact
//     vesk-native signatures; and
//   - as globals for the names that are NOT standard DOM globals
//     (openSqlite, signUp, signIn, signOut, currentUser, isSignedIn,
//     navigate, back, goBack, useParams), since
//     the compiler maps bare identifiers and the helpers are pruned by usage.
//     The standard globals already get browser-accurate types from the DOM
//     lib; fetch's DOM type (Promise-based) differs from vesk-native's
//     synchronous fetch, so import { fetch } from '@vesk/browser' when the
//     exact signature matters.
//
// Declarations are emitted into the generated vesk-env.d.ts; the module is
// validated at build time by kotlin-codegen.ts before the unknown-library
// error, so an invented import fails closed.

export interface BrowserApiDecl {
  /** JS-visible name (also the `@vesk/browser` export name). */
  name: string;
  /** 'function' for callables, 'const' for values (localStorage, JSON, ...). */
  kind: 'function' | 'const';
  /** Pre-rendered TS declaration lines (typed, with JSDoc). */
  decl: string[];
  /** Whether the name also works as a bare global without an import. */
  global: boolean;
}

// Interfaces the declaration surface references. Authored from the runtime
// classes/objects: VeskResponse (VeskFetch), VeskSqliteDb (VeskSqlite),
// VeskWebStorage methods, JsConsole methods, jsAlert, VeskTimers.
const BROWSER_INTERFACES: string[] = [
  `/** Native HTTP response from fetch(). Maps to the VeskResponse class in the
 * runtime (VeskFetch.fetch): a synchronous HttpURLConnection request that
 * returns a browser-shaped response. */
export declare interface VeskResponse {
  /** The request URL, verbatim. */
  readonly url: string;
  /** HTTP status code; 0 on network failure (no response received). */
  readonly status: number;
  /** HTTP reason phrase; 'Network error' when the request failed. */
  readonly statusText: string;
  /** True when status is 200-299. */
  readonly ok: boolean;
  /** Response headers as sent by the server (runtime Map<String, String>). */
  readonly headers: Record<string, string>;
  /** The response body as text. */
  text(): string;
  /** The response body parsed as JSON (JSON.parse semantics; throws on invalid JSON). */
  json(): any;
}

/** Options for fetch(). Runtime reads these keys from a plain object via
 * jsMapGet; everything else is ignored. */
export declare interface FetchInit {
  /** HTTP method; default 'GET'. GET/HEAD never send a body. */
  method?: string;
  /** Request headers as a plain object. */
  headers?: Record<string, string>;
  /** Request body; sent as UTF-8 text (only for non-GET/HEAD). */
  body?: string;
}

/** Native SQLite handle from openSqlite(). Maps to the VeskSqliteDb class in
 * the runtime — a better-sqlite3-style surface. Handles are cached per
 * database name for the process lifetime, so repeated openSqlite(name) calls
 * return the same handle. */
export declare interface VeskSqliteDb {
  /** Run a statement with no result (CREATE TABLE, DROP, ...). */
  exec(sql: string): void;
  /** Run an INSERT/UPDATE/DELETE and report lastInsertRowid + changes (0 when the db is closed). */
  run(sql: string, params?: any[]): { lastInsertRowid: number; changes: number };
  /** First row of the query, or null when there are no rows. */
  get(sql: string, params?: any[]): Record<string, any> | null;
  /** All rows of the query as a list of plain objects. */
  all(sql: string, params?: any[]): Record<string, any>[];
  /** Close the handle; later calls return empty results (no-op). */
  close(): void;
}

/** Router handle from useRouter() — react-router / Next.js style navigation.
 * All methods go through the same NavController as navigate()/back(). */
export declare interface VeskRouter {
  /** Navigate to a route path (history.pushState semantics). */
  push(path: string): void;
  /** Pop back to the previous route; a no-op at the root. */
  back(): void;
  /** Remount the current page from scratch (browser-reload semantics):
   * all of the page's local state is rebuilt. */
  refresh(): void;
}

/** Web Storage (localStorage / sessionStorage). Values are stored as strings
 * (null stores the literal string 'null'); getItem returns null for missing
 * keys; key(i) is the i-th key or null. localStorage persists across app
 * restarts (SharedPreferences), sessionStorage lives only for the process. */
export declare interface WebStorage {
  /** Number of keys. */
  readonly length: number;
  /** The stored string for key, or null when missing. */
  getItem(key: string): string | null;
  /** Store a value as a string (null becomes 'null'). */
  setItem(key: string, value: string): void;
  /** Remove key. */
  removeItem(key: string): void;
  /** Remove all keys. */
  clear(): void;
  /** The key at index, or null when out of range (localStorage keys are sorted). */
  key(index: number): string | null;
}

/** The mapped subset of the window global. Only these members compile to
 * native Kotlin; anything else is a hard build error. */
export declare interface Window {
  /** Non-blocking native AlertDialog; returns immediately. */
  alert(message?: any): void;
  /** Same as the bare fetch() global. */
  fetch(url: string, init?: FetchInit): VeskResponse;
  /** Same as the bare setTimeout() global. */
  setTimeout(fn: () => void, ms?: number): number;
  /** Same as the bare setInterval() global. */
  setInterval(fn: () => void, ms?: number): number;
  /** Same as the bare clearTimeout() global. */
  clearTimeout(id: number): void;
  /** Same as the bare clearInterval() global. */
  clearInterval(id: number): void;
}

/** The mapped subset of console. log/warn/error/info/debug print each argument
 * on its own line; time/timeEnd/count/countReset use the JsConsole runtime. */
export declare interface Console {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  info(...args: any[]): void;
  debug(...args: any[]): void;
  /** Print the message only when the first argument is falsy. */
  assert(condition: any, message?: any): void;
  /** Print the current stack trace. */
  trace(...args: any[]): void;
  /** Start a timer labeled 'label' (JsConsole). */
  time(label?: string): void;
  /** Print elapsed time for 'label' as "<label>: N ms". */
  timeEnd(label?: string): void;
  /** Increment and print a counter for 'label'. */
  count(label?: string): void;
  /** Reset the counter for 'label'. */
  countReset(label?: string): void;
  /** Print the first argument as a group header. */
  group(...args: any[]): void;
  /** Print the first argument as a group header. */
  groupCollapsed(...args: any[]): void;
  /** Print an empty line. */
  groupEnd(): void;
  /** Print the argument. */
  table(...args: any[]): void;
  /** Print an empty line. */
  clear(): void;
}`,
];

const BROWSER_FNS: BrowserApiDecl[] = [
  {
    name: 'fetch',
    kind: 'function',
    global: false,
    decl: [
      `/** Synchronous native fetch via HttpURLConnection on the IO dispatcher
 * (runtime VeskFetch.fetch). Unlike browsers, it blocks until the response
 * arrives; connect/read timeouts are 8s. On network failure the response has
 * status 0, ok=false and statusText 'Network error'. Requires the INTERNET
 * permission (added automatically when used). The DOM lib's Promise-based
 * fetch type is NOT this signature — use the @vesk/browser import for the
 * exact vesk-native shape. */
export declare function fetch(url: string, init?: FetchInit): VeskResponse;`,
    ],
  },
  {
    name: 'openSqlite',
    kind: 'function',
    global: true,
    decl: [
      `/** Open (or reuse) a native SQLite database (runtime VeskSqlite).
 * Handles are cached per name for the process lifetime; version only applies
 * on first open. Rows are plain objects with integer/real/string/blob column
 * values; params bind positionally to ? placeholders (booleans bind as 1/0). */
export declare function openSqlite(name: string, version?: number): VeskSqliteDb;`,
    ],
  },
  {
    name: 'signUp',
    kind: 'function',
    global: true,
    decl: [
      `/** Create a user in the native vesk_auth database (runtime VeskAuth).
 * Returns the user row { id, username } or null when the username is taken or
 * either value is empty. Passwords are stored as a SHA-256 hash of
 * "username:password" in native sqlite — never a JS shim. */
export declare function signUp(username: string, password: string): Record<string, any> | null;`,
    ],
  },
  {
    name: 'signIn',
    kind: 'function',
    global: true,
    decl: [
      `/** Sign in and persist the session in localStorage so it survives app
 * restarts (runtime VeskAuth). Returns the user row { id, username } or null
 * on bad credentials. */
export declare function signIn(username: string, password: string): Record<string, any> | null;`,
    ],
  },
  {
    name: 'signOut',
    kind: 'function',
    global: true,
    decl: [
      `/** Clear the persisted session (runtime VeskAuth.signOut). */
export declare function signOut(): void;`,
    ],
  },
  {
    name: 'currentUser',
    kind: 'function',
    global: true,
    decl: [
      `/** The signed-in user row { id, username } or null when signed out
 * (runtime VeskAuth.currentUser). */
export declare function currentUser(): Record<string, any> | null;`,
    ],
  },
  {
    name: 'isSignedIn',
    kind: 'function',
    global: true,
    decl: [
      `/** True when a session is persisted and its user still exists
 * (runtime VeskAuth.isSignedIn). */
export declare function isSignedIn(): boolean;`,
    ],
  },
  {
    name: 'setTimeout',
    kind: 'function',
    global: false,
    decl: [
      `/** Run fn after ms milliseconds on the main dispatcher (runtime
 * VeskTimers.setTimeout, default 0). Returns an id for clearTimeout(). */
export declare function setTimeout(fn: () => void, ms?: number): number;`,
    ],
  },
  {
    name: 'setInterval',
    kind: 'function',
    global: false,
    decl: [
      `/** Run fn every ms milliseconds on the main dispatcher (runtime
 * VeskTimers.setInterval). Returns an id for clearInterval(). */
export declare function setInterval(fn: () => void, ms?: number): number;`,
    ],
  },
  {
    name: 'clearTimeout',
    kind: 'function',
    global: false,
    decl: [
      `/** Cancel a pending setTimeout (runtime VeskTimers.clearTimeout). */
export declare function clearTimeout(id: number): void;`,
    ],
  },
  {
    name: 'clearInterval',
    kind: 'function',
    global: false,
    decl: [
      `/** Stop a setInterval loop (runtime VeskTimers.clearInterval). */
export declare function clearInterval(id: number): void;`,
    ],
  },
  {
    name: 'alert',
    kind: 'function',
    global: false,
    decl: [
      `/** Non-blocking native AlertDialog (runtime jsAlert). Android cannot
 * block the main thread, so this returns immediately and shows the dialog
 * asynchronously; the value of message is stringified (null becomes ''). */
export declare function alert(message?: any): void;`,
    ],
  },
  {
    name: 'navigate',
    kind: 'function',
    global: true,
    decl: [
      `/** Navigate to a route path through the NavController (runtime
 * veskNavigate) — browser history.pushState semantics: no reload, stack-based
 * back (pop() to the previous route). Also reachable as
 * history.pushState(null, '', path) or location.href = path. */
export declare function navigate(path: string): void;`,
    ],
  },
  {
    name: 'back',
    kind: 'function',
    global: true,
    decl: [
      `/** Go back to the previous route (runtime veskGoBack -> NavController
 * pop()); a no-op at the root route. Browser equivalent: history.back(). */
export declare function back(): void;`,
    ],
  },
  {
    name: 'goBack',
    kind: 'function',
    global: true,
    decl: [
      `/** Alias for back() (runtime veskGoBack). */
export declare function goBack(): void;`,
    ],
  },
  {
    name: 'useParams',
    kind: 'function',
    global: true,
    decl: [
      `/** The current route's matched params as a string map (runtime
 * veskUseParams): the {id} segments of the path currently being shown, e.g.
 * useParams()['id'] on a /flight/{id} page. */
export declare function useParams(): Record<string, string>;`,
    ],
  },
  {
    name: 'useRouter',
    kind: 'function',
    global: true,
    decl: [
      `/** A router handle for the current route (runtime veskUseRouter ->
 * VeskRouter). react-router / Next.js style: router.push(path) navigates,
 * router.back() pops the history, router.refresh() remounts the current
 * page (browser-reload semantics). Same NavController as navigate()/back(). */
export declare function useRouter(): VeskRouter;`,
    ],
  },
  {
    name: 'useQuery',
    kind: 'function',
    global: true,
    decl: [
      `/** The current route's query string as a decoded string map (runtime
 * veskUseQuery -> veskUseQuery): '/flight/123?seat=12A' gives
 * useQuery()['seat'] === '12A'. Keys and values are percent-decoded. */
export declare function useQuery(): Record<string, string>;`,
    ],
  },
];

const BROWSER_CONSTS: BrowserApiDecl[] = [
  {
    name: 'localStorage',
    kind: 'const',
    global: false,
    decl: [
      `/** Persistent Web Storage (SharedPreferences 'vesk_web_storage').
 * Survives app restarts. See WebStorage for semantics. */
export declare const localStorage: WebStorage;`,
    ],
  },
  {
    name: 'sessionStorage',
    kind: 'const',
    global: false,
    decl: [
      `/** In-memory Web Storage for the process lifetime. See WebStorage for
 * semantics. */
export declare const sessionStorage: WebStorage;`,
    ],
  },
  {
    name: 'window',
    kind: 'const',
    global: false,
    decl: [
      `/** The mapped subset of the window global (see Window). */
export declare const window: Window;`,
    ],
  },
  {
    name: 'console',
    kind: 'const',
    global: false,
    decl: [
      `/** Logging (see Console). */
export declare const console: Console;`,
    ],
  },
  {
    name: 'JSON',
    kind: 'const',
    global: false,
    decl: [
      `/** JSON.parse/stringify map to the native jsParseJson/jsStringify
 * runtime helpers with JS-semantics coercion. */
export declare const JSON: {
  /** Parse a JSON string (runtime jsParseJson). */
  parse(text: string): any;
  /** Serialize a value (runtime jsStringify). */
  stringify(value: any): string;
};`,
    ],
  },
];

export const BROWSER_API_EXPORTS: BrowserApiDecl[] = [...BROWSER_FNS, ...BROWSER_CONSTS];

export function browserApiNames(): string[] {
  return BROWSER_API_EXPORTS.map((d) => d.name).sort();
}

// The `@vesk/browser` virtual module: the full surface above, as a module.
export function browserModuleDecl(): string {
  return [
    `declare module '@vesk/browser' {`,
    `  // vesk-native browser APIs: sqlite, web storage, auth, fetch, timers and
  // friends compile to native Kotlin runtime helpers (VeskSqlite, VeskWebStorage,
  // VeskAuth, VeskFetch, VeskTimers, jsAlert, JsConsole) — never emulated in JS.
  // These are script functions/values, unlike @vesk/<library> markup components
  // (e.g. <CoilImage>) which are tags. openSqlite, signUp, signIn, signOut,
  // currentUser, isSignedIn, navigate, back, goBack and useParams also work as
  // bare globals; the standard browser
  // globals (fetch, alert, timers, localStorage, sessionStorage, console, JSON,
  // window) keep their DOM-lib types when used bare.`,
    ...BROWSER_INTERFACES.map((d) => d.split('\n').map((l) => `  ${l}`).join('\n')),
    ...BROWSER_API_EXPORTS.map((d) => d.decl.join('\n\n').split('\n').map((l) => `  ${l}`).join('\n')),
    `}`,
  ].join('\n');
}

// Bare globals usable without any import. Only vesk-specific names that are
// NOT standard DOM globals are declared globally (no lib.dom collisions):
// the standard globals resolve to their DOM-lib types instead. The interfaces
// those globals reference (VeskResponse, FetchInit, VeskSqliteDb, WebStorage)
// are also collision-free and declared globally; Window/Console stay
// module-only because lib.dom already owns those names.
const BROWSER_GLOBAL_INTERFACES: string[] = BROWSER_INTERFACES.flatMap((d) =>
  d
    .split(/\n(?=export declare interface )/)
    .filter((s) => /^export declare interface (VeskResponse|FetchInit|VeskSqliteDb|WebStorage|VeskRouter) \{/.test(s)),
);

export function browserGlobalDecl(): string {
  const names = BROWSER_API_EXPORTS.filter((d) => d.global);
  if (names.length === 0 && BROWSER_GLOBAL_INTERFACES.length === 0) return '';
  // `declare global { }` is an augmentation, not a module: the `export`
  // modifier is invalid there, so strip it from the shared decl strings.
  const stripExport = (s: string): string => s.split('\n').map((l) => l.replace(/^export declare /, 'declare ')).join('\n');
  return [
    `declare global {`,
    ...BROWSER_GLOBAL_INTERFACES.map((d) => stripExport(d).split('\n').map((l) => `  ${l}`).join('\n')),
    ...names.map((d) => stripExport(d.decl.join('\n\n')).split('\n').map((l) => `  ${l}`).join('\n')),
    `}`,
  ].join('\n');
}
