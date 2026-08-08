import { parse } from '@vesk/compiler/src/parser';
import { generateIR } from '@vesk/compiler/src/ir-generator';
import {
  StaticNode,
  TextNode,
  DynamicBinding,
  OpaqueDynamicRegion,
  MapRegion,
  ComponentCall,
  Expression,
  TrackDecl,
  RuntimeStatement,
  HeadBlock,
  ServerBlock,
  ClientBlock,
  SlotNode,
  WhileLoop,
  SwitchBlock,
  TryCatch,
  ForLoop,
} from '@vesk/compiler/src/ir';
import type { IRNode } from '@vesk/compiler/src/ir';
import { collectTrackedNames, transformTracked } from '@vesk/compiler/src/client-codegen';
import type { TrackedInfo } from '@vesk/compiler/src/client-codegen';
import { Js2Kt, KtErrors } from '@compiler-native/js2kt.ts';
import type { JsNode } from '@compiler-native/js2kt.ts';
import { ktIdent } from '@compiler-native/js2kt.ts';
import { findComponentDecls, generatePropsClass, inferPropsFromUsage, generateInferredPropsClass } from '@compiler-native/props.ts';
import { elementInfo } from '@compiler-native/elements.ts';
import { layoutArgs, elementAxis } from '@compiler-native/layout-args.ts';
import { resolveModifier, resolveTextStyle } from '@compiler-native/tailwind.ts';

export interface CompileOptions {
  packageName?: string;
  componentsWithoutProps?: Set<string>;
}

const CLASS_ATTRS = new Set(['class', 'className']);

const IMPORTS = `import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp`;

class Emitter {
  err: KtErrors;
  j2k: Js2Kt;
  tracked: Map<string, TrackedInfo>;
  componentsWithoutProps?: Set<string>;

  constructor(err: KtErrors, tracked: Map<string, TrackedInfo>, componentsWithoutProps?: Set<string>) {
    this.err = err;
    this.j2k = new Js2Kt(err);
    this.tracked = tracked;
    this.componentsWithoutProps = componentsWithoutProps;
  }

  ktString(value: string): string {
    return this.j2k.ktString(value);
  }

  ensureAst(expr: Expression): JsNode | null {
    if (expr.ast) return expr.ast as JsNode;
    if (expr.raw) {
      try {
        const program = parse(`let __vsk_expr = (${expr.raw});`) as unknown as {
          body: Array<{ declarations: Array<{ init: JsNode | undefined }> }>;
        };
        const init = program.body[0]?.declarations[0]?.init;
        if (init) {
          (expr as { ast: unknown }).ast = init;
          return init;
        }
      } catch (e) {
        this.err.warn(null, `could not parse expression: ${expr.raw}: ${(e as Error).message}`);
      }
    }
    return null;
  }

  exprOf(expr: Expression): string {
    const transformed = transformTracked(expr, this.tracked);
    const ast = this.parseExprInit(transformed);
    return ast;
  }

  stmtOf(node: RuntimeStatement): string {
    const transformed = transformTracked(node, this.tracked);
    try {
      const program = parse(`{ ${transformed} }`) as unknown as {
        body: Array<{ body: Array<JsNode> }>;
      };
      const stmts = program.body[0]?.body;
      if (!stmts || stmts.length === 0) {
        this.err.warn(null, `could not parse runtime statement: ${transformed}`);
        return transformed;
      }
      return stmts.map((s) => this.j2k.stmt(s)).join('\n');
    } catch (e) {
      this.err.warn(null, `could not parse runtime statement: ${transformed}: ${(e as Error).message}`);
      return transformed;
    }
  }

  parseExprInit(init: string): string {
    try {
      const program = parse(`let __vsk_init = ${init};`) as unknown as {
        body: Array<{ declarations: Array<{ init: JsNode }> }>;
      };
      const exprAst = program.body[0]?.declarations[0]?.init;
      if (!exprAst) {
        this.err.warn(null, `could not parse track init: ${init}`);
        return init;
      }
      return this.j2k.expr(exprAst);
    } catch (e) {
      this.err.warn(null, `could not parse track init: ${init}: ${(e as Error).message}`);
      return init;
    }
  }

