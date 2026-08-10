// Hand-written, regex-free JS/TS lexer — the foundation of the vesk-native
// script compiler. Produces the token stream that the recursive-descent
// parser (parser.ts) consumes; together they replace the borrowed parse()
// from the web compiler. Per AGENTS.md no structural source analysis may use
// regex; every token below is produced by character-by-character scanning.
//
// Design notes:
//  - The lexer is a streaming scanner: `new Lexer(src)` + next()/peek().
//    The parser drives it, so template-literal substitutions and regex
//    literals (both context-sensitive) stay accurate.
//  - `tokenize(src)` is the flat convenience surface for tests and tools;
//    it uses a previous-token heuristic for regex literals.
//  - Keywords: only the truly reserved words become Keyword tokens. TS
//    contextual keywords (let, static, async, await, of, as, from, get,
//    set, type, keyof, satisfies, ...) are Ident tokens; the parser decides
//    by position, matching how the TypeScript scanner treats them.

export const Tok = {
  Ident: 'ident',
  Keyword: 'keyword',
  Num: 'num',
  BigInt: 'bigint',
  Str: 'str',
  NoSubTemplate: 'no-sub-template',
  TemplateHead: 'template-head',
  TemplateMiddle: 'template-middle',
  TemplateTail: 'template-tail',
  Regex: 'regex',
  Punct: 'punct',
  EOF: 'eof',
} as const;
export type Tok = (typeof Tok)[keyof typeof Tok];

export interface Token {
  type: Tok;
  /** Raw source slice (templates/strings keep their delimiters for reprint). */
  value: string;
  /** Unescaped value for Str / NoSubTemplate / Template* text portions. */
  cooked?: string;
  /** Regex literal: the pattern source (between slashes). */
  pattern?: string;
  /** Regex literal: the flags. */
  flags?: string;
  /** Byte offset of the token start in the source. */
  start: number;
  /** Byte offset just past the token end. */
  end: number;
  /** 1-based line. */
  line: number;
  /** 1-based column. */
  col: number;
}

export class LexError extends Error {
  readonly pos: number;
  readonly line: number;
  readonly col: number;
  constructor(message: string, pos: number, line: number, col: number) {
    super(`${message} (${line}:${col})`);
    this.name = 'LexError';
    this.pos = pos;
    this.line = line;
    this.col = col;
  }
}

/** Full lexer position/state — lets the parser backtrack cheaply. */
export interface LexerSnapshot {
  pos: number;
  line: number;
  lineStart: number;
  lookahead: Token[];
  frames: SubstFrame[];
  regexAllowed: boolean;
}

/** One active `${...}` substitution inside a template literal. */
export interface SubstFrame {
  /** Brace nesting inside the substitution expression; the `}` at depth 0
   *  closes the substitution and resumes template text. */
  depth: number;
}

// Reserved words that can never be identifiers (ECMAScript strict mode plus
// the module keywords). `null` and `true`/`false` are literal keywords.
const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
  'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void',
  'while', 'with',
]);

export function isReservedWord(word: string): boolean {
  return RESERVED.has(word);
}

// Longest-first punctuator table (JS + TS). Multi-char operators must be
// tried before their single-char prefixes.
const PUNCTUATORS = [
  '>>>=', '===', '!==', '>>>', '**=', '<<=', '>>=', '&&=', '||=', '??=',
  '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--',
  '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '...',
  '{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '+', '-', '*', '/', '%',
  '&', '|', '^', '!', '~', '?', ':', '=', '.', '@', '#',
];

