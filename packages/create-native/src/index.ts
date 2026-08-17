#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TEMPLATES_DIR = join(import.meta.dirname, '..', 'templates');

interface Answers {
  projectName: string;
  appName: string;
  appId: string;
  template: string;
  primaryColor: string;
  theme: string;
}

interface AnswersArgs extends Partial<Answers> {
  yes?: boolean;
}

function parseArgs(argv: string[]): AnswersArgs {
  const args: AnswersArgs = {};
  const positional = argv.slice(2);
  let i = 0;
  while (i < positional.length) {
    const arg = positional[i]!;
    if (arg === '--yes' || arg === '-y') { args.yes = true; i++; }
    else if (arg === '--template' || arg === '-t') { args.template = positional[++i]; i++; }
    else if (arg === '--app-id') { args.appId = positional[++i]; i++; }
    else if (arg === '--app-name') { args.appName = positional[++i]; i++; }
    else if (arg === '--primary') { args.primaryColor = positional[++i]; i++; }
    else if (arg === '--theme') { args.theme = positional[++i]; i++; }
    else if (!arg.startsWith('-')) { args.projectName = arg; i++; }
    else { i++; }
  }
  return args;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function javaPackageName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function promptUser(args: AnswersArgs): Promise<Answers> {
  // If --yes flag is set, use defaults for everything
  if (args.yes) {
    const projectName = args.projectName || 'my-vesk-app';
    return {
      projectName,
      appName: args.appName || projectName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      appId: args.appId || `com.vesk.${javaPackageName(projectName)}`,
      template: args.template || 'starter',
      primaryColor: args.primaryColor || '#3B82F6',
      theme: args.theme || 'system',
    };
  }

  const prompts = (await import('prompts')).default;

  const responses = await prompts([
    {
      type: args.projectName ? null : 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: args.projectName || 'my-vesk-app',
    },
    {
      type: args.appName ? null : 'text',
      name: 'appName',
      message: 'App display name:',
      initial: (prev: string | undefined) => (prev ?? '').split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    },
    {
      type: args.appId ? null : 'text',
      name: 'appId',
      message: 'App ID (Android bundle identifier):',
      initial: (_prev: string, values: Record<string, string>) => `com.vesk.${slugify(values.projectName ?? '')}`,
    },
    {
      type: args.template ? null : 'select',
      name: 'template',
      message: 'Template:',
      choices: [
        { title: 'blank', description: 'Minimal starter', value: 'blank' },
        { title: 'starter', description: 'App with navigation and state', value: 'starter' },
        { title: 'demo', description: 'Full showcase of framework features', value: 'demo' },
      ],
      initial: 1,
    },
    {
      type: args.primaryColor ? null : 'text',
      name: 'primaryColor',
      message: 'Primary color (hex):',
      initial: '#3B82F6',
    },
    {
      type: args.theme ? null : 'select',
      name: 'theme',
      message: 'Theme mode:',
      choices: [
        { title: 'system', value: 'system' },
        { title: 'light', value: 'light' },
        { title: 'dark', value: 'dark' },
      ],
      initial: 0,
    },
  ]);

  return {
    projectName: args.projectName || responses.projectName,
    appName: args.appName || responses.appName,
    appId: args.appId || responses.appId,
    template: args.template || responses.template,
    primaryColor: args.primaryColor || responses.primaryColor,
    theme: args.theme || responses.theme,
  };
}

function generateVeskConfig(answers: Answers): string {
  return `import { defineConfig } from '@vesk/native';

export default defineConfig({
    appId: '${answers.appId}',
    appName: '${answers.appName}',
    versionName: '1.0.0',
    versionCode: 1,
    theme: '${answers.theme}',
    colors: {
        primary: '${answers.primaryColor}',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1E293B',
        textSecondary: '#64748B',
        border: '#E2E8F0',
    },
    darkColors: {
        primary: '${answers.primaryColor}',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        border: '#334155',
    },
});
`;
}

function generateLocalProperties(): string {
  return `sdk.dir=/opt/vesk-native-toolchain/sdk\n`;
}

function copyRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

// Resolve the vesk-native monorepo root from the create-native package location.
// When running from source: create-native is at packages/create-native, so the
// monorepo root is two levels up. When published, this fallback points at the
// workspace root (which may not exist), so we gracefully skip if missing.
function resolveVeskRoot(): string | null {
  // From packages/create-native/src/index.js → ../../.. → monorepo root
  const fromSrc = resolve(import.meta.dirname, '..', '..', '..');
  if (existsSync(join(fromSrc, 'packages', 'cli-native'))) return fromSrc;
  // Fallback: sibling of create-native package
  const sibling = resolve(import.meta.dirname, '..', '..', 'cli-native');
  if (existsSync(sibling)) return resolve(import.meta.dirname, '..', '..');
  return null;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const answers = await promptUser(args);

  if (!answers.projectName) {
    console.error('Project name is required.');
    process.exit(1);
  }

  const projectDir = resolve(process.cwd(), answers.projectName);

  if (existsSync(projectDir)) {
    console.error(`Directory "${answers.projectName}" already exists.`);
    process.exit(1);
  }

  console.log(`\nScaffolding vesk-native project "${answers.appName}"...`);

  mkdirSync(projectDir, { recursive: true });

  // Resolve paths for templates and assets
  const veskRoot = resolveVeskRoot();
  const templateAssets = veskRoot
    ? join(veskRoot, 'packages', 'cli-native', 'assets', 'template')
    : join(import.meta.dirname, '..', '..', 'cli-native', 'assets', 'template');

  // 1. Copy gradle template files
  if (existsSync(templateAssets)) {
    for (const f of ['build.gradle.kts', 'gradle.properties', 'settings.gradle.kts']) {
      const src = join(templateAssets, f);
      if (existsSync(src)) cpSync(src, join(projectDir, f));
    }
  }

  // 2. Write local.properties
  writeFileSync(join(projectDir, 'local.properties'), generateLocalProperties());

  // 3. Write veskconfig.ts
  writeFileSync(join(projectDir, 'veskconfig.ts'), generateVeskConfig(answers));

  // 4. Copy template files
  const srcTemplate = join(TEMPLATES_DIR, answers.template);
  if (existsSync(join(srcTemplate, 'app'))) {
    copyRecursive(join(srcTemplate, 'app'), join(projectDir, 'app'));
  }

  // 5. Create package.json with correct dependency paths
  // When scaffolding inside the monorepo, use file: links; otherwise use versions.
  const inMonorepo = veskRoot !== null;
  const deps = inMonorepo
    ? {
        '@vesk/native': `file:${join(veskRoot!, 'packages', 'native')}`,
        '@vesk/native-compiler': `file:${join(veskRoot!, 'packages', 'compiler-native')}`,
        '@vesk/native-cli': `file:${join(veskRoot!, 'packages', 'cli-native')}`,
      }
    : {
        '@vesk/native': '^0.1.0',
      };
  const devDeps = inMonorepo
    ? {}
    : {
        '@vesk/native-cli': '^0.1.0',
        '@vesk/native-compiler': '^0.1.0',
      };

  writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
    name: answers.projectName,
    private: true,
    type: 'module',
    scripts: {
      build: 'vesk-native build',
      clean: 'rm -rf app/build shared/build build .gradle',
    },
    dependencies: deps,
    devDependencies: devDeps,
  }, null, 2) + '\n');

  console.log(`\nDone! Created "${answers.appName}" in ./${answers.projectName}\n`);
  console.log('Next steps:');
  console.log(`  cd ${answers.projectName}`);
  console.log('  npm install');
  console.log('  npx vesk-native build');
  console.log('  # Open on device or emulator\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
