// `vesk dev --web` — thin client-only preview server (Phase 2 of
// plans/vesk-native-preview-hmr.md). No SSR, no API routes, no middleware:
// scan the app/ route tree, serve one client bundle (+ lazy route chunks and
// the tree-shaken runtime), and push per-file HMR updates over WebSocket.
//
// The web compiler (@vesk/compiler, the browser target of the same .vsk
// language) is used here because the browser can't run Kotlin; this is
// dev-only tooling and ships nowhere in a built app (AGENTS.md: the no-JS
// rule applies to built apps). device.* gets its browser mapping from
// WEB_PREVIEW_SHIM — the web compiler itself does nothing about it.
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, watch, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { parse, generateIR } from '@vesk/compiler';
import type { IRNode } from '@vesk/compiler/src/ir';
import { scanRoutes } from '@vesk/compiler/src/router';
import { generateClientBundle, buildTreeShakenRuntime, runtimeExportNames } from '@vesk/adapter/src/client-bundle';
import { createHmrServer } from '@vesk/adapter/src/hmr';
import { log } from '@cli-native/constants';
import { WEB_PREVIEW_SHIM } from './web-preview-shim.js';

const DEFAULT_PORT = 5173;

// ---------------------------------------------------------------------------
// Preview styling
// ---------------------------------------------------------------------------

// The native build maps Tailwind classes to Compose modifiers at compile
// time, but the browser needs real CSS. Candidates are collected through the
// AST surface (parse -> generateIR -> walk of element props), never by
// regexing source text.
function collectClassCandidates(ir: IRNode[], out: Set<string>): void {
  const visit = (node: IRNode): void => {
    if ('props' in node && Array.isArray(node.props)) {
      for (const prop of node.props) {
        if (prop.name !== 'class' && prop.name !== 'className') continue;
        const raw = typeof prop.value?.raw === 'string' ? prop.value.raw : '';
        const cls = raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw[raw.length - 1] === raw[0] ? raw.slice(1, -1) : raw;
        for (const token of cls.split(/\s+/)) {
          if (token && !token.includes('{') && !token.includes('$')) out.add(token);
        }
      }
    }
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) visit(child);
    }
  };
  for (const node of ir) visit(node);
}

// Minimal structural typing over @tailwindcss/node's compile API (loaded
// dynamically; the package is an optional-weight dependency). Its resolvers
// receive (id, base) and return an absolute path — or false when unresolvable.
interface TwResolver {
  (id: string, base: string): Promise<string | false | undefined> | string | false | undefined;
}
interface TwCompileOptions {
  base: string;
  from?: string;
  onDependency?: (path: string) => void;
  customCssResolver?: TwResolver;
  customJsResolver?: TwResolver;
}
interface TwCompiler {
  compile(css: string, opts: TwCompileOptions): Promise<{ build(candidates: Iterable<string>): string }>;
}

let twCompile: TwCompiler['compile'] | null | undefined;
async function loadTwCompiler(): Promise<TwCompiler['compile'] | null> {
  if (twCompile !== undefined) return twCompile;
  try {
    const mod = (await import('@tailwindcss/node')) as unknown as { compile: TwCompiler['compile'] };
    twCompile = mod.compile;
  } catch {
    twCompile = null;
    log('dev', 'tailwind not installed (@tailwindcss/node) — utility classes will not be styled in the web preview');
  }
  return twCompile;
}

// `@import "tailwindcss"` inside the synthesized entry must resolve against
// the CLI's own dependency tree — the user's project has no tailwindcss
// installed. @tailwindcss/node's default resolver only knows the importing
// file's directory, so anchor bare ids at this module.
function twResolvers(): Pick<TwCompileOptions, 'customCssResolver' | 'customJsResolver'> {
  const req = createRequire(import.meta.url);
  return {
    customCssResolver: async (id: string, base: string): Promise<string | false> => {
      const p = id.startsWith('.') || id.startsWith('/') ? resolve(base, id) : (() => {
        const pkgJsonPath = req.resolve(join(id, 'package.json'));
        const pkgDir = dirname(pkgJsonPath);
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as { style?: string; exports?: Record<string, { style?: string }> };
        const rel = pkg.style ?? pkg.exports?.['.']?.style ?? 'index.css';
        return resolve(pkgDir, rel);
      })();
      return existsSync(p) ? p : false;
    },
    customJsResolver: async (id: string): Promise<string | false> => {
      try {
        return req.resolve(id);
      } catch {
        return false;
      }
    },
  };
}