const isDigit = (c: string): boolean => c >= '0' && c <= '9';
const isAsciiLetter = (c: string): boolean =>
  (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
// Approximation of ID_Start/ID_Continue for a compiler: ASCII letters,
// $, _, and any non-ASCII character (the full Unicode tables are a parser
// concern, not a correctness one for vesk source).
const isIdStart = (c: string): boolean => isAsciiLetter(c) || c === '$' || c === '_' || c.charCodeAt(0) > 0x7f;
const isIdPart = (c: string): boolean => isIdStart(c) || isDigit(c);

export class Lexer {
  private readonly src: string;
  private pos = 0;
  private lineStart = 0;
  private line = 1;
  private lookahead: Token[] = [];
  // Stack of active `${...}` substitutions (nested templates push another
  // frame; each frame carries its own brace depth). A `}` at the top frame's
  // depth 0 ends that substitution and resumes the enclosing template text.
  private frames: SubstFrame[] = [];
  // When true, the next `/` starts a regex literal (the parser toggles this;
  // tokenize() derives it from the previous token).
  regexAllowed = true;

  constructor(src: string) {
    this.src = src;
  }

  /** 1-based column of the current scan position. */
  private col(): number {
    return this.pos - this.lineStart + 1;
  }

  private error(message: string, at = this.pos): never {
    throw new LexError(message, at, this.line, at - this.lineStart + 1);
  }

  private peekChar(offset = 0): string {
    return this.src[this.pos + offset] ?? '';
  }

  private advance(): string {
    const c = this.src[this.pos] ?? '';
    if (c === '\n') {
      this.line++;
      this.lineStart = this.pos + 1;
    }
    this.pos++;
    return c;
  }

  private skipTrivia(): void {
    for (;;) {
      const c = this.peekChar();
      if (c === ' ' || c === '\t' || c === '\v' || c === '\f' || c === '\r' || c === '\n' || c === '\u00a0' || c === '\ufeff') {
        this.advance();
        continue;
      }
      if (c === '/' && this.peekChar(1) === '/') {
        while (this.pos < this.src.length) {
          const ch = this.advance();
          if (ch === '\n') break;
        }
        continue;
      }
      if (c === '/' && this.peekChar(1) === '*') {
        const start = this.pos;
        const startLine = this.line;
        this.advance();
        this.advance();
        let closed = false;
        while (this.pos < this.src.length) {
          if (this.peekChar() === '*' && this.peekChar(1) === '/') {
            this.advance();
            this.advance();
            closed = true;
            break;
          }
          this.advance();
        }
        if (!closed) this.error('unterminated block comment', start);
        void startLine;
        continue;
      }
      break;
    }
  }

  private scanIdentifier(): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col();
    this.advance();
    while (isIdPart(this.peekChar())) this.advance();
    const value = this.src.slice(start, this.pos);
    return {
      type: RESERVED.has(value) ? Tok.Keyword : Tok.Ident,
      value,
      start,
      end: this.pos,
      line,
      col,
    };
  }

  private scanNumber(): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col();
    const first = this.advance();

    if (first === '0') {
      const c1 = this.peekChar();
      if (c1 === 'x' || c1 === 'X') {
        this.advance();
        this.scanDigits('hex', start);
        return this.finishNumber(start, line, col, true);
      }
      if (c1 === 'o' || c1 === 'O') {
        this.advance();
        this.scanDigits('octal', start);
        return this.finishNumber(start, line, col, true);
      }
      if (c1 === 'b' || c1 === 'B') {
        this.advance();
        this.scanDigits('binary', start);
        return this.finishNumber(start, line, col, true);
      }
      if (isDigit(c1)) this.error('legacy octal literals are not allowed in strict mode', start);
    }

    let dotSeen = first === '.';
    let expSeen = false;
    for (;;) {
      const c = this.peekChar();
      if (c === '_') {
        const before = this.src[this.pos - 1] ?? '';
        const after = this.peekChar(1);
        if (!isDigit(before) || !isDigit(after)) this.error('numeric separator must sit between two digits', this.pos);
        this.advance();
        continue;
      }
      if (isDigit(c)) {
        this.advance();
        continue;
      }
      if (c === '.' && !dotSeen && !expSeen) {
        dotSeen = true;
        this.advance();
        continue;
      }
      if ((c === 'e' || c === 'E') && !expSeen) {
        const prev = this.src[this.pos - 1] ?? '';
        if (!isDigit(prev) && prev !== '.') break;
        let next = this.peekChar(1);
        if (next === '+' || next === '-') next = this.peekChar(2);
        if (!isDigit(next)) this.error('exponent has no digits', this.pos);
        expSeen = true;
        this.advance();
        if (this.peekChar() === '+' || this.peekChar() === '-') this.advance();
        continue;
      }
      break;
    }
    return this.finishNumber(start, line, col, false);
  }

  private scanDigits(kind: 'hex' | 'octal' | 'binary', start: number): void {
    let count = 0;
    for (;;) {
      const c = this.peekChar();
      if (c === '_') {
        const before = this.src[this.pos - 1] ?? '';
        const after = this.peekChar(1);
        if (!isDigit(before) && !isHexLetter(before, kind) || !isDigit(after) && !isHexLetter(after, kind)) {
          this.error('numeric separator must sit between two digits', this.pos);
        }
        this.advance();
        continue;
      }
      if (kind === 'hex' && isHexDigit(c)) { this.advance(); count++; continue; }
      if (kind === 'octal' && c >= '0' && c <= '7') { this.advance(); count++; continue; }
      if (kind === 'binary' && (c === '0' || c === '1')) { this.advance(); count++; continue; }
      break;
    }
    if (count === 0) this.error('missing digits after base prefix', start);
  }

  private finishNumber(start: number, line: number, col: number, base: boolean): Token {
    const raw = this.src.slice(start, this.pos);
    if (this.peekChar() === 'n') {
      // BigInt is only invalid after a decimal point or an exponent; base
      // prefixes (0x/0o/0b) can never contain those, and their digits can
      // include letters, so only check the decimal path.
      if (!base && (raw.includes('.') || raw.includes('e') || raw.includes('E'))) {
        this.error('bigint literal must be a plain integer', this.pos);
      }
      this.advance();
      return { type: Tok.BigInt, value: this.src.slice(start, this.pos), start, end: this.pos, line, col };
    }
    return { type: Tok.Num, value: raw, start, end: this.pos, line, col };
  }

  private scanString(quote: string): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col();
    this.advance();
    const out: string[] = [];
    for (;;) {
      const c = this.peekChar();
      if (c === '') this.error('unterminated string literal', start);
      if (c === quote) {
        this.advance();
        return { type: Tok.Str, value: this.src.slice(start, this.pos), cooked: out.join(''), start, end: this.pos, line, col };
      }
      if (c === '\n' || c === '\r') this.error('unterminated string literal', start);
      if (c === '\\') {
        this.advance();
        this.scanEscape(out, start, true);
        continue;
      }
      out.push(this.advance());
    }
  }

  // Appends the decoded escape (or the continuation result) to `out`.
  private scanEscape(out: string[], start: number, inString: boolean): void {
    const c = this.peekChar();
    if (c === '') this.error('unterminated escape sequence', start);
    // Line continuation: \<CRLF> | \<LF> | \<CR> — contributes nothing.
    if (c === '\n') { this.advance(); return; }
    if (c === '\r') {
      this.advance();
      if (this.peekChar() === '\n') this.advance();
      return;
    }
    switch (c) {
      case 'n': out.push('\n'); this.advance(); return;
      case 't': out.push('\t'); this.advance(); return;
      case 'r': out.push('\r'); this.advance(); return;
      case 'b': out.push('\b'); this.advance(); return;
      case 'f': out.push('\f'); this.advance(); return;
      case 'v': out.push('\v'); this.advance(); return;
      case '0': {
        this.advance();
        const next = this.peekChar();
        if (isDigit(next)) this.error('\\0 must not be followed by a digit', this.pos - 1);
        out.push('\0');
        return;
      }
      case 'x': {
        this.advance();
        out.push(this.scanUnicodeDigits(2));
        return;
      }
      case 'u': {
        this.advance();
        if (this.peekChar() === '{') {
          this.advance();
          const hexStart = this.pos;
          let hex = '';
          while (this.pos < this.src.length && isHexDigit(this.peekChar())) {
            hex += this.advance();
          }
          if (hex.length === 0) this.error('empty unicode escape', hexStart);
          if (hex.length > 6) this.error('unicode escape out of range', hexStart);
          if (this.peekChar() !== '}') this.error('unterminated unicode escape', hexStart);
          this.advance();
          out.push(String.fromCodePoint(parseInt(hex, 16)));
          return;
        }
        out.push(this.scanUnicodeDigits(4));
        return;
      }
      default:
        // Identity escape: \' \" \\ and any other character is itself
        // (in templates, `` ` `` and `${` are the meaningful ones).
        if (!inString && c === '`') {
          out.push('`');
          this.advance();
          return;
        }
        if (c === '$' && this.peekChar(1) === '{' && !inString) {
          out.push('$');
          out.push('{');
          this.advance();
          this.advance();
          return;
        }
        if (c !== '\\' && c !== '\'' && c !== '"') {
          this.error(`invalid escape sequence \\${c}`, this.pos - 1);
        }
        out.push(this.advance());
        return;
    }
  }

  private scanUnicodeDigits(count: number): string {
    let hex = '';
    for (let i = 0; i < count; i++) {
      const c = this.peekChar();
      if (!isHexDigit(c)) this.error('invalid unicode escape', this.pos);
      hex += this.advance();
    }
    return String.fromCharCode(parseInt(hex, 16));
  }

  private scanTemplate(resume: boolean): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col();
    // Resume mode follows a `}` that scanPunct already consumed; fresh mode
    // (a top-level `` ` ``) consumes the opening backtick here.
    if (!resume) this.advance();
    const cooked: string[] = [];
    for (;;) {
      const c = this.peekChar();
      if (c === '') this.error('unterminated template literal', start);
      if (c === '`') {
        this.advance();
        return {
          type: resume ? Tok.TemplateTail : Tok.NoSubTemplate,
          value: this.src.slice(start, this.pos),
          cooked: cooked.join(''),
          start,
          end: this.pos,
          line,
          col,
        };
      }
      if (c === '$' && this.peekChar(1) === '{') {
        this.advance();
        this.advance();
        this.frames.push({ depth: 0 });
        return {
          type: resume ? Tok.TemplateMiddle : Tok.TemplateHead,
          value: this.src.slice(start, this.pos),
          cooked: cooked.join(''),
          start,
          end: this.pos,
          line,
          col,
        };
      }
      if (c === '\\') {
        this.advance();
        this.scanEscape(cooked, start, false);
        continue;
      }
      if (c === '\n') {
        cooked.push(this.advance());
        continue;
      }
      cooked.push(this.advance());
    }
  }

  private scanRegex(): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col();
    this.advance(); // /
    let inClass = false;
    let pattern = '';
    for (;;) {
      const c = this.peekChar();
      if (c === '') this.error('unterminated regex literal', start);
      if (c === '\n' || c === '\r') this.error('unterminated regex literal (newline)', start);
      if (c === '\\') {
        pattern += this.advance();
        const n = this.peekChar();
        if (n === '') this.error('unterminated regex literal', start);
        pattern += this.advance();
        continue;
      }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) {
        this.advance();
        break;
      }
      pattern += this.advance();
    }
    let flags = '';
    while (isAsciiLetter(this.peekChar())) {
      const f = this.advance();
      if (flags.includes(f)) this.error(`duplicate regex flag ${f}`, this.pos - 1);
      flags += f;
    }
    return {
      type: Tok.Regex,
      value: this.src.slice(start, this.pos),
      pattern,
      flags,
      start,
      end: this.pos,
      line,
      col,
    };
  }

  private scanPunct(): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col();
    for (const p of PUNCTUATORS) {
      if (this.src.startsWith(p, this.pos)) {
        // `?.` is optional chaining only when not followed by a digit
        // (otherwise `?` then `.5` — a ternary and a decimal).
        if (p === '?.' && isDigit(this.peekChar(2))) break;
        if (p === '}') {
          const top = this.frames[this.frames.length - 1];
          if (top && top.depth === 0) {
            // The `}` ends the innermost ${...} substitution: resume the
            // enclosing template's text.
            this.frames.pop();
            this.advance();
            return this.scanTemplate(true);
          }
          if (top) {
            // `}` of a nested brace inside the substitution expression.
            top.depth--;
            this.advance();
            return { type: Tok.Punct, value: p, start, end: this.pos, line, col };
          }
        }
        if (p === '{' && this.frames.length > 0) {
          // Braces inside a substitution expression nest; only the outermost
          // `}` closes the ${...}.
          this.frames[this.frames.length - 1]!.depth++;
        }
        if (p === '/' && this.regexAllowed) {
          return this.scanRegex();
        }
        for (let i = 0; i < p.length; i++) this.advance();
        return { type: Tok.Punct, value: p, start, end: this.pos, line, col };
      }
    }
    this.error(`unexpected character '${this.peekChar()}'`, this.pos);
  }

  next(): Token {
    this.skipTrivia();
    const start = this.pos;
    if (start >= this.src.length) {
      return { type: Tok.EOF, value: '', start, end: start, line: this.line, col: this.col() };
    }
    const c = this.peekChar();
    if (c === '`') return this.scanTemplate(false);
    if (isIdStart(c)) return this.scanIdentifier();
    if (isDigit(c) || (c === '.' && isDigit(this.peekChar(1)))) return this.scanNumber();
    if (c === '\'' || c === '"') return this.scanString(c);
    return this.scanPunct();
  }

  peek(): Token {
    if (this.lookahead.length === 0) this.lookahead.push(this.next());
    return this.lookahead[0]!;
  }

  advanceToken(): Token {
    const t = this.lookahead.length > 0 ? this.lookahead.shift()! : this.next();
    return t;
  }

  save(): LexerSnapshot {
    return {
      pos: this.pos,
      line: this.line,
      lineStart: this.lineStart,
      lookahead: [...this.lookahead],
      frames: this.frames.map((f) => ({ depth: f.depth })),
      regexAllowed: this.regexAllowed,
    };
  }

  restore(snapshot: LexerSnapshot): void {
    this.pos = snapshot.pos;
    this.line = snapshot.line;
    this.lineStart = snapshot.lineStart;
    this.lookahead = snapshot.lookahead;
    this.frames = snapshot.frames.map((f) => ({ depth: f.depth }));
    this.regexAllowed = snapshot.regexAllowed;
  }
}

