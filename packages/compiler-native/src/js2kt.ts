export interface JsNode {
  type: string;
  [k: string]: unknown;
}

const KOTLIN_KEYWORDS = new Set([
  'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if',
  'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this',
  'throw', 'true', 'try', 'typealias', 'typeof', 'val', 'var', 'when', 'while',
  'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally',
  'get', 'import', 'init', 'param', 'property', 'receiver', 'set', 'setparam',
  'where', 'actual', 'abstract', 'annotation', 'companion', 'const', 'crossinline',
  'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner',
  'internal', 'lateinit', 'noinline', 'open', 'operator', 'out', 'override',
  'private', 'protected', 'public', 'reified', 'sealed', 'suspend', 'tailrec',
  'vararg',
]);

function escapeKtString(value: string): string {
  let out = '';
  for (const ch of value) {
    switch (ch) {
      case '"': out += '\\"'; break;
      case '\\': out += '\\\\'; break;
      case '\n': out += '\\n'; break;
      case '\t': out += '\\t'; break;
      case '\r': out += '\\r'; break;
      case '$': out += "${'$'}"; break;
      default: out += ch;
    }
  }
  return out;
}

function ident(name: string): string {
  return KOTLIN_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

export { ident as ktIdent };

export class KtErrors {
  errors: string[] = [];
  notes: string[] = [];
  warn(node: JsNode | null, message: string): void {
    const nodeType = node ? node.type : '?';
    this.errors.push(`${message} (in ${nodeType})`);
  }
  note(message: string): void {
    this.notes.push(message);
  }
}

export class Js2Kt {
  err: KtErrors;

  constructor(err: KtErrors) {
    this.err = err;
  }

  private id(name: string): string {
    return ident(name);
  }

  ktString(value: string): string {
    return `"${escapeKtString(value)}"`;
  }

  private unknown(node: JsNode): string {
    this.err.warn(node, `unsupported expression node type: ${node.type}`);
    return `TODO(${node.type})`;
  }

  expr(node: JsNode): string {
    switch (node.type) {
      case 'Identifier': {
        const name = node.name as string;
        return this.id(name);
      }
      case 'Literal': {
        const value = node.value as string | number | boolean | null;
        if (value === null) return 'null';
        if (typeof value === 'string') return this.ktString(value);
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'number') return String(value);
        return this.unknown(node);
      }
      case 'MemberExpression':
        return this.memberExpr(node);
      case 'CallExpression':
        return this.callExpr(node);
      case 'NewExpression': {
        const callee = node.callee as JsNode;
        if (callee.type === 'Identifier' && callee.name === 'Error') {
          const args = (node.arguments as JsNode[]) ?? [];
          const argStrs = args.map((a) => {
            if (a.type === 'Literal' && typeof (a.value as unknown) === 'string') return this.expr(a);
            return `(${this.expr(a)})?.toString()`;
          });
          return `Exception(${argStrs.join(', ')})`;
        }
        return this.callExpr({ ...node, type: 'CallExpression' });
      }
      case 'BinaryExpression':
      case 'LogicalExpression':
        return this.binaryExpr(node);
      case 'UnaryExpression':
        return this.unaryExpr(node);
      case 'UpdateExpression':
        return this.updateExpr(node);
      case 'AssignmentExpression':
        return this.assignExpr(node);
      case 'ConditionalExpression':
        return this.conditionalExpr(node);
      case 'ArrowFunctionExpression':
        return this.arrowFn(node);
      case 'FunctionExpression':
        return this.arrowFn(node);
      case 'TemplateLiteral':
        return this.templateLiteral(node);
      case 'ArrayExpression':
        return this.arrayExpr(node);
      case 'ObjectExpression':
        return this.objectExpr(node);
      case 'SequenceExpression':
        this.err.warn(node, 'sequence expressions are not supported yet');
        return `TODO(Sequence)`;
      case 'ChainExpression':
        return this.expr(node.expression as JsNode);
      case 'TSAsExpression':
      case 'TSTypeAssertion':
      case 'TSNonNullExpression':
      case 'TSSatisfiesExpression':
        return this.expr(node.expression as JsNode);
      case 'ParenthesizedExpression':
        return this.expr(node.expression as JsNode);
      default:
        return this.unknown(node);
    }
  }

  private memberExpr(node: JsNode): string {
    const object = node.object as JsNode;
    const prop = node.property as JsNode;
    const computed = node.computed as boolean;
    const optional = node.optional as boolean;
    const obj = this.expr(object);
    if (computed) {
      return optional ? `${obj}?.get(${this.expr(prop)})` : `${obj}[${this.expr(prop)}]`;
    }
    return `${obj}${optional ? '?.' : '.'}${this.id(prop.type === 'Identifier' ? (prop.name as string) : this.expr(prop))}`;
  }

  private callExpr(node: JsNode): string {
    const callee = node.callee as JsNode;
    const args = (node.arguments as JsNode[]) ?? [];

    if (callee.type === 'Identifier') {
      const name = callee.name as string;
      if (name === 'get' && args.length === 1) {
        const arg = args[0];
        if (arg) return `${this.expr(arg)}.value`;
      }
      if (name === 'set' && args.length === 2) {
        const [a0, a1] = args;
        if (a0 && a1) return `${this.expr(a0)}.value = ${this.expr(a1)}`;
      }
    }

    if (callee.type === 'MemberExpression') {
      const member = callee as unknown as { object: JsNode; property: JsNode; computed: boolean };
      const method = member.property.type === 'Identifier' ? (member.property.name as string) : null;
      const receiver = this.expr(member.object);
      const first = args[0];

      const LAMBDA_METHODS: Record<string, string> = {
        map: 'map', forEach: 'forEach', filter: 'filter', flatMap: 'flatMap',
        find: 'find', findIndex: 'indexOfFirst', some: 'any', every: 'all',
        sortedBy: 'sortedBy', distinctBy: 'distinctBy',
      };
      if (method && method in LAMBDA_METHODS) {
        if (first && first.type === 'ArrowFunctionExpression') {
          return `${receiver}.${LAMBDA_METHODS[method!]}${this.arrowLambda(first)}`;
        }
        if (first && first.type === 'Identifier') {
          return `${receiver}.${LAMBDA_METHODS[method!]}(::${first.name})`;
        }
      }
      if (method === 'sortedWith' && first?.type === 'ArrowFunctionExpression') {
        return `${receiver}.sortedWith(compareBy${this.arrowLambda(first)})`;
      }
      if (method === 'reduce' && first?.type === 'ArrowFunctionExpression' && args[1]) {
        return `${receiver}.fold(${this.expr(args[1]!)})${this.arrowLambda(first)}`;
      }

      const ZERO_ARG_METHODS: Record<string, string> = {
        join: 'joinToString()',
        reverse: 'reversed()',
        toUpperCase: 'uppercase()',
        toLowerCase: 'lowercase()',
        trim: 'trim()',
        sort: 'sorted()',
        pop: 'removeLast()',
        shift: 'removeFirst()',
      };
      if (method && method in ZERO_ARG_METHODS && args.length === 0) {
        return `${receiver}.${ZERO_ARG_METHODS[method!]}`;
      }
      const ZERO_ARG_ONE_OPT: Record<string, string> = {
        toString: 'toString()',
      };
      if (method && method in ZERO_ARG_ONE_OPT) {
        return `${receiver}.${ZERO_ARG_ONE_OPT[method!]}`;
      }

      if (method === 'join' && first) {
        return `${receiver}.joinToString(${this.expr(first)})`;
      }
      if (method === 'push' && first) {
        return `${receiver}.add(${this.expr(first)})`;
      }
      if ((method === 'includes' || method === 'contains') && first) {
        return `${receiver}.contains(${this.expr(first)})`;
      }
      if (method === 'indexOf' && first) {
        return `${receiver}.indexOf(${this.expr(first)})`;
      }
      if (method === 'startsWith' && first) {
        return `${receiver}.startsWith(${this.expr(first)})`;
      }
      if (method === 'endsWith' && first) {
        return `${receiver}.endsWith(${this.expr(first)})`;
      }
      if (method === 'split' && first) {
        return `${receiver}.split(${this.expr(first)})`;
      }
      if (method === 'concat' && first) {
        return `${receiver} + ${this.expr(first)}`;
      }
      if (method === 'slice' && args.length >= 1) {
        const from = this.expr(args[0]!);
        const to = args[1] ? this.expr(args[1]!) : '';
        return to ? `${receiver}.subList(${from}, ${to})` : `${receiver}.subList(${from}, ${receiver}.size)`;
      }
    }

    const calleeStr = this.expr(callee);
    const argsStr = args.map((a) => (a as JsNode & { type?: string }).type === 'SpreadElement' ? `*${this.expr(a)}` : this.expr(a)).join(', ');
    return `${calleeStr}(${argsStr})`;
  }

  private arrowLambda(node: JsNode): string {
    const params = (node.params as JsNode[]) ?? [];
    const body = node.body as JsNode;
    const paramsStr = params.length === 0 ? '' : `${params.map((p) => this.pattern(p)).join(', ')} -> `;
    if (body.type === 'BlockStatement') {
      const lines = this.blockLines(body, 0);
      return ` { ${paramsStr}${lines.join('; ')} }`;
    }
    return ` { ${paramsStr}${this.expr(body)} }`;
  }

  private arrowFn(node: JsNode): string {
    return this.arrowLambda(node);
  }

  private binaryExpr(node: JsNode): string {
    const op = node.operator as string;
    const left = node.left as JsNode;
    const right = node.right as JsNode;
    switch (op) {
      case '===':
      case '==': return `${this.expr(left)} == ${this.expr(right)}`;
      case '!==':
      case '!=': return `${this.expr(left)} != ${this.expr(right)}`;
      case '&&':
      case '||': {
        const isString = (n: JsNode) => n.type === 'Literal' && typeof (n.value as unknown) === 'string';
        if (op === '||' && (isString(left) || isString(right))) {
          const l = this.expr(left);
          return `(if (truthy(${l})) ${l} else ${this.expr(right)})`;
        }
        return `truthy(${this.expr(left)}) ${op} truthy(${this.expr(right)})`;
      }
      case '+': return `${this.expr(left)} + ${this.expr(right)}`;
      case '-': return `${this.expr(left)} - ${this.expr(right)}`;
      case '*': return `${this.expr(left)} * ${this.expr(right)}`;
      case '/': return `${this.expr(left)} / ${this.expr(right)}`;
      case '%': return `${this.expr(left)} % ${this.expr(right)}`;
      case '<': return `num(${this.expr(left)}) < num(${this.expr(right)})`;
      case '>': return `num(${this.expr(left)}) > num(${this.expr(right)})`;
      case '<=': return `num(${this.expr(left)}) <= num(${this.expr(right)})`;
      case '>=': return `num(${this.expr(left)}) >= num(${this.expr(right)})`;
      case '??': return `${this.expr(left)} ?: ${this.expr(right)}`;
      case '**': {
        this.err.warn(node, '`**` power operator maps to Math.pow in Kotlin');
        return `Math.pow(${this.expr(left)}, ${this.expr(right)})`;
      }
      default:
        this.err.warn(node, `unsupported binary operator: ${op}`);
        return `TODO(${op})`;
    }
  }

  private unaryExpr(node: JsNode): string {
    const op = node.operator as string;
    const arg = node.argument as JsNode;
    switch (op) {
      case '!': return `!${this.expr(arg)}`;
      case '-': return `-${this.expr(arg)}`;
      case '+': return this.expr(arg);
      case 'typeof':
        this.err.warn(node, 'typeof is not supported in Kotlin');
        return `TODO(typeof)`;
      default:
        this.err.warn(node, `unsupported unary operator: ${op}`);
        return `TODO(${op})`;
    }
  }

  private updateExpr(node: JsNode): string {
    const arg = node.argument as JsNode;
    const op = node.operator as string;
    return `${this.expr(arg)} ${op === '++' ? '++' : '--'}`;
  }

  private assignExpr(node: JsNode): string {
    const left = node.left as JsNode;
    const right = node.right as JsNode;
    const op = node.operator as string;
    if (op === '??=') return `${this.expr(left)} = ${this.expr(left)} ?: ${this.expr(right)}`;
    if (op === '||=') return `${this.expr(left)} = ${this.expr(left)} || ${this.expr(right)}`;
    if (op === '&&=') return `${this.expr(left)} = ${this.expr(left)} && ${this.expr(right)}`;
    const opKt = op === '=' ? '' : ` ${op.slice(0, -1)}`;
    return `${this.expr(left)}${opKt}= ${this.expr(right)}`;
  }

  private conditionalExpr(node: JsNode): string {
    const test = node.test as JsNode;
    const consequent = node.consequent as JsNode;
    const alternate = node.alternate as JsNode;
    return `if (truthy(${this.expr(test)})) ${this.expr(consequent)} else ${this.expr(alternate)}`;
  }

  private templateLiteral(node: JsNode): string {
    const quasis = node.quasis as JsNode[];
    const expressions = node.expressions as JsNode[];
    let out = '"';
    for (let i = 0; i < quasis.length; i++) {
      const quasi = quasis[i] as { value?: { cooked?: string | null; raw?: string } };
      out += escapeKtString(quasi.value?.cooked ?? '');
      if (i < expressions.length) {
        const e = expressions[i];
        if (!e) break;
        if (e.type === 'Identifier') {
          out += `$${e.name}`;
        } else {
          out += `\${${this.expr(e)}}`;
        }
      }
    }
    return `${out}"`;
  }

  private arrayExpr(node: JsNode): string {
    const elements = (node.elements as (JsNode | null)[]) ?? [];
    const parts = elements.map((e) => (e === null ? 'null' : this.expr(e)));
    return `listOf(${parts.join(', ')})`;
  }

  private objectExpr(node: JsNode): string {
    const props = (node.properties as JsNode[]) ?? [];
    const entries = props.map((p) => {
      if (p.type === 'Property') {
        const key = p.key as JsNode;
        const keyStr = key.type === 'Identifier' ? (key.name as string) : key.type === 'Literal' ? String((key.value as string | number) ?? '') : this.expr(key);
        return `${this.ktString(keyStr)} to ${this.expr(p.value as JsNode)}`;
      }
      if (p.type === 'SpreadElement') {
        return `*${this.expr(p.argument as JsNode)}`;
      }
      this.err.warn(p, `unsupported object property: ${p.type}`);
      return `TODO(ObjectProp)`;
    });
    return entries.length === 0 ? `emptyMap<String, Any>()` : `mapOf(${entries.join(', ')})`;
  }

  private pattern(node: JsNode): string {
    if (node.type === 'Identifier') return this.id(node.name as string);
    if (node.type === 'RestElement') {
      const arg = node.argument as JsNode;
      if (arg.type === 'Identifier') return `*${this.id(arg.name as string)}`;
      return this.pattern(arg);
    }
    if (node.type === 'AssignmentPattern') return `${this.pattern(node.left as JsNode)} = ${this.expr(node.right as JsNode)}`;
    this.err.warn(node, `unsupported parameter pattern: ${node.type}`);
    return `TODO(Pattern)`;
  }

  private blockLines(node: JsNode, indentLevel: number): string[] {
    const pad = '\t'.repeat(indentLevel);
    const lines: string[] = [];
    for (const stmt of (node.body as JsNode[]) ?? []) {
      const out = this.stmt(stmt);
      for (const l of out.split('\n')) lines.push(`${pad}${l}`);
    }
    return lines;
  }

  stmt(node: JsNode): string {
    switch (node.type) {
      case 'ExpressionStatement':
        return `${this.expr(node.expression as JsNode)};`;
      case 'VariableDeclaration': {
        const kind = node.kind as string;
        const ktKind = kind === 'const' ? 'val' : 'var';
        const decls = (node.declarations as JsNode[]) ?? [];
        return decls
          .map((d) => {
            const id = d.id as JsNode;
            const init = d.init ? ` = ${this.expr(d.init as JsNode)}` : '';
            return `${ktKind} ${this.pattern(id)}${init};`;
          })
          .join('\n');
      }
      case 'ReturnStatement': {
        const arg = node.argument as JsNode | null;
        return arg ? `return ${this.expr(arg)};` : `return;`;
      }
      case 'BlockStatement': {
        const inner = this.blockLines(node, 1);
        return `{\n${inner.join('\n')}\n}`;
      }
      case 'IfStatement': {
        const test = node.test as JsNode;
        const consequent = node.consequent as JsNode;
        const alternate = node.alternate as JsNode | null;
        const cons = this.stmt(consequent);
        const alt = alternate ? ` else ${this.stmt(alternate)}` : '';
        return `if (truthy(${this.expr(test)})) ${cons}${alt}`;
      }
      case 'WhileStatement': {
        const test = node.test as JsNode;
        const body = node.body as JsNode;
        return `while (truthy(${this.expr(test)})) ${this.stmt(body)}`;
      }
      case 'ForStatement': {
        const init = node.init as JsNode | null;
        const test = node.test as JsNode | null;
        const update = node.update as JsNode | null;
        const body = node.body as JsNode;
        const initStr = init ? this.stmt(init).replace(/;$/, '') : '';
        const testStr = test ? `truthy(${this.expr(test)})` : '';
        const updateStr = update ? this.expr(update) : '';
        return `for (${initStr}; ${testStr}; ${updateStr}) ${this.stmt(body)}`;
      }
      case 'ForInStatement':
      case 'ForOfStatement': {
        const left = node.left as JsNode;
        const right = node.right as JsNode;
        const body = node.body as JsNode;
        return `for (${this.pattern(left)} in ${this.expr(right)}) ${this.stmt(body)}`;
      }
      case 'FunctionDeclaration': {
        const id = node.id as JsNode | null;
        const name = id ? this.id(id.name as string) : 'anon';
        const params = (node.params as JsNode[]) ?? [];
        const paramsStr = params.map((p) => this.pattern(p)).join(', ');
        const body = node.body as JsNode;
        const lines = this.blockLines(body, 1);
        return `fun ${name}(${paramsStr}) {\n${lines.join('\n')}\n}`;
      }
      case 'ThrowStatement': {
        const arg = node.argument as JsNode;
        return `throw ${this.expr(arg)};`;
      }
      case 'EmptyStatement':
        return '';
      case 'LabeledStatement':
        return this.stmt(node.body as JsNode);
      case 'DebuggerStatement':
        return '';
      case 'BreakStatement':
        return 'break;';
      case 'ContinueStatement':
        return 'continue;';
      default:
        this.err.warn(node, `unsupported statement node type: ${node.type}`);
        return `TODO(${node.type})`;
    }
  }

  program(body: JsNode[]): string {
    return body.map((n) => this.stmt(n)).join('\n');
  }
}
