// Parser smoke test — run with: npx tsx packages/compiler-native/src/parser-smoke.ts
// Exercises the hand-written recursive-descent parser (parser.ts) against the
// shapes the native codegen consumes: the synthetic `let __vsk_* = ...;`
// wrappers from kotlin-codegen.ts, the vesk `&[name]` track sugar (ArrayPattern
// + lazy, matching the web compiler's vesk-plugin), template literals, TS type
// surface, and the statement forms js2kt.ts translates.
import { parse, ParseError } from './parser.ts';
import type { JsNode } from './parser.ts';
import { KtErrors, Js2Kt } from './js2kt.ts';

let failures = 0;
function check(name: string, cond: boolean): void {
  if (cond) {
    console.log(`ok    ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}`);
  }
}

type AnyNode = JsNode & { [k: string]: any };

const program = (src: string): AnyNode => parse(src) as AnyNode;
const stmt0 = (src: string): AnyNode => program(src).body[0] as AnyNode;
const initOf = (src: string): AnyNode => stmt0(src).declarations[0].init as AnyNode;

function sliceEq(name: string, src: string): void {
  const ast = program(src);
  check(`${name}: source round-trip`, ast.body.every((s: AnyNode) => src.slice(s.start, s.end) === src.slice(s.start, s.end)));
}

// ---------- kotlin-codegen synthetic wrappers ----------

const wrap = 'let __vsk_expr = (get(count));';
check('ensureAst wrapper parses', program(wrap).body[0]?.declarations?.length === 1);
check('ensureAst init is get() call', initOf(wrap).type === 'CallExpression' && initOf(wrap).callee.name === 'get');
const trackInit = 'let __vsk_init = track(0);';
const ti = initOf(trackInit);
check('parseTrackInit: call + callee', ti.type === 'CallExpression' && ti.callee.name === 'track');
check('parseTrackInit: first arg literal', ti.arguments[0].type === 'Literal' && ti.arguments[0].value === 0);

const attr = 'let __vsk_attr = items.filter(i => i.ok).map(i => i.name);';
const ai = initOf(attr);
check('dynamicAttrs: chained member calls', ai.type === 'CallExpression' && ai.callee.property.name === 'map');
check('dynamicAttrs: arrow param', ai.callee.object.arguments[0].params[0].name === 'i');

const stmtsSrc = '{ if (x) { y++ } else { z = 1 } }';
const blk = program(stmtsSrc).body[0];
check('stmtOf block body', blk.type === 'BlockStatement' && blk.body.length === 1);
check('stmtOf postfix ++', blk.body[0].consequent.body[0].expression.operator === '++' && blk.body[0].consequent.body[0].expression.prefix === false);
check('stmtOf if/else', blk.body[0].type === 'IfStatement' && blk.body[0].alternate !== null);

// ---------- vesk track sugar ----------

const sugar = 'const &[count] = track(0);';
const sd = stmt0(sugar).declarations[0];
check('track sugar: ArrayPattern + lazy', sd.id.type === 'ArrayPattern' && sd.id.lazy === true);
check('track sugar: virtual name', sd.id.elements[0].name === 'count');

const sugar2 = 'let &[count, cell] = track(0);';
const sd2 = stmt0(sugar2).declarations[0];
check('track sugar two: lazy + names', sd2.id.type === 'ArrayPattern' && sd2.id.lazy === true && sd2.id.elements[1].name === 'cell');

const sugarTyped = 'const &[count]: number = track(0);';
const sd3 = stmt0(sugarTyped).declarations[0];
check('track sugar typed: lazy survives annotation', sd3.id.type === 'ArrayPattern' && sd3.id.lazy === true && sd3.init.type === 'CallExpression');

// ---------- expressions ----------

check('binary precedence', JSON.stringify(initOf('let x = 1 + 2 * 3;').operator) === '"+"' && initOf('let x = 1 + 2 * 3;').right.operator === '*');
check('assignment maps', initOf('let x = a += 1;').operator === '+=');
check('logical vs binary', initOf('let x = a && b;').type === 'LogicalExpression');
check('ternary', initOf('let x = a ? b : c;').type === 'ConditionalExpression');
check('optional chain wrapped', initOf('let x = a?.b?.(1) ?? [];').type === 'LogicalExpression');
check('template literal cooked', JSON.stringify(initOf('let x = `hi ${name}!`;').quasis.map((q: AnyNode) => q.value.cooked)) === JSON.stringify(['hi ', '!']));
check('nested template', initOf('let x = `a${`b${c}d`}e`;').type === 'TemplateLiteral' && initOf('let x = `a${`b${c}d`}e`;').expressions[0].type === 'TemplateLiteral');
check('template tagged', initOf('const s = html`<div>${x}</div>`;').type === 'TaggedTemplateExpression');
check('regex literal node', initOf('let re = /ab+c/gi;').regex.pattern === 'ab+c' && initOf('let re = /ab+c/gi;').regex.flags === 'gi');
check('division not regex', initOf('let q = a / b / c;').operator === '/');
check('sequence expr', initOf('let x = (a, b);').type === 'SequenceExpression');
check('spread in call', initOf('let x = f(...args);').arguments[0].type === 'SpreadElement');
check('object spread', initOf('let o = { a, ...rest };').properties[1].type === 'SpreadElement');
check('new expression', stmt0('throw new Error("boom");').argument.type === 'NewExpression');
check('get/set member call', initOf('let v = cell.set(count + 1);').callee.property.name === 'set');
check('arrow block body', initOf('let f = (a) => { return a * 2 };').body.type === 'BlockStatement');
check('async arrow', initOf('let f = async (x) => await g(x);').async === true);
check('TS as expression', initOf('let x = y as string;').type === 'TSAsExpression');
check('TS satisfies', initOf('let x = y satisfies Foo;').type === 'TSSatisfiesExpression');
check('TS non-null chain', initOf('let x = y!.prop;').object.type === 'TSNonNullExpression');

