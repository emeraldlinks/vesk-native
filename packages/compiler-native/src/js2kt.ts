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

  // JS Math.* maps to the kotlin.math / kotlin.random standard library with
  // Java runtime semantics. Arguments are widened to Double like JS numbers,
  // except for the Int-overloaded helpers (abs/min/max/sign).
  private mathCall(fn: string | null, args: JsNode[]): string | null {
    if (!fn) return null;
    const a = (i: number): string => (args[i] ? this.expr(args[i]) : '');
    const d = (i: number): string => `(${a(i)}).toDouble()`;
    switch (fn) {
      case 'abs': return `kotlin.math.abs(${a(0)})`;
      case 'min': return `kotlin.math.min(${a(0)}, ${a(1)})`;
      case 'max': return `kotlin.math.max(${a(0)}, ${a(1)})`;
      case 'round': return `kotlin.math.round(${d(0)}).toInt()`;
      case 'floor': return `kotlin.math.floor(${d(0)}).toInt()`;
      case 'ceil': return `kotlin.math.ceil(${d(0)}).toInt()`;
      case 'trunc': return `kotlin.math.truncate(${d(0)}).toInt()`;
      case 'sign': return `kotlin.math.sign(${d(0)})`;
      case 'sqrt': return `kotlin.math.sqrt(${d(0)})`;
      case 'cbrt': return `kotlin.math.cbrt(${d(0)})`;
      case 'pow': return `kotlin.math.pow(${d(0)}, ${d(1)})`;
      case 'exp': return `kotlin.math.exp(${d(0)})`;
      case 'log': return `kotlin.math.ln(${d(0)})`;
      case 'log2': return `kotlin.math.log2(${d(0)})`;
      case 'log10': return `kotlin.math.log10(${d(0)})`;
      case 'hypot': return `kotlin.math.hypot(${d(0)}, ${d(1)})`;
      case 'random': return `kotlin.random.Random.nextDouble()`;
      case 'sin': return `kotlin.math.sin(${d(0)})`;
      case 'cos': return `kotlin.math.cos(${d(0)})`;
      case 'tan': return `kotlin.math.tan(${d(0)})`;
      case 'asin': return `kotlin.math.asin(${d(0)})`;
      case 'acos': return `kotlin.math.acos(${d(0)})`;
      case 'atan': return `kotlin.math.atan(${d(0)})`;
      case 'atan2': return `kotlin.math.atan2(${d(0)}, ${d(1)})`;
      default: return null;
    }
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
      case 'SequenceExpression': {
        const exprs = (node.expressions as JsNode[]) ?? [];
        return `run { ${exprs.map((e) => this.expr(e)).join('; ')} }`;
      }
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
    if (!computed && object.type === 'Identifier' && object.name === 'Math' && prop.type === 'Identifier') {
      const MATH_CONSTS: Record<string, string> = {
        PI: 'kotlin.math.PI',
        E: 'kotlin.math.E',
        Infinity: 'Double.POSITIVE_INFINITY',
        NaN: 'Double.NaN',
      };
      const c = MATH_CONSTS[(prop as { name?: string }).name ?? ''];
      if (c) return c;
    }
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
      const member = callee as unknown as { object: JsNode; property: JsNode; computed: boolean; optional: boolean };
      const method = member.property.type === 'Identifier' ? (member.property.name as string) : null;
      const receiver = this.expr(member.object);
      const first = args[0];
      const safe = member.optional ? '?.' : '.';

      if (member.object.type === 'Identifier' && member.object.name === 'Math') {
        const math = this.mathCall(method, args);
        if (math !== null) return math;
        this.err.warn(callee, `unsupported Math.${method ?? '?'}() call`);
        return `TODO(Math.${method ?? '?'})`;
      }
      if (member.object.type === 'Identifier' && member.object.name === 'console') {
        if (method === 'log' || method === 'warn' || method === 'error') {
          const parts = args.map((a) => `println(${this.expr(a)})`);
          return parts.length > 1 ? `run { ${parts.join('; ')} }` : (parts[0] ?? 'println()');
        }
        this.err.warn(callee, `unsupported console.${method ?? '?'}()`);
        return `TODO(console.${method ?? '?'})`;
      }

      const LAMBDA_METHODS: Record<string, string> = {
        map: 'map', forEach: 'forEach', filter: 'filter', flatMap: 'flatMap',
        find: 'find', findIndex: 'indexOfFirst', some: 'any', every: 'all',
        sortedBy: 'sortedBy', distinctBy: 'distinctBy',
      };
      if (method && method in LAMBDA_METHODS) {
        if (first && first.type === 'ArrowFunctionExpression') {
          return `${receiver}${safe}${LAMBDA_METHODS[method!]}${this.arrowLambda(first)}`;
        }
        if (first && first.type === 'Identifier') {
          return `${receiver}${safe}${LAMBDA_METHODS[method!]}(::${first.name})`;
        }
      }
      if (method === 'sortedWith' && first?.type === 'ArrowFunctionExpression') {
        return `${receiver}${safe}sortedWith(compareBy${this.arrowLambda(first)})`;
      }
      if (method === 'reduce' && first?.type === 'ArrowFunctionExpression' && args[1]) {
        return `${receiver}${safe}fold(${this.expr(args[1]!)})${this.arrowLambda(first)}`;
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
        return `${receiver}${safe}${ZERO_ARG_METHODS[method!]}`;
      }
      const ZERO_ARG_ONE_OPT: Record<string, string> = {
        toString: 'toString()',
      };
      if (method && method in ZERO_ARG_ONE_OPT) {
        return `${receiver}${safe}${ZERO_ARG_ONE_OPT[method!]}`;
      }

      if (method === 'join' && first) {
        return `${receiver}${safe}joinToString(${this.expr(first)})`;
      }
      if (method === 'push' && first) {
        return `${receiver}${safe}add(${this.expr(first)})`;
      }
      if ((method === 'includes' || method === 'contains') && first) {
        return `${receiver}${safe}contains(${this.expr(first)})`;
      }
      if (method === 'indexOf' && first) {
        return `${receiver}${safe}indexOf(${this.expr(first)})`;
      }
      if (method === 'lastIndexOf' && first) {
        return `${receiver}${safe}lastIndexOf(${this.expr(first)})`;
      }
      if (method === 'startsWith' && first) {
        return `${receiver}${safe}startsWith(${this.expr(first)})`;
      }
      if (method === 'endsWith' && first) {
        return `${receiver}${safe}endsWith(${this.expr(first)})`;
      }
      if (method === 'split' && first) {
        return `${receiver}${safe}split(${this.expr(first)})`;
      }
      if (method === 'concat' && first) {
        return `${receiver}${safe}plus(${this.expr(first)})`;
      }
      if (method === 'slice' && args.length >= 1) {
        const from = this.expr(args[0]!);
        const to = args[1] ? this.expr(args[1]!) : '';
        return to ? `${receiver}${safe}subList(${from}, ${to})` : `${receiver}${safe}subList(${from}, ${receiver}${safe}size)`;
      }
      if (method === 'substring' && first) {
        const start = this.expr(first);
        const end = args[1] ? this.expr(args[1]!) : '';
        return end ? `${receiver}${safe}substring(${start}, ${end})` : `${receiver}${safe}substring(${start})`;
      }
      if (method === 'replace' && first && args[1]) {
        return `${receiver}${safe}replace(${this.expr(first)}, ${this.expr(args[1]!)})`;
      }
      if (method === 'repeat' && first) {
        return `${receiver}${safe}repeat(${this.expr(first)})`;
      }
      if (method === 'padStart' && first) {
        const padChar = args[1] ? this.expr(args[1]!) : `" "`;
        return `${receiver}${safe}padStart(${this.expr(first)}, ${padChar})`;
      }
      if (method === 'padEnd' && first) {
        const padChar = args[1] ? this.expr(args[1]!) : `" "`;
        return `${receiver}${safe}padEnd(${this.expr(first)}, ${padChar})`;
      }
      if (method === 'trimStart' || method === 'trimLeft') {
        return `${receiver}${safe}trimStart()`;
      }
      if (method === 'trimEnd' || method === 'trimRight') {
        return `${receiver}${safe}trimEnd()`;
      }
      if (method === 'charAt' && first) {
        return `${receiver}${safe}get(${this.expr(first)})`;
      }
      if (method === 'charCodeAt' && first) {
        return `${receiver}${safe}get(${this.expr(first)}).code`;
      }
      if (method === 'match' && first) {
        return `${receiver}${safe}matchOrNull(${this.expr(first)})`;
      }
      if (method === 'localeCompare' && first) {
        return `${receiver}${safe}compareTo(${this.expr(first)})`;
      }
    }

    const calleeStr = this.expr(callee);
    const argsStr = args.map((a) => {
      const jsNode = a as JsNode & { type?: string; argument?: JsNode };
      if (jsNode.type === 'SpreadElement') return `*${this.expr(jsNode.argument as JsNode)}`;
      return this.expr(jsNode);
    }).join(', ');
    return `${calleeStr}(${argsStr})`;
  }

  private arrowLambda(node: JsNode): string {
    const params = (node.params as JsNode[]) ?? [];
    const body = node.body as JsNode;
    const paramsStr = params.length === 0 ? '' : `${params.map((p) => this.pattern(p)).join(', ')} -> `;
    if (body.type === 'BlockStatement') {
      const lines = this.blockLines(body, 0);
      return ` { ${paramsStr}${lines.map((l) => l.replace(/;\s*$/, '')).join('; ')} }`;
    }
    return ` { ${paramsStr}${this.expr(body)} }`;
  }

  private arrowFn(node: JsNode): string {
    return this.arrowLambda(node);
  }

  // JS `*`/`+`/`if`-expression precedence differs from Kotlin; parenthesize
  // composite operands so JS grouping survives the translation.
  private operand(n: JsNode): string {
    const s = this.expr(n);
    const kinds = ['BinaryExpression', 'LogicalExpression', 'ConditionalExpression', 'SequenceExpression'];
    return kinds.includes(n.type) ? `(${s})` : s;
  }

  private binaryExpr(node: JsNode): string {
    const op = node.operator as string;
    const left = node.left as JsNode;
    const right = node.right as JsNode;
    switch (op) {
      case '===':
      case '==': return `${this.operand(left)} == ${this.operand(right)}`;
      case '!==':
      case '!=': return `${this.operand(left)} != ${this.operand(right)}`;
      case '&&':
      case '||':
      case '??': {
        if (op === '&&') return `truthy(${this.operand(left)}) && truthy(${this.operand(right)})`;
        return `(${this.operand(left)} ?: ${this.operand(right)})`;
      }
      case '+': return `${this.operand(left)} + ${this.operand(right)}`;
      case '-': return `${this.operand(left)} - ${this.operand(right)}`;
      case '*': return `${this.operand(left)} * ${this.operand(right)}`;
      case '/': return `${this.operand(left)} / ${this.operand(right)}`;
      case '%': return `${this.operand(left)} % ${this.operand(right)}`;
      case '<': return `num(${this.operand(left)}) < num(${this.operand(right)})`;
      case '>': return `num(${this.operand(left)}) > num(${this.operand(right)})`;
      case '<=': return `num(${this.operand(left)}) <= num(${this.operand(right)})`;
      case '>=': return `num(${this.operand(left)}) >= num(${this.operand(right)})`;
      case '**': {
        this.err.warn(node, '`**` power operator maps to Math.pow in Kotlin');
        return `kotlin.math.pow((${this.operand(left)}).toDouble(), (${this.operand(right)}).toDouble())`;
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
      case '-': {
        const kinds = ['BinaryExpression', 'LogicalExpression', 'ConditionalExpression', 'SequenceExpression'];
        const inner = this.expr(arg);
        return kinds.includes(arg.type) ? `-(${inner})` : `-${inner}`;
      }
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
    const isIntLit = (n: JsNode) => n.type === 'Literal' && typeof (n.value as unknown) === 'number' && Number.isInteger(n.value as number);
    const isFloatLit = (n: JsNode) => n.type === 'Literal' && typeof (n.value as unknown) === 'number' && !Number.isInteger(n.value as number);
    let con = this.expr(consequent);
    let alt = this.expr(alternate);
    if (isFloatLit(consequent) && isIntLit(alternate)) alt = `${alt}.0`;
    else if (isIntLit(consequent) && isFloatLit(alternate)) con = `${con}.0`;
    return `if (truthy(${this.expr(test)})) ${con} else ${alt}`;
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
          out += '$' + '{' + this.expr(e) + '}';
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
    if (node.type === 'ObjectPattern') {
      const props = (node.properties as JsNode[]) ?? [];
      const parts = props.map((p) => {
        if (p.type === 'Property') {
          const key = p.key as JsNode;
          const keyStr = key.type === 'Identifier' ? this.id(key.name as string) : this.expr(key);
          const val = this.pattern(p.value as JsNode);
          return `${keyStr} = ${val}`;
        }
        if (p.type === 'RestElement') {
          return `*${this.pattern(p.argument as JsNode)}`;
        }
        return '?';
      });
      return `(${parts.join(', ')})`;
    }
    if (node.type === 'ArrayPattern') {
      const elems = (node.elements as (JsNode | null)[]) ?? [];
      const parts = elems.map((e) => (e === null ? '_' : this.pattern(e)));
      return `(${parts.join(', ')})`;
    }
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
      case 'SwitchStatement': {
        const disc = this.expr(node.discriminant as JsNode);
        const cases = (node.cases as JsNode[]) ?? [];
        const lines: string[] = [];
        lines.push(`when (${disc}) {`);
        for (const c of cases) {
          const test = c.test ? this.expr(c.test as JsNode) : 'else';
          lines.push(`\t${test} -> {`);
          for (const s of (c.consequent as JsNode[]) ?? []) {
            lines.push(`\t\t${this.stmt(s)}`);
          }
          lines.push('\t}');
        }
        lines.push('}');
        return lines.join('\n');
      }
      case 'TryStatement': {
        const body = this.blockLines(node.block as JsNode, 1).join('\n');
        const catchClause = node.handler as JsNode | null;
        const catchLines = catchClause ? this.blockLines(catchClause.body as JsNode, 1).join('\n') : '';
        const out = [`try {`, body, '}'];
        if (catchClause) {
          const param = (catchClause.param as JsNode | null);
          const paramStr = param ? this.pattern(param) : 'e';
          out.push(`catch (${paramStr}: Exception) {`);
          out.push(catchLines);
          out.push('}');
        }
        return out.join('\n');
      }
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
