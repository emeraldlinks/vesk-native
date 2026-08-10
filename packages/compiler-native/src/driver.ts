import { readFileSync } from 'node:fs';
import { compileVsk, getCompileErrors } from '@compiler-native/index';
import { testAppAppDir } from '@compiler-native/paths';

const file = `${testAppAppDir}/page.vsk`;
const source = readFileSync(file, 'utf8');

const errors = getCompileErrors(source, 'page.vsk');
console.log('=== COMPILE ERRORS ===');
for (const e of errors) console.log(`  ! ${e}`);
if (errors.length === 0) console.log('  (none)');

const kt = compileVsk(source, 'page.vsk');
console.log('=== EMITTED KOTLIN ===');
console.log(kt);
