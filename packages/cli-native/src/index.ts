import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp, initApp, runApp, setupToolchain } from '@cli-native/commands';
import { TOOLCHAIN_ROOT, usage } from '@cli-native/constants';

// Programmatic surface for tooling, scripts, and tests (the CLI entry point
// is main() below; importing this module never runs the CLI).
export { loadConfig, writeDefaultConfig } from '@cli-native/config';
export { generateAppKt, generateAppBuildGradleKts, generateMainActivity, generateManifest, generateProject, generateRouterKt, generateRuntimeKt, generateSettingsGradleKts, generateThemeKt, generateThemes, syncAapt2Override } from '@cli-native/generators';
export { collectDeviceApiUsage, collectRuntimeUsage } from '@cli-native/usage';
export { API_PERMISSIONS } from '@cli-native/usage';
export { RUNTIME_ORDER } from '@cli-native/runtime-templates';

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case 'init':
      if (!arg) {
        usage();
        process.exit(1);
      }
      await initApp(arg);
      break;
    case 'build':
      await buildApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'run':
      await runApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'install':
      await runApp(arg ? resolve(arg) : process.cwd());
      break;
    case 'setup':
      setupToolchain(TOOLCHAIN_ROOT);
      break;
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
