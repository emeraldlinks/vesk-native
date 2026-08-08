import { parse } from '@vesk/compiler/src/parser';
import { generateIR } from '@vesk/compiler/src/ir-generator';
import {
  StaticNode,
  TextNode,
  DynamicBinding,
  OpaqueDynamicRegion,
  MapRegion,
  WhileLoop,
  SwitchBlock,
  TryCatch,
  ForLoop,
  TrackDecl,
  RuntimeStatement,
  ComponentRef,
  ComponentCall,
  ServerBlock,
  ClientBlock,
  HeadBlock,
  SlotNode,
} from '@vesk/compiler/src/ir';
import { collectTrackedNames, transformTracked } from '@vesk/compiler/src/client-codegen';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { testAppAppDir } from '@compiler-native/paths.ts';

const KIND_OF: Array<[new () => unknown, string]> = [
  [StaticNode, 'StaticNode'],
  [TextNode, 'TextNode'],
  [DynamicBinding, 'DynamicBinding'],
  [OpaqueDynamicRegion, 'OpaqueDynamicRegion'],
  [MapRegion, 'MapRegion'],
  [WhileLoop, 'WhileLoop'],
  [SwitchBlock, 'SwitchBlock'],
  [TryCatch, 'TryCatch'],
  [ForLoop, 'ForLoop'],
  [TrackDecl, 'TrackDecl'],
  [RuntimeStatement, 'RuntimeStatement'],
  [ComponentRef, 'ComponentRef'],
  [ComponentCall, 'ComponentCall'],
  [ServerBlock, 'ServerBlock'],
  [ClientBlock, 'ClientBlock'],
  [HeadBlock, 'HeadBlock'],
  [SlotNode, 'SlotNode'],
];

function kindOf(node: unknown): string {
  for (const [cls, name] of KIND_OF) if (node instanceof cls) return name;
  return `?${String((node as { type?: string }).type)}`;
}

function dumpIR(nodes: unknown[], indent = 0): void {
  const pad = '  '.repeat(indent);
  for (const node of nodes) {
    const k = kindOf(node);
    const n = node as { name?: string; rawName?: string; init?: string; tag?: string; raw?: string; itemVariable?: string; expression?: { raw: string }; condition?: { raw: string } };
    const bits: string[] = [];
    if (n.name !== undefined) bits.push(`name=${n.name}`);
    if (n.rawName !== undefined) bits.push(`rawName=${n.rawName}`);
    if (n.init !== undefined) bits.push(`init=${n.init}`);
    if (n.tag !== undefined) bits.push(`tag=${n.tag}`);
    if (n.raw !== undefined) bits.push(`raw=${JSON.stringify(n.raw.slice(0, 60))}`);
    if (n.itemVariable !== undefined) bits.push(`item=${n.itemVariable}`);
    if (n.expression !== undefined) bits.push(`expr=${n.expression.raw}`);
    if (n.condition !== undefined) bits.push(`cond=${n.condition.raw}`);
    console.log(`${pad}${k}${bits.length ? '  ' + bits.join(' ') : ''}`);

    const childKeys = ['children', 'bodyTemplate', 'consequentNodes', 'alternateNodes', 'body'] as const;
    for (const key of childKeys) {
      const child = (node as Record<string, unknown>)[key];
      if (Array.isArray(child)) dumpIR(child, indent + 1);
    }
  }
}

const source = readFileSync(resolve(testAppAppDir, 'page.vsk'), 'utf-8');

const ast = parse(source);
const ir = generateIR(ast, source);

console.log('=== components ===');
for (const comp of ir.components) {
  console.log(`\n--- ${comp.name} [${comp.mode}] ---`);
  dumpIR(comp.body);

  console.log(`\n  tracked:`, JSON.stringify([...collectTrackedNames(comp.body).entries()]));
  for (const node of comp.body) {
    if (node instanceof RuntimeStatement) {
      const out = transformTracked(node, collectTrackedNames(comp.body));
      console.log(`  runtimeStmt->`, out);
    }
    if (node instanceof DynamicBinding) {
      const out = transformTracked(node, collectTrackedNames(comp.body));
      console.log(`  binding->`, out);
    }
  }
}
