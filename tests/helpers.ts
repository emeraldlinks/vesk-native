import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, basename, extname } from 'node:path';
import { parse } from '@vesk/compiler';
import { collectVskFiles } from '../packages/cli-native/src/constants.ts';
import { findComponentDecls } from '../packages/compiler-native/src/props.ts';
import { compileVskResult, collectCustomCss, extractStylesheetLinks, extractMediaSources, compileProjectModule } from '../packages/compiler-native/src/kotlin-codegen.ts';
import { parseCssClasses } from '../packages/compiler-native/src/css.ts';
import { buildModuleSlugs, buildModuleRegistry, sanitizeIdent, slugFor } from '../packages/compiler-native/src/modules.ts';
import { KtErrors } from '../packages/compiler-native/src/js2kt.ts';
import type { JsNode } from '../packages/compiler-native/src/js2kt.ts';
import type { ModifierParts } from '../packages/compiler-native/src/tailwind.ts';
import type { ModuleExport } from '../packages/compiler-native/src/modules.ts';
import type { VskLibSurface, LibExportSig } from '../packages/compiler-native/src/elements.ts';
import { compileNpmModules } from '../packages/cli-native/src/npm.ts';
import { installedLibraries } from '../packages/cli-native/src/vsklib.ts';

export const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
export const APP_DIR = join(REPO_ROOT, 'test-app', 'app');
export const TARGET_DIR = join(REPO_ROOT, 'test-app');

export function ktExpr(src: string, j2k: { expr(n: JsNode): string }): string {
  const ast = parse(src) as unknown as { body: JsNode[] };
  const decl = (ast.body[0] as any).declarations[0];
  return j2k.expr(decl.init);
}

export function ktStmtOf(src: string, j2k: { stmt(n: JsNode): string }): string {
  const ast = parse(src) as unknown as { body: JsNode[] };
  return j2k.stmt(ast.body[0] as JsNode);
}

const JS_TS_EXTS = new Set(['.ts', '.js', '.mjs', '.tsx', '.jsx']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MEDIA_EXTS = new Set(['.mp4', '.webm', '.mp3', '.m4a', '.aac', '.ogg', '.wav']);

function collectProjectModules(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'build' || entry === 'src' || entry === 'node_modules') continue;
        walk(full);
      } else {
        const dot = entry.lastIndexOf('.');
        const ext = dot > 0 ? entry.slice(dot) : '';
        if (JS_TS_EXTS.has(ext)) out.push(full);
      }
    }
  };
  walk(dir);
  return out.sort();
}

export interface AppContext {
  appDir: string;
  vskFiles: string[];
  componentNames: Set<string>;
  componentsWithoutProps: Set<string>;
  customClasses: Map<string, ModifierParts>;
  scopedCustomClasses: Map<string, Map<string, ModifierParts>>;
  imageResources: Map<string, string>;
  mediaResources: Map<string, string>;
  moduleRegistry: ReturnType<typeof buildModuleRegistry>['registry'];
  moduleSlugs: Map<string, string>;
  projectModuleRegistry: Map<string, Map<string, ModuleExport>>;
  npmRegistry: Map<string, Map<string, ModuleExport>>;
  vsklibRegistry: Map<string, VskLibSurface>;
}

