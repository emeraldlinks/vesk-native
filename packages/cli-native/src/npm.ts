import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import {
  FRAMEWORK_NPM_SPECIFIERS,
  collectHeaderSymbols,
  declarationName,
  findNpmPackageDir,
  importSource,
  importSpecifiers,
  pkgNameFor,
  resolveJsTsTarget,
  resolveNpmTarget,
  resolveVskTarget,
  sanitizeIdent,
  slugFor,
  splitVskHeader,
  toPosix,
  transformModuleStatements,
} from '@compiler-native/modules';
import type { ModuleExport } from '@compiler-native/modules';
import { Js2Kt, KtErrors, ktIdent } from '@compiler-native/js2kt';
import type { JsNode } from '@compiler-native/js2kt';
import { collectVskFiles } from '@cli-native/constants';

// npm module compiler: translate the reachable subgraph of installed npm
// packages (imported from `.vsk` headers via bare specifiers like
// `import { nanoid } from 'nanoid'`) into Kotlin files in `app.vmod.<pkg>`
// packages. There is no JS engine at runtime — every module is translated at
// build time; anything that cannot be translated is a hard build error.
//
// Layout per package: the entry module (what the bare specifier resolved to)
// keeps its exports under their own names (`app.vmod.nanoid.nanoid`); every
// other file of the package is compiled into the same `app.vmod.<pkg>`
// package with a `slugOfRelInPkg_` name prefix so Kotlin declarations never
// collide across files. Package-internal imports resolve within the package;
// imports of other packages recurse into their own `app.vmod` packages.

// CommonJS module extensions. `.cjs`/`.cts` and friends cannot be translated
// (they need `require`/`module.exports`); they are hard errors, never
// silently skipped.
const CJS_EXTS = new Set(['.cjs', '.cts', '.cjsx']);

interface NpmModule {
  /** Package root (the `node_modules/<pkg>` directory). */
  pkgDir: string;
  /** Bare specifier slug (`@scope/pkg` -> `scope_pkg`); Kotlin package is `app.vmod.<pkgSlug>`. */
  pkgSlug: string;
  /** Absolute path of the module file. */
  file: string;
  /** Module path inside the package (`index.browser.js`). */
  relInPkg: string;
  /** True when reached directly through a bare specifier (exports keep their
   *  own Kotlin names). False for package-internal files (prefixed names). */
  isEntry: boolean;
  /** Bare specifiers that resolved to this module (registry keys). */
  entrySpecifiers: string[];
}

interface NpmCompileContext {
  appDir: string;
  modules: Map<string, NpmModule>;
  registryById: Map<string, Map<string, ModuleExport>>;
}

export interface NpmCompileResult {
  /** bare specifier -> export name -> { pkg, name } (what the header codegen
   *  turns into `import app.vmod.<pkg>.<name> [as local]` lines). */
  registry: Map<string, Map<string, ModuleExport>>;
  /** Compiled Kotlin files, `rel` relative to `app/src/main/kotlin/app`. */
  files: Array<{ rel: string; kt: string }>;
  /** Hard errors (each includes the importing specifier/file). */
  errors: string[];
}

const moduleIdOf = (pkgSlug: string, relInPkg: string): string => `${pkgSlug}:${relInPkg}`;

function labelFor(m: NpmModule): string {
  return `${m.entrySpecifiers[0] ?? m.pkgSlug} (${m.pkgSlug}/${m.relInPkg})`;
}

function extnameOf(p: string): string {
  const i = p.lastIndexOf('.');
  if (i <= p.lastIndexOf('/') || i < 0) return '';
  return p.slice(i);
}

