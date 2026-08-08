import type { JsNode } from '@compiler-native/js2kt.ts';
import { ktIdent } from '@compiler-native/js2kt.ts';

export interface ComponentDecl {
  name: string;
  params: JsNode[];
  node: JsNode;
}

export function findComponentDecls(program: JsNode): ComponentDecl[] {
  const body = (program.body as JsNode[]) ?? [];
  const out: ComponentDecl[] = [];
  const scan = (node: JsNode): void => {
    if (node.type === 'ComponentDeclaration') {
      const id = node.id as JsNode | null;
      out.push({
        name: id && id.type === 'Identifier' ? (id.name as string) : 'Anonymous',
        params: ((node.params as JsNode[]) ?? []).map((p) => {
          if (p.type === 'AssignmentPattern') return p.left as JsNode;
          return p;
        }),
        node,
      });
      return;
    }
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
      const decl = node.declaration as JsNode | null;
      if (decl) scan(decl);
    }
  };
  for (const node of body) scan(node);
  return out;
}

function typeRef(node: JsNode | null): string {
  if (!node) return 'Any';
  switch (node.type) {
    case 'TSNumberKeyword': return 'Int';
    case 'TSStringKeyword': return 'String';
    case 'TSBooleanKeyword': return 'Boolean';
    case 'TSAnyKeyword':
    case 'TSUnknownKeyword': return 'Any';
    case 'TSNullKeyword': return 'Any?';
    case 'TSUndefinedKeyword': return 'Unit?';
    case 'TSArrayType': return `List<${typeRef(node.elementType as JsNode | null)}>`;
    case 'TSUnionType': {
      const types = (node.types as JsNode[]) ?? [];
      const inner = types.map((t) => typeRef(t)).join(' | ');
      return inner.includes('|') ? `Any` : inner;
    }
    case 'TSTypeReference': {
      const name = node.typeName as JsNode;
      const refName = name.type === 'Identifier' ? (name.name as string) : 'Any';
      const args = (node.typeParameters as { params?: JsNode[] } | undefined)?.params;
      if (args?.length) return `${refName}<${args.map((a) => typeRef(a)).join(', ')}>`;
      return refName;
    }
    default:
      return 'Any';
  }
}

export function propsTypeAnnotation(param: JsNode): JsNode | null {
  const ann = param.typeAnnotation as JsNode | undefined;
  if (!ann) return null;
  const inner = ann.typeAnnotation as JsNode | undefined;
  return inner ?? null;
}

export function propsDataType(param: JsNode): { name: string; type: string }[] | null {
  const literal = propsTypeAnnotation(param);
  if (!literal || literal.type !== 'TSTypeLiteral') return null;
  const members = (literal.members as JsNode[]) ?? [];
  const props: { name: string; type: string }[] = [];
  for (const member of members) {
    if (member.type !== 'TSPropertySignature') continue;
    const key = member.key as JsNode;
    const keyName = key.type === 'Identifier' ? (key.name as string) : key.type === 'StringLiteral' ? (key.value as string) : null;
    if (!keyName) continue;
    const ann = member.typeAnnotation as JsNode | null;
    const inner = ann ? (ann.typeAnnotation as JsNode) : null;
    props.push({ name: keyName, type: typeRef(inner) });
  }
  return props;
}

export function generatePropsClass(componentName: string, param: JsNode | null): string {
  if (!param) return '';
  const literal = propsTypeAnnotation(param);
  if (!literal || literal.type !== 'TSTypeLiteral') return '';
  const classes = new Map<string, string>();
  const members = (literal.members as JsNode[]) ?? [];
  const lines: string[] = [];
  for (const member of members) {
    if (member.type !== 'TSPropertySignature') continue;
    const key = member.key as JsNode;
    const keyName = key.type === 'Identifier' ? (key.name as string) : key.type === 'StringLiteral' ? (key.value as string) : null;
    if (!keyName) continue;
    const ann = member.typeAnnotation as JsNode | null;
    const inner = ann ? (ann.typeAnnotation as JsNode) : null;
    const ktType = typeRefDeep(inner, `${componentName}${capName(keyName)}`, classes);
    const defaultVal = defaultForType(ktType);
    lines.push(`\tval ${ktIdent(keyName)}: ${ktType}${defaultVal ? ` = ${defaultVal}` : ''},`);
  }
  return `${[...classes.values()].join('')}data class ${componentName}Props(\n${lines.join('\n')}\n)\n`;
}

function capName(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function defaultForType(type: string): string {
  if (type === 'Int') return '0';
  if (type === 'String') return '""';
  if (type === 'Boolean') return 'false';
  if (type.startsWith('List<')) return 'emptyList()';
  if (type === 'Any') return 'null';
  if (type === 'Any?') return 'null';
  return `${type}()`;
}

function typeRefDeep(node: JsNode | null, prefix: string, classes: Map<string, string>): string {
  if (!node) return 'Any';
  switch (node.type) {
    case 'TSTypeLiteral': {
      if (classes.has(prefix)) return prefix;
      const members = (node.members as JsNode[]) ?? [];
      const lines: string[] = [];
      for (const member of members) {
        if (member.type !== 'TSPropertySignature') continue;
        const key = member.key as JsNode;
        const keyName = key.type === 'Identifier' ? (key.name as string) : key.type === 'StringLiteral' ? (key.value as string) : null;
        if (!keyName) continue;
        const ann = member.typeAnnotation as JsNode | null;
        const inner = ann ? (ann.typeAnnotation as JsNode) : null;
        const ktType = typeRefDeep(inner, `${prefix}${capName(keyName)}`, classes);
        const defaultVal = defaultForType(ktType);
        lines.push(`\tval ${ktIdent(keyName)}: ${ktType}${defaultVal ? ` = ${defaultVal}` : ''},`);
      }
      classes.set(prefix, `data class ${prefix}(\n${lines.join('\n')}\n)\n`);
      return prefix;
    }
    case 'TSArrayType': {
      return `List<${typeRefDeep(node.elementType as JsNode | null, prefix, classes)}>`;
    }
    default:
      return typeRef(node);
  }
}

function forEachNode(node: unknown, cb: (n: JsNode) => void): void {
  if (!node || typeof node !== 'object') return;
  const n = node as JsNode;
  if (typeof n.type === 'string') cb(n);
  for (const key of Object.keys(n)) {
    if (key === 'type' || key.startsWith('_')) continue;
    const v = (n as Record<string, unknown>)[key];
    if (Array.isArray(v)) {
      for (const item of v) forEachNode(item, cb);
    } else if (v && typeof v === 'object') {
      forEachNode(v, cb);
    }
  }
}

export function inferPropsFromUsage(body: JsNode | null): string[] {
  const names = new Set<string>();
  if (!body) return [];
  forEachNode(body, (n) => {
    if (n.type === 'MemberExpression') {
      const obj = n.object as JsNode | null;
      if (obj?.type === 'Identifier' && obj.name === 'props') {
        const prop = n.property as JsNode | null;
        const name =
          prop?.type === 'Identifier' ? (prop.name as string) : prop?.type === 'StringLiteral' ? (prop.value as string) : null;
        if (name) names.add(name);
      }
    }
  });
  return [...names];
}

export function generateInferredPropsClass(componentName: string, names: string[]): string {
  if (names.length === 0) return `data class ${componentName}Props(\n)\n`;
  const lines = names.map((n) => `\tval ${ktIdent(n)}: Any? = null,`);
  return `data class ${componentName}Props(\n${lines.join('\n')}\n)\n`;
}
