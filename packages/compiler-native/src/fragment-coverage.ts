import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as webParse } from '@vesk/compiler/src/parser';
import { generateIR } from '@vesk/compiler/src/ir-generator';
import {
  StaticNode, DynamicBinding, OpaqueDynamicRegion, MapRegion, WhileLoop,
  SwitchBlock, TryCatch, ForLoop, ComponentCall, TrackDecl, RuntimeStatement,
} from '@vesk/compiler/src/ir';
import type { IRNode } from '@vesk/compiler/src/ir';
import { collectTrackedNames, transformTracked } from '@vesk/compiler/src/client-codegen';
import { parse as nativeParse } from '@compiler-native/parser';

const VSK_ROOT = fileURLToPath(new URL('../../../test-app', import.meta.url));

interface Fragment {
  kind: string;
  source: string;
  component: string;
  file: string;
}

function walkVsk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkVsk(p));
    else if (e.endsWith('.vsk')) out.push(p);
  }
  return out;
}

function childArrays(node: IRNode): Array<IRNode[]> {
  if (node instanceof StaticNode) return [node.children];
  if (node instanceof OpaqueDynamicRegion) return [node.consequentNodes, node.alternateNodes];
  if (node instanceof MapRegion) return [node.bodyTemplate];
  if (node instanceof WhileLoop) return [node.bodyTemplate];
  if (node instanceof SwitchBlock) return node.cases.map((c) => c.body);
  if (node instanceof TryCatch) return [node.bodyTemplate, node.catchBody];
  if (node instanceof ForLoop) return [node.bodyTemplate];
  if (node instanceof ComponentCall) return [node.children];
  return [];
}

function walk(node: IRNode, tracked: Map<string, unknown>, frags: Fragment[], component: string, file: string): void {
  const add = (kind: string, source: string) => frags.push({ kind, source, component, file });

  if (node instanceof DynamicBinding) {
    const t = transformTracked(node.expression, tracked as never);
    add(`binding.${node.kind === 'text' ? 'text' : 'attr'}:${node.target ?? ''}`, `let __vsk_expr = ${t};`);
    if (!node.expression.ast) add('ensureAst', `let __vsk_expr = (${node.expression.raw});`);
  } else if (node instanceof OpaqueDynamicRegion) {
    const t = transformTracked(node.condition, tracked as never);
    add('opaque.condition', `let __vsk_expr = ${t};`);
  } else if (node instanceof MapRegion) {
    const t = transformTracked(node.expression, tracked as never);
    add('map.expression', `let __vsk_expr = ${t};`);
    if (node.keyExpr) {
      const kt = transformTracked(node.keyExpr, tracked as never);
      add('map.key', `let __vsk_expr = ${kt};`);
    }
  } else if (node instanceof WhileLoop) {
    const t = transformTracked(node.condition, tracked as never);
    add('while.condition', `let __vsk_expr = ${t};`);
  } else if (node instanceof SwitchBlock) {
    const d = transformTracked(node.discriminant, tracked as never);
    add('switch.discriminant', `let __vsk_expr = ${d};`);
    for (const c of node.cases) {
      if (c.test) {
        const ct = transformTracked(c.test, tracked as never);
        add('switch.case', `let __vsk_expr = ${ct};`);
      }
    }
  } else if (node instanceof ForLoop) {
    const t = transformTracked(node.condition, tracked as never);
    add('for.condition', `let __vsk_expr = ${t};`);
  } else if (node instanceof ComponentCall) {
    for (const p of node.props) {
      const t = transformTracked(p.value, tracked as never);
      add(`component.${p.name}`, `let __vsk_expr = ${t};`);
    }
  } else if (node instanceof TrackDecl) {
    add('track.init', `let __vsk_init = ${node.init};`);
  } else if (node instanceof RuntimeStatement) {
    const t = transformTracked(node, tracked as never);
    add('runtime.stmt', `{ ${t} }`);
  } else if (node instanceof StaticNode) {
    if (node.keyExpr) {
      const t = transformTracked(node.keyExpr, tracked as never);
      add('static.key', `let __vsk_expr = ${t};`);
    }
  }

  for (const kids of childArrays(node)) {
    for (const k of kids) walk(k, tracked, frags, component, file);
  }
}

const files = walkVsk(VSK_ROOT);
const frags: Fragment[] = [];
let ok = 0;
const failures: string[] = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  let ir;
  try {
    ir = generateIR(webParse(source, { filename: file }), source);
  } catch (e) {
    console.log(`web parse/generateIR failed for ${file}: ${(e as Error).message}`);
    continue;
  }
  for (const comp of ir.components) {
    const tracked = collectTrackedNames(comp.body);
    for (const node of comp.body) walk(node, tracked, frags, comp.name, file);
  }
}

for (const f of frags) {
  try {
    nativeParse(f.source);
    ok++;
  } catch (e) {
    failures.push(`[${f.kind}] ${f.component} @ ${f.file}\n  fragment: ${f.source}\n  error: ${(e as Error).message}`);
  }
}

console.log(`fragments: ${frags.length}, parsed: ${ok}, failed: ${failures.length}`);
for (const f of failures) console.log(`FAIL ${f}\n`);