  parseTrackInit(init: string): string {
    try {
      const program = parse(`let __vsk_init = ${init};`) as unknown as {
        body: Array<{ declarations: Array<{ init: JsNode }> }>;
      };
      const exprAst = program.body[0]?.declarations[0]?.init;
      if (!exprAst) {
        this.err.warn(null, `could not parse track init: ${init}`);
        return init;
      }
      const call = exprAst as unknown as {
        type?: string;
        callee?: { type?: string; name?: string };
        arguments?: Array<unknown>;
      };
      if (call.type === 'CallExpression' && call.callee?.name === 'track' && call.arguments?.[0]) {
        return this.j2k.expr(call.arguments[0] as JsNode);
      }
      return this.j2k.expr(exprAst);
    } catch (e) {
      this.err.warn(null, `could not parse track init: ${init}: ${(e as Error).message}`);
      return init;
    }
  }

  classList(node: StaticNode): string[] {
    const attr = node.attributes.find((a) => CLASS_ATTRS.has(a.name));
    if (!attr) return [];
    return attr.value.split(/\s+/).filter(Boolean);
  }

  staticAttr(node: StaticNode, name: string): string | null {
    const attr = node.attributes.find((a) => a.name === name);
    return attr ? attr.value : null;
  }

  bindRefVar(node: StaticNode): string | null {
    const ref = node.children.find(
      (c) => c instanceof DynamicBinding && c.kind === 'attribute' && c.target === 'ref'
    ) as DynamicBinding | undefined;
    if (!ref) return null;
    const ast = this.ensureAst(ref.expression);
    if (!ast) return null;
    const call = ast as unknown as {
      type?: string;
      callee?: { type?: string; name?: string };
      arguments?: Array<{ type?: string; name?: string }>;
    };
    if (
      call.type === 'CallExpression' &&
      call.callee?.type === 'Identifier' &&
      (call.callee.name === 'bindValue' || call.callee.name === 'bindChecked') &&
      call.arguments?.[0]?.type === 'Identifier'
    ) {
      return call.arguments[0].name as string;
    }
    return null;
  }

  dynamicAttrs(node: StaticNode): Map<string, JsNode> {
    const out = new Map<string, JsNode>();
    for (const child of node.children) {
      if (child instanceof DynamicBinding && child.kind === 'attribute' && child.target) {
        const transformed = transformTracked(child.expression, this.tracked);
        try {
          const program = parse(`let __vsk_attr = ${transformed};`) as unknown as {
            body: Array<{ declarations: Array<{ init: JsNode }> }>;
          };
          const exprAst = program.body[0]?.declarations[0]?.init;
          if (exprAst) {
            out.set(child.target, exprAst);
          } else {
            this.err.warn(null, `could not parse dynamic attribute: ${transformed}`);
          }
        } catch (e) {
          this.err.warn(null, `could not parse dynamic attribute: ${transformed}: ${(e as Error).message}`);
        }
      }
    }
    return out;
  }

  trackDecl(node: TrackDecl): string {
    const init = this.parseTrackInit(node.init);
    if (node.rawName) {
      return `val ${node.name} = remember { mutableStateOf(${init}) }\n\tval ${node.rawName} = ${node.name}`;
    }
    return `val ${node.name} = remember { mutableStateOf(${init}) }`;
  }

  emitTopLevel(node: IRNode, level: number): string[] {
    if (node instanceof StaticNode) {
      return emitElement(node, this, level);
    }
    return emitChild(node, this, level);
  }
}

function splitLines(code: string): string[] {
  return code.split('\n');
}

function dynamicText(expr: string): string {
  return `(${expr}).toString()`;
}

function textContent(children: IRNode[], em: Emitter): string {
  const parts: string[] = [];
  for (const child of children) {
    if (child instanceof TextNode) {
      parts.push(em.ktString(child.value));
    } else if (child instanceof DynamicBinding && child.kind === 'text') {
      parts.push(dynamicText(em.exprOf(child.expression)));
    } else if (child instanceof DynamicBinding && child.kind === 'attribute') {
      // attribute bindings are consumed elsewhere
    }
  }
  return parts.length === 0 ? '""' : parts.join(' + ');
}