function isHexDigit(c: string): boolean {
  return isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}

function isHexLetter(c: string, kind: 'hex' | 'octal' | 'binary'): boolean {
  void kind;
  return isHexDigit(c);
}

// Heuristic: can a regex literal legally start here, given the previous
// significant token? Mirrors the common cases; the streaming Lexer lets the
// parser override this precisely.
export function regexAllowedAfter(prev: Token | undefined): boolean {
  if (!prev) return true;
  if (prev.type === Tok.Ident || prev.type === Tok.Keyword) {
    switch (prev.value) {
      case 'return': case 'typeof': case 'void': case 'delete': case 'new':
      case 'in': case 'instanceof': case 'of': case 'case': case 'throw':
      case 'do': case 'else': case 'yield': case 'await': case 'extends':
        return true;
      default:
        return false;
    }
  }
  if (prev.type === Tok.Punct) {
    switch (prev.value) {
      case ')': case ']': case '}': case '++': case '--':
        return false;
      default:
        return true;
    }
  }
  return true;
}

/** Flat tokenization of a JS/TS source string (tests, tooling, diagnostics). */
export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  const lex = new Lexer(src);
  let prev: Token | undefined;
  for (;;) {
    lex.regexAllowed = regexAllowedAfter(prev);
    const t = lex.next();
    out.push(t);
    if (t.type === Tok.EOF) break;
    if (t.type !== Tok.Regex) prev = t;
    else prev = { type: Tok.Ident, value: '__re', start: 0, end: 0, line: 0, col: 0 };
  }
  return out;
}

/** Human-readable rendering of a token stream (diagnostics). */
export function tokensToString(tokens: Token[]): string {
  return tokens.map((t) => `${t.line}:${t.col} ${t.type} ${JSON.stringify(t.value)}`).join('\n');
}