// A relative import inside a package that only exists as a CommonJS module
// (the file resolves, but to a `.cjs`/`.cts` target). Used to produce a
// precise hard error instead of a generic "could not resolve".
function cjsRelativeTarget(spec: string, importerRel: string, baseDir: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const base = spec.startsWith('/') ? resolve(baseDir, `.${spec}`) : resolve(dirname(join(baseDir, importerRel)), spec);
  const candidates = [base, ...Array.from(CJS_EXTS, (e) => `${base}${e}`), ...Array.from(CJS_EXTS, (e) => join(base, `index${e}`))];
  for (const c of candidates) {
    if (existsSync(c) && CJS_EXTS.has(extnameOf(c))) return c;
  }
  return null;
}

// The `.kt` file name for a package module: strip the JS/TS extension.
function ktFileFor(relInPkg: string): string {
  const i = relInPkg.lastIndexOf('.');
  const base = i > relInPkg.lastIndexOf('/') ? relInPkg.slice(0, i) : relInPkg;
  return `${base}.kt`;
}

// Split a `var a = 1, b = 2` into one node per declarator (transformModuleStatements
// already does this for its own output; needed for any declaration that reaches
// the emission loop intact).
function splitVar(node: JsNode): JsNode[] {
  const decls = (node.declarations as JsNode[]) ?? [];
  return decls.map((d) => ({ ...node, declarations: [d] }));
}

// Rename a declaration's binding identifier to its compiled Kotlin name
// (same shape kotlin-codegen uses for project modules).
function renameDeclared(node: JsNode, kotlinName: string): JsNode {
  const id = { type: 'Identifier', name: kotlinName } as JsNode;
  if (node.type === 'VariableDeclaration') {
    const decls = (node.declarations as JsNode[]) ?? [];
    const first = decls[0] ?? ({} as JsNode);
    return { ...node, declarations: [{ ...first, id }] } as JsNode;
  }
  return { ...node, id } as JsNode;
}

interface ModuleOutcome {
  registryEntry: Map<string, ModuleExport>;
  kt: string;
  errors: string[];
}

