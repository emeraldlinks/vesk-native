import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Lexer, regexAllowedAfter, Tok } from './lexer.ts';
import type { Token } from './lexer.ts';
import { parse } from './parser.ts';
import type { JsNode } from './js2kt.ts';

// Module system support for vesk-native.
//
// A `.vsk` file's script header (everything before its first `component`
// declaration) may contain ES module `import`/`export` statements. The web
// compiler pipeline drops those statements from the component IR, so the
// native compiler handles them itself, on its own lexer/parser surfaces:
//
//  - exports are hoisted to file-top Kotlin declarations in package `app`
//    under file-unique mangled names (`media/page.vsk` + `pageProps` ->
//    `media_page_pageProps`), and the file aliases them back
//    (`import app.media_page_pageProps as pageProps`) so its own script and
//    markup bindings keep working;
//  - `import { x } from './other.vsk'` resolves through a project-wide
//    export registry built from every `.vsk` header and becomes a Kotlin
//    import of the mangled name;
//  - bare specifiers (npm packages) resolve to compiled Kotlin modules in
//    `app.vmod.<pkg>.<module>` packages (see the CLI's npm module compiler);
//  - anything unresolved is a hard build error, never a silent miscompile.

export interface HeaderSymbols {
  /** ImportDeclaration nodes (each carries source + specifiers). */
  imports: JsNode[];
  /** Exported declarations: `export const/let/var/function/class` and `export default <expr>`. */
  exportDecls: Array<{ name: string; node: JsNode }>;
  /** `export { a, b as c }` — local name -> exported name. */
  aliasExports: Array<{ local: string; exported: string }>;
  /** `export { x } from '...'` / `export * from '...'` — exported name, the
   *  name imported from the target (local), and the target specifier. */
  reExports: Array<{ exported: string; local: string; source: string }>;
  /** Non-exported top-level declarations (module-local, still emitted file-top). */
  decls: Array<{ name: string; node: JsNode }>;
}

export function emptyHeaderSymbols(): HeaderSymbols {
  return { imports: [], exportDecls: [], aliasExports: [], reExports: [], decls: [] };
}

// Find the byte offset of the first top-level `component` token using the
// native lexer (token surface — no regex). Markup inside the component body
// makes the lexer throw, but only after the `component` token was reached.
export function splitVskHeader(source: string): { header: string; componentOffset: number } {
  let depth = 0;
  let prev: Token | undefined;
  const lex = new Lexer(source);
  for (;;) {
    lex.regexAllowed = regexAllowedAfter(prev);
    let t: Token;
    try {
      t = lex.next();
    } catch {
      return { header: source, componentOffset: -1 };
    }
    if (t.type === Tok.EOF) break;
    if (t.type !== Tok.Regex) prev = t;
    else prev = { type: Tok.Ident, value: '__re', start: 0, end: 0, line: 0, col: 0 };
    if (t.type === Tok.Punct) {
      if (t.value === '{') depth++;
      else if (t.value === '}') depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && t.type === Tok.Ident && t.value === 'component') {
      return { header: source.slice(0, t.start), componentOffset: t.start };
    }
  }
  return { header: source, componentOffset: -1 };
}

function declarationName(node: JsNode | null): string | null {
  if (!node) return null;
  if (node.type === 'VariableDeclaration') {
    const decls = (node.declarations as JsNode[]) ?? [];
    if (decls.length !== 1) return null;
    const id = decls[0]?.id as JsNode | null;
    return id && id.type === 'Identifier' ? (id.name as string) : null;
  }
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
    const id = node.id as JsNode | null;
    return id && id.type === 'Identifier' ? (id.name as string) : null;
  }
  return null;
}

