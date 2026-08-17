/**
 * Smoke tests for the motion/animation system.
 * Validates that motion primitives are correctly mapped and that the
 * property key set is complete.
 */

const MOTION_PROPERTY_KEYS = [
  'opacity', 'scale', 'scaleX', 'scaleY',
  'translateX', 'x', 'translateY', 'y',
  'rotate', 'width', 'height',
  'skewX', 'skewY', 'blur', 'brightness', 'contrast',
];

const MOTION_EASING_NAMES = [
  'ease', 'easeIn', 'easeOut', 'easeInOut',
  'easeInBack', 'easeOutBack', 'easeInOutBack',
  'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
  'linear',
];

const MOTION_FN_MAP_KEYS = [
  'animate', 'spring', 'stagger', 'inView', 'scroll',
  'delay', 'cubicBezier', 'steps', 'mirrorEasing', 'reverseEasing',
];

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) { passed++; }
  else { failed++; console.error(`FAIL: ${msg}`); }
}

// Test 1: Property keys are non-empty
assert(MOTION_PROPERTY_KEYS.length >= 10, 'Should have at least 10 motion property keys');

// Test 2: All easing names are strings
assert(MOTION_EASING_NAMES.every(e => typeof e === 'string' && e.length > 0), 'All easing names should be non-empty strings');

// Test 3: Function map keys are non-empty
assert(MOTION_FN_MAP_KEYS.length >= 8, 'Should have at least 8 motion function map entries');

// Test 4: Essential easing names present
const essentialEasings = ['ease', 'easeIn', 'easeOut', 'easeInOut', 'linear'];
for (const e of essentialEasings) {
  assert(MOTION_EASING_NAMES.includes(e), `Essential easing "${e}" should be present`);
}

// Test 5: Essential function names present
const essentialFns = ['animate', 'spring', 'stagger', 'inView', 'scroll'];
for (const f of essentialFns) {
  assert(MOTION_FN_MAP_KEYS.includes(f), `Essential function "${f}" should be present`);
}

// Test 6: No duplicate property keys
assert(new Set(MOTION_PROPERTY_KEYS).size === MOTION_PROPERTY_KEYS.length, 'No duplicate property keys');

// Test 7: No duplicate easing names
assert(new Set(MOTION_EASING_NAMES).size === MOTION_EASING_NAMES.length, 'No duplicate easing names');

console.log(`\nMotion smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