// Translate a single package module to Kotlin plus its export registry.
// `registryById` carries the compiled export maps of every module in the
// graph (built in a first pass), so imports and re-exports resolve regardless
// of compile order.
function compileModule(m: NpmModule, ctx: NpmCompileContext): ModuleOutcome {
  const errors: string[] = [];
  const source = readFileSync(m.file, 'utf8');
  const { symbols, error } = collectHeaderSymbols(source);
  if (error) return { registryEntry: new Map(), kt: '', errors: [`could not parse module: ${error}`] };

  const j2k = new Js2Kt(new KtErrors());
  const packageName = pkgNameFor(m.pkgSlug);
  const nameFor = (n: string): string => ktIdent(m.isEntry ? sanitizeIdent(n) : sanitizeIdent(`${slugFor(m.relInPkg)}_${n}`));

  const registryEntry = new Map<string, ModuleExport>();
  const importLines: string[] = [];
  const declLines: string[] = [];
  // JS local binding name -> the compiled export it was imported from, so a
  // re-export of the same binding does not emit a second import line.
  const importedBindings = new Map<string, ModuleExport>();

  // Resolve an import/re-export specifier to the target module's export map.
  const resolveDep = (spec: string): { exports: Map<string, ModuleExport> } | null => {
    if (spec.startsWith('.') || spec.startsWith('/')) {
      const rel = resolveJsTsTarget(spec, m.relInPkg, m.pkgDir);
      if (!rel) return null;
      const id = moduleIdOf(m.pkgSlug, rel);
      return ctx.modules.has(id) ? { exports: ctx.registryById.get(id) ?? new Map() } : null;
    }
    const target = resolveNpmTarget(spec, ctx.appDir);
    if (!target) return null;
    const id = moduleIdOf(target.pkgSlug, target.relInPkg);
    return ctx.modules.has(id) ? { exports: ctx.registryById.get(id) ?? new Map() } : null;
  };

  for (const imp of symbols.imports) {
    const spec = importSource(imp);
    if (spec.startsWith('@vesk/')) {
      errors.push(`import '@vesk/...' inside an npm module is not supported`);
      continue;
    }
    const specs = importSpecifiers(imp);
    if (specs.length === 0) {
      errors.push(`import '${spec}': side-effect imports of npm packages are not supported`);
      continue;
    }
    const dep = resolveDep(spec);
    if (!dep) {
      errors.push(`import '${spec}': could not resolve module`);
      continue;
    }
    for (const s of specs) {
      if (s.kind === 'namespace') {
        errors.push(`import '${spec}': namespace imports are not supported`);
        continue;
      }
      const entry = dep.exports.get(s.name);
      if (!entry) {
        errors.push(`import '${spec}': module does not export '${s.name}'`);
        continue;
      }
      importedBindings.set(s.local, entry);
      const localKt = ktIdent(s.local);
      importLines.push(localKt === entry.name ? `import ${entry.pkg}.${entry.name}` : `import ${entry.pkg}.${entry.name} as ${localKt}`);
    }
  }

  const emitDecl = (node: JsNode, kotlinName: string, isDefaultExpr: boolean): void => {
    if (isDefaultExpr && node.type !== 'FunctionDeclaration' && node.type !== 'ClassDeclaration') {
      declLines.push(`val ${kotlinName} = ${j2k.expr(node)};`);
      return;
    }
    declLines.push(j2k.stmt(renameDeclared(node, kotlinName)));
  };

  // Non-exported top-level declarations plus whatever transformModuleStatements
  // turned class-augmentation patterns into. Import/export statements never
  // reach the code generator.
  let emitted: JsNode[];
  if (symbols.expressions.length > 0 && symbols.program) {
    const t = transformModuleStatements(symbols.program);
    errors.push(...t.errors);
    emitted = t.statements.filter(
      (s) => s.type !== 'ImportDeclaration' && s.type !== 'ExportNamedDeclaration' && s.type !== 'ExportAllDeclaration' && s.type !== 'ExportDefaultDeclaration',
    );
  } else {
    emitted = symbols.decls.map((d) => d.node);
  }
  for (const node of emitted) {
    if (node.type === 'VariableDeclaration') {
      for (const part of splitVar(node)) {
        const name = declarationName(part);
        if (name === null) {
          errors.push('could not determine declaration name');
          continue;
        }
        emitDecl(part, nameFor(name), false);
      }
    } else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      const name = declarationName(node);
      if (name === null) {
        errors.push('could not determine declaration name');
        continue;
      }
      emitDecl(node, nameFor(name), false);
    } else {
      // Remaining top-level statements (module-evaluation expressions, e.g. a
      // top-level call, or statements transformModuleStatements left alone).
      // Js2Kt fails closed on anything it cannot translate.
      declLines.push(j2k.stmt(node));
    }
  }

  for (const e of symbols.exportDecls) {
    const exportName = e.name === 'default' ? 'default' : e.name;
    const kotlinName = nameFor(exportName);
    emitDecl(e.node, kotlinName, e.name === 'default');
    registryEntry.set(exportName, { pkg: packageName, name: kotlinName });
  }

  for (const a of symbols.aliasExports) {
    const kt = registryEntry.get(a.local)?.name ?? nameFor(a.local);
    registryEntry.set(a.exported, { pkg: packageName, name: kt });
  }

  for (const re of symbols.reExports) {
    const dep = resolveDep(re.source);
    if (!dep) {
      errors.push(`re-export '${re.exported}' from '${re.source}': could not resolve module`);
      continue;
    }
    if (re.exported === '*') {
      for (const [name, entry] of dep.exports) {
        if (name === 'default') continue;
        if (registryEntry.has(name) || importedBindings.has(name)) continue;
        registryEntry.set(name, entry);
        importLines.push(name === entry.name ? `import ${entry.pkg}.${entry.name}` : `import ${entry.pkg}.${entry.name} as ${ktIdent(name)}`);
      }
      continue;
    }
    const entry = dep.exports.get(re.local);
    if (!entry) {
      errors.push(`re-export '${re.exported}' from '${re.source}': module does not export '${re.local}'`);
      continue;
    }
    registryEntry.set(re.exported, entry);
    if (!importedBindings.has(re.local)) {
      const as = ktIdent(re.exported);
      importLines.push(as === entry.name ? `import ${entry.pkg}.${entry.name}` : `import ${entry.pkg}.${entry.name} as ${as}`);
    }
  }

  for (const e of j2k.err.errors) errors.push(e);
  const kt = [...new Set(importLines), ...declLines].filter((l) => l.trim()).join('\n');
  return { registryEntry, kt, errors };
}

