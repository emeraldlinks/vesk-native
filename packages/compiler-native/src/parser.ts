// Hand-written, regex-free recursive-descent JS/TS parser producing an
// ESTree-shaped AST for the vesk-native script compiler. It consumes the
// streaming Lexer from lexer.ts; together they replace the borrowed acorn
// parse() from the web compiler for script expressions and statements
// (kotlin-codegen.ts). Per AGENTS.md no structural source analysis may use
// regex; every construct below is recognized on the token surface.
//
// The AST mirrors what the web compiler's acorn + TS pipeline produced so the
// existing consumers (js2kt.ts) keep working unchanged. Constructs the
// compiler cannot translate yet surface as hard build errors downstream
// (js2kt emits TODO(...) which fails the build) — never silent miscompiles.

import { Lexer, Tok, regexAllowedAfter } from './lexer.ts';
import type { LexerSnapshot, Token } from './lexer.ts';

export interface JsNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

export class ParseError extends Error {
  readonly pos: number;
  readonly line: number;
  readonly col: number;
  constructor(message: string, token: Token) {
    super(`${message} (${token.line}:${token.col})`);
    this.name = 'ParseError';
    this.pos = token.start;
    this.line = token.line;
    this.col = token.col;
  }
}

// Binary operator precedence (higher binds tighter). `in` is disabled while
// parsing a for-header so `for (x in obj)` stays a ForInStatement.
const BIN_OPS: Record<string, number> = {
  '**': 14,
  '*': 13,
  '/': 13,
  '%': 13,
  '+': 12,
  '-': 12,
  '<<': 11,
  '>>': 11,
  '>>>': 11,
  '<': 10,
  '>': 10,
  '<=': 10,
  '>=': 10,
  in: 10,
  instanceof: 10,
  '==': 9,
  '!=': 9,
  '===': 9,
  '!==': 9,
  '&': 8,
  '^': 7,
  '|': 6,
  '&&': 5,
  '??': 4,
  '||': 3,
};

const ASSIGN_OPS = new Set([
  '=', '+=', '-=', '*=', '/=', '%=', '**=',
  '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=',
]);

// A token that legally continues an expression across a newline — ASI must
// NOT insert a semicolon before these.
const RESTRICTED_CONTINUATION = new Set(['(', '[', '+', '-', '/', '.', '`']);

// The previous token after a regex literal is faked as an identifier so a
// following `/` lexes as division, not another regex.
const FAKE_IDENT: Token = { type: Tok.Ident, value: '__regex__', start: 0, end: 0, line: 0, col: 0 };

function numValue(raw: string): number {
  if (raw.startsWith('0x') || raw.startsWith('0X')) return parseInt(raw, 16);
  if (raw.startsWith('0o') || raw.startsWith('0O')) return parseInt(raw.slice(2), 8);
  if (raw.startsWith('0b') || raw.startsWith('0B')) return parseInt(raw.slice(2), 2);
  return parseFloat(raw);
}

interface Snapshot {
  lex: LexerSnapshot;
  ahead: Token[];
  prev: Token | null;
}

export class Parser {
  private readonly lex: Lexer;
  private readonly src: string;
  private ahead: Token[] = [];
  private prev: Token | null = null;

  constructor(src: string) {
    this.lex = new Lexer(src);
    this.src = src;
  }

  // ---------- token stream ----------

  private peekAhead(i: number): Token {
    while (this.ahead.length <= i) {
      const buffered = this.ahead[this.ahead.length - 1] ?? this.prev;
      const forHeuristic = buffered === null || buffered.type === Tok.Regex ? FAKE_IDENT : buffered;
      this.lex.regexAllowed = regexAllowedAfter(forHeuristic);
      this.ahead.push(this.lex.next());
    }
    return this.ahead[i]!;
  }

  private peek(): Token {
    return this.peekAhead(0);
  }

  private next(): Token {
    const t = this.peekAhead(0);
    this.ahead.shift();
    this.prev = t.type === Tok.Regex ? FAKE_IDENT : t;
    return t;
  }

  private saveState(): Snapshot {
    return { lex: this.lex.save(), ahead: [...this.ahead], prev: this.prev };
  }

  private restoreState(s: Snapshot): void {
    this.lex.restore(s.lex);
    this.ahead = s.ahead;
    this.prev = s.prev;
  }

  private isPunct(v: string): boolean {
    const t = this.peek();
    return t.type === Tok.Punct && t.value === v;
  }

  private isKeyword(v?: string): boolean {
    const t = this.peek();
    if (t.type !== Tok.Keyword) return false;
    return v === undefined || t.value === v;
  }

  private isIdent(v?: string): boolean {
    const t = this.peek();
    if (t.type !== Tok.Ident) return false;
    return v === undefined || t.value === v;
  }

  private eatPunct(v: string): boolean {
    if (this.isPunct(v)) {
      this.next();
      return true;
    }
    return false;
  }

  private expectPunct(v: string): Token {
    const t = this.peek();
    if (t.type !== Tok.Punct || t.value !== v) this.fail(`expected '${v}'`, t);
    return this.next();
  }

  private expectKeyword(v: string): Token {
    const t = this.peek();
    if (t.type !== Tok.Keyword || t.value !== v) this.fail(`expected '${v}'`, t);
    return this.next();
  }

  private fail(message: string, token: Token): never {
    throw new ParseError(message, token);
  }

  // ---------- node construction ----------

  private node(type: string, start: number, end: number, fields: Record<string, unknown> = {}): JsNode {
    return { type, start, end, ...fields };
  }

  private identNode(t: Token): JsNode {
    return this.node('Identifier', t.start, t.end, { name: t.value });
  }

  // ---------- entry points ----------

  /** Parse a full program (script). */
  parseProgram(): JsNode {
    const start = this.peek().start;
    const body: JsNode[] = [];
    while (this.peek().type !== Tok.EOF) {
      body.push(this.parseStatement());
    }
    return this.node('Program', start, this.prev?.end ?? start, { body, sourceType: 'module' });
  }

  /** Parse a single expression (top-level, no statement wrapper). */
  parseExpressionNode(): JsNode {
    return this.parseExpression();
  }

  // ---------- expressions ----------

  private parseExpression(): JsNode {
    const start = this.peek().start;
    const expr = this.parseAssignment();
    if (this.isPunct(',')) {
      const expressions: JsNode[] = [expr];
      while (this.eatPunct(',')) expressions.push(this.parseAssignment());
      return this.node('SequenceExpression', start, this.prev!.end, { expressions });
    }
    return expr;
  }

  private parseAssignment(noIn = false): JsNode {
    const arrow = this.tryParseArrowFunction(noIn);
    if (arrow) return arrow;
    const start = this.peek().start;
    const left = this.parseConditional(noIn);
    const t = this.peek();
    if (t.type === Tok.Punct && ASSIGN_OPS.has(t.value)) {
      this.next();
      const right = this.parseAssignment(noIn);
      return this.node('AssignmentExpression', start, right.end, { operator: t.value, left, right });
    }
    return left;
  }