async function buildTailwindCss(appDir: string): Promise<string> {
  const compile = await loadTwCompiler();
  if (!compile) return '';
  const irFiles = collectVskFilesForPreview(appDir);
  const candidates = new Set<string>();
  for (const file of irFiles) {
    try {
      const source = readFileSync(file, 'utf8');
      const root = generateIR(parse(source), source);
      for (const component of root.components) collectClassCandidates(component.body, candidates);
    } catch {
      // A file mid-edit can fail to parse; HMR will rebuild it shortly.
    }
  }
  const compiled = await compile('@import "tailwindcss";', {
    base: appDir,
    from: join(appDir, '_preview-tailwind.css'),
    onDependency: () => {},
    ...twResolvers(),
  });
  return compiled.build([...candidates]);
}

function collectVskFilesForPreview(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.vsk')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function findRuntimeDir(projectDir: string): string | null {
  const cliDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(projectDir, 'node_modules', '@vesk', 'runtime'),
    join(cliDir, '..', '..', 'node_modules', '@vesk', 'runtime'),
    join(cliDir, 'node_modules', '@vesk', 'runtime'),
  ];
  for (const base of candidates) {
    for (const dir of [base, join(base, 'dist')]) {
      if (existsSync(join(dir, 'index-client.js')) && existsSync(join(dir, 'hmr-client.js'))) return dir;
    }
  }
  return null;
}

