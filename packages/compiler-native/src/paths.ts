import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const HERE = fileURLToPath(new URL('.', import.meta.url));

export const repoRoot = resolve(HERE, '..', '..', '..');
export const testAppDir = resolve(repoRoot, 'test-app');
export const testAppAppDir = resolve(testAppDir, 'app');
