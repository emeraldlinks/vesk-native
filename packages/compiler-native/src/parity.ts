import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compileVsk, getCompileErrors } from '@compiler-native/index';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (f.endsWith('.vsk')) out.push(p);
  }
  return out;
}

const roots = process.argv.slice(2);
for (const root of roots) {
  console.log(`\n===== ${root} =====`);
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    let errors: string[];
    try {
      errors = getCompileErrors(source, file);
    } catch (e) {
      console.log(`CRASH ${file.replace(root, '')}`);
      console.log(`        ${String(e).split('\n')[0]}`);
      continue;
    }
    if (errors.length === 0) {
      const kt = compileVsk(source, file);
      console.log(`OK    ${file.replace(root, '')}  (${kt.length} bytes kt)`);
    } else {
      console.log(`FAIL  ${file.replace(root, '')}`);
      for (const e of errors) console.log(`        ! ${e}`);
    }
  }
}
