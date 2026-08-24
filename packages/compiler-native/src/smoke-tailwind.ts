import { classify, buildModifier, buildTextStyle, layoutArgs, elementAxis } from '@compiler-native/tailwind';

const cases: Array<[string, string[]]> = [
  ['gradient', ['bg-gradient-to-r', 'from-blue-500', 'via-purple-500', 'to-pink-500']],
  ['gradient-t', ['bg-gradient-to-t', 'from-red-500', 'to-blue-500']],
  ['rotate', ['rotate-45']],
  ['scale', ['scale-110', 'scale-x-50']],
  ['translate', ['translate-x-4', 'translate-y-2']],
  ['skew', ['skew-x-6']],
  ['blur', ['blur', 'blur-lg']],
  ['z', ['z-10']],
  ['aspect', ['aspect-video', 'aspect-square']],
  ['ring', ['ring-2', 'ring-blue-500']],
  ['ring-default', ['ring']],
  ['outline', ['outline-2', 'outline-red-500']],
  ['side-borders', ['border-t-2', 'border-x-4', 'border-red-500']],
  ['border-combo', ['border', 'border-blue-500']],
  ['divide', ['divide-y', 'divide-2', 'divide-gray-200']],
  ['line-clamp', ['line-clamp-2']],
  ['truncate', ['truncate']],
  ['ellipsis', ['text-ellipsis']],
  ['whitespace', ['whitespace-nowrap']],
  ['scroll', ['overflow-y-auto']],
  ['overflow-hidden', ['overflow-hidden']],
  ['flex-weight', ['flex-1']],
  ['invisible', ['invisible']],
  ['overline', ['overline']],
  ['decoration', ['decoration-blue-500']],
  ['max-w', ['max-w-md', 'max-w-prose']],
  ['max-w-screen', ['max-w-screen-xl']],
  ['min-w-full', ['min-w-full']],
  ['min-h-screen', ['min-h-screen']],
  ['max-h', ['max-h-96']],
  ['text-start', ['text-start']],
  ['drop-shadow', ['drop-shadow-lg']],
  ['drop-shadow-color', ['drop-shadow-lg', 'drop-shadow-red-500']],
  ['shadow-color', ['shadow', 'shadow-blue-500']],
  ['space', ['space-x-4']],
  ['leading-tight', ['text-xl', 'leading-tight']],
  ['text-wrap', ['text-wrap']],
  ['text-nowrap', ['text-nowrap']],
  ['whitespace-pre', ['whitespace-pre']],
  ['brightness', ['brightness-150']],
  ['contrast', ['contrast-50']],
  ['grayscale', ['grayscale']],
  ['hue-rotate', ['hue-rotate-180']],
  ['invert', ['invert']],
  ['saturate', ['saturate-200']],
  ['sepia', ['sepia-0']],
  ['border-dashed', ['border-2', 'border-red-500', 'border-dashed']],
  ['border-dotted', ['border', 'border-dotted']],
  ['divide-x-2', ['divide-x-2', 'divide-gray-200']],
  ['overflow-x-hidden', ['overflow-x-hidden']],
  ['self', ['self-center']],
  ['line-clamp-none', ['line-clamp-2', 'line-clamp-none']],
  ['overflow-clip', ['overflow-clip']],
  ['ring-none', ['ring-2', 'ring-none']],
  ['border-none', ['border-2', 'border-none']],
  ['neg-mt', ['-mt-4']],
  ['neg-mx', ['-mx-2']],
  ['neg-m', ['-m-px']],
  ['divide-dashed', ['divide-x', 'divide-dashed', 'divide-slate-400']],
  ['divide-none', ['divide-y', 'divide-none']],
  ['divide-double', ['divide-y-2', 'divide-double']],
  ['outline-dashed', ['outline-2', 'outline-dashed']],
  ['container', ['container']],
  ['flex-wrap', ['flex', 'flex-wrap', 'gap-2']],
  ['flex-nowrap', ['flex', 'flex-nowrap', 'gap-2']],
  ['text-uppercase', ['uppercase']],
  ['text-lowercase', ['lowercase']],
  ['text-capitalize', ['capitalize']],
  ['text-normal-case', ['uppercase', 'normal-case']],
  // ---- basis / flex / shrink ----
  ['basis-1/2', ['basis-1/2']],
  ['basis-full', ['basis-full']],
  ['basis-0', ['basis-0']],
  ['basis-auto', ['basis-auto']],
  ['basis-px', ['basis-px']],
  ['flex-0', ['flex-0']],
  ['flex-initial', ['flex-initial']],
  ['flex-none', ['flex-none']],
  ['grow-0', ['grow-0']],
  ['shrink', ['shrink']],
  ['shrink-0', ['shrink-0']],
  // ---- viewport units ----
  ['w-svw', ['w-svw']],
  ['w-dvw', ['w-dvw']],
  ['h-svh', ['h-svh']],
  ['h-dvh', ['h-dvh']],
  ['size-lvh', ['size-lvh']],
  // ---- grid ----
  ['grid-2', ['grid', 'grid-cols-2']],
  ['grid-3-gap', ['grid', 'grid-cols-3', 'gap-4']],
  ['grid-gap-xy', ['grid', 'grid-cols-2', 'gap-x-4', 'gap-y-2']],
  ['grid-inline', ['inline-grid', 'grid-cols-4', 'gap-2']],
  ['grid-cols-none', ['grid', 'grid-cols-none']],
  ['grid-rows-only', ['grid', 'grid-rows-3']],
  // ---- positioning ----
  ['relative', ['relative']],
  ['relative-nudge', ['relative', 'top-2']],
  ['absolute-tl', ['absolute', 'top-0', 'left-0']],
  ['absolute-tr', ['absolute', 'top-4', 'right-4']],
  ['absolute-bl', ['absolute', 'bottom-2', 'left-4']],
  ['absolute-inset-0', ['absolute', 'inset-0']],
  ['absolute-inset-4', ['absolute', 'inset-4']],
  ['absolute-inset-y-right', ['absolute', 'inset-y-0', 'right-0']],
  ['absolute-left-only', ['absolute', 'left-8']],
  ['fixed-top', ['fixed', 'top-2', 'left-2']],
  ['static-reset', ['absolute', 'static']],
];