function makeTextCall(text: string, classes: string[], level: number): string {
  const pad = '\t'.repeat(level);
  const lines = [pad + 'Text('];
  lines.push(`${pad}\ttext = ${text},`);
  const modifier = resolveModifier(classes);
  const style = resolveTextStyle(classes);
  if (modifier) lines.push(`${pad}\tmodifier = ${modifier},`);
  if (style) lines.push(`${pad}\tstyle = ${style},`);
  lines.push(pad + ')');
  return lines.join('\n');
}

function componentCallLines(node: ComponentCall, em: Emitter, level: number): string {
  const propArgs = node.props.map((p) => `${ktIdent(p.name)} = ${em.exprOf(p.value)}`);
  for (const sp of node.spreadProps) {
    em.err.warn(null, `spread props are not supported in component calls: ...${sp.raw}`);
  }
  const args = propArgs.length ? propArgs.join(', ') : '';
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const out: string[] = [];
  const withoutProps = em.componentsWithoutProps?.has(node.componentName) ?? false;
  if (withoutProps) {
    out.push(pad + `${node.componentName}()`);
  } else {
    out.push(pad + `${node.componentName}(props = ${node.componentName}Props(${args}))`);
  }
  if (node.children.length > 0) {
    out.push(padIn + '{');
    for (const child of node.children) {
      out.push(...emitChild(child, em, level + 2));
    }
    out.push(padIn + '}');
  }
  return out.join('\n');
}

function emitElement(node: StaticNode, em: Emitter, level: number): string[] {
  const info = elementInfo(node.tag);
  const classes = em.classList(node);
  const attrs = em.dynamicAttrs(node);
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);

  if (info.kind === 'text') {
    const content = textContent(node.children, em);
    const nonText = node.children.filter(
      (c) => !(c instanceof TextNode) && !(c instanceof DynamicBinding)
    );
    if (nonText.length === 0) {
      return splitLines(makeTextCall(content, classes, level));
    }
    const lines: string[] = [];
    const modifier = resolveModifier(classes);
    if (modifier) {
      lines.push(pad + `Column(modifier = ${modifier}) {`);
    } else {
      lines.push(pad + 'Column {');
    }
    if (content !== '""') lines.push(`${padIn}Text(${content})`);
    for (const child of nonText) {
      lines.push(...emitChild(child, em, level + 1));
    }
    lines.push(pad + '}');
    return lines;
  }

  if (info.kind === 'button') {
    const onClick = attrs.get('onClick');
    const onClickKt = onClick ? em.j2k.expr(onClick).trimStart() : '{}';
    const childText = textContent(node.children, em);
    const lines: string[] = [];
    lines.push(pad + 'Button(');
    lines.push(`${padIn}onClick = ${onClickKt},`);
    const modifier = resolveModifier(classes);
    if (modifier) lines.push(`${padIn}modifier = ${modifier},`);
    lines.push(pad + ') {');
    if (childText !== '""') lines.push(`${padIn}Text(${childText})`);
    lines.push(pad + '}');
    return lines;
  }

  if (info.kind === 'input') {
    const type = em.staticAttr(node, 'type');
    const bindVar = em.bindRefVar(node);
    const valueExpr = attrs.get('value');
    const checkedExpr = attrs.get('checked');
    const modifier = resolveModifier(classes);
    const modLine = modifier ? `${padIn}modifier = ${modifier},` : '';
    const lines: string[] = [];
    if (type === 'checkbox' || type === 'radio') {
      const checked = bindVar ? `${bindVar}.value` : checkedExpr ? em.j2k.expr(checkedExpr) : 'false';
      const onChange = bindVar ? `{ ${bindVar}.value = it }` : '{}';
      lines.push(pad + 'Checkbox(');
      lines.push(`${padIn}checked = ${checked},`);
      lines.push(`${padIn}onCheckedChange = ${onChange},`);
      if (modLine) lines.push(modLine);
      lines.push(pad + ')');
      return lines;
    }
    const value = bindVar ? `${bindVar}.value` : valueExpr ? em.j2k.expr(valueExpr) : '""';
    const onValueChange = bindVar ? `{ ${bindVar}.value = it }` : '{}';
    const placeholder = em.staticAttr(node, 'placeholder');
    const lines2: string[] = [];
    lines2.push(pad + 'OutlinedTextField(');
    lines2.push(`${padIn}value = ${value},`);
    lines2.push(`${padIn}onValueChange = ${onValueChange},`);
    if (node.tag === 'textarea') lines2.push(`${padIn}singleLine = false,`);
    if (modLine) lines2.push(modLine);
    if (placeholder) lines2.push(`${padIn}placeholder = { Text(${em.ktString(placeholder)}) },`);
    lines2.push(pad + ')');
    return lines2;
  }

  const axis = elementAxis(classes);
  const layout = layoutArgs(classes, axis);
  const layoutArgsLines: string[] = [];
  if (layout.horizontalAlignment) layoutArgsLines.push(`${padIn}horizontalAlignment = ${layout.horizontalAlignment},`);
  if (layout.verticalAlignment) layoutArgsLines.push(`${padIn}verticalAlignment = ${layout.verticalAlignment},`);
  if (layout.horizontalArrangement) layoutArgsLines.push(`${padIn}horizontalArrangement = ${layout.horizontalArrangement},`);
  if (layout.verticalArrangement) layoutArgsLines.push(`${padIn}verticalArrangement = ${layout.verticalArrangement},`);

  const composable = axis === 'row' ? 'Row' : 'Column';
  const argLines: string[] = [];
  const modifier = resolveModifier(classes);
  if (modifier) argLines.push(`${padIn}modifier = ${modifier},`);
  argLines.push(...layoutArgsLines);

  const lines: string[] = [];
  const childrenLines: string[] = [];
  for (const child of node.children) {
    childrenLines.push(...emitChild(child, em, level + 1));
  }

  if (argLines.length === 0 && childrenLines.length === 0) {
    lines.push(pad + `${composable} {}`);
    return lines;
  }
  if (argLines.length === 0) {
    lines.push(pad + `${composable} {`);
    lines.push(...childrenLines);
    lines.push(pad + '}');
    return lines;
  }
  lines.push(pad + `${composable}(`);
  lines.push(...argLines);
  lines.push(pad + ') {');
  lines.push(...childrenLines);
  lines.push(pad + '}');
  return lines;
}

