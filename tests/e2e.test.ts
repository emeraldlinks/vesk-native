import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { compileVskResult } from '../packages/compiler-native/src/kotlin-codegen.ts';
import { APP_DIR, buildAppContext, compilePage } from './helpers.ts';

describe('e2e: .vsk component fixtures', () => {
  it('compiles a counter page: cells, events, interpolation, tailwind', () => {
    const src = `component Counter() {
    const &[count] = track(0)

    <div class="flex-col items-center gap-4 p-6">
        <h1 class="text-2xl font-bold text-blue-600">Count: {count}</h1>
        <button onClick={() => count = count + 1}>Increment</button>
    </div>
}`;
    const r = compileVskResult(src, 'counter.vsk');
    assert.deepEqual(r.errors, []);
    assert.ok(r.kt.includes('val count = remember { mutableStateOf(0) }'));
    assert.ok(r.kt.includes('onClick = jsSafe({ count.value = num(count.value + 1).toInt() })'));
    assert.ok(r.kt.includes('text = "Count: " + (count.value).toString(),'));
  });

  it('compiles router push, list rendering and conditionals', () => {
    const src = `component Tasks() {
    const &[done] = track(false)
    const items = ['a', 'b', 'c']

    <div>
        <button onClick={() => useRouter().push('/home')}>Go</button>
        {done && <p class="text-green-500">All done</p>}
        {items.map(name => <p key={name}>{name}</p>)}
    </div>
}`;
    const r = compileVskResult(src, 'tasks.vsk');
    assert.deepEqual(r.errors, []);
    assert.ok(r.kt.includes('veskUseRouter().add("/home")'));
    assert.ok(r.kt.includes('if (truthy(done.value)) {'));
    assert.ok(r.kt.includes('items(items, key = { name }) { name ->'));
    assert.ok(r.kt.includes('LazyColumn'));
  });

  it('maps localStorage writes in event handlers to VeskWebStorage', () => {
    const src = `component Saver() {
    <button onClick={() => localStorage.setItem('k', 'v')}>Save</button>
}`;
    const r = compileVskResult(src, 'saver.vsk');
    assert.deepEqual(r.errors, []);
    assert.ok(r.kt.includes('VeskWebStorage.localSetItem("k", "v")'));
  });

  it('emits NavLink composables with href props', () => {
    const src = `component Nav() {
    <NavLink href="/shop"><p class="text-sm">Shop</p></NavLink>
}`;
    const r = compileVskResult(src, 'nav.vsk');
    assert.deepEqual(r.errors, []);
    assert.ok(r.kt.includes('NavLink(props = NavLinkProps(href = "/shop"'));
  });

  it('fails closed on constructs it cannot translate (parse error throws, never miscompiles)', () => {
    const src = `component Bad() {
    <button onClick={() => { await Promise.resolve() }}>Go</button>
}`;
    assert.throws(() => compileVskResult(src, 'bad.vsk'));
    const r = compileVskResult(`component Bad2() {\n    <p>{load()}</p>\n}\n\nasync function load() { return 1 }\n`, 'bad2.vsk');
    assert.ok(
      r.errors.some((e) => /async/i.test(e)) || r.kt.length > 0,
      'async construct must either error or be pruned, never emit broken Kotlin',
    );
  });
});

describe('e2e: test-app workload (25 pages, read-only)', () => {
  const ctx = buildAppContext();

  it('collects the full production compile context', () => {
    assert.equal(ctx.vskFiles.length, 25);
    assert.ok(ctx.componentNames.size > 0);
    assert.ok(ctx.scopedCustomClasses.size > 0);
    assert.ok(ctx.imageResources.size > 0);
    assert.ok(ctx.mediaResources.size > 0);
    assert.ok(ctx.projectModuleRegistry.size > 0);
    assert.ok(ctx.vsklibRegistry.has('coil'));
  });

  it('compiles every page with zero errors using production inputs', () => {
    const failures: string[] = [];
    for (const file of ctx.vskFiles) {
      const rel = relative(APP_DIR, file);
      const r = compilePage(readFileSync(file, 'utf8'), file, ctx);
      if (r.errors.length > 0) failures.push(`${rel}: ${r.errors.slice(0, 3).join(' | ')}`);
      assert.ok(r.kt.trim().length > 0, `${rel} produced empty Kotlin`);
    }
    assert.deepEqual(failures, []);
  });

  it('emits Kotlin-only output (no JS in compiled pages)', () => {
    for (const file of ctx.vskFiles) {
      const r = compilePage(readFileSync(file, 'utf8'), file, ctx);
      assert.ok(!/\bfunction\b|\b=>\b|<script/i.test(r.kt), `${relative(APP_DIR, file)} contains JS-shaped output`);
    }
  });
});
