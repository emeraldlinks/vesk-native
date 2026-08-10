// Lexer smoke test — run with: npx tsx packages/compiler-native/src/lexer-smoke.ts
import { Lexer, LexError, Tok, tokenize, tokensToString } from './lexer.ts';

let failures = 0;
function check(name: string, cond: boolean): void {
  if (cond) {
    console.log(`ok    ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}`);
  }
}

const types = (src: string): string[] => tokenize(src).filter((t) => t.type !== Tok.EOF).map((t) => t.type);
const values = (src: string): string[] => tokenize(src).filter((t) => t.type !== Tok.EOF).map((t) => t.value);

check('identifier + keyword split', JSON.stringify(types('const foo = bar')) === JSON.stringify([Tok.Keyword, Tok.Ident, Tok.Punct, Tok.Ident]));
check('contextual keywords stay ident', types('let type of as satisfies await get') .every((t) => t === Tok.Ident));
check('hex / octal / binary numbers', JSON.stringify(values('0xFF 0o77 0b101')) === JSON.stringify(['0xFF', '0o77', '0b101']));
check('bigint', types('10n 0x10n') .every((t) => t === Tok.BigInt));
check('numeric separators', types('1_000 0xFF_FF') .every((t) => t === Tok.Num));
check('floats + exponents', JSON.stringify(values('.5 1. 1.5 1e3 1e-3 1.5e+10')) === JSON.stringify(['.5', '1.', '1.5', '1e3', '1e-3', '1.5e+10']));
check('string escapes', tokenize('"a\\nb\\t\\u0041\\x42"')[0]?.cooked === 'a\nb\tAB');
check('longest-match punctuators', JSON.stringify(values('a >>> b === c ** d ?? e &&= f')) .includes('>>>') && JSON.stringify(values('a >>> b === c ** d ?? e &&= f')).includes('===') && JSON.stringify(values('a >>> b === c ** d ?? e &&= f')).includes('&&='));
check('optional chain vs ternary+decimal', JSON.stringify(values('a?.b ? .5 : 0')) === JSON.stringify(['a', '?.', 'b', '?', '.5', ':', '0']));
check('template no-substitution', tokenize('`hi ${1 + 2}`')[0]?.type === Tok.TemplateHead && tokenize('`hi`')[0]?.type === Tok.NoSubTemplate);
check('template middle/tail', JSON.stringify(types('`a${x}b${y}c`').slice(1)) === JSON.stringify([Tok.Ident, Tok.TemplateMiddle, Tok.Ident, Tok.TemplateTail]));
check('template nested braces', types('`a${ {b: 1} }c`') .filter((t) => t === Tok.Punct).length === 3);
check('regex after return', tokenize('return /a+b/g')[1]?.type === Tok.Regex);
check('division not regex after ident', types('x / y')[1] === Tok.Punct && values('x / y')[1] === '/');
check('regex after (', types('match(/x/)')[2] === Tok.Regex);
check('block + line comments skipped', values('a // hi\nb /* mid */ c').length === 3);

// Streaming lexer drives template substitution state precisely.
const stream = new Lexer('`a${x}b`');
stream.regexAllowed = false;
const s1 = stream.next(); // TemplateHead
const s2 = stream.next(); // Ident x
const s3 = stream.next(); // TemplateTail (} closes substitution)
check('streaming template substitution', s1.type === Tok.TemplateHead && s2.type === Tok.Ident && s3.type === Tok.TemplateTail);

// Error cases
function lexError(src: string): LexError | null {
  try {
    tokenize(src);
    return null;
  } catch (e) {
    return e instanceof LexError ? e : null;
  }
}
check('error: unterminated string', lexError('"abc') !== null);
check('error: legacy octal', lexError('0755') !== null);
check('error: bad separator', lexError('1__0') !== null);
check('error: empty hex', lexError('0x') !== null);
check('error: invalid escape', lexError('"\\q"') !== null);

const sample = `
const &[count] = track(0)
async function load() {
  const res = await fetch('/api', { method: 'POST', body: JSON.stringify({ n: count.value }) })
  return res.ok ? \`got \${res.status} bytes\` : null
}
`;
console.log('\n--- sample token stream ---');
console.log(tokensToString(tokenize(sample)));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