function emitChild(child: IRNode, em: Emitter, level: number): string[] {
  const pad = '\t'.repeat(level);

  if (child instanceof StaticNode) {
    return emitElement(child, em, level);
  }
  if (child instanceof TextNode) {
    return splitLines(makeTextCall(em.ktString(child.value), [], level));
  }
  if (child instanceof DynamicBinding) {
    if (child.kind === 'text') return splitLines(makeTextCall(dynamicText(em.exprOf(child.expression)), [], level));
    return [];
  }
  if (child instanceof OpaqueDynamicRegion) {
    const cond = em.exprOf(child.condition);
    const out: string[] = [];
    out.push(pad + `if (truthy(${cond})) {`);
    for (const n of child.consequentNodes) out.push(...emitChild(n, em, level + 1));
    out.push(pad + `} else {`);
    for (const n of child.alternateNodes) out.push(...emitChild(n, em, level + 1));
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof MapRegion) {
    const arrExpr = em.exprOf(child.expression);
    const item = child.itemVariable;
    const keyExpr = child.keyExpr ? em.exprOf(child.keyExpr) : null;
    const out: string[] = [];
    out.push(pad + `LazyColumn {`);
    out.push(pad + `\titems(${arrExpr}${keyExpr ? `, key = { ${keyExpr} }` : ''}) { ${item} ->`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 2));
    out.push(pad + `\t}`);
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof ComponentCall) {
    return splitLines(componentCallLines(child, em, level));
  }
  if (child instanceof TrackDecl) {
    return splitLines(em.trackDecl(child)).map((l) => pad + l);
  }
  if (child instanceof RuntimeStatement) {
    return splitLines(em.stmtOf(child)).map((l) => pad + l);
  }
  if (child instanceof HeadBlock) {
    em.err.note('{#head} blocks are not supported in native');
    return [];
  }
  if (child instanceof ServerBlock) {
    em.err.warn(null, '{#server} blocks are not supported in native');
    return [pad + `error("server block not supported in vesk-native")`];
  }
  if (child instanceof ClientBlock) {
    return child.children.length ? emitChild(child.children[0]!, em, level) : [];
  }
  if (child instanceof SlotNode) {
    return [pad + `content()`];
  }
  if (child instanceof WhileLoop) {
    const cond = em.exprOf(child.condition);
    const out: string[] = [];
    out.push(pad + `while (truthy(${cond})) {`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1));
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof SwitchBlock) {
    const disc = em.exprOf(child.discriminant);
    const out: string[] = [];
    out.push(pad + `when (${disc}) {`);
    for (const c of child.cases) {
      const test = c.test ? em.exprOf(c.test) : null;
      out.push(pad + `\t${test === null ? 'else' : test} -> {`);
      for (const n of c.body) out.push(...emitChild(n, em, level + 2));
      out.push(pad + '\t}');
    }
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof TryCatch) {
    const catchParam = child.catchParamName ?? 'e';
    const out: string[] = [];
    out.push(pad + `try {`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1));
    out.push(pad + `} catch (${catchParam}: Exception) {`);
    for (const n of child.catchBody) out.push(...emitChild(n, em, level + 1));
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof ForLoop) {
    const init = child.init.replace(/;$/, '');
    const cond = em.exprOf(child.condition);
    const update = child.update.replace(/;$/, '');
    const out: string[] = [];
    out.push(pad + `for (${init}; ${cond}; ${update}) {`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1));
    out.push(pad + `}`);
    return out;
  }
  return [];
}