// Parse a `.vsk` script header with the native parser and classify every
// top-level statement. Returns { symbols, error } — a header that fails to
// parse is a hard build error.
export function collectHeaderSymbols(header: string): { symbols: HeaderSymbols; error: string | null } {
  const symbols = emptyHeaderSymbols();
  const trimmed = header.trim();
  if (!trimmed) return { symbols, error: null };
  let program: JsNode;
  try {
    program = parse(header);
  } catch (e) {
    return { symbols, error: `could not parse script header: ${(e as Error).message}` };
  }
  for (const stmt of (program.body as JsNode[]) ?? []) {
    switch (stmt.type) {
      case 'ImportDeclaration':
        symbols.imports.push(stmt);
        break;
      case 'ExportNamedDeclaration': {
        const decl = stmt.declaration as JsNode | null;
        const source = (stmt.source as { value?: string } | null | undefined)?.value;
        if (decl) {
          const name = declarationName(decl);
          if (name === null) {
            return { symbols, error: 'multi-declarator or destructured exports are not supported' };
          }
          symbols.exportDecls.push({ name, node: decl });
        } else if (source) {
          for (const s of (stmt.specifiers as JsNode[]) ?? []) {
            if (s.type !== 'ExportSpecifier') continue;
            const local = (s.local as JsNode).name as string;
            const exported = (s.exported as JsNode).name as string;
            symbols.reExports.push({ exported, local, source });
          }
        } else {
          for (const s of (stmt.specifiers as JsNode[]) ?? []) {
            if (s.type !== 'ExportSpecifier') continue;
            const local = (s.local as JsNode).name as string;
            const exported = (s.exported as JsNode).name as string;
            symbols.aliasExports.push({ local, exported });
          }
        }
        break;
      }
      case 'ExportAllDeclaration': {
        const source = (stmt.source as { value?: string } | null | undefined)?.value;
        if (source) symbols.reExports.push({ exported: '*', local: '*', source });
        break;
      }
      case 'ExportDefaultDeclaration': {
        let decl = stmt.declaration as JsNode | null;
        if (decl?.type === 'ExpressionStatement') decl = decl.expression as JsNode;
        if (!decl) {
          return { symbols, error: 'export default requires a value' };
        }
        if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
          const id = decl.id as JsNode | null;
          if (!id || id.type !== 'Identifier') {
            return { symbols, error: 'anonymous default exports are not supported' };
          }
        }
        symbols.exportDecls.push({ name: 'default', node: decl });
        break;
      }
      case 'VariableDeclaration': {
        const name = declarationName(stmt);
        if (name === null) {
          return { symbols, error: 'multi-declarator or destructured module declarations are not supported' };
        }
        symbols.decls.push({ name, node: stmt });
        break;
      }
      case 'FunctionDeclaration':
      case 'ClassDeclaration': {
        const name = declarationName(stmt);
        if (name === null) break;
        symbols.decls.push({ name, node: stmt });
        break;
      }
      default:
        return { symbols, error: `top-level statement ${stmt.type} is not supported in a component script header` };
    }
  }
  return { symbols, error: null };
}

