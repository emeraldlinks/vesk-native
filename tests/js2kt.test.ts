import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../packages/compiler-native/src/parser.ts';
import { Js2Kt, KtErrors } from '../packages/compiler-native/src/js2kt.ts';
import type { JsNode } from '../packages/compiler-native/src/js2kt.ts';

function fresh() {
  const err = new KtErrors();
  return { err, j2k: new Js2Kt(err) };
}

function exprOf(j2k: Js2Kt, src: string): string {
  const ast = parse(src) as unknown as { body: JsNode[] };
  const decl = (ast.body[0] as any).declarations[0];
  return j2k.expr(decl.init);
}

function stmtOf(j2k: Js2Kt, src: string): string {
  const ast = parse(src) as unknown as { body: JsNode[] };
  return j2k.stmt(ast.body[0] as JsNode);
}

describe('js2kt translation', () => {
  let e: ReturnType<typeof fresh>;
  beforeEach(() => {
    e = fresh();
  });

  it('translates ternaries to Kotlin if-expressions with JS truthiness', () => {
    assert.equal(exprOf(e.j2k, 'let x = a ? "hi" : "bye"'), 'if (truthy(a)) "hi" else "bye"');
    assert.deepEqual(e.err.errors, []);
  });

  it('translates template literals to Kotlin templates', () => {
    assert.equal(exprOf(e.j2k, 'let x = `n=${n} d=${d + 1}`'), '"n=$n d=${d + 1}"');
  });

  it('translates array map/filter and length through js helpers', () => {
    assert.equal(exprOf(e.j2k, 'let y = items.map(i => i * 2)'), 'items.map { i -> i * 2 }');
    assert.equal(exprOf(e.j2k, 'let z = items.filter(i => i > 2).length'), 'jsLength(items.filter { i -> num(i) > num(2) })');
  });

  it('translates object literals to mutable String->Any? maps', () => {
    assert.equal(exprOf(e.j2k, 'let o = { name: "x", n: 1 }'), 'mutableMapOf<String, Any?>("name" to "x", "n" to 1)');
  });

  it('maps JSON.stringify to the runtime helper', () => {
    assert.equal(exprOf(e.j2k, 'let j = JSON.stringify(obj)'), 'jsStringify(obj)');
  });

  it('maps localStorage reads/writes to VeskWebStorage', () => {
    assert.equal(exprOf(e.j2k, 'let v = localStorage.getItem("k")'), 'VeskWebStorage.localGetItem("k")');
  });

  it('maps Math functions to kotlin.math with JS-faithful types', () => {
    assert.equal(exprOf(e.j2k, 'let m = Math.max(1, 2) + Math.round(3.7)'), 'kotlin.math.max(1, 2) + kotlin.math.round((3.7).toDouble()).toInt()');
  });

  it('emits try/catch/finally', () => {
    const out = stmtOf(e.j2k, 'try { throw "boom" } catch (e) { x = e.message } finally { y = 1 }');
    assert.ok(out.includes('catch (e: Exception) {'));
    assert.ok(out.includes('finally {'));
  });

  it('maps history navigation to the router helpers', () => {
    assert.equal(exprOf(e.j2k, 'let h = history.pushState(null, "", "/shop")'), 'veskNavigate("/shop")');
    assert.equal(stmtOf(e.j2k, 'history.back()'), 'veskGoBack();');
  });

  it('maps location.href writes to veskNavigate and rejects compound writes', () => {
    assert.equal(stmtOf(e.j2k, 'location.href = "/shop"'), 'veskNavigate("/shop");');
    const err2 = new KtErrors();
    const j2k2 = new Js2Kt(err2);
    stmtOf(j2k2, 'location.href += "/shop"');
    assert.ok(err2.errors[0]!.includes('location.href compound assignment is not supported'));
  });

  it('fails closed on async/await', () => {
    const err2 = new KtErrors();
    const j2k2 = new Js2Kt(err2);
    exprOf(j2k2, 'let x = await f();');
    assert.ok(err2.errors.length > 0);
    assert.match(err2.errors[0]!, /await requires async\/promise support/);

    const err3 = new KtErrors();
    const j2k3 = new Js2Kt(err3);
    stmtOf(j2k3, 'async function g() { await h() }');
    assert.match(err3.errors[0]!, /async functions are not supported/);
  });

  it('fails closed on unsupported browser APIs instead of miscompiling', () => {
    for (const src of ['let x = history.replaceState(null, "", "/a");', 'let b = atob("aGk=");']) {
      const err2 = new KtErrors();
      const j2k2 = new Js2Kt(err2);
      const out = exprOf(j2k2, src);
      assert.ok(err2.errors.length > 0, src);
      assert.ok(out.startsWith('error("vesk: '), src);
    }
  });
});