export interface CompileResult {
  kt: string;
  errors: string[];
  notes: string[];
}

function runCompile(source: string, filename: string, options: CompileOptions): CompileResult {
  const err = new KtErrors();
  const pkg = options.packageName ?? 'app';

  const ast = parse(source, { filename });
  const ir = generateIR(ast, source);
  const decls = findComponentDecls(ast as unknown as JsNode);

  const out: string[] = [];
  out.push(`package ${pkg}`, '', IMPORTS, '');

  for (const comp of ir.components) {
    const decl = decls.find((d) => d.name === comp.name);
    let propsParam = decl?.params[0] ?? null;
    if (propsParam?.type === 'Identifier' && propsParam.name === 'content') propsParam = null;
    let propsClass = '';
    let propsParamDefault = false;
    if (propsParam) {
      propsClass = generatePropsClass(comp.name, propsParam);
      if (!propsClass) {
        const names = inferPropsFromUsage((decl?.node.body as JsNode | undefined) ?? null);
        propsClass = generateInferredPropsClass(comp.name, names);
      }
      propsParamDefault = true;
    }
    if (propsClass) out.push(propsClass);

    const tracked = collectTrackedNames(comp.body);
    const em = new Emitter(err, tracked, options.componentsWithoutProps);

    const propsArg = propsClass ? `props: ${comp.name}Props${propsParamDefault ? ` = ${comp.name}Props()` : ''}` : '';
    const params = [propsArg, 'content: @Composable () -> Unit = {}'].filter(Boolean).join(', ');
    out.push('@Composable', `fun ${comp.name}(${params}) {`);

    const bodyLines: string[] = [];
    for (const node of comp.body) {
      bodyLines.push(...em.emitTopLevel(node, 1));
    }
    out.push(...bodyLines, '}', '');
  }

  return { kt: out.join('\n').trimEnd() + '\n', errors: err.errors, notes: err.notes };
}

export function compileVsk(source: string, filename: string, options: CompileOptions = {}): string {
  return runCompile(source, filename, options).kt;
}

export function compileVskResult(source: string, filename: string, options: CompileOptions = {}): CompileResult {
  return runCompile(source, filename, options);
}

export function getCompileErrors(source: string, filename: string, options: CompileOptions = {}): string[] {
  return runCompile(source, filename, options).errors;
}
