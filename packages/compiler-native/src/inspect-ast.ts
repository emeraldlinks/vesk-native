import { parse, generateIR, DynamicBinding, OpaqueDynamicRegion, collectTrackedNames, transformTrackedAst } from '@vesk/compiler';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { testAppAppDir } from '@compiler-native/paths.ts';
import { walkIR } from '@compiler-native/walk-ir.ts';

const source = readFileSync(resolve(testAppAppDir, 'page.vsk'), 'utf-8');
const ir = generateIR(parse(source), source);
const comp = ir.components[0];
const tracked = collectTrackedNames(comp.body);

const clean = (_k: string, v: unknown): unknown =>
  ['loc', 'range', 'start', 'end', 'raw'].includes(_k) ? undefined : v;

let dbShown = 0;
walkIR(comp.body, (node) => {
  if (node instanceof DynamicBinding && dbShown < 2) {
    dbShown++;
    console.log(`=== DynamicBinding kind=${node.kind} target=${node.target} expr=${node.expression.raw} ===`);
    console.log('  expression.ast:', node.expression.ast ? node.expression.ast.type : 'NULL', '| source:', node.expression.source);
    const out = transformTrackedAst(node.expression, tracked);
    console.log('  transformed:', out ? (out as { type: string }).type : 'NULL');
  }
  if (node instanceof OpaqueDynamicRegion) {
    console.log(`=== Opaque cond=${node.condition.raw} ===`);
    console.log(JSON.stringify(transformTrackedAst(node.condition, tracked), clean, 1));
    console.log();
  }
});
