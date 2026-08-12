// Regenerate the per-library `.ts` typing files committed next to each `.vsklib`
// record in registry/. Each file is the concrete type surface for the
// `@vesk/<id>` virtual module (see SESSION_SUMMARY "Per-library .ts typing files").
//
// The generated content is parsed with the native JS/TS parser (the same
// surface the compiler consumes) so a typing file with unbalanced or unsupported
// syntax fails loudly here, never at app build time.
//
//   npx tsx packages/cli-native/src/metadata/regenerate-typings.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@compiler-native/parser';
import { vskLibTypingFile } from '@cli-native/generators';
import { loadRegistry } from '@cli-native/vsklib-registry';

async function main(): Promise<void> {
  const records = loadRegistry();
  let written = 0;
  let parseErrors = 0;
  console.log(`  [typings] regenerating .ts typing files for ${records.length} registry libraries`);
  for (const rec of records) {
    const ts = vskLibTypingFile(rec);
    // Parse with the native parser: TS declaration surface must be silently
    // skippable (it carries no runtime value), so a parse failure means the
    // generator emitted something the compiler cannot consume.
    try {
      parse(ts);
    } catch (e) {
      parseErrors++;
      console.error(`  [typings] FAILED to parse typing file for ${rec.id}: ${(e as Error).message}`);
      continue;
    }
    const target = join('packages', 'cli-native', 'registry', `${rec.id}.ts`);
    writeFileSync(target, ts);
    written++;
  }
  console.log(`\n  [typings] wrote ${written}/${records.length} .ts typing files (${parseErrors} parse errors).`);
  if (parseErrors > 0) process.exit(1);
}

void main();
