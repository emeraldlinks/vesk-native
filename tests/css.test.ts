import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCssClasses } from '../packages/compiler-native/src/css.ts';
import { collectCustomCss, compileVskResult } from '../packages/compiler-native/src/kotlin-codegen.ts';

describe('css generation', () => {
  it('maps box shorthand padding to per-side dp', () => {
    const r = parseCssClasses('.card { padding: 16px; margin: -8px 4px; background: #ff0000; border-radius: 12px; }');
    const card = r.classes.get('card');
    assert.ok(card);
    assert.deepEqual(card.padding, ['padding(16.dp)']);
    assert.ok(card.margin.includes('offset(y = -8.dp)'));
    assert.ok(card.margin.includes('padding(start = 4.dp)'));
    assert.deepEqual(card.background, ['background(Color(0xFFFF0000))']);
    assert.deepEqual(card.clip, ['clip(RoundedCornerShape(12.dp))']);
  });

  it('converts rgb() colors to Compose colors', () => {
    const r = parseCssClasses('.btn { color: rgb(10, 20, 30); }');
    const btn = r.classes.get('btn');
    assert.ok(btn);
    assert.deepEqual(btn.textStyle, ['color = Color(0xFF0A141E)']);
  });

  it('records var() usage and @-rules as skipped with reasons', () => {
    const r = parseCssClasses('.a { width: var(--w); }\n@media (min-width: 640px) { .b { width: 10px; } }');
    assert.equal(r.skipped.length, 2);
    assert.ok(r.skipped[0]!.includes('.a: var() in width is not supported in native (skipped)'));
    assert.ok(r.skipped.some((s) => s.startsWith('@-rule ignored')));
  });

  it('collects component <style> blocks as scoped classes', () => {
    const src = `component Card() {
    <section class="card"><p class="title">Hello</p></section>
    <style>
    .card { padding: 16px; background: #ffffff; border-radius: 16px; }
    .title { font-size: 18px; font-weight: 700; }
    </style>
}`;
    const cc = collectCustomCss([{ source: src }]);
    assert.deepEqual([...cc.scoped.keys()], ['Card']);
    const own = cc.scoped.get('Card')!;
    assert.ok(own.has('card'));
    assert.ok(own.has('title'));
    assert.deepEqual(cc.classes.size, 0);
  });

  it('applies scoped styles to the compiled modifier chain', () => {
    const src = `component Card() {
    <section class="card"><p>Hello</p></section>
    <style>
    .card { padding: 16px; background: #ffffff; border-radius: 16px; }
    </style>
}`;
    const r = compileVskResult(src, 'card.vsk');
    assert.deepEqual(r.errors, []);
    assert.ok(r.kt.includes('clip(RoundedCornerShape(16.dp))'));
    assert.ok(r.kt.includes('background(Color(0xFFFFFFFF))'));
    assert.ok(r.kt.includes('padding(16.dp)'));
  });
});
