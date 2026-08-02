import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repoRoot, '..', 'vesk', 'packages', 'compiler');
const dest = resolve(repoRoot, 'node_modules', '@vesk', 'compiler');

if (!existsSync(source)) {
  console.error(`fix-links: source missing — expected @vesk/compiler at ${source}`);
  process.exit(1);
}

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const srcPath = join(from, entry);
    const dstPath = join(to, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      if (entry === 'node_modules') continue;
      copyTree(srcPath, dstPath);
    } else if (stat.isFile() && !(entry.endsWith('.ts') && !entry.endsWith('.d.ts'))) {
      copyFileSync(srcPath, dstPath);
    }
  }
}

rmSync(dest, { recursive: true, force: true });
copyTree(source, dest);
const hoistedDeps = resolve(repoRoot, '..', 'vesk', 'node_modules');
if (existsSync(hoistedDeps)) {
  symlinkSync(hoistedDeps, resolve(dest, 'node_modules'), 'dir');
}
console.log(`fix-links: @vesk/compiler copied to ${dest} (excluding .ts sources)`);
