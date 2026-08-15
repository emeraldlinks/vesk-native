// Copies the monorepo-owned assets into the cli-native package so a packed
// tarball is self-contained: gradle template, navigation Router.kt, and the
// sample .vsk sources. Run as part of `npm run build` (and manually to refresh).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'packages', 'cli-native', 'assets');

function collectFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
}

mkdirSync(join(OUT, 'template'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'runtime', 'vesk-native-template'))) {
  cpSync(join(ROOT, 'runtime', 'vesk-native-template', f), join(OUT, 'template', f), { recursive: true });
}
console.log('[assets] template -> assets/template/');

mkdirSync(join(OUT, 'navigation'), { recursive: true });
// The router is a KMP pair: the portable Router.kt (commonMain) plus the
// platform actuals. Each platform source file follows Kotlin's
// Platform.android.kt naming and is copied alongside the common file.
for (const f of readdirSync(join(ROOT, 'packages', 'navigation-native', 'src')).sort()) {
  if (!f.endsWith('.kt')) continue;
  cpSync(join(ROOT, 'packages', 'navigation-native', 'src', f), join(OUT, 'navigation', f));
}
console.log('[assets] navigation Router.kt* -> assets/navigation/');

const sampleSrc = join(ROOT, 'test-app', 'app');
const sampleOut = join(OUT, 'sample');
mkdirSync(sampleOut, { recursive: true });
let n = 0;
for (const f of collectFiles(sampleSrc)) {
  if (!f.endsWith('.vsk')) continue;
  const rel = relative(sampleSrc, f);
  const dest = join(sampleOut, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, readFileSync(f, 'utf8'));
  n++;
}
console.log(`[assets] ${n} sample .vsk -> assets/sample/`);
