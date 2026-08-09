import { emptyParts, mergeParts, cssColorToKt } from '@compiler-native/tailwind.ts';
import type { ModifierParts } from '@compiler-native/tailwind.ts';

export interface CssParseResult {
  classes: Map<string, ModifierParts>;
  skipped: string[];
}

function lenToDp(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (v.endsWith('px')) return Number.parseFloat(v);
  if (v.endsWith('rem')) return Number.parseFloat(v) * 16;
  if (v.endsWith('em')) return Number.parseFloat(v) * 16;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number.parseFloat(v);
  return null;
}

const CSS_FONT_WEIGHT: Record<string, string> = {
  '100': 'FontWeight.Thin', '200': 'FontWeight.ExtraLight', '300': 'FontWeight.Light',
  '400': 'FontWeight.Normal', '500': 'FontWeight.Medium', '600': 'FontWeight.SemiBold',
  '700': 'FontWeight.Bold', '800': 'FontWeight.ExtraBold', '900': 'FontWeight.Black',
  'normal': 'FontWeight.Normal', 'bold': 'FontWeight.Bold', 'semibold': 'FontWeight.SemiBold',
  'medium': 'FontWeight.Medium', 'light': 'FontWeight.Light',
};

function cssFontWeight(value: string): string | null {
  return CSS_FONT_WEIGHT[value.trim().toLowerCase()] ?? null;
}

function cssFontFamily(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (v.includes('mono')) return 'FontFamily.Monospace';
  if (v.includes('serif')) return 'FontFamily.Serif';
  if (v.includes('cursive')) return 'FontFamily.Cursive';
  return 'FontFamily.SansSerif';
}

function cssTextAlign(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (v === 'center') return 'TextAlign.Center';
  if (v === 'left' || v === 'start') return 'TextAlign.Start';
  if (v === 'right' || v === 'end') return 'TextAlign.End';
  if (v === 'justify') return 'TextAlign.Justify';
  return null;
}

function parseBorder(value: string): string | null {
  const v = value.trim();
  if (!v || v === 'none' || v === '0') return null;
  const toks = v.split(/\s+/);
  let width: number | null = null;
  for (const t of toks) {
    const n = lenToDp(t);
    if (n !== null) { width = n; break; }
  }
  let color: string | null = null;
  for (const t of toks) {
    const c = cssColorToKt(t);
    if (c) { color = c; break; }
  }
  return `border(${width ?? 1}.dp, ${color ?? 'Color(0x1F000000)'})`;
}

function parseBoxShadow(value: string): number | null {
  const nums = value.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const n = nums.length >= 3 ? Number(nums[2]) : Number(nums[0]);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.min(30, Math.round(n));
}

