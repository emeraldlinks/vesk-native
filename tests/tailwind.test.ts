import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classify, resolveModifier, resolveTextStyle, buildModifier, layoutArgs, elementAxis, isHidden, tailwindColor, cssColorToKt } from '../packages/compiler-native/src/tailwind.ts';

describe('tailwind generation', () => {
  it('maps spacing utilities to dp padding', () => {
    const parts = classify(['p-4']);
    assert.deepEqual(parts.padding, ['padding(16.dp)']);
  });

  it('builds a modifier chain in clip > background > padding order', () => {
    const kt = buildModifier(classify(['p-4', 'rounded-xl', 'bg-blue-500']));
    assert.equal(kt, 'Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF3B82F6)).padding(16.dp)');
  });

  it('resolves combined class lists to a modifier string', () => {
    assert.equal(resolveModifier(['p-2', 'bg-red-500']), 'Modifier.background(Color(0xFFEF4444)).padding(8.dp)');
  });

  it('returns null when no classes produce modifiers (layout-only)', () => {
    assert.equal(resolveModifier(['flex', 'gap-2', 'items-center']), null);
  });

  it('builds text style with size, leading, weight and color', () => {
    assert.equal(
      resolveTextStyle(['text-lg', 'font-bold', 'text-blue-500']),
      'TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, color = Color(0xFF3B82F6))',
    );
  });

  it('extracts row arrangement and alignment', () => {
    const args = layoutArgs(['flex', 'gap-3', 'justify-between', 'items-center'], 'row');
    assert.equal(args.horizontalArrangement, 'Arrangement.SpaceBetween');
    assert.equal(args.verticalAlignment, 'Alignment.CenterVertically');
  });

  it('detects axis direction from classes', () => {
    assert.equal(elementAxis(['flex-row']), 'row');
    assert.equal(elementAxis([]), 'column');
  });

  it('flags hidden elements', () => {
    assert.equal(isHidden(['hidden']), true);
    assert.equal(isHidden(['block']), false);
  });

  it('resolves palette colors by name', () => {
    assert.equal(tailwindColor('red-500'), 'Color(0xFFEF4444)');
    assert.equal(tailwindColor('not-a-color'), null);
  });

  it('converts CSS color syntax to Compose Color literals', () => {
    assert.equal(cssColorToKt('#00ff00'), 'Color(0xFF00FF00)');
    assert.equal(cssColorToKt('rgb(1,2,3)'), 'Color(0xFF010203)');
    assert.equal(cssColorToKt('rgba(4,5,6,0.5)'), 'Color(0x80040506)');
    assert.equal(cssColorToKt('banana'), null);
  });

  it('merges custom class parts into classification', () => {
    const custom = new Map([['card', classify(['p-4'])]]);
    const parts = classify(['card'], custom);
    assert.deepEqual(parts.padding, ['padding(16.dp)']);
  });
});
