import { parse } from '@vesk/compiler';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { testAppAppDir } from '@compiler-native/paths';

const source = readFileSync(resolve(testAppAppDir, 'page.vsk'), 'utf-8');
const ast = parse(source);
const comp = ast.body[0] as { type: string; id: { name: string }; params?: unknown[] };
console.log('node:', comp.type, '| name:', comp.id?.name);
console.log(
  JSON.stringify(comp.params, (_k, v) =>
    ['loc', 'range', 'start', 'end'].includes(_k) ? undefined : v,
  2),
);