// Map a component file's project-relative path to a unique identifier prefix.
// `media/page.vsk` -> `media_page`. Pure character handling — no regex.
const SLUG_EXTENSIONS = new Set(['.vsk', '.ts', '.js', '.mjs', '.tsx', '.jsx']);
export function slugFor(rel: string): string {
  let slug = rel.toLowerCase();
  for (const ext of SLUG_EXTENSIONS) {
    if (slug.endsWith(ext)) slug = slug.slice(0, slug.length - ext.length);
  }
  let out = '';
  for (const ch of slug) {
    const code = ch.charCodeAt(0);
    const isAlnum = (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
    out += isAlnum || ch === '_' ? ch : '_';
  }
  let start = 0;
  let end = out.length;
  while (start < end && out[start] === '_') start++;
  while (end > start && out[end - 1] === '_') end--;
  out = out.slice(start, end);
  if (!out) out = 'v';
  const first = out.charCodeAt(0);
  if (first >= 48 && first <= 57) out = `v_${out}`;
  return out;
}

// Assign every file a slug unique across the project: `media/page.vsk` and
// `media_page.vsk` both base-slug to `media_page`, so the second gets a
// deterministic numeric suffix. Iteration order is sorted by rel path, so
// assignments are stable across builds.
export function buildModuleSlugs(appDir: string, files: string[]): Map<string, string> {
  const rels = files.map((f) => toPosix(relative(appDir, f))).sort();
  const slugs = new Map<string, string>();
  const used = new Set<string>();
  for (const rel of rels) {
    const base = slugFor(rel);
    let slug = base;
    let i = 2;
    while (used.has(slug)) slug = `${base}_${i++}`;
    used.add(slug);
    slugs.set(rel, slug);
  }
  return slugs;
}

export function toPosix(p: string): string {
  return p.split('\\').join('/');
}

// The project-wide registry: for every `.vsk` file, the Kotlin name assigned
// to each importable symbol (exported script names, components, re-exports).
export type ModuleRegistry = Map<string, Map<string, string>>;

// Build the registry from every `.vsk` file under the app. Component names
// come from the web compiler parse (the only parser that understands
// `component`); script symbols come from the native header parse. Returns the
// registry plus the per-file slug map so codegen uses identical mangling.
export function buildModuleRegistry(appDir: string, files: string[], componentNames: Map<string, string[]>): { registry: ModuleRegistry; slugs: Map<string, string> } {
  const slugs = buildModuleSlugs(appDir, files);
  const registry: ModuleRegistry = new Map();
  const maps = new Map<string, Map<string, string>>();
  for (const file of files) {
    const rel = toPosix(relative(appDir, file));
    const map = new Map<string, string>();
    for (const name of componentNames.get(rel) ?? []) map.set(name, name);
    maps.set(rel, map);
  }
  // Re-exports need the whole map first, so resolve them in a second pass.
  const reExports = new Map<string, Array<{ exported: string; local: string; source: string }>>();
  for (const file of files) {
    const rel = toPosix(relative(appDir, file));
    const source = readFileSync(file, 'utf8');
    const { header } = splitVskHeader(source);
    if (!header.trim()) continue;
    const { symbols, error } = collectHeaderSymbols(header);
    if (error) continue;
    const map = maps.get(rel) ?? new Map<string, string>();
    const slug = slugs.get(rel) ?? slugFor(rel);
    for (const e of symbols.exportDecls) map.set(e.name, `${slug}_${e.name}`);
    for (const a of symbols.aliasExports) map.set(a.exported, map.get(a.local) ?? `${slug}_${a.local}`);
    if (symbols.reExports.length) reExports.set(rel, symbols.reExports);
  }
  for (const [rel, list] of reExports) {
    const map = maps.get(rel) ?? new Map<string, string>();
    for (const re of list) {
      if (re.exported === '*') {
        const target = resolveVskTarget(re.source, rel, appDir);
        if (target) {
          for (const [name, kt] of maps.get(target) ?? new Map()) map.set(name, kt);
        }
      } else {
        const target = resolveVskTarget(re.source, rel, appDir);
        if (target) {
          const kt = maps.get(target)?.get(re.local);
          if (kt) map.set(re.exported, kt);
        }
      }
    }
  }
  for (const [rel, map] of maps) registry.set(rel, map);
  return { registry, slugs };
}

// Resolve a relative/absolute `.vsk` import specifier against the importing
// file. Returns the target's project-relative path, or null when nothing
// exists. `specifier` may be a bare npm name or `app.vmod...`-style path —
// those return null here and are handled by the npm resolver.
export function resolveVskTarget(specifier: string, importerRel: string, appDir: string): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
  const base = specifier.startsWith('/')
    ? resolve(appDir, `.${specifier}`)
    : resolve(dirname(join(appDir, importerRel)), specifier);
  const candidates = [base, `${base}.vsk`, join(base, 'index.vsk')];
  for (const c of candidates) {
    if (existsSync(c) && c.endsWith('.vsk')) return toPosix(relative(appDir, c));
  }
  return null;
}

// The project JS/TS extensions that compile to Kotlin. `.cjs`/`.cts` and
// friends are CommonJS — rejected with a hard error, never silently compiled.
const TS_EXTS = ['.ts', '.js', '.mjs', '.tsx', '.jsx'];
const CJS_EXTS = new Set(['.cjs', '.cts', '.cjsx']);

// Resolve a relative/absolute specifier from a `.vsk` header (or another
// JS/TS module) to a project JS/TS file. Returns the project-relative path
// (with the real extension) or null when it does not resolve. Follows the
// bundler convention: exact match, then `+ .ts/.js/.mjs/.tsx/.jsx`, then
// `<dir>/index.<ext>`.
export function resolveJsTsTarget(specifier: string, importerRel: string, appDir: string): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
  const base = specifier.startsWith('/')
    ? resolve(appDir, `.${specifier}`)
    : resolve(dirname(join(appDir, importerRel)), specifier);
  if (existsSync(base) && !base.endsWith('.vsk')) {
    const rel = toPosix(relative(appDir, base));
    if (CJS_EXTS.has(extnameOf(base))) return null;
    return rel;
  }
  for (const ext of TS_EXTS) {
    const c = `${base}${ext}`;
    if (existsSync(c)) return toPosix(relative(appDir, c));
  }
  for (const ext of TS_EXTS) {
    const c = join(base, `index${ext}`);
    if (existsSync(c)) return toPosix(relative(appDir, c));
  }
  return null;
}

