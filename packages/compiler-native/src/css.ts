import { emptyParts, mergeParts, cssColorToKt } from '@compiler-native/tailwind';
import type { ModifierParts } from '@compiler-native/tailwind';

export interface CssParseResult {
  classes: Map<string, ModifierParts>;
  skipped: string[];
}

function lenToDp(value: string): number | null {
  const v = value.trim().toLowerCase();
  // A single length token only — multi-token shorthands (margin: a b c d) are
  // expanded by the callers. parseFloat alone would silently read the leading
  // number of "-40px 16px 16px" and emit a negative padding.
  if (!v || /\s/.test(v)) return null;
  if (v.endsWith('px')) {
    const n = v.slice(0, -2);
    if (!/^-?\d+(\.\d+)?$/.test(n)) return null;
    return Number.parseFloat(n);
  }
  if (v.endsWith('rem')) {
    const n = v.slice(0, -3);
    if (!/^-?\d+(\.\d+)?$/.test(n)) return null;
    return Number.parseFloat(n) * 16;
  }
  if (v.endsWith('em')) {
    const n = v.slice(0, -2);
    if (!/^-?\d+(\.\d+)?$/.test(n)) return null;
    return Number.parseFloat(n) * 16;
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number.parseFloat(v);
  return null;
}

// Expand a 1-4 value box shorthand into per-side lengths (top/right/bottom/
// left). Returns null unless every token is a single length.
function expandShorthand(value: string): { top: number; right: number; bottom: number; left: number } | null {
  const toks = value.trim().split(/\s+/);
  if (toks.length === 0 || toks.length > 4) return null;
  const dps = toks.map((t) => lenToDp(t));
  if (dps.some((n) => n === null)) return null;
  const a = dps[0] as number;
  const b = (dps[1] ?? a) as number;
  const c = (dps[2] ?? a) as number;
  const d = (dps[3] ?? b) as number;
  return { top: a, right: b, bottom: c, left: d };
}

const MARGIN_SIDE_TPL: Record<string, string> = {
  top: 'padding(top = ${dp}.dp)',
  end: 'padding(end = ${dp}.dp)',
  bottom: 'padding(bottom = ${dp}.dp)',
  start: 'padding(start = ${dp}.dp)',
};

const NEG_MARGIN_SIDE_TPL: Record<string, string> = {
  top: 'offset(y = -${dp}.dp)',
  end: 'offset(x = -${dp}.dp)',
  bottom: 'offset(y = -${dp}.dp)',
  start: 'offset(x = -${dp}.dp)',
};

function pushMargin(parts: ModifierParts, side: string, dp: number): void {
  const tpl = dp < 0 ? NEG_MARGIN_SIDE_TPL[side] : MARGIN_SIDE_TPL[side];
  if (tpl) parts.margin.push(tpl.replaceAll('${dp}', String(Math.abs(dp))));
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
      const s = expandShorthand(value);
      if (s && s.top >= 0 && s.right >= 0 && s.bottom >= 0 && s.left >= 0) {
        if (s.top === s.right && s.right === s.bottom && s.bottom === s.left) parts.padding.push(`padding(${s.top}.dp)`);
        else {
          if (s.top > 0) parts.padding.push(`padding(top = ${s.top}.dp)`);
          if (s.right > 0) parts.padding.push(`padding(end = ${s.right}.dp)`);
          if (s.bottom > 0) parts.padding.push(`padding(bottom = ${s.bottom}.dp)`);
          if (s.left > 0) parts.padding.push(`padding(start = ${s.left}.dp)`);
        }
      }
      continue;
    }
    if (prop === 'padding-top') { const n = lenToDp(value); if (n !== null && n >= 0) parts.padding.push(`padding(top = ${n}.dp)`); continue; }
    if (prop === 'padding-right') { const n = lenToDp(value); if (n !== null && n >= 0) parts.padding.push(`padding(end = ${n}.dp)`); continue; }
    if (prop === 'padding-bottom') { const n = lenToDp(value); if (n !== null && n >= 0) parts.padding.push(`padding(bottom = ${n}.dp)`); continue; }
    if (prop === 'padding-left') { const n = lenToDp(value); if (n !== null && n >= 0) parts.padding.push(`padding(start = ${n}.dp)`); continue; }
    if (prop === 'margin') {
      const s = expandShorthand(value);
      if (s) {
        pushMargin(parts, 'top', s.top);
        pushMargin(parts, 'end', s.right);
        pushMargin(parts, 'bottom', s.bottom);
        pushMargin(parts, 'start', s.left);
      }
      continue;
    }
    if (prop === 'margin-top') { const n = lenToDp(value); if (n !== null) pushMargin(parts, 'top', n); continue; }
    if (prop === 'margin-right') { const n = lenToDp(value); if (n !== null) pushMargin(parts, 'end', n); continue; }
    if (prop === 'margin-bottom') { const n = lenToDp(value); if (n !== null) pushMargin(parts, 'bottom', n); continue; }
    if (prop === 'margin-left') { const n = lenToDp(value); if (n !== null) pushMargin(parts, 'start', n); continue; }
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
    // ---- sizing constraints ----
    if (prop === 'min-width') {
      if (value.trim() === '0') parts.size.push('widthIn(min = 0.dp)');
      else if (value.trim() === '100%') parts.size.push('fillMaxWidth()');
      else { const n = lenToDp(value); if (n !== null) parts.size.push(`widthIn(min = ${n}.dp)`); }
      continue;
    }
    if (prop === 'max-width') {
      if (value.trim() === '100%') parts.size.push('fillMaxWidth()');
      else { const n = lenToDp(value); if (n !== null) parts.size.push(`widthIn(max = ${n}.dp)`); }
      continue;
    }
    if (prop === 'min-height') {
      if (value.trim() === '0') parts.size.push('heightIn(min = 0.dp)');
      else if (value.trim() === '100%') parts.size.push('fillMaxHeight()');
      else { const n = lenToDp(value); if (n !== null) parts.size.push(`heightIn(min = ${n}.dp)`); }
      continue;
    }
    if (prop === 'max-height') {
      if (value.trim() === '100%') parts.size.push('fillMaxHeight()');
      else { const n = lenToDp(value); if (n !== null) parts.size.push(`heightIn(max = ${n}.dp)`); }
      continue;
    }
    // ---- per-side border ----
    if (prop === 'border-top' || prop === 'border-right' || prop === 'border-bottom' || prop === 'border-left') {
      const b = parseBorder(value);
      if (b) parts.border.push(b);
      continue;
    }
    // ---- z-index ----
    if (prop === 'z-index') {
      const v = value.trim().toLowerCase();
      if (v === 'auto') continue;
      const n = Number.parseInt(v, 10);
      if (!Number.isNaN(n)) parts.posMod.push(`zIndex(${n}f)`);
      continue;
    }
    // ---- visibility ----
    if (prop === 'visibility') {
      if (value.trim().toLowerCase() === 'hidden') parts.alpha.push('alpha(0.000f)');
      continue;
    }
    // ---- overflow ----
    if (prop === 'overflow') {
      const v = value.trim().toLowerCase();
      if (v === 'hidden' || v === 'clip') parts.clip.push('clip(RoundedCornerShape(0.dp))');
      else if (v === 'auto' || v === 'scroll') parts.scroll.push('verticalScroll(rememberScrollState())');
      continue;
    }
    // ---- letter-spacing ----
    if (prop === 'letter-spacing') {
      const n = lenToDp(value);
      if (n !== null) parts.textStyle.push(`letterSpacing = ${n}.sp`);
      continue;
    }
    // ---- text-transform ----
    if (prop === 'text-transform') {
      const v = value.trim().toLowerCase();
      if (v === 'uppercase') parts.text.transform = 'upper';
      else if (v === 'lowercase') parts.text.transform = 'lower';
      else if (v === 'capitalize') parts.text.transform = 'cap';
      continue;
    }
    // ---- text-overflow ----
    if (prop === 'text-overflow') {
      const v = value.trim().toLowerCase();
      if (v === 'ellipsis') { parts.text.maxLines = 1; parts.text.overflow = 'Ellipsis'; }
      else if (v === 'clip') { parts.text.maxLines = 1; parts.text.overflow = 'Clip'; }
      continue;
    }
    // ---- white-space ----
    if (prop === 'white-space') {
      const v = value.trim().toLowerCase();
      if (v === 'nowrap' || v === 'pre') parts.text.softWrap = false;
      else parts.text.softWrap = true;
      continue;
    }
    // ---- cursor / outline / object-fit — drop (no Compose equivalent) ----
    if (prop === 'cursor' || prop === 'outline' || prop === 'object-fit') continue;
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