for (const [name, classes] of cases) {
  const parts = classify(classes, undefined, elementAxis(classes) === 'row' ? 'row' : 'column');
  const mod = buildModifier(parts);
  const style = buildTextStyle(parts);
  console.log(`--- ${name} [${classes.join(' ')}]`);
  if (mod) console.log('  mod:', mod);
  if (style) console.log('  style:', style);
  if (parts.text.maxLines !== undefined || parts.text.overflow !== undefined || parts.text.softWrap !== undefined || parts.text.transform !== undefined) {
    console.log('  text:', JSON.stringify(parts.text));
  }
  if (parts.divide) console.log('  divide:', JSON.stringify(parts.divide));
  if (parts.flow !== undefined) console.log('  flow:', parts.flow);
  if (parts.position) console.log('  position:', parts.position);
  const layout = layoutArgs(classes, elementAxis(classes));
  if (Object.keys(layout).length) console.log('  layout:', JSON.stringify(layout));
}

// drops — utilities that produce no Compose output (no modifier, no style)
const drops = ['hover:bg-red-500', 'z-auto', 'shadow-none', 'truncate-not', 'order-2', 'col-span-2', 'float-left', 'absolute', 'static'];
for (const c of drops) {
  const parts = classify([c], undefined, 'column');
  console.log(`--- drop? [${c}] mod=${buildModifier(parts) ?? '(none)'} style=${buildTextStyle(parts) ?? '(none)'}`);
}

// warns (transition/animate → use motion.animate() instead)
const warns = ['transition', 'transition-colors', 'duration-300', 'ease-in-out', 'delay-100', 'animate-spin', 'animate-pulse', 'animate-bounce'];
for (const c of warns) {
  const parts = classify([c], undefined, 'column');
  console.log(`--- warn? [${c}] warnings=${JSON.stringify(parts.warnings ?? [])} mod=${buildModifier(parts) ?? '(none)'}`);
}
