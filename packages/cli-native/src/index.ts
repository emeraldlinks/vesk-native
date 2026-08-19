import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addLibrary, buildApp, bundleApp, devApp, initApp, removeLibrary, setupToolchain, updateLibraries, verifyApp, verifyBundle } from '@cli-native/commands';
import { TOOLCHAIN_ROOT, usage } from '@cli-native/constants';

// Programmatic surface for tooling, scripts, and tests (the CLI entry point
// is main() below; importing this module never runs the CLI).
export { loadConfig, writeDefaultConfig } from '@cli-native/config';
export { generateAppKt, generateAppBuildGradleKts, generateMainActivity, generateManifest, generateProject, generateRouterKt, generateRuntimeKt, generateSettingsGradleKts, generateThemeKt, generateThemes, syncAapt2Override } from '@cli-native/generators';
export { addLibrary, removeLibrary, updateLibraries, verifyApp, verifyBundle } from '@cli-native/commands';
export { collectBrowserApiUsage, collectDeviceApiUsage, collectRuntimeUsage } from '@cli-native/usage';
export { API_PERMISSIONS } from '@cli-native/usage';
export { RUNTIME_ORDER } from '@cli-native/runtime-templates';
export { LIBRARY_REGISTRY, installedLibraries, loadLibraries, parseLibrarySpec, resolveLibrary, saveLibraries, verifyLibraries, verifyLibrary, writeVsklibCache } from '@cli-native/vsklib';

async function main(): Promise<void> {
  // The CLI runs from inside the user's project (installed in its node_modules),
  // so every command operates on the current working directory — there is no
  // project-name positional (vesk build / vesk bundle ios, not vesk build myapp).
  const cwd = process.cwd();
  const [cmd] = process.argv.slice(2);
  switch (cmd) {
    case 'init':
      await initApp(cwd);
      break;
    case 'build':
      await buildApp(cwd);
      break;
    case 'bundle':
      await bundleApp(cwd, (process.argv[3] as 'android' | 'ios') ?? 'android');
      break;
    case 'verify':
      if (process.argv[3] === 'bundle') await verifyBundle(cwd, process.argv[4]);
      else await verifyApp(cwd);
      break;
    case 'setup':
      setupToolchain(TOOLCHAIN_ROOT);
      break;
    case 'add': {
      const spec = process.argv[3];
      if (!spec) {
        usage();
        process.exit(1);
      }
      await addLibrary(cwd, spec);
      break;
    }
    case 'update':
      await updateLibraries(cwd, process.argv[3]);
      break;
    case 'remove': {
      const spec = process.argv[3];
      if (!spec) {
        usage();
        process.exit(1);
      }
      await removeLibrary(cwd, spec);
      break;
    }
    case 'dev': {
      const portArg = process.argv.findIndex((a) => a === '--port');
      const port = portArg !== -1 && process.argv[portArg + 1] ? Number(process.argv[portArg + 1]) : 5173;
      const desktop = process.argv.includes('--desktop');
      await devApp(cwd, Number.isFinite(port) ? port : 5173, desktop);
      break;
    }
    default:
      usage();
  }
}

// Only dispatch when this file is the CLI entry point (handles npx, symlinked
// bins, and direct `tsx src/index.ts` invocations); importing the module for
// its exported generators is side-effect free.
const invokedAsCli =
  process.argv[1] !== undefined &&
  (() => {
    try {
      return realpathSync(process.argv[1]!) === fileURLToPath(import.meta.url);
    } catch {
      return false;
    }
  })();

if (invokedAsCli) void main();