  private tryParseArrowFunction(noIn: boolean): JsNode | null {
    // async x => y | async (x) => y | async <T>(x) => y
    if (this.isIdent('async')) {
      const mark = this.saveState();
      const start = this.peek().start;
      this.next();
      const arrow = this.tryParseArrowTail(start, true, noIn);
      if (arrow) return arrow;
      this.restoreState(mark);
    }
    // x => y
    const t = this.peek();
    if (t.type === Tok.Ident && this.peekAhead(1).type === Tok.Punct && this.peekAhead(1).value === '=>') {
      const id = this.identNode(this.next());
      this.next(); // =>
      const body = this.parseArrowBody(noIn);
      return this.node('ArrowFunctionExpression', id.start, body.end, {
        id: null,
        params: [id],
        body,
        async: false,
        expression: body.type !== 'BlockStatement',
      });
    }
    // (params) => body
    if (this.isPunct('(')) {
      const mark = this.saveState();
      const start = this.peek().start;
      try {
        const params = this.tryParseParenthesizedParams();
        let returnType: string | null = null;
        if (params && this.isPunct(':')) {
          this.next();
          const ts = this.peek().start;
          returnType = this.src.slice(ts, this.skipType());
        }
        if (params && this.isPunct('=>')) {
          this.next();
          const body = this.parseArrowBody(noIn);
          return this.node('ArrowFunctionExpression', start, body.end, {
            id: null,
            params,
            body,
            async: false,
            returnType,
            expression: body.type !== 'BlockStatement',
          });
        }
      } catch {
        // not a parameter list — a parenthesized expression; fall through
      }
      this.restoreState(mark);
    }
    // <T>(params) => body — generic arrow (ambiguous with `<`, so speculative).
    if (this.isPunct('<')) {
      const mark = this.saveState();
      const start = this.peek().start;
      try {
        this.skipBalanced('<');
        const params = this.tryParseParenthesizedParams();
        let returnType: string | null = null;
        if (params && this.isPunct(':')) {
          this.next();
          const ts = this.peek().start;
          returnType = this.src.slice(ts, this.skipType());
        }
        if (params && this.eatPunct('=>')) {
          const body = this.parseArrowBody(noIn);
          return this.node('ArrowFunctionExpression', start, body.end, {
            id: null,
            params,
            body,
            async: false,
            returnType,
            expression: body.type !== 'BlockStatement',
          });
        }
      } catch (e) {
        // not a generic arrow — a relational <; fall through
        if (process.env.VESK_PARSE_DEBUG) console.error('generic arrow probe threw:', (e as Error).message);
      }
      this.restoreState(mark);
    }
    return null;
  }

  private tryParseArrowTail(start: number, async: boolean, noIn: boolean): JsNode | null {
    if (this.isPunct('(')) {
      const params = this.tryParseParenthesizedParams();
      let returnType: string | null = null;
      if (params && this.isPunct(':')) {
        this.next();
        const ts = this.peek().start;
        returnType = this.src.slice(ts, this.skipType());
      }
      if (params && this.isPunct('=>')) {
        this.next();
        const body = this.parseArrowBody(noIn);
        return this.node('ArrowFunctionExpression', start, body.end, {
          id: null,
          params,
          body,
          async,
          returnType,
          expression: body.type !== 'BlockStatement',
        });
      }
      return null;
    }
    const t = this.peek();
    if (t.type === Tok.Ident && this.peekAhead(1).type === Tok.Punct && this.peekAhead(1).value === '=>') {
      const id = this.identNode(this.next());
      this.next(); // =>
      const body = this.parseArrowBody(noIn);
      return this.node('ArrowFunctionExpression', start, body.end, {
        id: null,
        params: [id],
        body,
        async,
        expression: body.type !== 'BlockStatement',
      });
    }
    if (this.isPunct('<')) {
      const mark = this.saveState();
      try {
        this.skipBalanced('<');
        if (this.isPunct('(')) {
          const params = this.tryParseParenthesizedParams();
          let returnType: string | null = null;
          if (params && this.isPunct(':')) {
            this.next();
            const ts = this.peek().start;
            returnType = this.src.slice(ts, this.skipType());
          }
          if (params && this.eatPunct('=>')) {
            const body = this.parseArrowBody(noIn);
            return this.node('ArrowFunctionExpression', start, body.end, {
              id: null,
              params,
              body,
              async,
              returnType,
              expression: body.type !== 'BlockStatement',
            });
          }
        }
      } catch {
        // not a generic arrow — fall through
      }
      this.restoreState(mark);
    }
    return null;
  }

  private parseArrowBody(noIn: boolean): JsNode {
    if (this.isPunct('{')) return this.parseBlock();
    return this.parseAssignment(noIn);
  }

  /** Consumes `(...)` as a parameter list; throws on non-pattern content. */
  private tryParseParenthesizedParams(): JsNode[] | null {
    this.expectPunct('(');
    if (this.isPunct(')')) {
      this.next();
      return [];
    }
    const params: JsNode[] = [];
    for (;;) {
      params.push(this.parseParam());
      if (this.eatPunct(',')) continue;
      break;
    }
    this.expectPunct(')');
    return params;
  }

  private parseConditional(noIn: boolean): JsNode {
    const start = this.peek().start;
    const test = this.parseBinary(3, noIn);
    if (this.isPunct('?')) {
      this.next();
      const consequent = this.parseAssignment(noIn);
      this.expectPunct(':');
      const alternate = this.parseAssignment(noIn);
      return this.node('ConditionalExpression', start, alternate.end, { test, consequent, alternate });
    }
    return test;
  }