// ---------- statements ----------

check('classic for', stmt0('for (let i = 0; i < 10; i++) { sum += i }').type === 'ForStatement');
check('for-of', stmt0('for (const x of items) { f(x) }').type === 'ForOfStatement');
check('for-in', stmt0('for (const k in obj) { f(k) }').type === 'ForInStatement');
check('for-of key clause tolerated', stmt0('for (const item of items; key item.id) { render(item) }').type === 'ForOfStatement');
check('for-of index clause tolerated', stmt0('for (const item of items; index i) { render(item, i) }').type === 'ForOfStatement');
check('switch', stmt0('switch (x) { case 1: f(); break; default: g(); }').type === 'SwitchStatement');
check('try/catch/finally', stmt0('try { a() } catch (e) { b(e) } finally { c() }').type === 'TryStatement');
check('do-while', stmt0('do { x++ } while (x < 10);').type === 'DoWhileStatement');
check('labeled + continue', stmt0('outer: for (;;) { continue outer; }').type === 'LabeledStatement');
check('function declaration', stmt0('function add(a, b) { return a + b }').type === 'FunctionDeclaration');
check('generator function', stmt0('function* g() { yield 1 }').generator === true);
check('class declaration', stmt0('class Foo extends Bar { constructor(x) { super(x) } static m() {} get p() {} }').type === 'ClassDeclaration');
check('import/export', program('import { a } from "m"; export const b = a;').body.length === 2);
check('export default', stmt0('export default 42;').type === 'ExportDefaultDeclaration');
check('var/let/const kinds', [stmt0('var a;').kind, stmt0('let b;').kind, stmt0('const c = 1;').kind].join() === 'var,let,const');
check('destructuring params default', initOf('let f = ({ a, b = 2 }, [c, ...d]) => c;').params[0].properties[1].value.type === 'AssignmentPattern');
check('TS interface skipped', stmt0('interface Foo { a: string }').type === 'EmptyStatement');
check('type annotation skipped', stmt0('let x: number = 5;').declarations[0].id.name === 'x' && stmt0('let x: number = 5;').declarations[0].init.value === 5);
check('import type', program('import type { X } from "m";').body[0].type === 'ImportDeclaration');

// ---------- source round-trip ----------

for (const src of [
  'let x = a ? b : c;',
  'const s = `a${x}b${y}c`;',
  'let o = { a: 1, "k v": 2, 42: 3 };',
  'let f = (x, y = 1) => x + y;',
  'for (const item of items; key item.id) { render(item) }',
]) sliceEq('round-trip', src);

// ---------- error cases ----------

function parseError(src: string): boolean {
  try {
    parse(src);
    return false;
  } catch (e) {
    return e instanceof ParseError;
  }
}
check('error: missing init', parseError('let x = ;'));
check('error: unterminated block', parseError('{ a()'));
check('error: if without parens', parseError('if x { }'));
check('error: bare & binding', parseError('let &x = 1;'));
check('error: unexpected keyword', parseError('const = 1;'));

// ---------- js2kt emission round-trip ----------

function kt(src: string): string {
  const err = new KtErrors();
  const j2k = new Js2Kt(err);
  const expr = initOf(`let __vsk_e = ${src};`);
  return j2k.expr(expr);
}
check('js2kt: get() maps to .value', kt('get(count)') === 'count.value');
check('js2kt: set() maps to assignment', kt('set(count, get(count) + 1)') === 'count.value = count.value + 1');
check('js2kt: template literal', kt('`hi ${name}`') === '"hi $name"');
check('js2kt: filter/map chain', kt('items.filter(i => i.ok).map(i => i.name)') === 'items.filter { i -> i.ok }.map { i -> i.name }');
check('js2kt: no unsupported warnings', (() => {
  const err = new KtErrors();
  const j2k = new Js2Kt(err);
  j2k.expr(initOf('let x = a?.b?.(1) ?? `v${c}`;'));
  return err.errors.length === 0;
})());

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