function runtimeImportNamesFrom(clientJs: string): string[] | null {
  const m = clientJs.match(/^import\s*\{([^}]*)\}\s*from\s*['"]\/_vesk\/runtime\.js['"];?\s*$/m);
  if (!m) return null;
  const names = (m[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return names.length > 0 ? names : null;
}

const HTML_SHELL = (themeCss: string, cssVars: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/_vesk/tw.css" />
  ${themeCss ? `<link rel="stylesheet" href="${themeCss}" />` : ''}
  <style>:root { ${cssVars} } body { margin: 0; background: var(--vesk-background, #fff); color: var(--vesk-text, #111); }</style>
  <title>vesk preview</title>
</head>
<body>
  <div id="root"></div>
  <script src="/_vesk/native-shim.js"></script>
  <script type="module" src="/_vesk/client.js"></script>
  <script type="module" src="/_vesk/hmr.js"></script>
</body>
</html>
`;

// Static asset types the web preview serves straight from app/ (images,
// audio, video, fonts — the same paths the native build packages as res).
const STATIC_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// veskconfig -> web adapter: the native colorScheme palette becomes CSS
// custom properties so pages using the semantic tokens (background/text
// defaults, primary accents) preview close to the app's look.
function cssVarsFromConfig(config: { colors?: { primary?: string; background?: string; surface?: string; onPrimary?: string; text?: string } } | undefined): string {
  const c = config?.colors;
  if (!c) return '';
  const map: Record<keyof typeof c, string> = {
    primary: '--vesk-primary',
    background: '--vesk-background',
    surface: '--vesk-surface',
    onPrimary: '--vesk-on-primary',
    text: '--vesk-text',
  };
  return (Object.entries(map) as [keyof typeof c, string][])
    .filter(([key]) => c[key])
    .map(([key, v]) => `${v}: ${c[key]};`)
    .join(' ');
}

export async function startPreviewServer(
  projectDir: string,
  port: number = DEFAULT_PORT,
  config?: { colors?: { primary?: string; background?: string; surface?: string; onPrimary?: string; text?: string } },
): Promise<void> {
  const appDir = join(projectDir, 'app');
  const runtimeDirCandidate = findRuntimeDir(projectDir);
  if (!runtimeDirCandidate) {
    console.error('  [dev] @vesk/runtime not found (needed for the web preview) — install it in the project or the CLI');
    process.exit(1);
  }
  const runtimeDir: string = runtimeDirCandidate;
  const themeCss = existsSync(join(appDir, 'theme.css')) ? '/theme.css' : '';

  let routeTree = scanRoutes(appDir);
  let clientBundle = '';
  let chunkMap = new Map<string, string>();
  let runtimeBundle = '';
  let tailwindCss = '';

  async function rebuild(): Promise<void> {
    routeTree = scanRoutes(appDir);
    const { main, chunks } = await generateClientBundle(routeTree, appDir, new Map(), {
      importRuntime: true,
      hmr: true,
      codeSplit: true,
    });
    clientBundle = main;
    chunkMap = new Map(chunks.map((c) => [c.name, c.code]));
    try {
      tailwindCss = await buildTailwindCss(appDir);
    } catch (e) {
      log('dev', `tailwind compile failed (serving without utility styles): ${(e as Error).message}`);
      tailwindCss = '';
    }
    const used = runtimeImportNamesFrom(clientBundle) ?? [...runtimeExportNames(runtimeDir)].filter((n): n is string => !!n);
    // The tree-shaken bundle is an ES module, so its esbuild `globalName`
    // binding (var __veskRuntime) stays module-scoped; bridge it to the
    // global for the device shim, which must reach track/get/set to make
    // device.* state slots reactive.
    runtimeBundle = (await buildTreeShakenRuntime(runtimeDir, used)) + '\nglobalThis.__veskRuntime = __veskRuntime;\n';
  }

  const html = HTML_SHELL(themeCss, cssVarsFromConfig(config));
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('method not allowed');
      return;
    }
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;
    const send = (status: number, body: string, type: string): void => {
      res.writeHead(status, { 'Content-Type': type });
      if (method === 'HEAD') res.end();
      else res.end(body);
    };

    if (pathname === '/_vesk/runtime.js') return send(200, runtimeBundle, 'application/javascript');
    if (pathname === '/_vesk/client.js') return send(200, clientBundle, 'application/javascript');
    if (pathname === '/_vesk/tw.css') return send(200, tailwindCss, 'text/css');
    if (pathname === '/_vesk/hmr.js') return send(200, readFileSync(join(runtimeDir, 'hmr-client.js'), 'utf8'), 'application/javascript');
    if (pathname === '/_vesk/native-shim.js') return send(200, WEB_PREVIEW_SHIM, 'application/javascript');
    if (pathname.startsWith('/_vesk/static/')) {
      const code = chunkMap.get(pathname.slice('/_vesk/static/'.length));
      if (code !== undefined) return send(200, code, 'application/javascript');
      return send(404, 'chunk not found', 'text/plain');
    }
    if (pathname === '/favicon.ico') return send(204, '', 'text/plain');
    // Static app assets: images/media referenced as /media/... resolve to
    // files under app/ (same paths the native build packages as resources).
    const staticFile = resolve(appDir, `.${decodeURIComponent(pathname)}`);
    if (staticFile.startsWith(appDir) && existsSync(staticFile) && statSync(staticFile).isFile()) {
      const type = STATIC_MIME[extname(staticFile).toLowerCase()];
      if (type) {
        res.writeHead(200, { 'Content-Type': type });
        if (method === 'HEAD') return res.end();
        return res.end(readFileSync(staticFile));
      }
    }
    // Raw CSS passthrough (theme.css etc., referenced from heads).
    if (pathname.endsWith('.css')) {
      const file = join(appDir, pathname.replace(/^\//, ''));
      if (existsSync(file)) return send(200, readFileSync(file, 'utf8'), 'text/css');
      return send(404, 'css not found', 'text/plain');
    }
    // Every other path is a route: the client router renders it.
    return send(200, html, 'text/html');
  });

  // Per-file HMR: the adapter's hmr module recompiles the changed .vsk with
  // compileClient and broadcasts component fnSources over WS; the served
  // bundles are rebuilt by our own watcher so lazy chunks stay fresh.
  const devDir = join(tmpdir(), 'vesk-preview');
  const hmr = createHmrServer(server, appDir, devDir, new Map());

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  watch(appDir, { recursive: true }, (_event, filename) => {
    if (!filename || !(filename.endsWith('.vsk') || filename.endsWith('.css'))) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const t0 = Date.now();
      try {
        await rebuild();
      } catch (e) {
        console.error('  [dev] bundle rebuild failed (still serving the previous version):', (e as Error).message);
      }
      await hmr.handleFileChange(filename, rebuild, routeTree);
      log('dev', `rebuilt (${filename}) — ${Date.now() - t0}ms`);
    }, 150);
  });

  await rebuild();
  const htmlRoot = existsSync(join(appDir, 'page.vsk'));
  server.listen(port, () => {
    console.log(`  [dev] vesk web preview: http://localhost:${port}${htmlRoot ? '' : ' (no root page.vsk — check the app/ layout)'}`);
    console.log('  [dev] watching app/ for changes (HMR over ws://localhost:' + port + '/_vesk/hmr)');
  });
}