  private parseBinary(minLevel: number, noIn: boolean): JsNode {
    const start = this.peek().start;
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      let op: string | null = null;
      let level = 0;
      if (t.type === Tok.Punct && BIN_OPS[t.value] !== undefined) {
        op = t.value;
        level = BIN_OPS[t.value]!;
      } else if (t.type === Tok.Keyword && (t.value === 'in' || t.value === 'instanceof')) {
        if (t.value === 'in' && noIn) break;
        op = t.value;
        level = BIN_OPS[t.value]!;
      } else if (t.type === Tok.Ident && (t.value === 'as' || t.value === 'satisfies')) {
        // TS type assertions sit at relational precedence (`x as T`).
        op = t.value;
        level = BIN_OPS['<']!;
      }
      if (op === null || level < minLevel) break;
      this.next();
      if (op === 'as' || op === 'satisfies') {
        this.skipType();
        left = this.node(op === 'as' ? 'TSAsExpression' : 'TSSatisfiesExpression', start, this.prev!.end, {
          expression: left,
          typeAnnotation: null,
        });
        continue;
      }
      const rightAssoc = op === '**';
      const right = this.parseBinary(rightAssoc ? level : level + 1, noIn);
      const isLogical = op === '&&' || op === '||' || op === '??';
      left = this.node(isLogical ? 'LogicalExpression' : 'BinaryExpression', start, right.end, {
        operator: op,
        left,
        right,
      });
    }
    return left;
  }

  private parseUnary(): JsNode {
    const t = this.peek();
    if (t.type === Tok.Punct) {
      if (t.value === '!' || t.value === '~' || t.value === '+' || t.value === '-') {
        this.next();
        const argument = this.parseUnary();
        return this.node('UnaryExpression', t.start, argument.end, { operator: t.value, argument, prefix: true });
      }
      if (t.value === '++' || t.value === '--') {
        this.next();
        const argument = this.parseUnary();
        return this.node('UpdateExpression', t.start, argument.end, { operator: t.value, argument, prefix: true });
      }
      if (t.value === '<') {
        // TS type assertion <T>expr
        const mark = this.saveState();
        try {
          this.next();
          this.skipType();
          if (this.eatPunct('>')) {
            const argument = this.parseUnary();
            return this.node('TSTypeAssertion', t.start, argument.end, { expression: argument });
          }
        } catch {
          // not a type assertion — a relational <; fall through
        }
        this.restoreState(mark);
      }
    }
    if (t.type === Tok.Keyword && (t.value === 'typeof' || t.value === 'void' || t.value === 'delete')) {
      this.next();
      const argument = this.parseUnary();
      return this.node('UnaryExpression', t.start, argument.end, { operator: t.value, argument, prefix: true });
    }
    if (t.type === Tok.Ident && t.value === 'await') {
      this.next();
      const argument = this.parseUnary();
      return this.node('AwaitExpression', t.start, argument.end, { argument });
    }
    return this.parseMemberChain(true);
  }

  private parseMemberChain(calls: boolean): JsNode {
    let expr = this.parsePrimary();
    let chain = false;
    let pendingTypeParams: JsNode | null = null;
    for (;;) {
      const t = this.peek();
      if (t.type === Tok.Punct && (t.value === '.' || t.value === '?.')) {
        const dot = this.next();
        const optional = dot.value === '?.';
        const nt = this.peek();
        if (nt.type === Tok.Punct && nt.value === '[') {
          this.next();
          const prop = this.parseExpression();
          this.expectPunct(']');
          expr = this.node('MemberExpression', expr.start, this.prev!.end, {
            object: expr,
            property: prop,
            computed: true,
            optional,
          });
          if (optional) chain = true;
          continue;
        }
        if (nt.type === Tok.Punct && nt.value === '(' && calls) {
          this.next();
          const args = this.parseArguments();
          expr = this.node('CallExpression', expr.start, this.prev!.end, {
            callee: expr,
            arguments: args,
            optional: true,
            typeParameters: null,
          });
          chain = true;
          continue;
        }
        const prop = this.parsePropertyName();
        expr = this.node('MemberExpression', expr.start, prop.end, {
          object: expr,
          property: prop,
          computed: false,
          optional,
        });
        if (optional) chain = true;
        continue;
      }
      if (t.type === Tok.Punct && t.value === '[') {
        this.next();
        const prop = this.parseExpression();
        this.expectPunct(']');
        expr = this.node('MemberExpression', expr.start, this.prev!.end, {
          object: expr,
          property: prop,
          computed: true,
          optional: false,
        });
        continue;
      }
      if (t.type === Tok.Punct && t.value === '!') {
        // TS non-null assertion
        this.next();
        expr = this.node('TSNonNullExpression', expr.start, this.prev!.end, { expression: expr });
        continue;
      }
      if (t.type === Tok.Punct && (t.value === '++' || t.value === '--')) {
        // postfix update: y++ / y--
        const op = this.next();
        expr = this.node('UpdateExpression', expr.start, op.end, { operator: op.value, argument: expr, prefix: false });
        continue;
      }
      if (t.type === Tok.Punct && t.value === '(' && calls) {
        const typeParameters = pendingTypeParams;
        pendingTypeParams = null;
        this.next();
        const args = this.parseArguments();
        expr = this.node('CallExpression', expr.start, this.prev!.end, {
          callee: expr,
          arguments: args,
          optional: false,
          typeParameters,
        });
        continue;
      }
      if (t.type === Tok.Punct && t.value === '<' && calls) {
        const mark = this.saveState();
        try {
          this.next(); // <
          this.skipType();
          if (this.eatPunct('>') && this.isPunct('(')) {
            pendingTypeParams = this.node('TSTypeParameterInstantiation', t.start, this.prev!.end, { params: [] });
            continue;
          }
        } catch {
          // not type arguments — a relational <
        }
        this.restoreState(mark);
        break;
      }
      if (t.type === Tok.NoSubTemplate || t.type === Tok.TemplateHead) {
        const quasi = this.parseTemplateLiteral();
        expr = this.node('TaggedTemplateExpression', expr.start, quasi.end, { tag: expr, quasi });
        continue;
      }
      break;
    }
    if (chain) expr = this.node('ChainExpression', expr.start, expr.end, { expression: expr });
    return expr;
  }

  private parsePrimary(): JsNode {
    const t = this.peek();
    if (t.type === Tok.Num) {
      this.next();
      return this.node('Literal', t.start, t.end, { value: numValue(t.value), raw: t.value });
    }
    if (t.type === Tok.BigInt) {
      this.next();
      return this.node('Literal', t.start, t.end, { value: BigInt(t.value.slice(0, -1)), raw: t.value, bigint: t.value.slice(0, -1) });
    }
    if (t.type === Tok.Str) {
      this.next();
      return this.node('Literal', t.start, t.end, { value: t.cooked ?? t.value.slice(1, -1), raw: t.value });
    }
    if (t.type === Tok.Regex) {
      this.next();
      return this.node('Literal', t.start, t.end, { value: null, regex: { pattern: t.pattern ?? '', flags: t.flags ?? '' } });
    }
    if (t.type === Tok.NoSubTemplate || t.type === Tok.TemplateHead) return this.parseTemplateLiteral();
    if (t.type === Tok.Keyword) {
      switch (t.value) {
        case 'null':
          this.next();
          return this.node('Literal', t.start, t.end, { value: null, raw: 'null' });
        case 'true':
          this.next();
          return this.node('Literal', t.start, t.end, { value: true, raw: 'true' });
        case 'false':
          this.next();
          return this.node('Literal', t.start, t.end, { value: false, raw: 'false' });
        case 'this':
          this.next();
          return this.node('ThisExpression', t.start, t.end, {});
        case 'super':
          this.next();
          return this.node('Super', t.start, t.end, {});
        case 'function':
          this.next();
          return this.parseFunction(false, false);
        case 'class':
          return this.parseClass(false);
        case 'new':
          return this.parseNew();
        case 'import': {
          this.next();
          if (this.isPunct('(')) {
            const open = this.next();
            const source = this.parseAssignment();
            const close = this.expectPunct(')');
            return this.node('ImportExpression', open.start, close.end, { source });
          }
          this.fail("'import' can only appear as import(...)", t);
        }
        default:
          this.fail(`unexpected keyword '${t.value}'`, t);
      }
    }
    if (t.type === Tok.Ident) {
      if (t.value === 'async' && this.peekAhead(1).type === Tok.Keyword && this.peekAhead(1).value === 'function') {
        this.next();
        this.next();
        return this.parseFunction(false, true);
      }
      if (t.value === 'yield') {
        this.next();
        const delegate = this.eatPunct('*');
        let argument: JsNode | null = null;
        if (!this.isPunct(';') && !this.isPunct(')') && !this.isPunct('}') && !this.isPunct(',') && this.peek().type !== Tok.EOF) {
          argument = this.parseAssignment();
        }
        return this.node('YieldExpression', t.start, (argument ?? this.prev!).end, { argument, delegate });
      }
      this.next();
      return this.identNode(t);
    }
    if (t.type === Tok.Punct) {
      if (t.value === '(') {
        // Parentheses group an expression — acorn drops the parens from the
        // AST (no preserveParens), so the consumers (bindRefVar/ensureAst)
        // see the bare inner node. A sequence inside stays a SequenceExpression.
        this.next();
        const expression = this.parseExpression();
        this.expectPunct(')');
        return expression;
      }
      if (t.value === '[') return this.parseArray();
      if (t.value === '{') return this.parseObject();
    }
    this.fail(`unexpected token '${t.value}'`, t);
  }

  private parseNew(): JsNode {
    const start = this.peek().start;
    this.next(); // new
    if (this.isPunct('.')) {
      // new.target
      this.next();
      const prop = this.next();
      return this.node('MetaProperty', start, prop.end, { meta: { name: 'new' }, property: { name: prop.value } });
    }
    const callee = this.parseMemberChain(false);
    let typeParameters: JsNode | null = null;
    if (this.isPunct('<')) {
      const mark = this.saveState();
      try {
        this.next(); // <
        this.skipType();
        if (this.eatPunct('>') && this.isPunct('(')) {
          typeParameters = this.node('TSTypeParameterInstantiation', callee.end, this.prev!.end, { params: [] });
        }
      } catch {
        // not type arguments
      }
      if (typeParameters === null) this.restoreState(mark);
    }
    let args: JsNode[] = [];
    if (this.isPunct('(')) {
      this.next();
      args = this.parseArguments();
    }
    return this.node('NewExpression', start, this.prev!.end, { callee, arguments: args, typeParameters });
  }

  private parseArguments(): JsNode[] {
    // The opening `(` has already been consumed by the caller.
    const args: JsNode[] = [];
    if (this.isPunct(')')) {
      this.next();
      return args;
    }
    for (;;) {
      if (this.isPunct('...')) {
        const sp = this.next();
        const argument = this.parseAssignment();
        args.push(this.node('SpreadElement', sp.start, argument.end, { argument }));
      } else {
        args.push(this.parseAssignment());
      }
      if (this.eatPunct(',')) continue;
      break;
    }
    this.expectPunct(')');
    return args;
  }

  private parseArray(): JsNode {
    const open = this.expectPunct('[');
    const elements: (JsNode | null)[] = [];
    for (;;) {
      if (this.isPunct(']')) break;
      if (this.isPunct(',')) {
        this.next();
        elements.push(null);
        continue;
      }
      if (this.isPunct('...')) {
        const sp = this.next();
        const argument = this.parseAssignment();
        elements.push(this.node('SpreadElement', sp.start, argument.end, { argument }));
      } else {
        elements.push(this.parseAssignment());
      }
      if (this.eatPunct(',')) continue;
      break;
    }
    const close = this.expectPunct(']');
    return this.node('ArrayExpression', open.start, close.end, { elements });
  }

  private parseObject(): JsNode {
    const open = this.expectPunct('{');
    const properties: JsNode[] = [];
    for (;;) {
      if (this.isPunct('}')) break;
      if (this.isPunct('...')) {
        const sp = this.next();
        const argument = this.parseAssignment();
        properties.push(this.node('SpreadElement', sp.start, argument.end, { argument }));
      } else {
        properties.push(this.parseObjectMember());
      }
      if (this.eatPunct(',')) continue;
      break;
    }
    const close = this.expectPunct('}');
    return this.node('ObjectExpression', open.start, close.end, { properties });
  }

  private parseObjectMember(): JsNode {
    const start = this.peek().start;
    let kind: 'init' | 'get' | 'set' = 'init';

    // get x() {} / set x(v) {} accessors (but `{ get: 1 }`, `{ get() {} }` are
    // a plain property and a method named `get`).
    if (this.isIdent('get') || this.isIdent('set')) {
      const nt = this.peekAhead(1);
      const accessor = nt.type !== Tok.Punct || (nt.value !== ':' && nt.value !== '(' && nt.value !== ',' && nt.value !== '}');
      if (accessor) {
        kind = this.next().value === 'get' ? 'get' : 'set';
      }
    }

    let computed = false;
    let key: JsNode;
    if (this.isPunct('[')) {
      this.next();
      key = this.parseExpression();
      this.expectPunct(']');
      computed = true;
    } else {
      key = this.parsePropertyName();
    }

    let value: JsNode;
    let method = false;
    let shorthand = false;
    if (this.isPunct(':')) {
      this.next();
      value = this.parseAssignment();
    } else if (this.isPunct('(')) {
      method = true;
      value = this.parseFunctionFromParen(start);
    } else {
      shorthand = true;
      if (key.type !== 'Identifier') this.fail('shorthand property requires an identifier', this.peek());
      value = this.node('Identifier', key.start, key.end, { name: key.name });
      if (this.eatPunct('=')) {
        value = this.node('AssignmentPattern', key.start, this.prev!.end, {
          left: value,
          right: this.parseAssignment(),
        });
      }
    }
    return this.node('Property', start, this.prev!.end, { key, value, kind, computed, method, shorthand });
  }

  private parsePropertyName(): JsNode {
    const t = this.peek();
    if (t.type === Tok.Ident) return this.identNode(this.next());
    if (t.type === Tok.Keyword) {
      // Reserved words are legal member/property names (a.class, { new: 1 }).
      this.next();
      return this.node('Identifier', t.start, t.end, { name: t.value });
    }
    if (t.type === Tok.Str || t.type === Tok.Num) {
      this.next();
      return this.node('Literal', t.start, t.end, {
        value: t.type === Tok.Num ? numValue(t.value) : (t.cooked ?? t.value.slice(1, -1)),
        raw: t.value,
      });
    }
    this.fail('expected property name', t);
  }

  private parseTemplateLiteral(): JsNode {
    const first = this.next(); // NoSubTemplate or TemplateHead
    const start = first.start;
    const quasis: JsNode[] = [];
    const expressions: JsNode[] = [];
    const element = (t: Token, tail: boolean): JsNode =>
      this.node('TemplateElement', t.start, t.end, { value: { raw: t.value, cooked: t.cooked ?? '' }, tail });
    if (first.type === Tok.NoSubTemplate) {
      quasis.push(element(first, true));
      return this.node('TemplateLiteral', start, first.end, { quasis, expressions });
    }
    quasis.push(element(first, false));
    for (;;) {
      expressions.push(this.parseExpression());
      const t = this.next();
      if (t.type === Tok.TemplateTail) {
        quasis.push(element(t, true));
        return this.node('TemplateLiteral', start, t.end, { quasis, expressions });
      }
      if (t.type !== Tok.TemplateMiddle) this.fail('expected template continuation', t);
      quasis.push(element(t, false));
    }
  }

  // ---------- functions ----------

  private parseFunction(decl: boolean, async: boolean): JsNode {
    const start = async ? this.prev!.start : this.peek().start;
    let id: JsNode | null = null;
    let generator = false;
    if (this.eatPunct('*')) generator = true;
    if (this.isIdent()) id = this.identNode(this.next());
    if (this.isPunct('<')) this.skipBalanced('<');
    const params = this.parseParamsStrict();
    let returnType: string | null = null;
    if (this.isPunct(':')) {
      this.next();
      const ts = this.peek().start;
      returnType = this.src.slice(ts, this.skipType());
    }
    const body = this.parseBlock();
    return this.node(decl ? 'FunctionDeclaration' : 'FunctionExpression', start, body.end, {
      id,
      params,
      body,
      async,
      generator,
      expression: false,
      returnType,
    });
  }

  private parseFunctionDecl(async: boolean): JsNode {
    this.next(); // function
    return this.parseFunction(true, async);
  }

  private parseParamsStrict(): JsNode[] {
    this.expectPunct('(');
    const params: JsNode[] = [];
    if (this.isPunct(')')) {
      this.next();
      return params;
    }
    for (;;) {
      params.push(this.parseParam());
      if (this.eatPunct(',')) continue;
      break;
    }
    this.expectPunct(')');
    return params;
  }

  /** A binding pattern that may carry a default: `a`, `{a = 1}`, `x = 2`. */
  private parseParam(): JsNode {
    const pat = this.parsePattern();
    if (this.isPunct('=')) {
      this.next();
      const right = this.parseAssignment();
      return this.node('AssignmentPattern', pat.start, right.end, { left: pat, right });
    }
    return pat;
  }

  /** Parses the `(params) { body }` tail of a method/arrow-shaped function. */
  private parseFunctionFromParen(start: number): JsNode {
    const params = this.parseParamsStrict();
    let returnType: string | null = null;
    if (this.isPunct(':')) {
      this.next();
      const ts = this.peek().start;
      returnType = this.src.slice(ts, this.skipType());
    }
    const body = this.parseBlock();
    return this.node('FunctionExpression', start, body.end, {
      id: null,
      params,
      body,
      async: false,
      generator: false,
      expression: false,
      returnType,
    });
  }

  // ---------- patterns ----------

  private parsePattern(): JsNode {
    const t = this.peek();
    let pat: JsNode;
    if (t.type === Tok.Punct && t.value === '...') {
      this.next();
      const argument = this.parsePattern();
      return this.node('RestElement', t.start, argument.end, { argument });
    }
    if (t.type === Tok.Punct && t.value === '&') {
      // vesk track sugar: `&[name]` / `&[name, cell]` / `&{...}` — the `&`
      // marks the pattern as a lazy track binding (ArrayPattern/OjectPattern
      // with `lazy: true`, matching the web compiler's vesk-plugin).
      const nt = this.peekAhead(1);
      if (nt.type === Tok.Punct && (nt.value === '[' || nt.value === '{')) {
        this.next();
        pat = nt.value === '[' ? this.parseArrayPattern() : this.parseObjectPattern();
        (pat as { lazy?: boolean }).lazy = true;
      } else {
        this.fail(`unexpected token '&' in binding pattern`, t);
      }
    } else if (t.type === Tok.Punct && t.value === '{') {
      pat = this.parseObjectPattern();
    } else if (t.type === Tok.Punct && t.value === '[') {
      pat = this.parseArrayPattern();
    } else if (t.type === Tok.Ident) {
      pat = this.identNode(this.next());
    } else {
      this.fail(`unexpected token '${t.value}' in binding pattern`, t);
    }
    if (this.isPunct('?')) this.next(); // TS optional binding: a?: T
    if (this.isPunct(':')) {
      // type annotation on the binding
      this.next();
      const ts = this.peek().start;
      (pat as { typeAnnotation?: string | null }).typeAnnotation = this.src.slice(ts, this.skipType());
    }
    return pat;
  }

  private parseObjectPattern(): JsNode {
    const open = this.expectPunct('{');
    const properties: JsNode[] = [];
    for (;;) {
      if (this.isPunct('}')) break;
      if (this.isPunct('...')) {
        const sp = this.next();
        const argument = this.parsePattern();
        properties.push(this.node('RestElement', sp.start, argument.end, { argument }));
      } else {
        properties.push(this.parseObjectPatternProperty());
      }
      if (this.eatPunct(',')) continue;
      break;
    }
    const close = this.expectPunct('}');
    return this.node('ObjectPattern', open.start, close.end, { properties });
  }

  private parseObjectPatternProperty(): JsNode {
    const start = this.peek().start;
    let computed = false;
    let key: JsNode;
    if (this.isPunct('[')) {
      this.next();
      key = this.parseExpression();
      this.expectPunct(']');
      computed = true;
    } else {
      key = this.parsePropertyName();
    }
    let value: JsNode;
    let shorthand = false;
    if (this.isPunct(':')) {
      this.next();
      value = this.parsePattern();
      if (this.isPunct('=')) {
        this.next();
        const right = this.parseAssignment();
        value = this.node('AssignmentPattern', value.start, right.end, { left: value, right });
      }
    } else {
      shorthand = true;
      if (key.type !== 'Identifier') this.fail('shorthand pattern requires an identifier', this.peek());
      value = this.node('Identifier', key.start, key.end, { name: key.name });
      if (this.eatPunct('=')) {
        value = this.node('AssignmentPattern', key.start, this.prev!.end, {
          left: value,
          right: this.parseAssignment(),
        });
      }
    }
    return this.node('Property', start, this.prev!.end, { key, value, kind: 'init', computed, method: false, shorthand });
  }

  private parseArrayPattern(): JsNode {
    const open = this.expectPunct('[');
    const elements: (JsNode | null)[] = [];
    for (;;) {
      if (this.isPunct(']')) break;
      if (this.isPunct(',')) {
        this.next();
        elements.push(null);
        continue;
      }
      if (this.isPunct('...')) {
        const sp = this.next();
        const argument = this.parsePattern();
        elements.push(this.node('RestElement', sp.start, argument.end, { argument }));
      } else {
        const el = this.parsePattern();
        if (this.isPunct('=')) {
          this.next();
          const right = this.parseAssignment();
          elements.push(this.node('AssignmentPattern', el.start, right.end, { left: el, right }));
        } else {
          elements.push(el);
        }
      }
      if (this.eatPunct(',')) continue;
      break;
    }
    const close = this.expectPunct(']');
    return this.node('ArrayPattern', open.start, close.end, { elements });
  }

  // ---------- TS type surface (tolerantly skipped, no AST) ----------

  private skipBalanced(open: string): void {
    const close = open === '{' ? '}' : open === '(' ? ')' : open === '[' ? ']' : '>';
    let depth = 0;
    for (;;) {
      const t = this.next();
      if (t.type === Tok.EOF) this.fail(`unterminated '${open}'`, t);
      if (t.type !== Tok.Punct) continue;
      if (t.value === open) {
        depth++;
        continue;
      }
      if (t.value === close) {
        depth--;
        if (depth === 0) return;
      }
    }
  }

  // Keywords that open a type-level operator.
  private isTypePrefixToken(t: Token): boolean {
    if (t.type === Tok.Keyword) return t.value === 'typeof' || t.value === 'new' || t.value === 'abstract';
    if (t.type === Tok.Ident) {
      return t.value === 'keyof' || t.value === 'readonly' || t.value === 'infer' ||
        t.value === 'unique' || t.value === 'asserts' || t.value === 'is';
    }
    return false;
  }

  // Consume a template-literal type through its tail (nested templates nest).
  private skipTemplateType(): void {
    const first = this.next();
    if (first.type === Tok.NoSubTemplate) return;
    let depth = 1;
    for (;;) {
      const t = this.next();
      if (t.type === Tok.TemplateTail) {
        depth--;
        if (depth === 0) return;
      } else if (t.type === Tok.TemplateHead) {
        depth++;
      }
    }
  }

  // Structural parse of a TS type annotation. Consumes exactly the type's
  // tokens and returns the byte offset just past the type, so callers can
  // record the annotation text. Covers the erasable TS surface: unions,
  // intersections, generics, object/tuple/function types, conditional types,
  // indexed access, keyof/typeof/infer/readonly, literals. Anything after a
  // complete type that cannot continue a type (a body `{`, `=>`, `)`, ...)
  // is left for the caller — that is what lets `: string {` parse a body.
  private skipType(): number {
    for (;;) {
      const end = this.skipTypeOperand();
      const t = this.peek();
      if (t.type === Tok.Punct && (t.value === '|' || t.value === '&')) {
        this.next();
        continue;
      }
      if (t.type === Tok.Keyword && t.value === 'extends') {
        // conditional type: T extends U ? X : Y
        this.next();
        this.skipType();
        if (this.isPunct('?')) {
          this.next();
          this.skipType();
          if (this.isPunct(':')) {
            this.next();
            this.skipType();
          }
        }
        return end;
      }
      return end;
    }
  }

  private skipTypeOperand(): number {
    const t = this.peek();
    if (t.type === Tok.Ident || t.type === Tok.Keyword) {
      if (this.isTypePrefixToken(t)) {
        this.next();
        return this.skipTypeOperand();
      }
      this.next();
    } else if (t.type === Tok.Str || t.type === Tok.Num || t.type === Tok.BigInt) {
      this.next();
    } else if (t.type === Tok.Punct) {
      if (t.value === '-') {
        // negative literal type
        this.next();
        this.skipTypeOperand();
        return this.prev!.end;
      }
      if (t.value === '(') {
        // function type or parenthesized type
        this.skipBalanced('(');
        if (this.isPunct('=>')) {
          this.next();
          this.skipType();
        }
        return this.prev!.end;
      }
      if (t.value === '{') {
        this.skipBalanced('{');
        return this.prev!.end;
      }
      if (t.value === '[') {
        this.skipBalanced('[');
        return this.prev!.end;
      }
      if (t.value === '<') {
        this.skipBalanced('<');
        return this.skipTypeOperand();
      }
      this.fail(`expected a type, found '${t.value}'`, t);
    } else if (t.type === Tok.TemplateHead || t.type === Tok.NoSubTemplate) {
      this.skipTemplateType();
      return this.prev!.end;
    } else {
      this.fail(`expected a type, found '${t.value}'`, t);
    }
    // Postfix suffixes: qualified names, generics, arrays, indexed access.
    for (;;) {
      const p = this.peek();
      if (p.type === Tok.Punct && p.value === '[') {
        this.skipBalanced('[');
        continue;
      }
      if (p.type === Tok.Punct && p.value === '.') {
        this.next();
        if (!this.isIdent()) this.fail('expected a type name after .', p);
        this.next();
        continue;
      }
      if (p.type === Tok.Punct && p.value === '<') {
        this.skipBalanced('<');
        continue;
      }
      break;
    }
    return this.prev!.end;
  }

  // ---------- statements ----------

  private parseStatement(): JsNode {
    const t = this.peek();
    if (t.type === Tok.Punct && t.value === '{') return this.parseBlock();
    if (t.type === Tok.Punct && t.value === ';') {
      const st = this.next();
      return this.node('EmptyStatement', st.start, st.end, {});
    }
    if (t.type === Tok.Keyword) {
      switch (t.value) {
        case 'var':
        case 'const':
          return this.parseVarDecl(true);
        case 'function':
          return this.parseFunctionDecl(false);
        case 'if':
          return this.parseIf();
        case 'while':
          return this.parseWhile();
        case 'do':
          return this.parseDoWhile();
        case 'for':
          return this.parseFor();
        case 'switch':
          return this.parseSwitch();
        case 'try':
          return this.parseTry();
        case 'throw':
          return this.parseThrow();
        case 'return':
          return this.parseReturn();
        case 'break':
          return this.parseBreakContinue('BreakStatement');
        case 'continue':
          return this.parseBreakContinue('ContinueStatement');
        case 'debugger': {
          const st = this.next();
          this.consumeSemicolon();
          return this.node('DebuggerStatement', st.start, st.end, {});
        }
        case 'class':
          return this.parseClass(true);
        case 'import':
          return this.parseImport();
        case 'export':
          return this.parseExport();
        case 'with':
          this.fail('with statements are not supported', t);
        default:
          break; // null / true / this / ... → expression statement
      }
    }
    if (t.type === Tok.Ident) {
      if (t.value === 'async' && this.peekAhead(1).type === Tok.Keyword && this.peekAhead(1).value === 'function') {
        this.next();
        return this.parseFunctionDecl(true);
      }
      if (t.value === 'let' && this.looksLikeBinding()) return this.parseVarDecl(true);
      if (t.value === 'abstract' && this.peekAhead(1).type === Tok.Keyword && this.peekAhead(1).value === 'class') {
        this.next();
        return this.parseClass(true);
      }
      if ((t.value === 'interface' || t.value === 'enum' || t.value === 'namespace' || t.value === 'declare' || t.value === 'module' || t.value === 'global' || t.value === 'type') && this.isTsDeclStart()) {
        return this.skipTsDeclaration();
      }
      if (this.peekAhead(1).type === Tok.Punct && this.peekAhead(1).value === ':') {
        const label = this.identNode(this.next());
        this.next(); // :
        const body = this.parseStatement();
        return this.node('LabeledStatement', label.start, body.end, { label, body });
      }
    }
    // expression statement
    const start = t.start;
    const expression = this.parseExpression();
    this.consumeSemicolon();
    return this.node('ExpressionStatement', start, this.prev!.end, { expression });
  }

  private looksLikeBinding(): boolean {
    const nt = this.peekAhead(1);
    if (nt.type === Tok.Punct && nt.value === '&') {
      // `let &[name]` / `let &{...}` is the vesk track sugar; a bare `let &x`
      // is an invalid binding and must surface as a pattern error.
      return true;
    }
    return nt.type === Tok.Ident || (nt.type === Tok.Punct && (nt.value === '[' || nt.value === '{'));
  }

  private isTsDeclStart(): boolean {
    const nt = this.peekAhead(1);
    return nt.type === Tok.Ident || nt.type === Tok.Str || (nt.type === Tok.Punct && nt.value === '{');
  }

  private skipTsDeclaration(): JsNode {
    // Type-level declarations (interface/enum/namespace/... ) carry no runtime
    // value for the compiler; consume their tokens so surrounding code keeps
    // parsing. Mirrors the web stripTsTypes pass — nothing is emitted.
    const start = this.peek().start;
    let depth = 0;
    let inBody = false;
    for (;;) {
      const t = this.peek();
      if (t.type === Tok.EOF) break;
      if (t.type === Tok.Punct) {
        if (t.value === '{') {
          inBody = true;
          depth++;
          this.next();
          continue;
        }
        if (t.value === '}') {
          if (!inBody) {
            this.next();
            continue;
          }
          depth--;
          this.next();
          if (depth === 0) {
            if (this.eatPunct(';')) {
              // trailing semicolon after the body
            }
            break;
          }
          continue;
        }
        if (depth === 0 && !inBody && t.value === ';') {
          this.next();
          break;
        }
        this.next();
        continue;
      }
      this.next();
    }
    return this.node('EmptyStatement', start, this.prev!.end, {});
  }

  private parseBlock(): JsNode {
    const open = this.expectPunct('{');
    const body: JsNode[] = [];
    while (!this.isPunct('}')) {
      if (this.peek().type === Tok.EOF) this.fail("unterminated block — expected '}'", this.peek());
      body.push(this.parseStatement());
    }
    const close = this.next();
    return this.node('BlockStatement', open.start, close.end, { body });
  }

  private consumeSemicolon(): void {
    if (this.eatPunct(';')) return;
    const t = this.peek();
    if (t.type === Tok.EOF || this.isPunct('}')) return; // ASI
    const last = this.prev;
    if (last && t.line > last.line && !RESTRICTED_CONTINUATION.has(t.value)) return; // ASI on newline
    this.fail(`missing semicolon before '${t.value}'`, t);
  }

  private parseVarDecl(consumeSemi: boolean): JsNode {
    const start = this.peek().start;
    const kind = this.next().value; // var | let | const
    const declarations: JsNode[] = [];
    for (;;) {
      const id = this.parsePattern();
      let init: JsNode | null = null;
      if (this.eatPunct('=')) init = this.parseAssignment();
      declarations.push(this.node('VariableDeclarator', id.start, (init ?? id).end, { id, init }));
      if (this.eatPunct(',')) continue;
      break;
    }
    if (consumeSemi) this.consumeSemicolon();
    return this.node('VariableDeclaration', start, this.prev!.end, { kind, declarations });
  }

  private parseIf(): JsNode {    const start = this.peek().start;
    this.next(); // if
    this.expectPunct('(');
    const test = this.parseExpression();
    this.expectPunct(')');
    const consequent = this.parseStatement();
    let alternate: JsNode | null = null;
    if (this.isKeyword('else')) {
      this.next();
      alternate = this.parseStatement();
    }
    return this.node('IfStatement', start, (alternate ?? consequent).end, { test, consequent, alternate });
  }

  private parseWhile(): JsNode {
    const start = this.peek().start;
    this.next(); // while
    this.expectPunct('(');
    const test = this.parseExpression();
    this.expectPunct(')');
    const body = this.parseStatement();
    return this.node('WhileStatement', start, body.end, { test, body });
  }

  private parseDoWhile(): JsNode {
    const start = this.peek().start;
    this.next(); // do
    const body = this.parseStatement();
    this.expectKeyword('while');
    this.expectPunct('(');
    const test = this.parseExpression();
    this.expectPunct(')');
    this.consumeSemicolon();
    return this.node('DoWhileStatement', start, this.prev!.end, { body, test });
  }

  private parseFor(): JsNode {
    const start = this.peek().start;
    this.next(); // for
    let isAwait = false;
    if (this.isIdent('await')) {
      this.next();
      isAwait = true;
    }
    this.expectPunct('(');

    let init: JsNode | null = null;
    let forLeft: JsNode | null = null;
    let isOf = false;
    let isIn = false;

    if (!this.isPunct(';')) {
      const t = this.peek();
      const isDecl =
        (t.type === Tok.Keyword && (t.value === 'var' || t.value === 'const')) ||
        (t.type === Tok.Ident && t.value === 'let' && this.looksLikeBinding());
      if (isDecl) {
        init = this.parseVarDecl(false);
        if (this.isIdent('of') || this.isKeyword('in')) {
          isOf = this.isIdent('of');
          isIn = !isOf;
          this.next();
          const decl0 = (init as unknown as { declarations: JsNode[] | undefined } | null)?.declarations?.[0] ?? this.fail('for-of needs a binding', t);
          forLeft = decl0.id as JsNode;
        }
      } else {
        init = this.parseAssignment(true);
        if (this.isIdent('of') || this.isKeyword('in')) {
          isOf = this.isIdent('of');
          isIn = !isOf;
          this.next();
          forLeft = init;
        }
      }
    }

    if (isOf || isIn) {
      const right = this.parseExpression();
      if (this.isPunct(';')) this.skipForClause();
      this.expectPunct(')');
      const body = this.parseStatement();
      return this.node(isOf ? 'ForOfStatement' : 'ForInStatement', start, body.end, {
        left: forLeft,
        right,
        body,
        await: isAwait,
      });
    }

    this.expectPunct(';');
    const test = this.isPunct(';') ? null : this.parseExpression();
    this.expectPunct(';');
    const update = this.isPunct(')') ? null : this.parseExpression();
    this.expectPunct(')');
    const body = this.parseStatement();
    return this.node('ForStatement', start, body.end, { init, test, update, body });
  }

  // The web compiler blanks `for (x of y; key expr)` / `; index name` clauses
  // before parsing; raw vesk sources keep them. Tolerate the clause so script
  // fragments round-trip: consume `;` then everything up to the closing `)`.
  private skipForClause(): void {
    this.next(); // ;
    let depth = 0;
    for (;;) {
      const t = this.peek();
      if (t.type === Tok.EOF) this.fail('unterminated for-clause', t);
      if (t.type === Tok.Punct) {
        if (t.value === '(' || t.value === '[' || t.value === '{') depth++;
        else if (t.value === ')' || t.value === ']' || t.value === '}') {
          if (t.value === ')' && depth === 0) return;
          depth--;
        }
      }
      this.next();
    }
  }

  private parseSwitch(): JsNode {
    const start = this.peek().start;
    this.next(); // switch
    this.expectPunct('(');
    const discriminant = this.parseExpression();
    this.expectPunct(')');
    this.expectPunct('{');
    const cases: JsNode[] = [];
    while (!this.isPunct('}')) {
      const t = this.peek();
      if (t.type !== Tok.Keyword || (t.value !== 'case' && t.value !== 'default')) {
        this.fail("expected 'case' or 'default'", t);
      }
      const caseStart = this.next().start;
      let test: JsNode | null = null;
      if (t.value === 'case') test = this.parseExpression();
      this.expectPunct(':');
      const consequent: JsNode[] = [];
      while (!this.isPunct('}') && !this.isKeyword('case') && !this.isKeyword('default')) {
        consequent.push(this.parseStatement());
      }
      cases.push(this.node('SwitchCase', caseStart, this.prev!.end, { test, consequent }));
    }
    const close = this.next(); // }
    return this.node('SwitchStatement', start, close.end, { discriminant, cases });
  }

  private parseTry(): JsNode {
    const start = this.peek().start;
    this.next(); // try
    const block = this.parseBlock();
    let handler: JsNode | null = null;
    if (this.isKeyword('catch')) {
      const catchStart = this.next().start;
      let param: JsNode | null = null;
      if (this.eatPunct('(')) {
        if (!this.isPunct(')')) param = this.parsePattern();
        this.expectPunct(')');
      }
      const body = this.parseBlock();
      handler = this.node('CatchClause', catchStart, body.end, { param, body });
    }
    let finalizer: JsNode | null = null;
    if (this.isKeyword('finally')) {
      this.next();
      finalizer = this.parseBlock();
    }
    if (handler === null && finalizer === null) this.fail('try requires catch or finally', this.peek());
    return this.node('TryStatement', start, (finalizer ?? handler!).end, { block, handler, finalizer });
  }

  private parseThrow(): JsNode {
    const start = this.peek().start;
    this.next(); // throw
    const argument = this.parseExpression();
    this.consumeSemicolon();
    return this.node('ThrowStatement', start, this.prev!.end, { argument });
  }

  private parseReturn(): JsNode {
    const start = this.peek().start;
    const kw = this.next(); // return
    let argument: JsNode | null = null;
    const t = this.peek();
    const endOfLine = t.line > kw.line;
    const atBoundary = t.type === Tok.EOF || this.isPunct(';') || this.isPunct('}');
    if (!atBoundary && (!endOfLine || RESTRICTED_CONTINUATION.has(t.value))) {
      argument = this.parseExpression();
    }
    this.consumeSemicolon();
    return this.node('ReturnStatement', start, this.prev!.end, { argument });
  }

  private parseBreakContinue(type: 'BreakStatement' | 'ContinueStatement'): JsNode {
    const kw = this.next();
    let label: JsNode | null = null;
    if (this.isIdent() && this.peek().line === kw.line) label = this.identNode(this.next());
    this.consumeSemicolon();
    return this.node(type, kw.start, this.prev!.end, { label });
  }

  private parseClass(decl: boolean): JsNode {
    const start = this.peek().start;
    this.next(); // class
    let id: JsNode | null = null;
    if (this.isIdent()) id = this.identNode(this.next());
    if (this.isPunct('<')) this.skipBalanced('<');
    let superClass: JsNode | null = null;
    if (this.isKeyword('extends')) {
      this.next();
      superClass = this.parseMemberChain(false);
    }
    if (this.isIdent('implements')) {
      // TS implements clause — skip the type list
      this.next();
      while (!this.isPunct('{')) this.next();
    }
    this.expectPunct('{');
    const body: JsNode[] = [];
    while (!this.isPunct('}')) {
      body.push(this.parseClassElement());
    }
    const close = this.next();
    return this.node(decl ? 'ClassDeclaration' : 'ClassExpression', start, close.end, {
      id,
      superClass,
      body: this.node('ClassBody', start, close.end, { body }),
    });
  }

  private parseClassElement(): JsNode {
    const start = this.peek().start;
    let isStatic = false;
    let isAsync = false;
    let kind: 'method' | 'get' | 'set' = 'method';

    for (;;) {
      if (this.isIdent('static')) {
        this.next();
        isStatic = true;
        continue;
      }
      if (this.isIdent('async')) {
        this.next();
        isAsync = true;
        continue;
      }
      if ((this.isIdent('get') || this.isIdent('set')) && this.peekAhead(1).type !== Tok.Punct) {
        // `get p() {}` / `set v(x) {}` accessors; `get() {}` / `get;` / `get = 1`
        // are a method / field named `get`.
        kind = this.next().value === 'get' ? 'get' : 'set';
        continue;
      }
      break;
    }

    let computed = false;
    let key: JsNode;
    if (this.isPunct('[')) {
      this.next();
      key = this.parseExpression();
      this.expectPunct(']');
      computed = true;
    } else if (this.isIdent() || this.isKeyword()) {
      key = this.identNode(this.next());
    } else if (this.isPunct('*')) {
      // generator method — skip the star, parse the name
      this.next();
      key = this.identNode(this.next());
    } else {
      this.fail('expected class member name', this.peek());
      key = this.node('Identifier', start, start, { name: '?' });
    }

    if (this.isPunct('<')) this.skipBalanced('<');

    // class field: name; | name: T; | name = expr;
    if (this.isPunct(';') || this.isPunct('=') || this.isPunct(':')) {
      let value: JsNode | null = null;
      if (this.isPunct(':')) {
        this.next();
        this.skipType();
        if (this.isPunct('=')) value = this.parseAssignment();
      } else if (this.isPunct('=')) {
        value = this.parseAssignment();
      }
      this.consumeSemicolon();
      return this.node('PropertyDefinition', start, this.prev!.end, { key, value, computed, static: isStatic });
    }

    const params = this.parseParamsStrict();
    if (this.isPunct(':')) {
      this.next();
      this.skipType();
    }
    const body = this.parseBlock();
    const value = this.node('FunctionExpression', start, body.end, {
      id: null,
      params,
      body,
      async: isAsync,
      generator: false,
      expression: false,
    });
    return this.node('MethodDefinition', start, body.end, {
      key,
      value,
      kind,
      computed,
      static: isStatic,
    });
  }

  private parseImport(): JsNode {
    const start = this.peek().start;
    this.next(); // import
    const specifiers: JsNode[] = [];
    let source: JsNode | null = null;

    const mkSource = (): JsNode => {
      const t = this.peek();
      if (t.type !== Tok.Str) this.fail('expected module string', t);
      this.next();
      return this.node('Literal', t.start, t.end, { value: t.cooked ?? t.value.slice(1, -1), raw: t.value });
    };

    if (this.isPunct('{')) {
      this.next();
      while (!this.isPunct('}')) {
        const imported = this.identNode(this.next());
        let local: JsNode = imported;
        if (this.isIdent('as')) {
          this.next();
          local = this.identNode(this.next());
        }
        specifiers.push(this.node('ImportSpecifier', imported.start, local.end, { imported, local }));
        if (!this.eatPunct(',')) break;
      }
      this.expectPunct('}');
      this.expectIdent('from');
      source = mkSource();
    } else if (this.isPunct('*')) {
      const star = this.next();
      this.expectIdent('as');
      const local = this.identNode(this.next());
      specifiers.push(this.node('ImportNamespaceSpecifier', star.start, local.end, { local }));
      this.expectIdent('from');
      source = mkSource();
    } else if (this.isIdent('type')) {
      // `import type from 'm'` is a default import named `type`;
      // `import type { X } from 'm'` is a TS type-only import (no runtime).
      this.next();
      if (this.isIdent('from')) {
        const local = this.identNode(this.next());
        specifiers.push(this.node('ImportDefaultSpecifier', local.start, local.end, { local }));
        this.expectIdent('from');
        source = mkSource();
      } else {
        this.expectPunct('{');
        while (!this.isPunct('}')) {
          const imported = this.identNode(this.next());
          let local: JsNode = imported;
          if (this.isIdent('as')) {
            this.next();
            local = this.identNode(this.next());
          }
          specifiers.push(this.node('ImportSpecifier', imported.start, local.end, { imported, local }));
          if (!this.eatPunct(',')) break;
        }
        this.expectPunct('}');
        this.expectIdent('from');
        source = mkSource();
      }
    } else if (this.isIdent()) {
      const local = this.identNode(this.next());
      specifiers.push(this.node('ImportDefaultSpecifier', local.start, local.end, { local }));
      if (this.isPunct(',')) {
        this.next();
        if (this.isPunct('{')) {
          this.next();
          while (!this.isPunct('}')) {
            const imported = this.identNode(this.next());
            let local2: JsNode = imported;
            if (this.isIdent('as')) {
              this.next();
              local2 = this.identNode(this.next());
            }
            specifiers.push(this.node('ImportSpecifier', imported.start, local2.end, { imported, local: local2 }));
            if (!this.eatPunct(',')) break;
          }
          this.expectPunct('}');
        } else if (this.isPunct('*')) {
          const star = this.next();
          this.expectIdent('as');
          const ns = this.identNode(this.next());
          specifiers.push(this.node('ImportNamespaceSpecifier', star.start, ns.end, { local: ns }));
        } else {
          this.fail('expected { or * after default import', this.peek());
        }
      }
      this.expectIdent('from');
      source = mkSource();
    } else {
      // side-effect import: import 'm'
      source = mkSource();
    }
    this.consumeSemicolon();
    return this.node('ImportDeclaration', start, this.prev!.end, { specifiers, source });
  }

  private parseExport(): JsNode {
    const start = this.peek().start;
    this.next(); // export
    if (this.isKeyword('default')) {
      this.next();
      const declaration = this.parseStatement();
      return this.node('ExportDefaultDeclaration', start, this.prev!.end, { declaration });
    }
    if (this.isPunct('{')) {
      this.next();
      const specifiers: JsNode[] = [];
      while (!this.isPunct('}')) {
        const local = this.identNode(this.next());
        let exported: JsNode = local;
        if (this.isIdent('as')) {
          this.next();
          exported = this.identNode(this.next());
        }
        specifiers.push(this.node('ExportSpecifier', local.start, exported.end, { local, exported }));
        if (!this.eatPunct(',')) break;
      }
      this.expectPunct('}');
      let source: JsNode | null = null;
      if (this.isIdent('from')) {
        this.next();
        const t = this.peek();
        if (t.type !== Tok.Str) this.fail('expected module string', t);
        this.next();
        source = this.node('Literal', t.start, t.end, { value: t.cooked ?? t.value.slice(1, -1), raw: t.value });
      }
      this.consumeSemicolon();
      return this.node('ExportNamedDeclaration', start, this.prev!.end, { declaration: null, specifiers, source });
    }
    if (this.isPunct('*')) {
      const star = this.next();
      this.expectIdent('from');
      const t = this.peek();
      if (t.type !== Tok.Str) this.fail('expected module string', t);
      this.next();
      const source = this.node('Literal', t.start, t.end, { value: t.cooked ?? t.value.slice(1, -1), raw: t.value });
      this.consumeSemicolon();
      return this.node('ExportAllDeclaration', star.start, this.prev!.end, { source });
    }
    const declaration = this.parseStatement();
    return this.node('ExportNamedDeclaration', start, declaration.end, { declaration, specifiers: [], source: null });
  }

  private expectIdent(v: string): Token {
    const t = this.peek();
    if (t.type !== Tok.Ident || t.value !== v) this.fail(`expected '${v}'`, t);
    return this.next();
  }
}

/** Parse a JS/TS script into a Program AST. */
export function parse(src: string): JsNode {
  const parser = new Parser(src);
  return parser.parseProgram();
}

/** Parse a JS/TS expression into an expression AST node. */
export function parseExpression(src: string): JsNode {
  const parser = new Parser(src);
  return parser.parseExpressionNode();
}