// Classify a `.vsk` header import. Returns null for imports the npm compiler
// does not own (`@vesk/*` libraries, project `.vsk`/JS/TS modules); npm
// imports are recorded (or errored). Never silently skips a bare specifier.
export function compileNpmModules(appDir: string): NpmCompileResult {
  const errors: string[] = [];
  const modules = new Map<string, NpmModule>();
  const order: NpmModule[] = [];
  const queue: NpmModule[] = [];
  const enqueue = (m: NpmModule): void => {
    const id = moduleIdOf(m.pkgSlug, m.relInPkg);
    const existing = modules.get(id);
    if (existing) {
      for (const s of m.entrySpecifiers) {
        if (!existing.entrySpecifiers.includes(s)) existing.entrySpecifiers.push(s);
      }
      return;
    }
    modules.set(id, m);
    order.push(m);
    queue.push(m);
  };
  const recordNpmResolution = (spec: string, from: string): void => {
    const target = resolveNpmTarget(spec, appDir);
    if (target) {
      enqueue({
        pkgDir: target.pkgDir,
        pkgSlug: target.pkgSlug,
        file: target.file,
        relInPkg: target.relInPkg,
        isEntry: true,
        entrySpecifiers: [spec],
      });
      return;
    }
    const pkgDir = findNpmPackageDir(spec, appDir);
    if (pkgDir) {
      errors.push(`import '${spec}' from ${from}: package is installed but has no translatable ESM entry (CommonJS-only or missing entry file)`);
    } else {
      errors.push(`import '${spec}' from ${from}: could not resolve npm package (not installed in node_modules)`);
    }
  };

  // Discovery: bare imports in `.vsk` headers are the graph roots.
  for (const file of collectVskFiles(appDir)) {
    const rel = toPosix(relative(appDir, file));
    const source = readFileSync(file, 'utf8');
    const { header } = splitVskHeader(source);
    if (!header.trim()) continue;
    const { symbols, error } = collectHeaderSymbols(header);
    if (error) continue; // the .vsk codegen reports header parse errors
    for (const imp of symbols.imports) {
      const spec = importSource(imp);
      if (spec.startsWith('@vesk/')) continue;
      if (FRAMEWORK_NPM_SPECIFIERS.has(spec)) continue; // handled by the framework, not npm
      if (resolveVskTarget(spec, rel, appDir) || resolveJsTsTarget(spec, rel, appDir)) continue;
      if (importSpecifiers(imp).length === 0) {
        errors.push(`import '${spec}' from ${rel}: side-effect imports of npm packages are not supported`);
        continue;
      }
      recordNpmResolution(spec, rel);
    }
    for (const re of symbols.reExports) {
      const spec = re.source;
      if (spec.startsWith('@vesk/')) continue;
      if (FRAMEWORK_NPM_SPECIFIERS.has(spec)) continue; // handled by the framework, not npm
      if (resolveVskTarget(spec, rel, appDir) || resolveJsTsTarget(spec, rel, appDir)) continue;
      recordNpmResolution(spec, rel);
    }
  }

  // BFS through each package module's own imports so the whole reachable
  // subgraph (and only it) compiles. Cycles are handled by the visited set.
  while (queue.length > 0) {
    const m = queue.shift()!;
    const source = readFileSync(m.file, 'utf8');
    const { symbols, error } = collectHeaderSymbols(source);
    if (error) {
      errors.push(`${labelFor(m)}: could not parse module: ${error}`);
      continue;
    }
    for (const imp of symbols.imports) {
      const spec = importSource(imp);
      if (spec.startsWith('@vesk/')) {
        errors.push(`${labelFor(m)}: import '@vesk/...' inside an npm module is not supported`);
        continue;
      }
      if (FRAMEWORK_NPM_SPECIFIERS.has(spec)) {
        errors.push(`${labelFor(m)}: import '${spec}' inside an npm module is not supported (the framework motion mapping is only for .vsk scripts)`);
        continue;
      }
      if (importSpecifiers(imp).length === 0) {
        errors.push(`${labelFor(m)}: import '${spec}': side-effect imports of npm packages are not supported`);
        continue;
      }
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const depRel = resolveJsTsTarget(spec, m.relInPkg, m.pkgDir);
        if (depRel) {
          enqueue({ pkgDir: m.pkgDir, pkgSlug: m.pkgSlug, file: join(m.pkgDir, depRel), relInPkg: depRel, isEntry: false, entrySpecifiers: [] });
          continue;
        }
        if (cjsRelativeTarget(spec, m.relInPkg, m.pkgDir)) {
          errors.push(`${labelFor(m)}: import '${spec}': CommonJS modules cannot be translated`);
        } else {
          errors.push(`${labelFor(m)}: import '${spec}': could not resolve module file`);
        }
        continue;
      }
      recordNpmResolution(spec, labelFor(m));
    }
    // Re-exports (`export { x } from '...'` / `export * from '...'`) pull the
    // same dependencies into the graph; they are not `import` statements.
    for (const re of symbols.reExports) {
      const spec = re.source;
      if (spec.startsWith('@vesk/')) continue;
      if (FRAMEWORK_NPM_SPECIFIERS.has(spec)) {
        errors.push(`${labelFor(m)}: re-export from '${spec}' inside an npm module is not supported (the framework motion mapping is only for .vsk scripts)`);
        continue;
      }
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const depRel = resolveJsTsTarget(spec, m.relInPkg, m.pkgDir);
        if (depRel) {
          enqueue({ pkgDir: m.pkgDir, pkgSlug: m.pkgSlug, file: join(m.pkgDir, depRel), relInPkg: depRel, isEntry: false, entrySpecifiers: [] });
        } else if (!cjsRelativeTarget(spec, m.relInPkg, m.pkgDir)) {
          errors.push(`${labelFor(m)}: re-export from '${spec}': could not resolve module file`);
        }
      } else {
        recordNpmResolution(spec, labelFor(m));
      }
    }
  }

  // Deterministic output: process modules sorted by package slug + rel path.
  const ids = [...modules.keys()].sort();
  if (ids.length === 0) return { registry: new Map(), files: [], errors };

  // Pass 1: compile every module to capture its export registry (used to
  // resolve imports/re-exports of the modules around it). Errors from this
  // pass are discarded; pass 2 re-emits with the complete registry.
  const registryById = new Map<string, Map<string, ModuleExport>>();
  for (const id of ids) {
    const outcome = compileModule(modules.get(id)!, { appDir, modules, registryById });
    registryById.set(id, outcome.registryEntry);
  }

  // Pass 2: final Kotlin text with the full registry available.
  const files: Array<{ rel: string; kt: string }> = [];
  for (const id of ids) {
    const m = modules.get(id)!;
    const outcome = compileModule(m, { appDir, modules, registryById });
    for (const e of outcome.errors) errors.push(`${labelFor(m)}: ${e}`);
    if (!outcome.kt.trim()) continue;
    files.push({ rel: `vmod/${m.pkgSlug}/${ktFileFor(m.relInPkg)}`, kt: `package ${pkgNameFor(m.pkgSlug)}\n\n${outcome.kt.trimEnd()}` });
  }

  const registry = new Map<string, Map<string, ModuleExport>>();
  for (const id of ids) {
    const m = modules.get(id)!;
    for (const spec of m.entrySpecifiers) registry.set(spec, registryById.get(id) ?? new Map());
  }
  return { registry, files, errors };
}
