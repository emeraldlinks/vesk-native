import { describe, it } from 'node:test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers.ts';

const smokes = ['lexer-smoke.ts', 'parser-smoke.ts', 'motion-smoke.ts', 'smoke-tailwind.ts'];

describe('compiler smoke scripts', () => {
  for (const s of smokes) {
    it(`packages/compiler-native/src/${s} passes`, () => {
      execFileSync('npx', ['tsx', join('packages/compiler-native/src', s)], { cwd: REPO_ROOT, stdio: 'pipe' });
    });
  }
});
