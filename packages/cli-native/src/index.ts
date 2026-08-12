import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addLibrary, buildApp, initApp, installApp, parseLibraryArgs, removeLibrary, runApp, setupToolchain, updateLibraries } from '@cli-native/commands';
import { TOOLCHAIN_ROOT, usage } from '@cli-native/constants';

// Programmatic surface for tooling, scripts, and tests (the CLI entry point
// is main() below; importing this module never runs the CLI).
export { loadConfig, writeDefaultConfig } from '@cli-native/config';
export { generateAppKt, generateAppBuildGradleKts, generateMainActivity, generateManifest, generateProject, generateRouterKt, generateRuntimeKt, generateSettingsGradleKts, generateThemeKt, generateThemes, syncAapt2Override } from '@cli-native/generators';
export { addLibrary, installApp, removeLibrary, updateLibraries } from '@cli-native/commands';
export { collectBrowserApiUsage, collectDeviceApiUsage, collectRuntimeUsage } from '@cli-native/usage';
export { API_PERMISSIONS } from '@cli-native/usage';
export { RUNTIME_ORDER } from '@cli-native/runtime-templates';
export { LIBRARY_REGISTRY, installedLibraries, loadLibraries, parseLibrarySpec, regenerateVsklib, resolveLibrary, saveLibraries, verifyLibrary, writeVsklibCache } from '@cli-native/vsklib';

async function main(): Promise<void> {
  const [cmd] = process.argv.slice(2);
  switch (cmd) {
    case 'init':
      if (!process.argv[3]) {
        usage();
        process.exit(1);
      }
      await initApp(process.argv[3]!);
      break;
    case 'build':
      await buildApp(process.argv[3] ? resolve(process.argv[3]) : process.cwd());
      break;
    case 'run':
      await runApp(process.argv[3] ? resolve(process.argv[3]) : process.cwd());
      break;
    case 'install':
      await installApp(process.argv[3] ? resolve(process.argv[3]) : process.cwd());
      break;
    case 'setup':
      setupToolchain(TOOLCHAIN_ROOT);
      break;
    case 'add': {
      const { spec, dir } = parseLibraryArgs(process.argv.slice(3));
      if (!spec) {
        usage();
        process.exit(1);
      }
      await addLibrary(dir, spec);
      break;
    }
    case 'update': {
      const { spec, dir } = parseLibraryArgs(process.argv.slice(3));
      await updateLibraries(dir, spec);
      break;
    }
    case 'remove': {
      const { spec, dir } = parseLibraryArgs(process.argv.slice(3));
      if (!spec) {
        usage();
        process.exit(1);
      }
      await removeLibrary(dir, spec);
      break;
    }
    case 'dev':
      console.log('  [dev] not implemented yet (Phase 7)');
      break;
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
