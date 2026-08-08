import {
  StaticNode,
  DynamicBinding,
  OpaqueDynamicRegion,
  MapRegion,
  WhileLoop,
  SwitchBlock,
  TryCatch,
  ForLoop,
  ComponentCall,
  ServerBlock,
  ClientBlock,
  HeadBlock,
  Expression,
} from '@vesk/compiler/src/ir';
import type { IRNode } from '@vesk/compiler/src/ir';

export type Visitor = (node: IRNode, parent: IRNode | null) => void;

function childArrays(node: IRNode): Array<IRNode[]> {
  if (node instanceof StaticNode) return [node.children];
  if (node instanceof OpaqueDynamicRegion) return [node.consequentNodes, node.alternateNodes];
  if (node instanceof MapRegion) return [node.bodyTemplate];
  if (node instanceof WhileLoop) return [node.bodyTemplate];
  if (node instanceof SwitchBlock) return node.cases.map((c) => c.body);
  if (node instanceof TryCatch) return [node.bodyTemplate, node.catchBody];
  if (node instanceof ForLoop) return [node.bodyTemplate];
  if (node instanceof ComponentCall) return [node.children];
  if (node instanceof ServerBlock) return [node.children];
  if (node instanceof ClientBlock) return [node.children];
  if (node instanceof HeadBlock) return [node.children];
  return [];
}

export function walkIR(nodes: IRNode[], visitor: Visitor, parent: IRNode | null = null): void {
  for (const node of nodes) {
    visitor(node, parent);
    for (const children of childArrays(node)) walkIR(children, visitor, node);
  }
}

export function expressionOf(node: IRNode): Expression | null {
  if (node instanceof DynamicBinding) return node.expression;
  if (node instanceof OpaqueDynamicRegion) return node.condition;
  if (node instanceof MapRegion) return node.expression;
  if (node instanceof WhileLoop) return node.condition;
  if (node instanceof SwitchBlock) return node.discriminant;
  if (node instanceof ForLoop) return node.condition;
  if (node instanceof ComponentCall) return node.props.map((p) => p.value)[0] ?? null;
  return null;
}

export function hasExpression(node: IRNode): boolean {
  return (
    node instanceof DynamicBinding ||
    node instanceof OpaqueDynamicRegion ||
    node instanceof MapRegion ||
    node instanceof WhileLoop ||
    node instanceof SwitchBlock ||
    node instanceof ForLoop
  );
}
