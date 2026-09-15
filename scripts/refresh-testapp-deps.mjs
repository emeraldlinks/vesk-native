#!/usr/bin/env node
/**
 * Rebuilds workspace packages and repacks them as uniquely-versioned CI
 * tarballs for a vesk-native example app (default: test-app), then rewrites
 * the app's dependency pins to the fresh tarballs and runs npm install.
 * Guarantees every run (CI or local) exercises the LATEST source instead of
 * stale checked-in tarballs (npm's same-name+version caching makes reuse of
 * unchanged filenames unsafe).
 *
 * Usage: node scripts/refresh-testapp-deps.mjs [appDir]
 *   appDir defaults to "test-app". Pass any project to refresh instead — a
 *   bare name (resolved under the repo root, e.g. "navigation-testapp") or a
 *   full/relative path (resolved against the current directory, e.g.
 *   "/abs/path/to/app" or "../some/app"). The target package list is derived
 *   from that app's own @vesk/* dependency names (so every project's target
 *   set follows its own pins automatically — never a hardcoded list).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const appArg = process.argv[2];
const appDirName = appArg || 'test-app';
// Resolve the target project: a name stays repo-root-relative (so callers
// can stay inside the repo), anything that looks like a path is resolved
// against the current working directory instead (covers absolute and
// ../relative paths to projects outside the repo).
const looksLikePath = appArg && (appArg.startsWith('.') || appArg.startsWith('/') || appArg.includes('/'));
const appPathBase = looksLikePath ? process.cwd() : root;
const appDir = resolve(appPathBase, appDirName);
const tarballsDir = join(appDir, 'tarballs');

// name -> directory under packages/ (built from every readable package.json)
function buildPackageIndex() {
	const index = new Map();
	for (const dir of readdirSync(join(root, 'packages'))) {
		try {
			const pkg = JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'));
			if (pkg.name) index.set(pkg.name, dir);
		} catch {
			// skip dirs without a readable package.json
		}
	}
	return index;
}

// Derive pack targets from the app's own @vesk/* deps that resolve to local
// workspace packages. The target list always mirrors the app's package.json
// (never a hardcoded set), so refresh works verbatim for any example app.
function deriveTargets(packageIndex) {
	const appPkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
	const names = new Set([
		...Object.keys(appPkg.dependencies || {}),
		...Object.keys(appPkg.devDependencies || {}),
		...Object.keys(appPkg.peerDependencies || {}),
	]);
	const targets = [];
	for (const name of names) {
		const dir = packageIndex.get(name);
		if (dir) targets.push({ name, dir });
	}
	return targets;
}

const targets = deriveTargets(buildPackageIndex());
if (targets.length === 0) {
	console.error(`[refresh] no local @vesk packages found in ${appDirName}'s deps — nothing to do`);
	process.exit(1);
}

console.log(`[refresh] targets: ${targets.map((t) => t.name).join(', ') || '(none)'}`);

// Step 1 — build every target workspace package (their builds emit dist/).
for (const target of targets) {
	const { name, dir } = target;
	const pkgPath = join(root, 'packages', dir, 'package.json');
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
	const script = pkg.scripts?.build;
	console.log(`[refresh] building ${name}${script ? ` (npm run build -w ${name})` : ''}`);
	const res = spawnSync('npm', ['run', 'build', '-w', name], { cwd: root, stdio: 'inherit' });
	if (res.status !== 0) {
		console.error(`[refresh] build failed for ${name}`);
		process.exit(1);
	}
}
console.log('[refresh] all targets built');

// Step 2 — repack each target as a uniquely-versioned CI tarball, then
// rewrite the app's dependency pins to the fresh tarballs.
mkdirSync(tarballsDir, { recursive: true });
const epoch = Date.now();
let packedCount = 0;
for (const target of targets) {
	const { name, dir } = target;
	const pkgPath = join(root, 'packages', dir, 'package.json');
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
	// temporarily bump the package version so `npm pack` emits a unique
	// filename AND unique version for the tarball
	const origVersion = pkg.version;
	pkg.version = `${pkg.version}-ci.${epoch}.${packedCount}`;
	writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
	console.log(`[refresh] packing ${name} ...`);
	const res = spawnSync('npm', ['pack', '.', '--pack-destination', tarballsDir], {
		cwd: join(root, 'packages', dir),
		stdio: 'inherit',
	});
	// restore the real version immediately (keep the workspace clean)
	pkg.version = origVersion;
	writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
	if (res.status !== 0) {
		console.error(`[refresh] pack failed for ${name}`);
		process.exit(1);
	}
	const tarballName = `${name}-${pkg.version}-ci.${epoch}.${packedCount}.tgz`.replace(/^@/, '').replaceAll('/', '-');
	const appPkgPath = join(appDir, 'package.json');
	const appPkg = JSON.parse(readFileSync(appPkgPath, 'utf8'));
	appPkg.dependencies[name] = `file:./tarballs/${tarballName}`;
	writeFileSync(appPkgPath, JSON.stringify(appPkg, null, '\t') + '\n');
	packedCount++;
}
console.log('[refresh] all targets packed and pinned');

// Step 3 — npm install in the app dir (resolves the file: tarball pins).
const install = spawnSync('npm', ['install'], { cwd: appDir, stdio: 'inherit' });
if (install.status !== 0) {
	console.error(`[refresh] npm install failed in ${appDir}`);
	process.exit(1);
}

// Step 4 — freshness gate: the installed resolved versions must be the CI
// tarball versions we just packed (no stale node_modules reuse).
let allFresh = true;
for (const target of targets) {
	const { name, dir } = target;
	const installedPath = join(appDir, 'node_modules', name, 'package.json');
	const installed = JSON.parse(readFileSync(installedPath, 'utf8'));
	const ciVersion = `${installed.version} initialized`;
	// The installed version must carry the CI marker we packed this run.
	const fresh = installed.version.includes('-ci.') && !installed.version.includes('file:');
	if (!fresh) {
		allFresh = false;
		console.error(`[refresh] STALE: ${name} resolved to ${installed.version} — expected a -ci. tarball from this run`);
	} else {
		console.log(`[refresh] fresh: ${name}@${installed.version}`);
	}
}
if (!allFresh) {
	console.error('[refresh] freshness gate FAILED — aborting');
	process.exit(1);
}
console.log(`[refresh] done — ${appDirName} now exercises latest workspace source`);