function parseDeclarations(decls: string, skipped: string[], cls: string): ModifierParts {
  const parts = emptyParts();
  let hidden = false;

  for (const decl of decls.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!prop || !value) continue;
    if (value.includes('var(')) {
      skipped.push(`.${cls}: var() in ${prop} is not supported in native (skipped)`);
      continue;
    }
    if (prop === 'display') {
      if (value === 'none') hidden = true;
      continue;
    }
    if (prop === 'flex-direction' || prop === 'flex-wrap' || prop === 'gap' || prop === 'row-gap' || prop === 'column-gap') {
      continue;
    }
    if (prop === 'color') {
      const c = cssColorToKt(value);
      if (c) parts.textStyle.push(`color = ${c}`);
      continue;
    }
    if (prop === 'background-color' || prop === 'background') {
      const c = cssColorToKt(value);
      if (c) parts.background.push(`background(${c})`);
      continue;
    }
    if (prop === 'padding') {
      const n = lenToDp(value);
      if (n !== null) parts.padding.push(`padding(${n}.dp)`);
      continue;
    }
    if (prop === 'padding-top') { const n = lenToDp(value); if (n !== null) parts.padding.push(`padding(top = ${n}.dp)`); continue; }
    if (prop === 'padding-right') { const n = lenToDp(value); if (n !== null) parts.padding.push(`padding(end = ${n}.dp)`); continue; }
    if (prop === 'padding-bottom') { const n = lenToDp(value); if (n !== null) parts.padding.push(`padding(bottom = ${n}.dp)`); continue; }
    if (prop === 'padding-left') { const n = lenToDp(value); if (n !== null) parts.padding.push(`padding(start = ${n}.dp)`); continue; }
    if (prop === 'margin') {
      const n = lenToDp(value);
      if (n !== null) parts.margin.push(`padding(${n}.dp)`);
      continue;
    }
    if (prop === 'margin-top') { const n = lenToDp(value); if (n !== null) parts.margin.push(`padding(top = ${n}.dp)`); continue; }
    if (prop === 'margin-right') { const n = lenToDp(value); if (n !== null) parts.margin.push(`padding(end = ${n}.dp)`); continue; }
    if (prop === 'margin-bottom') { const n = lenToDp(value); if (n !== null) parts.margin.push(`padding(bottom = ${n}.dp)`); continue; }
    if (prop === 'margin-left') { const n = lenToDp(value); if (n !== null) parts.margin.push(`padding(start = ${n}.dp)`); continue; }
    if (prop === 'font-size') {
      const n = lenToDp(value);
      if (n !== null) parts.textStyle.push(`fontSize = ${n}.sp`);
      continue;
    }
    if (prop === 'font-weight') {
      const w = cssFontWeight(value);
      if (w) parts.textStyle.push(`fontWeight = ${w}`);
      continue;
    }
    if (prop === 'font-family') {
      const f = cssFontFamily(value);
      if (f) parts.textStyle.push(`fontFamily = ${f}`);
      continue;
    }
    if (prop === 'font-style') {
      if (value.trim().toLowerCase() === 'italic') parts.textStyle.push('fontStyle = FontStyle.Italic');
      continue;
    }
    if (prop === 'text-align') {
      const a = cssTextAlign(value);
      if (a) parts.textStyle.push(`textAlign = ${a}`);
      continue;
    }
    if (prop === 'text-decoration') {
      const v = value.toLowerCase();
      if (v.includes('underline')) parts.textStyle.push('textDecoration = TextDecoration.Underline');
      else if (v.includes('line-through')) parts.textStyle.push('textDecoration = TextDecoration.LineThrough');
      continue;
    }
    if (prop === 'line-height') {
      const n = lenToDp(value);
      if (n !== null) parts.textStyle.push(`lineHeight = ${n}.sp`);
      continue;
    }
    if (prop === 'border-radius') {
      const n = lenToDp(value);
      if (n !== null) parts.clip.push(`clip(RoundedCornerShape(${n}.dp))`);
      continue;
    }
    if (prop === 'border' || prop === 'border-width' || prop === 'border-color') {
      const b = parseBorder(value);
      if (b) parts.border.push(b);
      continue;
    }
    if (prop === 'width') {
      if (value.trim() === '100%') parts.size.push('fillMaxWidth()');
      else { const n = lenToDp(value); if (n !== null) parts.size.push(`width(${n}.dp)`); }
      continue;
    }
    if (prop === 'height') {
      if (value.trim() === '100%') parts.size.push('fillMaxHeight()');
      else { const n = lenToDp(value); if (n !== null) parts.size.push(`height(${n}.dp)`); }
      continue;
    }
    if (prop === 'opacity') {
      const n = Number.parseFloat(value);
      if (!Number.isNaN(n)) parts.alpha.push(`alpha(${n.toFixed(3)}f)`);
      continue;
    }
    if (prop === 'box-shadow') {
      const n = parseBoxShadow(value);
      if (n !== null) parts.shadow.push(`shadow(${n}.dp)`);
      continue;
    }
    // Unknown props (justify-content, align-items, position, ...) are layout
    // concerns handled by Tailwind classes; ignore them here.
  }

  if (hidden) parts.hidden = true;
  return parts;
}

export function parseCssClasses(css: string): CssParseResult {
  const classes = new Map<string, ModifierParts>();
  const skipped: string[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRe = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(clean))) {
    const selector = m[1]!.trim();
    const decls = m[2]!;
    if (selector.startsWith('@')) {
      skipped.push(`@-rule ignored: ${selector.split(/\s/)[0] ?? selector}`);
      continue;
    }
    for (const sel of selector.split(',')) {
      const s = sel.trim().split(':')[0]!.trim();
      if (!s.startsWith('.')) continue;
      const cls = s.slice(1).trim();
      if (!cls) continue;
      const parts = parseDeclarations(decls, skipped, cls);
      const existing = classes.get(cls);
      if (existing) mergeParts(existing, parts);
      else classes.set(cls, parts);
    }
  }
  return { classes, skipped };
}