// Read-only replica of the CLI's page-compile context (generators.ts
// compileVskFiles): collects components, CSS, assets and module registries
// without writing anything to disk, so tests can run the exact production
// compileVskResult inputs over the real workload.
export function buildAppContext(appDir = APP_DIR, targetDir = TARGET_DIR): AppContext {
  const vskFiles = collectVskFiles(appDir);

  const componentNames = new Set<string>();
  const componentsWithoutProps = new Set<string>();
  const componentNamesByFile = new Map<string, string[]>();
  for (const file of vskFiles) {
    const rel = toPosix(relative(appDir, file));
    const ast = parse(readFileSync(file, 'utf8')) as unknown as JsNode;
    const names: string[] = [];
    for (const d of findComponentDecls(ast)) {
      names.push(d.name);
      componentNames.add(d.name);
      const p = d.params[0];
      if (!p || (p.type === 'Identifier' && p.name === 'content')) componentsWithoutProps.add(d.name);
    }
    if (names.length) componentNamesByFile.set(rel, names);
  }

  const { scoped: scopedCustomClasses } = collectCustomCss(
    vskFiles.map((f) => ({ source: readFileSync(f, 'utf8'), filename: relative(appDir, f) })),
  );

  const customClasses = new Map<string, ModifierParts>();
  for (const file of vskFiles) {
    const source = readFileSync(file, 'utf8');
    for (const href of extractStylesheetLinks(source)) {
      const cssPath = href.startsWith('/') ? resolve(appDir, href.slice(1)) : resolve(dirname(file), href);
      if (!existsSync(cssPath)) continue;
      for (const [k, v] of parseCssClasses(readFileSync(cssPath, 'utf8')).classes) customClasses.set(k, v);
    }
  }

  const imageResources = new Map<string, string>();
  const mediaResources = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const file of vskFiles) {
    for (const { src, element } of extractMediaSources(readFileSync(file, 'utf8'))) {
      const p = src.startsWith('/') ? resolve(appDir, src.slice(1)) : resolve(dirname(file), src);
      if (!existsSync(p)) continue;
      const ext = extname(p).toLowerCase();
      const isImage = element === 'img';
      if (!(isImage ? IMAGE_EXTS : MEDIA_EXTS).has(ext)) continue;
      const b = basename(p, ext).toLowerCase().replace(/[^a-z0-9_]/g, '_') || (isImage ? 'img' : 'media');
      let name = b;
      let i = 1;
      while (usedNames.has(name)) name = `${b}_${i++}`;
      usedNames.add(name);
      (isImage ? imageResources : mediaResources).set(src, name);
    }
  }

  const projectModuleFiles = collectProjectModules(appDir);
  const unionSlugs = buildModuleSlugs(appDir, [...vskFiles, ...projectModuleFiles]);
  const { registry: moduleRegistry, slugs: moduleSlugs } = buildModuleRegistry(appDir, vskFiles, componentNamesByFile, unionSlugs);

  const projectModuleRegistry = new Map<string, Map<string, ModuleExport>>();
  for (const file of projectModuleFiles) {
    const rel = toPosix(relative(appDir, file));
    const slug = unionSlugs.get(rel) ?? slugFor(rel);
    const compiled = compileProjectModule(readFileSync(file, 'utf8'), rel, new KtErrors(), {
      selfAlias: true,
      kotlinName: (n: string): string => sanitizeIdent(`${slug}_${n}`),
    });
    if (compiled.registryEntry.size > 0) projectModuleRegistry.set(rel, compiled.registryEntry);
  }

  const npmRegistry = compileNpmModules(appDir).registry;

  const vsklibRegistry = new Map<string, VskLibSurface>();
  for (const lib of installedLibraries(targetDir)) {
    const exports = new Map<string, LibExportSig>();
    for (const sig of Object.values(lib.signatures ?? {})) exports.set(sig.name, sig);
    for (const name of lib.exports ?? []) {
      if (!exports.has(name)) exports.set(name, { name, target: name, qualified: name, isConstructor: false, params: [], defaultParams: [], returnShape: 'any' });
    }
    vsklibRegistry.set(lib.id, { exports, tags: lib.tags ?? {} });
  }

  return {
    appDir,
    vskFiles,
    componentNames,
    componentsWithoutProps,
    customClasses,
    scopedCustomClasses,
    imageResources,
    mediaResources,
    moduleRegistry,
    moduleSlugs,
    projectModuleRegistry,
    npmRegistry,
    vsklibRegistry,
  };
}

export function compilePage(source: string, file: string, ctx: AppContext) {
  return compileVskResult(source, file, {
    componentsWithoutProps: ctx.componentsWithoutProps,
    componentNames: ctx.componentNames,
    customClasses: ctx.customClasses,
    scopedCustomClasses: ctx.scopedCustomClasses,
    imageResources: ctx.imageResources,
    mediaResources: ctx.mediaResources,
    rootName: '',
    fileRel: relative(ctx.appDir, file),
    appDir: ctx.appDir,
    moduleRegistry: ctx.moduleRegistry,
    moduleSlugs: ctx.moduleSlugs,
    projectModuleRegistry: ctx.projectModuleRegistry,
    npmRegistry: ctx.npmRegistry,
    vsklibRegistry: ctx.vsklibRegistry,
  });
}

function toPosix(p: string): string {
  return p.split('\\').join('/');
}