function extnameOf(p: string): string {
  const i = p.lastIndexOf('.');
  if (i <= p.lastIndexOf('/') || i < 0) return '';
  return p.slice(i);
}

// A compiled JS/TS/npm module's export surface: Kotlin package + name.
export interface ModuleExport {
  pkg: string;
  name: string;
}

// Turn an `import { x as y } from '<module>'` node into Kotlin import lines
// against a compiled module's export map. Shared by project JS/TS imports and
// npm imports (the `.vsk` variant lives in `vskImportLines`).
export function pkgImportLines(
  node: JsNode,
  source: string,
  exports: Map<string, ModuleExport>,
): { lines: string[]; errors: string[] } {
  const specifiers = importSpecifiers(node);
  const errors: string[] = [];
  const lines: string[] = [];
  for (const spec of specifiers) {
    if (spec.kind === 'namespace') {
      errors.push(`import '${source}': namespace imports are not supported`);
      continue;
    }
    const entry = exports.get(spec.name);
    if (!entry) {
      errors.push(`import '${source}': module does not export '${spec.name}'`);
      continue;
    }
    if (spec.local === entry.name) lines.push(`import ${entry.pkg}.${entry.name}`);
    else lines.push(`import ${entry.pkg}.${entry.name} as ${spec.local}`);
  }
  return { lines, errors };
}

export interface ImportSpecifierShape {
  kind: 'default' | 'named' | 'namespace';
  name: string;
  local: string;
}

export function importSpecifiers(node: JsNode): ImportSpecifierShape[] {
  const out: ImportSpecifierShape[] = [];
  for (const s of (node.specifiers as JsNode[]) ?? []) {
    if (s.type === 'ImportDefaultSpecifier') {
      out.push({ kind: 'default', name: 'default', local: (s.local as JsNode).name as string });
    } else if (s.type === 'ImportSpecifier') {
      const imported = (s.imported as JsNode).name as string;
      const local = (s.local as JsNode).name as string;
      out.push({ kind: 'named', name: imported, local });
    } else if (s.type === 'ImportNamespaceSpecifier') {
      out.push({ kind: 'namespace', name: '*', local: (s.local as JsNode).name as string });
    }
  }
  return out;
}

export function importSource(node: JsNode): string {
  return (node.source as { value?: string } | null | undefined)?.value ?? '';
}

// Turn a `.vsk` header import into Kotlin `import app.<kotlinName> [as local]`
// lines plus any hard errors (unknown export, namespace import, unresolved
// target). `kotlinFor` maps a kotlin name back to its local name for alias
// generation (used for the declaring file's own aliases too).
export function vskImportLines(
  node: JsNode,
  importerRel: string,
  appDir: string,
  registry: ModuleRegistry,
): { lines: string[]; errors: string[] } {
  const source = importSource(node);
  const specifiers = importSpecifiers(node);
  const errors: string[] = [];
  const lines: string[] = [];

  const target = resolveVskTarget(source, importerRel, appDir);
  if (!target) {
    errors.push(`import '${source}': target file not found`);
    return { lines, errors };
  }
  const exports = registry.get(target) ?? new Map<string, string>();

  for (const spec of specifiers) {
    if (spec.kind === 'namespace') {
      errors.push(`import '${source}': namespace imports are not supported`);
      continue;
    }
    const kotlinName = exports.get(spec.name);
    if (!kotlinName) {
      errors.push(`import '${source}': module does not export '${spec.name}'`);
      continue;
    }
    if (spec.local === kotlinName) lines.push(`import app.${kotlinName}`);
    else lines.push(`import app.${kotlinName} as ${spec.local}`);
  }
  return { lines, errors };
}

// Turn a `.vsk` header import of a project JS/TS file or npm package into
// Kotlin `import <pkg>.<name> [as local]` lines. The registry maps the
// resolved module's rel path (JS/TS) or bare specifier (npm) to its compiled
// exports (built by the CLI's module compiler).
export function npmImportLines(
  node: JsNode,
  npmRegistry: Map<string, Map<string, ModuleExport>>,
): { lines: string[]; errors: string[] } {
  const source = importSource(node);
  const specifiers = importSpecifiers(node);
  if (specifiers.length === 0) {
    return { lines: [], errors: [`import '${source}': side-effect imports of npm packages are not supported`] };
  }
  const exports = npmRegistry.get(source) ?? new Map<string, ModuleExport>();
  return pkgImportLines(node, source, exports);
}
