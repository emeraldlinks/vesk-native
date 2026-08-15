import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Lexer, regexAllowedAfter, Tok } from './lexer.ts';
import type { Token } from './lexer.ts';
import { parse } from './parser.ts';
import type { JsNode } from './js2kt.ts';
import { ktIdent } from './js2kt.ts';

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
  /** Top-level expression statements (module files only; the module compiler
   *  turns class-augmentation patterns into class members and rejects the
   *  rest). `.vsk` script headers never allow these. */
  expressions: JsNode[];
  /** The parsed program (module compiler uses it for class augmentation). */
  program: JsNode | null;
}

export function emptyHeaderSymbols(): HeaderSymbols {
  return { imports: [], exportDecls: [], aliasExports: [], reExports: [], decls: [], expressions: [], program: null };
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

export function declarationName(node: JsNode | null): string | null {
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

// Split a `var/let/const` statement into one node per declarator, so minified
// ESM like `var a = 1, b = 2` (or a multi-declarator export) compiles each
// binding independently. Destructured declarators are rejected by the caller.
function splitVariableDecl(stmt: JsNode): JsNode[] {
  const decls = (stmt.declarations as JsNode[]) ?? [];
  return decls.map((d) => ({ ...stmt, declarations: [d] }));
}

// Generated ESM (Bublé/Babel/Rollup output) attaches class members after the
// class body through top-level assignments:
//
//   var pp = Foo.prototype;          // prototype alias
//   Foo.prototype.bar = function() {};   // instance method
//   pp.baz = function() {};          // instance method via alias
//   Foo.staticFn = function() {};    // static method
//   var accs = { prop: { configurable: true } };
//   accs.prop.get = function() {};   // accessor
//   Object.defineProperties(Foo.prototype, accs);  // apply accessors
//
// The module compiler rewrites these into MethodDefinitions injected into the
// target class's body (Kotlin cannot add members after the class declaration).
// Returns the statement list to emit (classes augmented, augmentations
// dropped) or a hard error for shapes that cannot be translated.
export function transformModuleStatements(program: JsNode): { statements: JsNode[]; errors: string[] } {
  const body = (program.body as JsNode[]) ?? [];
  const classNames = new Set<string>();
  for (const s of body) {
    if (s.type === 'ClassDeclaration') {
      const id = s.id as JsNode | null;
      if (id?.type === 'Identifier') classNames.add(id.name as string);
    }
  }

  const isFn = (n: JsNode | null): boolean =>
    n?.type === 'FunctionExpression' || n?.type === 'ArrowFunctionExpression' || n?.type === 'FunctionDeclaration';

  const memberIdent = (n: JsNode | null): string | null =>
    n && n.type === 'MemberExpression' && !n.computed && (n.property as JsNode | null)?.type === 'Identifier'
      ? ((n.property as JsNode).name as string)
      : null;

  // Constructor functions written as `var Cls = function Cls(...) {...}`
  // (Bublé output for classes). They become ClassDeclarations when something
  // attaches members to them — prototype methods, prototype aliases, statics,
  // or Object.defineProperties on the prototype — so the augmentation pass
  // below can inject into a real class body (Kotlin needs a class to hold the
  // members). Constructor functions without any such usage stay function
  // values.
  const ctorCandidates = new Map<string, JsNode>();
  for (const s of body) {
    if (s.type !== 'VariableDeclaration') continue;
    const decls = (s.declarations as JsNode[]) ?? [];
    if (decls.length === 1) {
      const id = decls[0]?.id as JsNode | null;
      const init = decls[0]?.init as JsNode | null;
      if (id?.type === 'Identifier' && init?.type === 'FunctionExpression') ctorCandidates.set(id.name as string, init);
    }
  }
  const usedAsClass = new Set<string>();
  const protoAliases = new Map<string, string>();
  for (const s of body) {
    if (s.type === 'VariableDeclaration') {
      const decls = (s.declarations as JsNode[]) ?? [];
      if (decls.length === 1) {
        const id = decls[0]?.id as JsNode | null;
        const init = decls[0]?.init as JsNode | null;
        if (id?.type === 'Identifier' && init && memberIdent(init) === 'prototype' && (init.object as JsNode | null)?.type === 'Identifier') {
          protoAliases.set(id.name as string, (init.object as JsNode).name as string);
        }
      }
    }
    if (s.type !== 'ExpressionStatement') continue;
    const expr = s.expression as JsNode | null;
    if (expr?.type === 'AssignmentExpression' && expr.operator === '=') {
      const left = expr.left as JsNode | null;
      if (left?.type === 'MemberExpression' && !left.computed && (left.property as JsNode | null)?.type === 'Identifier') {
        const obj = left.object as JsNode | null;
        if (obj?.type === 'Identifier') {
          if (ctorCandidates.has(obj.name as string)) usedAsClass.add(obj.name as string);
          const aliasTarget = protoAliases.get(obj.name as string);
          if (aliasTarget && ctorCandidates.has(aliasTarget)) usedAsClass.add(aliasTarget);
        } else if (obj && memberIdent(obj) === 'prototype' && (obj.object as JsNode | null)?.type === 'Identifier') {
          const t = (obj.object as JsNode).name as string;
          if (ctorCandidates.has(t)) usedAsClass.add(t);
        }
      }
    }
    if (expr?.type === 'CallExpression') {
      const callee = expr.callee as JsNode | null;
      if (callee?.type === 'MemberExpression' && (callee.object as JsNode | null)?.type === 'Identifier' && (callee.object as JsNode).name === 'Object') {
        const p = (callee.property as JsNode | null)?.name;
        if (p === 'defineProperties' || p === 'defineProperty') {
          const arg0 = (expr.arguments as JsNode[])[0] as JsNode | null;
          if (arg0 && memberIdent(arg0) === 'prototype' && (arg0.object as JsNode | null)?.type === 'Identifier') {
            const t = (arg0.object as JsNode).name as string;
            if (ctorCandidates.has(t)) usedAsClass.add(t);
          }
        }
      }
    }
  }
  const convertedToClass = new Map<string, JsNode>();
  for (const [name, fn] of ctorCandidates) {
    if (!usedAsClass.has(name)) continue;
    classNames.add(name);
    convertedToClass.set(name, {
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name },
      body: {
        type: 'ClassBody',
        body: [
          { type: 'MethodDefinition', key: { type: 'Identifier', name: 'constructor' }, value: fn, kind: 'constructor', static: false, computed: false },
        ],
      },
    } as JsNode);
  }

  const aliasVars = new Map<string, string>();
  const accessorGetters = new Map<string, Map<string, JsNode>>();
  const consumedAccessorVars = new Set<string>();
  const drop = new Set<JsNode>();
  const injected = new Map<string, JsNode[]>();
  const errors: string[] = [];

  const injectMethod = (cls: string, methodName: string, fn: JsNode, kind: string, isStatic: boolean): void => {
    const list = injected.get(cls) ?? [];
    list.push({
      type: 'MethodDefinition',
      key: { type: 'Identifier', name: methodName },
      value: fn,
      kind,
      static: isStatic,
      computed: false,
    });
    injected.set(cls, list);
  };

  for (const stmt of body) {
    // `var alias = Cls.prototype` — remember the alias, drop the decl.
    if (stmt.type === 'VariableDeclaration') {
      const decls = (stmt.declarations as JsNode[]) ?? [];
      if (decls.length === 1) {
        const id = decls[0]?.id as JsNode | null;
        const init = decls[0]?.init as JsNode | null;
        if (id?.type === 'Identifier' && memberIdent(init) === 'prototype' && init?.object && (init.object as JsNode).type === 'Identifier') {
          const target = (init.object as JsNode).name as string;
          if (classNames.has(target)) {
            aliasVars.set(id.name as string, target);
            drop.add(stmt);
            continue;
          }
        }
      }
    }
    if (stmt.type !== 'ExpressionStatement') continue;
    const expr = stmt.expression as JsNode | null;
    if (!expr || expr.type !== 'AssignmentExpression' || expr.operator !== '=') continue;
    const left = expr.left as JsNode | null;
    const right = expr.right as JsNode | null;
    if (!left || left.type !== 'MemberExpression' || left.computed) {
      errors.push(`top-level assignment that cannot be translated in a module (left side is not a member access)`);
      continue;
    }
    const prop = left.property as JsNode | null;
    const methodName = prop?.type === 'Identifier' ? (prop.name as string) : prop?.type === 'Literal' ? String((prop as { value?: unknown }).value ?? '') : null;
    const obj = left.object as JsNode | null;

    // `prototypeAccessors.name.get = function ...` — collect accessor getter.
    if (prop?.type === 'Identifier' && prop.name === 'get' && obj && obj.type === 'MemberExpression' && !obj.computed) {
      const accVar = obj.object as JsNode | null;
      const accProp = obj.property as JsNode | null;
      if (accVar?.type === 'Identifier' && accProp?.type === 'Identifier' && isFn(right)) {
        const map = accessorGetters.get(accVar.name as string) ?? new Map<string, JsNode>();
        map.set(accProp.name as string, right as JsNode);
        accessorGetters.set(accVar.name as string, map);
        drop.add(stmt);
        continue;
      }
    }

    if (methodName === null) {
      errors.push(`top-level assignment to a computed property cannot be translated in a module`);
      continue;
    }

    // `Cls.prototype.method = fn` | `alias.method = fn` | `Cls.method = fn`
    let cls: string | null = null;
    let isStatic = false;
    if (obj?.type === 'Identifier') {
      const name = obj.name as string;
      if (classNames.has(name)) {
        cls = name;
        isStatic = true;
      } else if (aliasVars.has(name)) {
        cls = aliasVars.get(name) ?? null;
      }
    } else if (obj && memberIdent(obj) === 'prototype') {
      const target = (obj.object as JsNode | null);
      if (target?.type === 'Identifier' && classNames.has(target.name as string)) cls = target.name as string;
    }
    if (cls) {
      if (!isFn(right)) {
        errors.push(`cannot translate assignment to ${cls}.${methodName}: right side must be a function`);
        continue;
      }
      injectMethod(cls, methodName, right as JsNode, 'method', isStatic);
      drop.add(stmt);
      continue;
    }

    errors.push(`top-level assignment to '${obj?.type === 'Identifier' ? obj.name : 'an expression'} .${methodName}' cannot be translated in a module (target is not a module class)`);
  }

  // Apply accessors via `Object.defineProperties(Cls.prototype, src)` /
  // `Object.defineProperty(Cls.prototype, "name", { get: fn })`.
  for (const stmt of body) {
    if (stmt.type !== 'ExpressionStatement') continue;
    const expr = stmt.expression as JsNode | null;
    if (!expr || expr.type !== 'CallExpression') continue;
    const callee = expr.callee as JsNode | null;
    if (callee?.type !== 'MemberExpression') continue;
    const cobj = callee.object as JsNode | null;
    const cprop = (callee.property as JsNode | null)?.name;
    if (cobj?.type !== 'Identifier' || cobj.name !== 'Object' || (cprop !== 'defineProperties' && cprop !== 'defineProperty')) continue;
    const args = (expr.arguments as JsNode[]) ?? [];
    if (args.length < 2 || args.length > 3) {
      errors.push(`Object.${cprop} with ${args.length} arguments cannot be translated in a module`);
      continue;
    }
    const target = args[0] as JsNode | null;
    let cls: string | null = null;
    if (target && memberIdent(target) === 'prototype') {
      const t = (target.object as JsNode | null);
      if (t?.type === 'Identifier' && classNames.has(t.name as string)) cls = t.name as string;
    }
    if (!cls) {
      errors.push(`Object.${cprop} targets a non-class prototype; cannot be translated in a module`);
      continue;
    }
    if (cprop === 'defineProperty') {
      const name = (args[1] as { type?: string; value?: string } | null)?.type === 'Literal' ? String((args[1] as { value?: string }).value ?? '') : null;
      const desc = args[2] as JsNode | null;
      if (name === null || desc?.type !== 'ObjectExpression') {
        errors.push(`Object.defineProperty: property name or descriptor is not a literal/object`);
        continue;
      }
      const getter = findObjectProp(desc, 'get');
      if (getter && isFn(getter)) injectMethod(cls, name, getter as JsNode, 'get', false);
      const setter = findObjectProp(desc, 'set');
      if (setter && isFn(setter)) injectMethod(cls, name, setter as JsNode, 'set', false);
      drop.add(stmt);
      continue;
    }
    // defineProperties
    const src = args[1] as JsNode | null;
    let applied = 0;
    if (src?.type === 'Identifier') {
      const getters = accessorGetters.get(src.name as string);
      if (getters) {
        for (const [name, fn] of getters) injectMethod(cls, name, fn, 'get', false);
        applied = getters.size;
        consumedAccessorVars.add(src.name as string);
      }
    } else if (src?.type === 'ObjectExpression') {
      for (const p of (src.properties as JsNode[]) ?? []) {
        if (p.type !== 'Property') continue;
        const key = p.key as JsNode | null;
        const name = key?.type === 'Identifier' ? (key.name as string) : key?.type === 'Literal' ? String((key as { value?: unknown }).value ?? '') : null;
        const value = p.value as JsNode | null;
        if (name === null || value?.type !== 'ObjectExpression') continue;
        const getter = findObjectProp(value, 'get');
        if (getter && isFn(getter)) injectMethod(cls, name, getter as JsNode, 'get', false);
        const setter = findObjectProp(value, 'set');
        if (setter && isFn(setter)) injectMethod(cls, name, setter as JsNode, 'set', false);
        applied++;
      }
    }
    if (applied === 0) {
      errors.push(`Object.defineProperties on ${cls}.prototype has no resolvable accessors`);
      continue;
    }
    drop.add(stmt);
  }

  // Drop the accessor-object var declarations once their getters were applied.
  for (const stmt of body) {
    if (stmt.type !== 'VariableDeclaration') continue;
    const decls = (stmt.declarations as JsNode[]) ?? [];
    if (decls.length === 1) {
      const id = decls[0]?.id as JsNode | null;
      if (id?.type === 'Identifier' && consumedAccessorVars.has(id.name as string)) drop.add(stmt);
    }
  }

  const statements: JsNode[] = [];
  for (const stmt of body) {
    if (drop.has(stmt)) continue;
    if (stmt.type === 'VariableDeclaration') {
      const decls = (stmt.declarations as JsNode[]) ?? [];
      if (decls.length === 1) {
        const id = decls[0]?.id as JsNode | null;
        if (id?.type === 'Identifier') {
          const name = id.name as string;
          const cls = convertedToClass.get(name);
          if (cls) {
            const extra = injected.get(name);
            if (extra && extra.length) {
              const bodyNode = cls.body as { body?: JsNode[] };
              statements.push({ ...cls, body: { ...bodyNode, body: [...(bodyNode.body ?? []), ...extra] } });
            } else {
              statements.push(cls);
            }
            continue;
          }
        }
      }
      for (const part of splitVariableDecl(stmt)) statements.push(part);
      continue;
    }
    if (stmt.type === 'ClassDeclaration') {
      const id = stmt.id as JsNode | null;
      const name = id?.type === 'Identifier' ? (id.name as string) : null;
      const extra = name ? injected.get(name) : undefined;
      if (extra && extra.length) {
        const bodyNode = stmt.body as { body?: JsNode[] };
        statements.push({ ...stmt, body: { ...bodyNode, body: [...(bodyNode.body ?? []), ...extra] } });
        continue;
      }
    }
    statements.push(stmt);
  }

  return { statements, errors };
}

function findObjectProp(node: JsNode, prop: string): JsNode | null {
  for (const p of (node.properties as JsNode[]) ?? []) {
    if (p.type !== 'Property') continue;
    const key = p.key as JsNode | null;
    if (key?.type === 'Identifier' && key.name === prop) return p.value as JsNode | null;
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
  symbols.program = program;
  for (const stmt of (program.body as JsNode[]) ?? []) {
    switch (stmt.type) {
      case 'ImportDeclaration':
        symbols.imports.push(stmt);
        break;
      case 'ExportNamedDeclaration': {
        const decl = stmt.declaration as JsNode | null;
        const source = (stmt.source as { value?: string } | null | undefined)?.value;
        if (decl) {
          if (decl.type === 'VariableDeclaration') {
            for (const part of splitVariableDecl(decl)) {
              const name = declarationName(part);
              if (name === null) {
                return { symbols, error: 'destructured exports are not supported' };
              }
              symbols.exportDecls.push({ name, node: part });
            }
          } else {
            const name = declarationName(decl);
            if (name === null) {
              return { symbols, error: 'destructured exports are not supported' };
            }
            symbols.exportDecls.push({ name, node: decl });
          }
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
        for (const part of splitVariableDecl(stmt)) {
          const name = declarationName(part);
          if (name === null) {
            return { symbols, error: 'destructured module declarations are not supported' };
          }
          symbols.decls.push({ name, node: part });
        }
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
        symbols.expressions.push(stmt);
        break;
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
    for (const e of symbols.exportDecls) map.set(e.name, sanitizeIdent(`${slug}_${e.name}`));
    for (const a of symbols.aliasExports) map.set(a.exported, map.get(a.local) ?? sanitizeIdent(`${slug}_${a.local}`));
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

// The npm package fields/entries the module compiler accepts. `.cjs` and
// friends are CommonJS — a hard error, never silently compiled.
const ESM_EXTS = ['.mjs', '.js', '.ts', '.tsx', '.jsx'];

// Bare specifiers handled by the framework (compiler + runtime mappings), never
// by the npm module compiler. `motion`/`motion/mini` route to the app runtime's
// motion helpers (see kotlin-codegen emitVskHeader's framework branch).
export const FRAMEWORK_NPM_SPECIFIERS = new Set(['motion', 'motion/mini']);

// An npm module resolution: the package directory, the entry file, and the
// bare specifier's package slug (`@jridgewell/sourcemap-codec` ->
// `jridgewell_sourcemap_codec`). `relInPkg` is the entry's path inside the
// package, used to name the compiled Kotlin file.
export interface NpmTarget {
  specifier: string;
  pkgDir: string;
  file: string;
  relInPkg: string;
  pkgSlug: string;
}

// Resolve a bare npm specifier to a package entry file by walking
// `node_modules` upward from the app directory (standard Node resolution:
// package.json `exports`, then `module`/`main`, then `index.*`; subpath
// imports resolve within the package). Returns null when the package or its
// entry cannot be resolved; CJS-only entries are rejected by the caller via
// the returned file extension.
// Locate the installed package directory for a bare specifier by walking
// `node_modules` upward from the app directory. Returns null when the package
// is not installed anywhere on the chain.
export function findNpmPackageDir(specifier: string, appDir: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const segs = specifier.split('/');
  const scoped = specifier.startsWith('@');
  const pkgName = scoped ? `${segs[0]}/${segs[1]}` : segs[0];
  if (scoped && segs.length < 2) return null;
  if (!pkgName) return null;
  let dir = appDir;
  for (;;) {
    const pkgDir = join(dir, 'node_modules', pkgName);
    if (existsSync(pkgDir)) return pkgDir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function resolveNpmTarget(specifier: string, appDir: string): NpmTarget | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const segs = specifier.split('/');
  const scoped = specifier.startsWith('@');
  const subpath = segs.slice(scoped ? 2 : 1).join('/');
  if (scoped && segs.length < 2) return null;
  if (!scoped && !segs[0]) return null;
  const pkgDir = findNpmPackageDir(specifier, appDir);
  if (!pkgDir) return null;
  const entry = resolveNpmEntry(pkgDir, subpath);
  if (!entry) return null;
  return {
    specifier,
    pkgDir,
    file: entry,
    relInPkg: toPosix(relative(pkgDir, entry)),
    pkgSlug: slugFor(specifier),
  };
}

function resolveNpmEntry(pkgDir: string, subpath: string): string | null {
  const pkgJsonPath = join(pkgDir, 'package.json');
  let exportsField: unknown = null;
  if (existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as Record<string, unknown>;
      exportsField = pkgJson.exports ?? null;
      if (subpath) {
        const viaExports = pickExportsTarget(exportsField, `./${subpath}`);
        if (viaExports) {
          const f = resolveFile(pkgDir, viaExports);
          if (f) return f;
        }
        for (const c of [join(pkgDir, subpath), ...ESM_EXTS.map((e) => `${join(pkgDir, subpath)}${e}`), ...ESM_EXTS.map((e) => join(pkgDir, subpath, `index${e}`))]) {
          const f = resolveFile(pkgDir, c);
          if (f) return f;
        }
        return null;
      }
      const viaExports = pickExportsTarget(exportsField, '.');
      if (viaExports) {
        const f = resolveFile(pkgDir, viaExports);
        if (f) return f;
      }
      for (const field of ['module', 'main']) {
        const v = pkgJson[field];
        if (typeof v === 'string') {
          const f = resolveFile(pkgDir, v);
          if (f) return f;
        }
      }
    } catch {
      return null;
    }
  }
  for (const c of [join(pkgDir, 'index'), ...ESM_EXTS.map((e) => join(pkgDir, `index${e}`))]) {
    const f = resolveFile(pkgDir, c);
    if (f) return f;
  }
  return null;
}

// Resolve a package.json `exports` entry for a subpath. Handles strings,
// condition arrays, and nested condition objects, preferring the `browser`
// semantics conditions (then `import`/`default`) and skipping type-only and
// node-only branches. A bare `./index.js`-style string result still gets
// extension probing via resolveFile.
function pickExportsTarget(exportsField: unknown, key: string): string | null {
  if (!exportsField) return null;
  const direct = exportsField;
  const candidate = typeof direct === 'string' || Array.isArray(direct) ? direct : (direct as Record<string, unknown>)[key];
  if (candidate === undefined) return null;
  return pickConditionTarget(candidate);
}

function pickConditionTarget(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const r = pickConditionTarget(v);
      if (r) return r;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Android apps run a browser-grade JS environment, not Node: prefer the
    // `browser` entry (uses browser APIs), fall to `import`, and never pick a
    // `node` entry (Buffer/fs/crypto-hash surfaces have no Android mapping).
    // `node` is only skipped — a package whose only viable condition is
    // `node` (no browser/import/default) resolves to nothing.
    for (const k of ['browser', 'import', 'node', 'default']) {
      if (obj[k] === undefined || k === 'node') continue;
      const r = pickConditionTarget(obj[k]);
      if (r) return r;
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'types' || k === 'typescript' || k === 'require' || k === 'node') continue;
      const r = pickConditionTarget(v);
      if (r) return r;
    }
  }
  return null;
}

function resolveFile(pkgDir: string, candidate: string): string | null {
  const target = candidate.startsWith('./') ? join(pkgDir, candidate.slice(2)) : candidate;
  if (existsSync(target) && !target.endsWith('.vsk') && !CJS_EXTS.has(extnameOf(target))) return target;
  if (extnameOf(target)) return null;
  for (const ext of ESM_EXTS) {
    const c = `${target}${ext}`;
    if (existsSync(c)) return c;
  }
  for (const ext of ESM_EXTS) {
    const c = join(target, `index${ext}`);
    if (existsSync(c)) return c;
  }
  return null;
}

// A compiled JS/TS/npm module's export surface: Kotlin package + name.
export interface ModuleExport {
  pkg: string;
  name: string;
}

// The Kotlin package an npm package's compiled modules live in: the bare
// specifier's slug under `app.vmod` (`@jridgewell/sourcemap-codec` ->
// `app.vmod.jridgewell_sourcemap_codec`).
export function pkgNameFor(pkgSlug: string): string {
  return `app.vmod.${pkgSlug}`;
}

// Kotlin identifiers cannot contain `$`; module names are sanitized the same
// way j2k sanitizes references (char scan — no regex) so declarations and
// references always agree.
export function sanitizeIdent(name: string): string {
  let out = '';
  for (let i = 0; i < name.length; i++) out += name[i] === '$' ? '_' : name[i];
  return out;
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
    const localKt = ktIdent(spec.local);
    if (localKt === entry.name) lines.push(`import ${entry.pkg}.${entry.name}`);
    else lines.push(`import ${entry.pkg}.${entry.name} as ${localKt}`);
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
    else lines.push(`import app.${kotlinName} as ${ktIdent(spec.local)}`);
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
  // The registry only carries packages the npm module compiler resolved; a
  // bare specifier that is not a key never resolved to an installed package,
  // so report that instead of the misleading "module does not export X".
  if (!npmRegistry.has(source)) {
    return { lines: [], errors: [`import '${source}': could not resolve npm package (not installed in node_modules)`] };
  }
  const exports = npmRegistry.get(source) ?? new Map<string, ModuleExport>();
  return pkgImportLines(node, source, exports);
}
