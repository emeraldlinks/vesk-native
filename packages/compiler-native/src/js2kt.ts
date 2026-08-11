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
  private anonCount = 0;
  private retLabels: (string | undefined)[] = [];
  private brkLabels: (string | undefined)[] = [];
  private contLabels: (string | undefined)[] = [];

  constructor(err: KtErrors) {
    this.err = err;
  }

  private id(name: string): string {
    return ident(name);
  }

  private uid(prefix: string): string {
    return `${prefix}${this.anonCount++}`;
  }

  ktString(value: string): string {
    return `"${escapeKtString(value)}"`;
  }

  private unknown(node: JsNode): string {
    this.err.warn(node, `cannot translate expression node type ${node.type} to Kotlin`);
    return `error("vesk: unsupported expression node ${node.type}")`;
  }

  private withLabels<T>(ret: string | undefined, brk: string | undefined, cont: string | undefined, fn: () => T): T {
    this.retLabels.push(ret);
    this.brkLabels.push(brk);
    this.contLabels.push(cont);
    try {
      return fn();
    } finally {
      this.retLabels.pop();
      this.brkLabels.pop();
      this.contLabels.pop();
    }
  }

  // JS Math.* maps to the kotlin.math / kotlin.random standard library with
  // Java runtime semantics.
  private mathCall(fn: string | null, args: JsNode[]): string | null {
    if (!fn) return null;
    const a = (i: number): string => (args[i] ? this.expr(args[i]) : '');
    const d = (i: number): string => `(${a(i)}).toDouble()`;
    const math2 = (name: string): string | null => {
      if (args.length === 0) return name === 'kotlin.math.max' ? 'Double.NEGATIVE_INFINITY' : 'Double.POSITIVE_INFINITY';
      if (args.length === 1) return `${name}(num(${a(0)}), num(${a(0)}))`;
      let acc = `${name}(${a(0)}, ${a(1)})`;
      for (let i = 2; i < args.length; i++) acc = `${name}(${acc}, ${a(i)})`;
      return acc;
    };
    switch (fn) {
      case 'abs': return `kotlin.math.abs(${a(0)})`;
      case 'min': return math2('kotlin.math.min');
      case 'max': return math2('kotlin.math.max');
      case 'round': return `kotlin.math.round(${d(0)}).toInt()`;
      case 'floor': return `kotlin.math.floor(${d(0)}).toInt()`;
      case 'ceil': return `kotlin.math.ceil(${d(0)}).toInt()`;
      case 'trunc': return `kotlin.math.truncate(${d(0)}).toInt()`;
      case 'sign': return `kotlin.math.sign(${d(0)})`;
      case 'sqrt': return `kotlin.math.sqrt(${d(0)})`;
      case 'cbrt': return `kotlin.math.cbrt(${d(0)})`;
      case 'pow': return `kotlin.math.pow(${d(0)}, ${d(1)})`;
      case 'exp': return `kotlin.math.exp(${d(0)})`;
      case 'expm1': return `kotlin.math.expm1(${d(0)})`;
      case 'log': return `kotlin.math.ln(${d(0)})`;
      case 'log1p': return `kotlin.math.ln1p(${d(0)})`;
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
      case 'sinh': return `kotlin.math.sinh(${d(0)})`;
      case 'cosh': return `kotlin.math.cosh(${d(0)})`;
      case 'tanh': return `kotlin.math.tanh(${d(0)})`;
      case 'asinh': return `kotlin.math.asinh(${d(0)})`;
      case 'acosh': return `kotlin.math.acosh(${d(0)})`;
      case 'atanh': return `kotlin.math.atanh(${d(0)})`;
      case 'imul': return `num(${a(0)}).toInt() * num(${a(1)}).toInt()`;
      case 'clz32': return `Integer.numberOfLeadingZeros(num(${a(0)}).toInt())`;
      case 'fround': return `num(${a(0)}).toFloat().toDouble()`;
      default: return null;
    }
  }

  private regexLiteral(pattern: string, flags: string): string {
    const options: string[] = [];
    if (flags.includes('i')) options.push('RegexOption.IGNORE_CASE');
    if (flags.includes('m')) options.push('RegexOption.MULTILINE');
    if (flags.includes('s')) options.push('RegexOption.DOT_MATCHES_ALL');
    if (flags.includes('x')) options.push('RegexOption.COMMENTS');
    if (flags.includes('g')) this.err.note('regex flag g has no native equivalent (patterns are stateless)');
    if (flags.includes('y')) this.err.note('regex flag y (sticky) has no native equivalent');
    return options.length ? `Regex(${this.ktString(pattern)}, setOf(${options.join(', ')}))` : `Regex(${this.ktString(pattern)})`;
  }

  expr(node: JsNode): string {
    switch (node.type) {
      case 'Identifier': {
        const name = node.name as string;
        return this.id(name);
      }
      case 'Literal': {
        const regex = (node as { regex?: { pattern?: string; flags?: string } }).regex;
        if (regex) return this.regexLiteral(regex.pattern ?? '', regex.flags ?? '');
        const value = node.value as string | number | boolean | null;
        if (value === null) return 'null';
        if (typeof value === 'string') return this.ktString(value);
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'number') return String(value);
        return this.unknown(node);
      }
      case 'ThisExpression':
        return 'this';
      case 'Super':
        return 'super';
      case 'MemberExpression':
        return this.memberExpr(node);
      case 'CallExpression':
        return this.callExpr(node);
      case 'NewExpression': {
        const callee = node.callee as JsNode;
        const args = (node.arguments as JsNode[]) ?? [];
        if (callee.type === 'Identifier' && callee.name === 'Error') {
          const argStrs = args.map((a) => {
            if (a.type === 'Literal' && typeof (a.value as unknown) === 'string') return this.expr(a);
            return `(${this.expr(a)})?.toString()`;
          });
          return `Exception(${argStrs.join(', ')})`;
        }
        if (callee.type === 'Identifier' && callee.name === 'RegExp') {
          const flags = args[1] as JsNode | undefined;
          if (args[0] && args[0].type === 'Literal' && typeof (args[0].value as unknown) === 'string') {
            const flagStr = flags && flags.type === 'Literal' && typeof (flags.value as unknown) === 'string' ? (flags.value as string) : '';
            if (flags && flags.type !== 'Literal') this.err.warn(callee, 'RegExp flags must be a string literal');
            return this.regexLiteral(args[0].value as string, flagStr);
          }
          const pattern = args[0] ? this.expr(args[0]) : '""';
          if (flags) this.err.warn(callee, 'RegExp flags must be a string literal');
          return `Regex(${pattern})`;
        }
        if (callee.type === 'ClassExpression') {
          const name = this.uid('__VeskAnon');
          const cls = this.classDecl({ ...callee, id: { type: 'Identifier', name } });
          return `run { ${cls}; ${name}(${args.map((a) => this.expr(a)).join(', ')}) }`;
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
      case 'FunctionExpression':
        return this.arrowLambda(node);
      case 'TemplateLiteral':
        return this.templateLiteral(node);
      case 'TaggedTemplateExpression':
        return this.taggedTemplate(node);
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
      case 'AwaitExpression':
        return `${this.operand(node.argument as JsNode)}.await()`;
      case 'YieldExpression': {
        const arg = node.argument as JsNode | null;
        if (node.delegate) {
          this.err.warn(node, 'yield* delegation is not supported');
          return `error("vesk: yield* is not supported")`;
        }
        return arg ? `yield(${this.expr(arg)})` : `yield()`;
      }
      case 'ClassExpression':
        return this.classExpr(node);
      case 'MetaProperty':
        this.err.warn(node, 'new.target has no Kotlin equivalent');
        return `error("vesk: new.target is not supported")`;
      case 'ImportExpression':
        this.err.warn(node, 'dynamic import() has no static Kotlin equivalent');
        return `error("vesk: dynamic import is not supported")`;
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
        LN2: 'kotlin.math.LN2',
        LN10: 'kotlin.math.LN10',
        LOG2E: 'kotlin.math.LOG2E',
        LOG10E: 'kotlin.math.LOG10E',
        SQRT1_2: 'kotlin.math.sqrt(0.5)',
        SQRT2: 'kotlin.math.sqrt(2.0)',
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
    const a0 = args[0];
    const a1 = args[1];

    if (callee.type === 'Identifier') {
      const name = callee.name as string;
      if (name === 'get' && args.length === 1 && a0) {
        return `${this.expr(a0)}.value`;
      }
      if (name === 'set' && args.length === 2 && a0 && a1) {
        return `${this.expr(a0)}.value = ${this.expr(a1)}`;
      }
      if (name === 'String') return args.length ? `jsString(${this.expr(a0!)})` : '""';
      if (name === 'Number') return args.length ? `num(${this.expr(a0!)})` : '0.0';
      if (name === 'Boolean') return args.length ? `truthy(${this.expr(a0!)})` : 'false';
      if (name === 'isNaN') return `jsGlobalIsNaN(${a0 ? this.expr(a0) : 'null'})`;
      if (name === 'isFinite') return `jsGlobalIsFinite(${a0 ? this.expr(a0) : 'null'})`;
      if (name === 'parseInt') {
        return args.length ? `jsParseInt(${this.expr(a0!)}${a1 ? `, ${this.expr(a1)}` : ''})` : '0';
      }
      if (name === 'parseFloat') return args.length ? `jsParseFloat(${this.expr(a0!)})` : '0.0';
      if (name === 'encodeURIComponent') return `jsEncodeURIComponent(${this.expr(a0 ?? ({ type: 'Literal', value: '' } as JsNode))})`;
      if (name === 'decodeURIComponent') return `jsDecodeURIComponent(${this.expr(a0 ?? ({ type: 'Literal', value: '' } as JsNode))})`;
      if (name === 'encodeURI') return `jsEncodeURI(${this.expr(a0 ?? ({ type: 'Literal', value: '' } as JsNode))})`;
      if (name === 'decodeURI') return `jsDecodeURI(${this.expr(a0 ?? ({ type: 'Literal', value: '' } as JsNode))})`;
      if (name === 'setTimeout' || name === 'setInterval') {
        const fn = a0 ?? ({ type: 'ArrowFunctionExpression', params: [], body: { type: 'BlockStatement', body: [] } } as JsNode);
        return `VeskTimers.${name}(${this.expr(fn)}, ${a1 ? this.expr(a1) : '0'})`;
      }
      if (name === 'clearTimeout' || name === 'clearInterval') {
        return `VeskTimers.clearTimeout(${this.expr(a0 ?? ({ type: 'Literal', value: 0 } as JsNode))})`;
      }
    }

    if (callee.type === 'MemberExpression') {
      const member = callee as unknown as { object: JsNode; property: JsNode; computed: boolean; optional: boolean };
      const method = member.property.type === 'Identifier' ? (member.property.name as string) : null;
      const receiver = this.expr(member.object);
      const safe = member.optional ? '?.' : '.';

      if (member.object.type === 'Identifier') {
        const objName = member.object.name as string;
        if (objName === 'Math') {
          const math = this.mathCall(method, args);
          if (math !== null) return math;
          this.err.warn(callee, `unsupported Math.${method ?? '?'}() call`);
          return `error("vesk: unsupported Math.${method ?? '?'}()")`;
        }
        if (objName === 'console') {
          if (method === 'log' || method === 'warn' || method === 'error' || method === 'info' || method === 'debug') {
            const parts = args.map((a) => `println(${this.expr(a)})`);
            return parts.length > 1 ? `run { ${parts.join('; ')} }` : (parts[0] ?? 'println()');
          }
          if (method === 'assert') {
            return `if (!truthy(${a0 ? this.expr(a0) : 'false'})) println(${a1 ? this.expr(a1) : this.ktString('Assertion failed')})`;
          }
          if (method === 'trace') {
            return `println(Thread.currentThread().stackTrace.joinToString(${this.ktString('\n')}))`;
          }
          if (method === 'time') return `JsConsole.time(${a0 ? this.expr(a0) : this.ktString('')})`;
          if (method === 'timeEnd') return `JsConsole.timeEnd(${a0 ? this.expr(a0) : this.ktString('')})`;
          if (method === 'count') return `JsConsole.count(${a0 ? this.expr(a0) : this.ktString('')})`;
          if (method === 'countReset') return `JsConsole.countReset(${a0 ? this.expr(a0) : this.ktString('')})`;
          if (method === 'group' || method === 'groupCollapsed') return a0 ? `println(${this.expr(a0)})` : 'println()';
          if (method === 'groupEnd') return 'println()';
          if (method === 'table') return `println(${a0 ? this.expr(a0) : ''})`;
          if (method === 'clear') return 'println()';
          this.err.warn(callee, `unsupported console.${method ?? '?'}()`);
          return `error("vesk: unsupported console.${method ?? '?'}()")`;
        }
        if (objName === 'Object') {
          if (method === 'keys' && a0) return `(${this.expr(a0)} as Map<*, *>).keys.toList()`;
          if (method === 'values' && a0) return `(${this.expr(a0)} as Map<*, *>).values.toList()`;
          if (method === 'entries' && a0) return `(${this.expr(a0)} as Map<*, *>).entries.toList()`;
          if (method === 'assign' && a0) return `(${this.expr(a0)} as Map<*, *>) + (${a1 ? this.expr(a1) : 'emptyMap<Any, Any>()'} as Map<*, *>)`;
        }
        if (objName === 'Array') {
          if (method === 'isArray' && a0) return `(${this.expr(a0)}) is List<*>`;
        }
        if (objName === 'JSON') {
          if (method === 'stringify') return `jsStringify(${a0 ? this.expr(a0) : 'null'})`;
          if (method === 'parse') return `jsParseJson(${a0 ? this.expr(a0) : 'null'})`;
        }
        if (objName === 'Number') {
          if (method === 'isNaN' && a0) return `jsStrictIsNaN(${this.expr(a0)})`;
          if (method === 'isFinite' && a0) return `jsStrictIsFinite(${this.expr(a0)})`;
          if (method === 'isInteger' && a0) return `jsIsInteger(${this.expr(a0)})`;
          if (method === 'parseInt') return `jsParseInt(${this.expr(a0!)}${a1 ? `, ${this.expr(a1)}` : ''})`;
          if (method === 'parseFloat' && a0) return `jsParseFloat(${this.expr(a0)})`;
        }
      }

      const isRegexLit = (n: JsNode | undefined): n is JsNode & { regex: { pattern: string; flags: string } } =>
        !!n && n.type === 'Literal' && !!(n as { regex?: unknown }).regex;

      if (method === 'test' && a0) return `${receiver}${safe}containsMatchIn(${this.expr(a0)})`;
      if (method === 'exec' && a0) return `jsRegexExec(${receiver}, ${this.expr(a0)})`;
      if (method === 'search' && a0) return `jsRegexSearch(${this.expr(a0)}, ${receiver})`;
      if (method === 'match' && a0) return `jsRegexExec(${this.expr(a0)}, ${receiver})`;
      if (method === 'split' && a0 && isRegexLit(a0)) {
        return `${this.regexLiteral(a0.regex.pattern, a0.regex.flags)}.split(${receiver})`;
      }
      if (method === 'replace' && a0 && a1 && isRegexLit(a0)) {
        return `${this.regexLiteral(a0.regex.pattern, a0.regex.flags)}.replace(${receiver}, ${this.expr(a1)})`;
      }

      const LAMBDA_METHODS: Record<string, string> = {
        map: 'map', forEach: 'forEach', filter: 'filter', flatMap: 'flatMap',
        find: 'find', findIndex: 'indexOfFirst', some: 'any', every: 'all',
        sortedBy: 'sortedBy', distinctBy: 'distinctBy',
      };
      if (method && method in LAMBDA_METHODS) {
        if (a0 && a0.type === 'ArrowFunctionExpression') {
          return `${receiver}${safe}${LAMBDA_METHODS[method!]}${this.arrowLambda(a0)}`;
        }
        if (a0 && a0.type === 'Identifier') {
          return `${receiver}${safe}${LAMBDA_METHODS[method!]}(::${a0.name})`;
        }
      }
      if (method === 'sortedWith' && a0?.type === 'ArrowFunctionExpression') {
        return `${receiver}${safe}sortedWith(compareBy${this.arrowLambda(a0)})`;
      }
      if (method === 'reduce' && a0?.type === 'ArrowFunctionExpression' && a1) {
        return `${receiver}${safe}fold(${this.expr(a1)})${this.arrowLambda(a0)}`;
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

      if (method === 'join' && a0) {
        return `${receiver}${safe}joinToString(${this.expr(a0)})`;
      }
      if (method === 'push' && a0) {
        return `${receiver}${safe}add(${this.expr(a0)})`;
      }
      if ((method === 'includes' || method === 'contains') && a0) {
        return `${receiver}${safe}contains(${this.expr(a0)})`;
      }
      if (method === 'indexOf' && a0) {
        return `${receiver}${safe}indexOf(${this.expr(a0)})`;
      }
      if (method === 'lastIndexOf' && a0) {
        return `${receiver}${safe}lastIndexOf(${this.expr(a0)})`;
      }
      if (method === 'startsWith' && a0) {
        return `${receiver}${safe}startsWith(${this.expr(a0)})`;
      }
      if (method === 'endsWith' && a0) {
        return `${receiver}${safe}endsWith(${this.expr(a0)})`;
      }
      if (method === 'split' && a0) {
        return `${receiver}${safe}split(${this.expr(a0)})`;
      }
      if (method === 'concat' && a0) {
        return `${receiver}${safe}plus(${this.expr(a0)})`;
      }
      if (method === 'slice' && args.length >= 1) {
        const from = this.expr(args[0]!);
        const to = args[1] ? this.expr(args[1]!) : '';
        const isStringReceiver = member.object.type === 'Literal' && typeof ((member.object as { value?: unknown }).value) === 'string';
        if (isStringReceiver) {
          return to ? `${receiver}${safe}substring(${from}, ${to})` : `${receiver}${safe}substring(${from})`;
        }
        return to ? `${receiver}${safe}subList(${from}, ${to})` : `${receiver}${safe}subList(${from}, ${receiver}${safe}size)`;
      }
      if (method === 'substring' && a0) {
        const start = this.expr(a0);
        const end = args[1] ? this.expr(args[1]!) : '';
        return end ? `${receiver}${safe}substring(${start}, ${end})` : `${receiver}${safe}substring(${start})`;
      }
      if (method === 'replace' && a0 && a1) {
        return `${receiver}${safe}replace(${this.expr(a0)}, ${this.expr(a1)})`;
      }
      if (method === 'repeat' && a0) {
        return `${receiver}${safe}repeat(${this.expr(a0)})`;
      }
      if (method === 'padStart' && a0) {
        const n = this.expr(a0);
        return a1 ? `${receiver}${safe}padStart(${n}, (${this.expr(a1)}).first())` : `${receiver}${safe}padStart(${n})`;
      }
      if (method === 'padEnd' && a0) {
        const n = this.expr(a0);
        return a1 ? `${receiver}${safe}padEnd(${n}, (${this.expr(a1)}).first())` : `${receiver}${safe}padEnd(${n})`;
      }
      if (method === 'trimStart' || method === 'trimLeft') {
        return `${receiver}${safe}trimStart()`;
      }
      if (method === 'trimEnd' || method === 'trimRight') {
        return `${receiver}${safe}trimEnd()`;
      }
      if (method === 'charAt' && a0) {
        return `${receiver}${safe}get(${this.expr(a0)})`;
      }
      if (method === 'charCodeAt' && a0) {
        return `${receiver}${safe}get(${this.expr(a0)}).code`;
      }
      if (method === 'localeCompare' && a0) {
        return `${receiver}${safe}compareTo(${this.expr(a0)})`;
      }
      if (method === 'push' && args.length > 1) {
        return `run { ${args.map((a) => `${receiver}${safe}add(${this.expr(a)})`).join('; ')}; ${receiver}${safe}size }`;
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
      const lbl = this.uid('__veskret');
      const lines = this.withLabels(lbl, undefined, undefined, () => this.blockLines(body, 0));
      const stripped = lines.map((l) => (l.endsWith(';') ? l.slice(0, -1) : l));
      return ` { ${paramsStr}run ${lbl}@ { ${stripped.join('; ')} } }`;
    }
    return ` { ${paramsStr}${this.expr(body)} }`;
  }

  // JS `*`/`+`/`if`-expression precedence differs from Kotlin; parenthesize
  // composite operands so JS grouping survives the translation.
  private operand(n: JsNode): string {
    const s = this.expr(n);
    const kinds = ['BinaryExpression', 'LogicalExpression', 'ConditionalExpression', 'SequenceExpression'];
    return kinds.includes(n.type) ? `(${s})` : s;
  }

  // Evaluates a JS operand exactly once. Identifiers and literals are pure,
  // so they can be duplicated freely; anything else is bound to a temporary
  // so side effects (or volatile reads) behave the way the browser engine
  // would.
  private evalOnce(node: JsNode, use: (value: string) => string): string {
    if (node.type === 'Identifier' || node.type === 'Literal') {
      return use(this.expr(node));
    }
    const tmp = this.uid('__vsk_v');
    return `run { val ${tmp} = ${this.expr(node)}; ${use(tmp)} }`;
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
      case '&&': return this.evalOnce(left, (l) => `if (truthy(${l})) ${this.operand(right)} else ${l}`);
      case '||': return this.evalOnce(left, (l) => `if (truthy(${l})) ${l} else ${this.operand(right)}`);
      case '??': return `(${this.operand(left)} ?: ${this.operand(right)})`;
      case '+': return `${this.operand(left)} + ${this.operand(right)}`;
      case '-': return `${this.operand(left)} - ${this.operand(right)}`;
      case '*': return `${this.operand(left)} * ${this.operand(right)}`;
      case '/': return `${this.operand(left)} / ${this.operand(right)}`;
      case '%': return `${this.operand(left)} % ${this.operand(right)}`;
      case '<': return `num(${this.operand(left)}) < num(${this.operand(right)})`;
      case '>': return `num(${this.operand(left)}) > num(${this.operand(right)})`;
      case '<=': return `num(${this.operand(left)}) <= num(${this.operand(right)})`;
      case '>=': return `num(${this.operand(left)}) >= num(${this.operand(right)})`;
      case '**': return `kotlin.math.pow((${this.operand(left)}).toDouble(), (${this.operand(right)}).toDouble())`;
      case '&': return `num(${this.operand(left)}).toInt() and num(${this.operand(right)}).toInt()`;
      case '|': return `num(${this.operand(left)}).toInt() or num(${this.operand(right)}).toInt()`;
      case '^': return `num(${this.operand(left)}).toInt() xor num(${this.operand(right)}).toInt()`;
      case '<<': return `num(${this.operand(left)}).toInt() shl num(${this.operand(right)}).toInt()`;
      case '>>': return `num(${this.operand(left)}).toInt() shr num(${this.operand(right)}).toInt()`;
      case '>>>': return `num(${this.operand(left)}).toInt() ushr num(${this.operand(right)}).toInt()`;
      case 'in': return `(${this.operand(left)}) in (${this.operand(right)})`;
      case 'instanceof': {
        const r = node.right as JsNode;
        if (r.type === 'Identifier') {
          const types: Record<string, string> = {
            Array: 'List<*>', Error: 'Exception', Date: 'java.util.Date',
            RegExp: 'Regex', Map: 'Map<*, *>', Set: 'Set<*>',
          };
          return `${this.operand(left)} is ${types[r.name as string] ?? this.id(r.name as string)}`;
        }
        this.err.warn(node, 'instanceof requires a class name on the right');
        return `error("vesk: instanceof right side must be a class name")`;
      }
      default:
        this.err.warn(node, `unsupported binary operator: ${op}`);
        return `error("vesk: unsupported binary operator ${op}")`;
    }
  }

  private unaryExpr(node: JsNode): string {
    const op = node.operator as string;
    const arg = node.argument as JsNode;
    switch (op) {
      case '!': return `!truthy(${this.expr(arg)})`;
      case '-': {
        const kinds = ['BinaryExpression', 'LogicalExpression', 'ConditionalExpression', 'SequenceExpression'];
        const inner = this.expr(arg);
        return kinds.includes(arg.type) ? `-(${inner})` : `-${inner}`;
      }
      case '+': return `num(${this.expr(arg)})`;
      case 'typeof': return `jsTypeof(${this.expr(arg)})`;
      case '~': return `num(${this.expr(arg)}).toInt().inv()`;
      case 'void': return `run { ${this.expr(arg)}; null }`;
      case 'delete': {
        const a = node.argument as JsNode;
        if (a.type === 'MemberExpression') {
          const obj = this.expr(a.object as JsNode);
          const key = a.computed
            ? this.expr(a.property as JsNode)
            : this.ktString((a.property as JsNode).type === 'Identifier' ? ((a.property as JsNode).name as string) : '');
          return `(${obj}).remove(${key})`;
        }
        this.err.warn(node, 'delete requires a property access');
        return `error("vesk: delete requires a property access")`;
      }
      default:
        this.err.warn(node, `unsupported unary operator: ${op}`);
        return `error("vesk: unsupported unary operator ${op}")`;
    }
  }

  private updateExpr(node: JsNode): string {
    const arg = node.argument as JsNode;
    const op = node.operator as string;
    return `${this.expr(arg)} ${op === '++' ? '++' : '--'}`;
  }

  private destruct(id: JsNode, src: string, bind: (name: string, value: string) => string): string[] {
    if (id.type === 'ObjectPattern') return this.destructObject(id, src, bind);
    if (id.type === 'ArrayPattern') return this.destructArray(id, src, bind);
    return [bind(this.expr(id), src)];
  }

  private destructObject(p: JsNode, src: string, bind: (name: string, value: string) => string): string[] {
    const tmp = this.uid('__vsk_d');
    const lines = [`val ${tmp} = ${src}`];
    const consumed: string[] = [];
    for (const prop of (p.properties as JsNode[]) ?? []) {
      if (prop.type === 'RestElement') {
        const arg = prop.argument as JsNode;
        if (arg.type === 'Identifier') {
          const minus = consumed.map((k) => ` - ${this.ktString(k)}`).join('');
          lines.push(bind(arg.name as string, minus ? `(${tmp} as Map<String, Any?>)${minus}` : tmp));
        }
        continue;
      }
      if (prop.type !== 'Property') continue;
      const key = prop.key as JsNode;
      const keyName = key.type === 'Identifier' ? (key.name as string) : key.type === 'Literal' ? String(key.value ?? '') : null;
      if (keyName === null) continue;
      const keyLit = this.ktString(keyName);
      consumed.push(keyName);
      const value = prop.value as JsNode;
      if (value.type === 'Identifier') {
        lines.push(bind(value.name as string, `(${tmp} as Map<String, Any?>)[${keyLit}]`));
      } else if (value.type === 'AssignmentPattern') {
        const inner = value.left as JsNode;
        if (inner.type === 'Identifier') {
          lines.push(bind(inner.name as string, `(${tmp} as Map<String, Any?>)[${keyLit}] ?: ${this.expr(value.right as JsNode)}`));
        }
      } else if (value.type === 'ObjectPattern' || value.type === 'ArrayPattern') {
        lines.push(...this.destruct(value, `(${tmp} as Map<String, Any?>)[${keyLit}]`, bind));
      }
    }
    return lines;
  }

  private destructArray(p: JsNode, src: string, bind: (name: string, value: string) => string): string[] {
    const tmp = this.uid('__vsk_d');
    const lines = [`val ${tmp} = ${src}`];
    const elems = (p.elements as (JsNode | null)[]) ?? [];
    for (let i = 0; i < elems.length; i++) {
      const e = elems[i];
      if (e === null || e === undefined) continue;
      if (e.type === 'RestElement') {
        const arg = e.argument as JsNode;
        if (arg.type === 'Identifier') lines.push(bind(arg.name as string, `(${tmp} as List<*>).drop(${i})`));
        continue;
      }
      const get = `(${tmp} as List<*>).getOrNull(${i})`;
      if (e.type === 'Identifier') {
        lines.push(bind(e.name as string, get));
      } else if (e.type === 'AssignmentPattern') {
        const inner = e.left as JsNode;
        if (inner.type === 'Identifier') lines.push(bind(inner.name as string, `${get} ?: ${this.expr(e.right as JsNode)}`));
      } else if (e.type === 'ObjectPattern' || e.type === 'ArrayPattern') {
        lines.push(...this.destruct(e, get, bind));
      }
    }
    return lines;
  }

  private assignExpr(node: JsNode): string {
    const left = node.left as JsNode;
    const right = node.right as JsNode;
    const op = node.operator as string;
    if (left.type === 'ObjectPattern' || left.type === 'ArrayPattern') {
      const bind = (name: string, value: string): string => `${this.id(name)} = ${value}`;
      return `run { ${this.destruct(left, this.expr(right), bind).join('; ')} }`;
    }
    if (op === '??=') return this.evalOnce(left, (l) => `${this.expr(left)} = ${l} ?: ${this.expr(right)}`);
    if (op === '||=') return this.evalOnce(left, (l) => `${this.expr(left)} = if (truthy(${l})) ${l} else ${this.expr(right)}`);
    if (op === '&&=') return this.evalOnce(left, (l) => `${this.expr(left)} = if (truthy(${l})) ${this.expr(right)} else ${l}`);
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

  private taggedTemplate(node: JsNode): string {
    const tag = this.expr(node.tag as JsNode);
    const quasi = node.quasi as JsNode;
    const quasis = (quasi.quasis as JsNode[]) ?? [];
    const expressions = (quasi.expressions as JsNode[]) ?? [];
    const strings = quasis.map((q) => this.ktString(((q as { value?: { cooked?: string | null } }).value?.cooked) ?? ''));
    const values = expressions.map((e) => this.expr(e));
    return `jsTagged(${tag}, listOf(${strings.join(', ')}), listOf(${values.join(', ')}))`;
  }

  private arrayExpr(node: JsNode): string {
    const elements = (node.elements as (JsNode | null)[]) ?? [];
    const parts = elements.map((e) => {
      if (e === null) return 'null';
      if (e.type === 'SpreadElement') {
        const arg = e.argument as JsNode;
        return `*(${this.expr(arg)} as List<*>).toTypedArray()`;
      }
      return this.expr(e);
    });
    return `listOf(${parts.join(', ')})`;
  }

  private objectExpr(node: JsNode): string {
    const props = (node.properties as JsNode[]) ?? [];
    const entries = props.map((p) => {
      if (p.type === 'Property') {
        const key = p.key as JsNode;
        const keyStr = key.type === 'Identifier' ? (key.name as string) : key.type === 'Literal' ? String((key.value as string | number) ?? '') : this.expr(key);
        const value = p.value as JsNode;
        const valueStr = value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression' ? this.arrowLambda(value) : this.expr(value);
        return `${this.ktString(keyStr)} to ${valueStr}`;
      }
      if (p.type === 'SpreadElement') {
        return `*(${this.expr(p.argument as JsNode)} as Map<String, Any?>).toList().toTypedArray()`;
      }
      this.err.warn(p, `unsupported object property: ${p.type}`);
      return `error("vesk: unsupported object property ${p.type}")`;
    });
    return entries.length === 0 ? `mutableMapOf<String, Any?>()` : `mutableMapOf<String, Any?>(${entries.join(', ')})`;
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
    this.err.warn(node, `cannot translate parameter pattern ${node.type} to Kotlin`);
    return `error("vesk: unsupported parameter pattern ${node.type}")`;
  }

  // Function/constructor parameters must carry an explicit Kotlin type;
  // lambda parameters (arrowLambda) stay untyped so inference applies.
  private typedParam(p: JsNode): string {
    if (p.type === 'AssignmentPattern') {
      return `${this.pattern(p.left as JsNode)}: Any? = ${this.expr(p.right as JsNode)}`;
    }
    return `${this.pattern(p)}: Any?`;
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

  // A JS function body translated with the return/break/continue label
  // context of a Kotlin function: `return` is non-local through the inline
  // run helper, and break/continue only target loops inside the body.
  private fnBody(body: JsNode, retLabel: string | undefined): string[] {
    return this.withLabels(retLabel, undefined, undefined, () => this.blockLines(body, 0));
  }

  private loopVar(left: JsNode): string {
    if (left.type === 'VariableDeclaration') {
      const d = (left.declarations as JsNode[])[0];
      if (d) return this.pattern(d.id as JsNode);
      return '';
    }
    return this.pattern(left);
  }

  private loopBody(body: JsNode): string {
    return this.withLabels(undefined, undefined, undefined, () => this.stmt(body));
  }

  private isSuperCall(stmt: JsNode): boolean {
    return (
      stmt.type === 'ExpressionStatement' &&
      (stmt.expression as JsNode | undefined)?.type === 'CallExpression' &&
      ((stmt.expression as JsNode).callee as JsNode | undefined)?.type === 'Super'
    );
  }

  private findSuperCall(body: JsNode): string[] | null {
    for (const s of (body.body as JsNode[]) ?? []) {
      if (this.isSuperCall(s)) {
        return (((s.expression as JsNode).arguments as JsNode[]) ?? []).map((a) => this.expr(a));
      }
    }
    return null;
  }

  private collectThisProps(node: JsNode, out: Set<string>): void {
    if (node.type === 'AssignmentExpression') {
      const left = node.left as JsNode;
      if (
        left.type === 'MemberExpression' &&
        (left.object as JsNode | undefined)?.type === 'ThisExpression' &&
        (left.property as JsNode | undefined)?.type === 'Identifier'
      ) {
        out.add((left.property as JsNode).name as string);
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'line' || key === 'col') continue;
      const v = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(v)) {
        for (const c of v) {
          if (c && typeof c === 'object' && typeof (c as JsNode).type === 'string') this.collectThisProps(c as JsNode, out);
        }
      } else if (v && typeof v === 'object' && typeof (v as JsNode).type === 'string') {
        this.collectThisProps(v as JsNode, out);
      }
    }
  }

  private ctorStmtLines(body: JsNode): string[] {
    const stmts = ((body.body as JsNode[]) ?? []).filter((s) => !this.isSuperCall(s));
    return this.withLabels(undefined, undefined, undefined, () => stmts.map((s) => this.stmt(s)));
  }

  private classDecl(node: JsNode): string {
    const id = node.id as JsNode | null;
    const name = id && id.type === 'Identifier' ? this.id(id.name as string) : this.uid('__VeskAnon');
    const superClass = node.superClass as JsNode | null;
    const members = (((node.body as JsNode | null)?.body as JsNode[] | undefined) ?? []);

    const fields: Array<{ name: string; init: string | null; isStatic: boolean }> = [];
    const methods: Array<{ name: string; params: string; body: string; lbl: string; isStatic: boolean }> = [];
    const accessors: Array<{ name: string; kind: 'get' | 'set'; params: string; body: string; lbl: string | undefined; isStatic: boolean }> = [];
    let ctorParams = '';
    let ctorBodyLines: string[] = [];
    let ctorDelegation = '';
    const thisProps = new Set<string>();

    for (const m of members) {
      const isStatic = !!m.static;
      if (m.type === 'PropertyDefinition') {
        const key = m.key as JsNode;
        const fname = key.type === 'Identifier' ? (key.name as string) : key.type === 'Literal' ? String(key.value ?? '') : null;
        if (fname === null) continue;
        fields.push({ name: fname, init: m.value ? this.expr(m.value as JsNode) : null, isStatic });
        continue;
      }
      if (m.type !== 'MethodDefinition') continue;
      const key = m.key as JsNode;
      const fname = key.type === 'Identifier' ? (key.name as string) : key.type === 'Literal' ? String(key.value ?? '') : null;
      if (fname === null) continue;
      const value = m.value as JsNode;
      const params = (((value.params as JsNode[]) ?? []).map((p) => this.typedParam(p))).join(', ');
      const kind = m.kind as string;
      if (kind === 'constructor' || (kind === 'method' && fname === 'constructor')) {
        ctorParams = params;
        const body = value.body as JsNode;
        this.collectThisProps(body, thisProps);
        const sup = this.findSuperCall(body);
        ctorDelegation = sup || superClass ? ` : super(${sup ? sup.join(', ') : ''})` : '';
        ctorBodyLines = this.ctorStmtLines(body);
        continue;
      }
      if (kind === 'get' || kind === 'set') {
        if (kind === 'get') {
          const lbl = this.uid('__veskget');
          const body = this.withLabels(lbl, undefined, undefined, () => this.blockLines(value.body as JsNode, 0)).join('\n');
          accessors.push({ name: fname, kind, params, body, lbl, isStatic });
        } else {
          accessors.push({ name: fname, kind, params, body: this.fnBody(value.body as JsNode, undefined).join('\n'), lbl: undefined, isStatic });
        }
        continue;
      }
      const lbl = this.uid('__veskfn');
      methods.push({ name: this.id(fname), params, body: this.withLabels(lbl, undefined, undefined, () => this.blockLines(value.body as JsNode, 0)).join('\n'), lbl, isStatic });
    }

    const accessorGroups = new Map<string, { get?: { params: string; body: string; lbl: string | undefined }; set?: { params: string; body: string } }>();
    for (const a of accessors) {
      if (a.isStatic) continue;
      const g = accessorGroups.get(a.name) ?? {};
      if (a.kind === 'get') g.get = { params: a.params, body: a.body, lbl: a.lbl };
      else g.set = { params: a.params, body: a.body };
      accessorGroups.set(a.name, g);
    }

    const alreadyDeclared = new Set<string>();
    for (const f of fields) if (!f.isStatic) alreadyDeclared.add(f.name);
    for (const an of accessorGroups.keys()) alreadyDeclared.add(an);

    const out: string[] = [];
    out.push(`class ${name}${superClass ? ` : ${this.classRef(superClass)}` : ''} {`);
    for (const f of fields) {
      if (!f.isStatic) out.push(`\tvar ${this.id(f.name)}: Any?${f.init ? ` = ${f.init}` : ' = null'}`);
    }
    for (const p of thisProps) {
      if (alreadyDeclared.has(p)) continue;
      out.push(`\tvar ${this.id(p)}: Any? = null`);
    }
    if (ctorParams !== '' || ctorBodyLines.length > 0 || superClass) {
      out.push(`\tconstructor(${ctorParams})${ctorDelegation} {`);
      for (const l of ctorBodyLines) out.push(`\t\t${l}`);
      out.push('\t}');
    }
    for (const [aname, g] of accessorGroups) {
      const getter = g.get ? `\t\tget() = run<Any?> ${g.get.lbl}@ {\n${g.get.body.split('\n').map((l) => `\t\t\t${l}`).join('\n')}\n\t\t}` : '';
      const setter = g.set ? `\t\tset(${g.set.params || 'value'}) {\n${g.set.body.split('\n').map((l) => `\t\t\t${l}`).join('\n')}\n\t\t}` : '';
      if (g.get && !g.set) out.push(`\tval ${this.id(aname)}: Any?`, getter);
      else if (g.set && !g.get) out.push(`\tvar ${this.id(aname)}: Any? = null`, setter);
      else if (g.set) out.push(`\tvar ${this.id(aname)}: Any?`, `${getter}\n${setter}`);
    }

    for (const m of methods) {
      if (m.isStatic) continue;
      out.push(`\tfun ${m.name}(${m.params}) = run<Any?> ${m.lbl}@ {`);
      for (const l of m.body.split('\n')) out.push(`\t\t${l}`);
      out.push('\t}');
    }

    const compLines: string[] = [];
    for (const f of fields) {
      if (f.isStatic) compLines.push(`var ${this.id(f.name)}: Any?${f.init ? ` = ${f.init}` : ' = null'}`);
    }
    for (const m of methods) {
      if (m.isStatic) compLines.push(`fun ${m.name}(${m.params}) = run<Any?> ${m.lbl}@ { ${m.body} }`);
    }
    for (const a of accessors) {
      if (!a.isStatic) continue;
      if (a.kind === 'get') compLines.push(`fun ${this.id(a.name)}() = run<Any?> ${a.lbl}@ { ${a.body} }`);
      else compLines.push(`fun ${this.id(a.name)}(${a.params || 'value'}) { ${a.body} }`);
    }
    if (compLines.length) {
      out.push('\tcompanion object {');
      for (const l of compLines) out.push(`\t\t${l}`);
      out.push('\t}');
    }
    out.push('}');
    return out.join('\n');
  }

  private classRef(superClass: JsNode): string {
    if (superClass.type === 'Identifier') {
      const types: Record<string, string> = { Error: 'Exception' };
      return types[superClass.name as string] ?? this.id(superClass.name as string);
    }
    return this.expr(superClass);
  }

  private classExpr(node: JsNode): string {
    const name = this.uid('__VeskAnon');
    const cls = this.classDecl({ ...node, id: { type: 'Identifier', name } });
    return `run { ${cls}; ${name}() }`;
  }

  stmt(node: JsNode): string {
    switch (node.type) {
      case 'ExpressionStatement':
        return `${this.expr(node.expression as JsNode)};`;
      case 'VariableDeclaration': {
        const kind = node.kind as string;
        const ktKind = kind === 'const' ? 'val' : 'var';
        const decls = (node.declarations as JsNode[]) ?? [];
        const out: string[] = [];
        for (const d of decls) {
          const id = d.id as JsNode;
          const init = d.init ? ` = ${this.expr(d.init as JsNode)}` : '';
          if (!(id as unknown as { lazy?: boolean }).lazy && (id.type === 'ObjectPattern' || id.type === 'ArrayPattern')) {
            const bind = (name: string, value: string): string => `${ktKind} ${this.id(name)} = ${value}`;
            out.push(...this.destruct(id, (d.init ? this.expr(d.init as JsNode) : 'null'), bind));
          } else {
            out.push(`${ktKind} ${this.pattern(id)}${init};`);
          }
        }
        return out.join('\n');
      }
      case 'ReturnStatement': {
        const arg = node.argument as JsNode | null;
        const lbl = this.retLabels[this.retLabels.length - 1];
        if (lbl) return arg ? `return@${lbl} ${this.expr(arg)};` : `return@${lbl};`;
        return arg ? `return ${this.expr(arg)};` : `return Unit;`;
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
        const body = this.loopBody(node.body as JsNode);
        return `while (truthy(${this.expr(test)})) ${body}`;
      }
      case 'DoWhileStatement': {
        const test = node.test as JsNode;
        const body = this.loopBody(node.body as JsNode);
        return `do ${body} while (truthy(${this.expr(test)}));`;
      }
      case 'ForStatement': {
        const init = node.init as JsNode | null;
        const test = node.test as JsNode | null;
        const update = node.update as JsNode | null;
        const body = node.body as JsNode;
        const initStr = init ? (() => { const s = this.stmt(init); return s.endsWith(';') ? s.slice(0, -1) : s; })() : '';
        const testStr = test ? `truthy(${this.expr(test)})` : '';
        const lines: string[] = [];
        if (initStr) lines.push(initStr);
        if (update) {
          const lbl = this.uid('__vskfor');
          const bodyStr = this.withLabels(undefined, undefined, lbl, () => this.stmt(body));
          lines.push(`while (${testStr || 'true'}) {`);
          lines.push(`\trun ${lbl}@ {`);
          for (const l of bodyStr.split('\n')) lines.push(`\t\t${l}`);
          lines.push('\t}');
          lines.push(`\t${this.expr(update)}`);
          lines.push('}');
        } else {
          const bodyStr = this.loopBody(body);
          lines.push(`while (${testStr || 'true'}) {`);
          for (const l of bodyStr.split('\n')) lines.push(`\t${l}`);
          lines.push('}');
        }
        return lines.join('\n');
      }
      case 'ForInStatement':
      case 'ForOfStatement': {
        const left = node.left as JsNode;
        const right = node.right as JsNode;
        const body = this.loopBody(node.body as JsNode);
        return `for (${this.loopVar(left)} in ${this.expr(right)}) ${body}`;
      }
      case 'FunctionDeclaration': {
        const id = node.id as JsNode | null;
        const name = id ? this.id(id.name as string) : 'anon';
        const params = ((node.params as JsNode[]) ?? []).map((p) => this.typedParam(p)).join(', ');
        const body = node.body as JsNode;
        const lbl = this.uid('__veskfn');
        const lines = this.withLabels(lbl, undefined, undefined, () => this.blockLines(body, 0));
        return `fun ${name}(${params}) = run<Any?> ${lbl}@ {\n${lines.join('\n')}\n}`;
      }
      case 'ClassDeclaration':
        return this.classDecl(node);
      case 'ThrowStatement': {
        const arg = node.argument as JsNode;
        if (arg.type === 'Literal' && typeof (arg.value as unknown) === 'string') {
          return `throw Exception(${this.expr(arg)});`;
        }
        return `throw ${this.expr(arg)};`;
      }
      case 'EmptyStatement':
        return '';
      case 'LabeledStatement': {
        const label = node.label as { name?: string } | null;
        const body = node.body as JsNode;
        return `${label?.name ? `${label.name}@ ` : ''}${this.stmt(body)}`;
      }
      case 'DebuggerStatement':
        return '';
      case 'SwitchStatement': {
        const disc = this.expr(node.discriminant as JsNode);
        const cases = (node.cases as JsNode[]) ?? [];
        const lines: string[] = [];
        lines.push(`when (${disc}) {`);
        for (const c of cases) {
          const test = c.test ? this.expr(c.test as JsNode) : 'else';
          const lbl = this.uid('__vsksw');
          lines.push(`\t${test} -> run ${lbl}@ {`);
          this.pushBrk(lbl);
          try {
            for (const s of (c.consequent as JsNode[]) ?? []) {
              for (const l of this.stmt(s).split('\n')) lines.push(`\t\t${l}`);
            }
          } finally {
            this.brkLabels.pop();
          }
          lines.push('\t}');
        }
        lines.push('}');
        return lines.join('\n');
      }
      case 'TryStatement': {
        const block = node.block as JsNode;
        const handler = node.handler as JsNode | null;
        const finalizer = node.finalizer as JsNode | null;
        const out = ['try {'];
        out.push(...this.blockLines(block, 1));
        out.push('}');
        if (handler) {
          const param = handler.param as JsNode | null;
          const paramStr = param ? this.pattern(param) : 'e';
          out.push(`catch (${paramStr}: Exception) {`);
          out.push(...this.blockLines(handler.body as JsNode, 1));
          out.push('}');
        }
        if (finalizer) {
          out.push('finally {');
          out.push(...this.blockLines(finalizer, 1));
          out.push('}');
        }
        return out.join('\n');
      }
      case 'BreakStatement': {
        const lbl = (node.label as { name?: string } | null)?.name;
        if (lbl) return `break@${lbl};`;
        const bl = this.brkLabels[this.brkLabels.length - 1];
        if (bl) return `return@${bl};`;
        return 'break;';
      }
      case 'ContinueStatement': {
        const lbl = (node.label as { name?: string } | null)?.name;
        if (lbl) return `continue@${lbl};`;
        const cl = this.contLabels[this.contLabels.length - 1];
        if (cl) return `return@${cl};`;
        return 'continue;';
      }
      case 'ImportDeclaration': {
        const source = (node.source as { value?: string } | null)?.value ?? '';
        const specifiers = (node.specifiers as JsNode[]) ?? [];
        const lines = specifiers.map((s) => {
          if (s.type === 'ImportDefaultSpecifier') {
            return `import ${source}.${this.id((s.local as JsNode).name as string)}`;
          }
          if (s.type === 'ImportNamespaceSpecifier') return `import ${source}.*`;
          if (s.type === 'ImportSpecifier') {
            const imported = (s.imported as JsNode).name as string;
            const local = (s.local as JsNode).name as string;
            return imported === local
              ? `import ${source}.${this.id(local)}`
              : `import ${source}.${this.id(imported)} as ${this.id(local)}`;
          }
          return '';
        }).filter(Boolean);
        return lines.length ? lines.join('\n') : `import ${source}`;
      }
      case 'ExportNamedDeclaration': {
        const decl = node.declaration as JsNode | null;
        return decl ? this.stmt(decl) : '';
      }
      case 'ExportDefaultDeclaration': {
        const decl = node.declaration as JsNode;
        if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') return this.stmt(decl);
        return `val __vsk_export_default = ${this.expr(decl)};`;
      }
      case 'ExportAllDeclaration': {
        const source = (node.source as { value?: string } | null)?.value ?? '';
        return source ? `import ${source}.*` : '';
      }
      case 'WithStatement':
        this.err.warn(node, 'with statements are not supported');
        return `error("vesk: with statement is not supported")`;
      default:
        this.err.warn(node, `cannot translate statement node type ${node.type} to Kotlin`);
        return `error("vesk: unsupported statement node ${node.type}")`;
    }
  }

  private pushBrk(label: string): void {
    this.brkLabels.push(label);
  }

  program(body: JsNode[]): string {
    return body.map((n) => this.stmt(n)).join('\n');
  }
}
