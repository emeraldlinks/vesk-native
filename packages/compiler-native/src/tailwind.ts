// Tailwind v3 -> Compose Modifier/TextStyle.
//
// Data-driven: value tables mirror Tailwind's default theme, and UTILITIES is a
// declarative spec table covering the full v3.4 inventory (see
// tailwindclasses.md). Adding a utility = one row. Matching, arbitrary values
// ([..]), color-opacity (/50), variants (md:) and bucket ordering are all
// handled generically by the tokenizer, so a new utility never needs new
// parsing or ordering code. Recognized-but-not-expressible utilities are one
// `drop` row each (no hand-written if-chains anywhere).

// ---------- value tables (Tailwind v3 default theme data) ----------

export const SPACING: Record<string, number> = {
  '0': 0, 'px': 1, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10, '3': 12, '3.5': 14,
  '4': 16, '5': 20, '6': 24, '7': 28, '8': 32, '9': 36, '10': 40, '11': 44, '12': 48,
  '14': 56, '16': 64, '20': 80, '24': 96, '28': 112, '32': 128, '36': 144, '40': 160,
  '44': 176, '48': 192, '52': 208, '56': 224, '60': 240, '64': 256, '72': 288,
  '80': 320, '96': 384,
};

export const FONT_SIZE: Record<string, number> = {
  'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20, '2xl': 24, '3xl': 30, '4xl': 36,
  '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128,
};

// Tailwind v3 line-height paired with each text-* size.
const FONT_LINE_HEIGHT: Record<string, number> = {
  'xs': 16, 'sm': 20, 'base': 24, 'lg': 28, 'xl': 28, '2xl': 32, '3xl': 36, '4xl': 40,
  '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128,
};

export const RADIUS: Record<string, number> = {
  'none': 0, 'sm': 2, 'DEFAULT': 4, 'md': 6, 'lg': 8, 'xl': 12, '2xl': 16, '3xl': 24,
  'full': 9999,
};

export const SHADOW_SIZE: Record<string, number> = {
  'sm': 1, 'DEFAULT': 3, 'md': 6, 'lg': 10, 'xl': 20, '2xl': 30,
};

const BLUR: Record<string, number> = {
  'none': 0, 'sm': 4, 'DEFAULT': 8, 'md': 12, 'lg': 16, 'xl': 24, '2xl': 40, '3xl': 64,
};

const RING: Record<string, number> = {
  'DEFAULT': 3, '0': 0, '1': 1, '2': 2, '4': 4, '8': 8,
};

const ROTATE: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '6': 6, '12': 12, '45': 45, '90': 90, '180': 180,
};

const SCALE: Record<string, number> = {
  '0': 0, '50': 0.5, '75': 0.75, '90': 0.9, '95': 0.95, '100': 1, '105': 1.05,
  '110': 1.1, '125': 1.25, '150': 1.5,
};

const SKEW: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '6': 6, '12': 12,
};

const LINE_CLAMP: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
};

// Named max-w-* sizes (px). max-w-none is 0 (no constraint).
const MAX_W: Record<string, number> = {
  'none': 0, 'xs': 320, 'sm': 384, 'md': 448, 'lg': 512, 'xl': 576, '2xl': 672,
  '3xl': 768, '4xl': 896, '5xl': 1024, '6xl': 1152, '7xl': 1280, 'prose': 650,
  'screen-sm': 640, 'screen-md': 768, 'screen-lg': 1024, 'screen-xl': 1280, 'screen-2xl': 1536,
};

// leading-* line heights in sp. Named multipliers (tight/snug/...) are
// resolved against the 16sp base font size (approximation for 16sp).
export const LEADING: Record<string, number> = {
  '3': 12, '4': 16, '5': 20, '6': 24, '7': 28, '8': 32, '9': 36, '10': 40,
  'none': 16, 'tight': 20, 'snug': 22, 'normal': 24, 'relaxed': 26, 'loose': 32,
};

export const TRACKING: Record<string, number> = {
  'tighter': -0.4, 'tight': -0.2, 'normal': 0, 'wide': 0.2, 'wider': 0.4, 'widest': 0.8,
};

const WEIGHT: Record<string, string> = {
  'thin': 'FontWeight.Thin', 'extralight': 'FontWeight.ExtraLight', 'light': 'FontWeight.Light',
  'normal': 'FontWeight.Normal', 'medium': 'FontWeight.Medium', 'semibold': 'FontWeight.SemiBold',
  'bold': 'FontWeight.Bold', 'extrabold': 'FontWeight.ExtraBold', 'black': 'FontWeight.Black',
};

const FONT_FAMILY: Record<string, string> = {
  'sans': 'FontFamily.SansSerif', 'serif': 'FontFamily.Serif', 'mono': 'FontFamily.Monospace',
};

const OPACITY_VALUES = new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);

const Z_INDEX = new Set(['0', '10', '20', '30', '40', '50']);

export const PALETTE: Record<string, Record<number, number>> = {
  slate: { 50: 0xF8FAFC, 100: 0xF1F5F9, 200: 0xE2E8F0, 300: 0xCBD5E1, 400: 0x94A3B8, 500: 0x64748B, 600: 0x475569, 700: 0x334155, 800: 0x1E293B, 900: 0x0F172A, 950: 0x020617 },
  gray: { 50: 0xF9FAFB, 100: 0xF3F4F6, 200: 0xE5E7EB, 300: 0xD1D5DB, 400: 0x9CA3AF, 500: 0x6B7280, 600: 0x4B5563, 700: 0x374151, 800: 0x1F2937, 900: 0x111827, 950: 0x030712 },
  zinc: { 50: 0xFAFAFA, 100: 0xF4F4F5, 200: 0xE4E4E7, 300: 0xD4D4D8, 400: 0xA1A1AA, 500: 0x71717A, 600: 0x52525B, 700: 0x3F3F46, 800: 0x27272A, 900: 0x18181B, 950: 0x09090B },
  neutral: { 50: 0xFAFAFA, 100: 0xF5F5F4, 200: 0xE7E5E4, 300: 0xD6D3D1, 400: 0xA8A29E, 500: 0x78716C, 600: 0x57534E, 700: 0x44403C, 800: 0x292524, 900: 0x1C1917, 950: 0x0C0A09 },
  stone: { 50: 0xFAFAF9, 100: 0xF5F5F4, 200: 0xE7E5E4, 300: 0xD6D3D1, 400: 0xA8A29E, 500: 0x78716C, 600: 0x57534E, 700: 0x44403C, 800: 0x292524, 900: 0x1C1917, 950: 0x0C0A09 },
  red: { 50: 0xFEF2F2, 100: 0xFEE2E2, 200: 0xFECACA, 300: 0xFCA5A5, 400: 0xF87171, 500: 0xEF4444, 600: 0xDC2626, 700: 0xB91C1C, 800: 0x991B1B, 900: 0x7F1D1D, 950: 0x450A0A },
  orange: { 50: 0xFFF7ED, 100: 0xFFEDD5, 200: 0xFED7AA, 300: 0xFDBA74, 400: 0xFB923C, 500: 0xF97316, 600: 0xEA580C, 700: 0xC2410C, 800: 0x9A3412, 900: 0x7C2D12, 950: 0x431407 },
  amber: { 50: 0xFFFBEB, 100: 0xFEF3C7, 200: 0xFDE68A, 300: 0xFCD34D, 400: 0xFBBF24, 500: 0xF59E0B, 600: 0xD97706, 700: 0xB45309, 800: 0x92400E, 900: 0x78350F, 950: 0x451A03 },
  yellow: { 50: 0xFEFCE8, 100: 0xFEF9C3, 200: 0xFEF08A, 300: 0xFDE047, 400: 0xFACC15, 500: 0xEAB308, 600: 0xCA8A04, 700: 0xA16207, 800: 0x854D0E, 900: 0x713F12, 950: 0x422006 },
  lime: { 50: 0xF7FEE7, 100: 0xECFCCB, 200: 0xD9F99D, 300: 0xBEF264, 400: 0xA3E635, 500: 0x84CC16, 600: 0x65A30D, 700: 0x4D7C0F, 800: 0x3F6212, 900: 0x365314, 950: 0x1A2E05 },
  green: { 50: 0xF0FDF4, 100: 0xDCFCE7, 200: 0xBBF7D0, 300: 0x86EFAC, 400: 0x4ADE80, 500: 0x22C55E, 600: 0x16A34A, 700: 0x15803D, 800: 0x166534, 900: 0x14532D, 950: 0x052E16 },
  emerald: { 50: 0xECFDF5, 100: 0xD1FAE5, 200: 0xA7F3D0, 300: 0x6EE7B7, 400: 0x34D399, 500: 0x10B981, 600: 0x059669, 700: 0x047857, 800: 0x065F46, 900: 0x064E3B, 950: 0x022C22 },
  teal: { 50: 0xF0FDFA, 100: 0xCCFBF1, 200: 0x99F6E4, 300: 0x5EEAD4, 400: 0x2DD4BF, 500: 0x14B8A6, 600: 0x0D9488, 700: 0x0F766E, 800: 0x115E59, 900: 0x134E4A, 950: 0x042F2E },
  cyan: { 50: 0xECFEFF, 100: 0xCFFAFE, 200: 0xA5F3FC, 300: 0x67E8F9, 400: 0x22D3EE, 500: 0x06B6D4, 600: 0x0891B2, 700: 0x0E7490, 800: 0x155E75, 900: 0x164E63, 950: 0x083344 },
  sky: { 50: 0xF0F9FF, 100: 0xE0F2FE, 200: 0xBAE6FD, 300: 0x7DD3FC, 400: 0x38BDF8, 500: 0x0EA5E9, 600: 0x0284C7, 700: 0x0369A1, 800: 0x075985, 900: 0x0C4A6E, 950: 0x082F49 },
  blue: { 50: 0xEFF6FF, 100: 0xDBEAFE, 200: 0xBFDBFE, 300: 0x93C5FD, 400: 0x60A5FA, 500: 0x3B82F6, 600: 0x2563EB, 700: 0x1D4ED8, 800: 0x1E40AF, 900: 0x1E3A8A, 950: 0x172554 },
  indigo: { 50: 0xEEF2FF, 100: 0xE0E7FF, 200: 0xC7D2FE, 300: 0xA5B4FC, 400: 0x818CF8, 500: 0x6366F1, 600: 0x4F46E5, 700: 0x4338CA, 800: 0x3730A3, 900: 0x312E81, 950: 0x1E1B4B },
  violet: { 50: 0xF5F3FF, 100: 0xEDE9FE, 200: 0xDDD6FE, 300: 0xC4B5FD, 400: 0xA78BFA, 500: 0x8B5CF6, 600: 0x7C3AED, 700: 0x6D28D9, 800: 0x5B21B6, 900: 0x4C1D95, 950: 0x2E1065 },
  purple: { 50: 0xFAF5FF, 100: 0xF3E8FF, 200: 0xE9D5FF, 300: 0xD8B4FE, 400: 0xC084FC, 500: 0xA855F7, 600: 0x9333EA, 700: 0x7E22CE, 800: 0x6B21A8, 900: 0x581C87, 950: 0x3B0764 },
  fuchsia: { 50: 0xFDF4FF, 100: 0xFAE8FF, 200: 0xF5D0FE, 300: 0xF0ABFC, 400: 0xE879F9, 500: 0xD946EF, 600: 0xC026D3, 700: 0xA21CAF, 800: 0x86198F, 900: 0x701A75, 950: 0x4A044E },
  pink: { 50: 0xFDF2F8, 100: 0xFCE7F3, 200: 0xFBCFE8, 300: 0xF9A8D4, 400: 0xF472B6, 500: 0xEC4899, 600: 0xDB2777, 700: 0xBE185D, 800: 0x9D174D, 900: 0x831843, 950: 0x500724 },
  rose: { 50: 0xFFF1F2, 100: 0xFFE4E6, 200: 0xFECDD3, 300: 0xFDA4AF, 400: 0xFB7185, 500: 0xF43F5E, 600: 0xE11D48, 700: 0xBE123C, 800: 0x9F1239, 900: 0x881337, 950: 0x4C0519 },
};

const NAMED_COLORS: Record<string, number> = {
  white: 0xffffff,
  black: 0x000000,
};

const CSS_NAMED: Record<string, number> = {
  ...NAMED_COLORS,
  red: 0xff0000, green: 0x008000, blue: 0x0000ff, gray: 0x808080, grey: 0x808080,
  silver: 0xc0c0c0, maroon: 0x800000, olive: 0x808000, lime: 0x00ff00, aqua: 0x00ffff,
  teal: 0x008080, navy: 0x000080, fuchsia: 0xff00ff, purple: 0x800080, orange: 0xffa500,
  gold: 0xffd700, yellow: 0xffff00, cyan: 0x00ffff, tomato: 0xff6347, coral: 0xff7f50,
  salmon: 0xfa8072, pink: 0xffc0cb, skyblue: 0x87ceeb, steelblue: 0x4682b4,
  darkgray: 0xa9a9a9, darkgrey: 0xa9a9a9, lightgray: 0xd3d3d3, lightgrey: 0xd3d3d3,
  indigo: 0x4b0082, violet: 0xee82ee, brown: 0xa52a2a, beige: 0xf5f5dc,
};

export function colorLiteral(hex: number): string {
  const argb = ((0xff000000 | hex) >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `Color(0x${argb})`;
}

export function cssColorToKt(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (v === 'transparent') return 'Color(0x00000000)';
  if (v.startsWith('#')) {
    let hex = v.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = [...hex].map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      const n = Number.parseInt(hex, 16);
      return Number.isNaN(n) ? null : colorLiteral(n);
    }
    if (hex.length === 8) {
      const rgb = Number.parseInt(hex.slice(0, 6), 16);
      const a = Number.parseInt(hex.slice(6, 8), 16);
      if (Number.isNaN(rgb) || Number.isNaN(a)) return null;
      const argb = ((a << 24) | rgb) >>> 0;
      return `Color(0x${argb.toString(16).padStart(8, '0').toUpperCase()})`;
    }
    return null;
  }
  const rgbMatch = v.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const nums = rgbMatch[1]!.split(',').map((s) => s.trim());
    const r = Number(nums[0]);
    const g = Number(nums[1]);
    const b = Number(nums[2]);
    if (r === undefined || g === undefined || b === undefined || Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    let a = 255;
    const av = nums[3];
    if (av !== undefined) {
      const parsed = av.endsWith('%') ? Math.round(Number(av.slice(0, -1)) * 2.55) : Math.round(Number(av) * 255);
      if (!Number.isNaN(parsed)) a = Math.max(0, Math.min(255, parsed));
    }
    const argb = ((a << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)) >>> 0;
    return `Color(0x${argb.toString(16).padStart(8, '0').toUpperCase()})`;
  }
  const named = CSS_NAMED[v];
  return named === undefined ? null : colorLiteral(named);
}

export function tailwindColorHex(className: string): number | null {
  const parts = className.split('-');
  if (parts.length === 1) {
    const hex = NAMED_COLORS[parts[0] ?? ''];
    return hex === undefined ? null : hex;
  }
  const shade = Number(parts[parts.length - 1]);
  if (!Number.isInteger(shade)) return null;
  const hex = PALETTE[parts.slice(0, -1).join('-')]?.[shade];
  return hex === undefined ? null : hex;
}

export function tailwindColor(className: string): string | null {
  const hex = tailwindColorHex(className);
  return hex === null ? null : colorLiteral(hex);
}

// ---------- semantic (theme-aware) neutrals ----------
// When the project config declares darkColors, Tailwind neutral utilities map
// to MaterialTheme color scheme roles instead of literal hex. Day and night
// modes then both match the web layout (Tailwind's neutral palette is
// theme-neutral by design). Colored utilities and alpha overlays stay literal.

let adaptiveDark = false;

export function setAdaptiveDark(enabled: boolean): void {
  adaptiveDark = enabled;
}

type NeutralKind = 'bg' | 'text' | 'border';

function neutralToken(raw: string, kind: NeutralKind): string | null {
  if (!adaptiveDark) return null;
  let base = raw;
  const slash = raw.lastIndexOf('/');
  if (slash > 0) {
    const opRaw = raw.slice(slash + 1);
    const n = opRaw.endsWith('%') ? Number(opRaw.slice(0, -1)) : Number(opRaw);
    if (!Number.isNaN(n)) return null;
  }
  const o = (a: number) => `MaterialTheme.colorScheme.onSurface.copy(alpha = ${a}f)`;
  switch (kind) {
    case 'bg':
      if (base === 'white') return 'MaterialTheme.colorScheme.surface';
      if (base === 'gray-50') return o(0.04);
      if (base === 'gray-100') return o(0.07);
      if (base === 'gray-200') return o(0.11);
      return null;
    case 'text':
      if (base === 'black' || base === 'gray-800' || base === 'gray-900') return 'MaterialTheme.colorScheme.onSurface';
      if (base === 'gray-400') return `MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)`;
      if (base === 'gray-500' || base === 'gray-600' || base === 'gray-700') return 'MaterialTheme.colorScheme.onSurfaceVariant';
      return null;
    case 'border':
      if (base === 'gray-100') return o(0.08);
      if (base === 'gray-200') return o(0.12);
      if (base === 'gray-300') return o(0.22);
      return null;
  }
  return null;
}

function defaultBorder(): string {
  return adaptiveDark ? 'MaterialTheme.colorScheme.outlineVariant' : 'Color(0x1F000000)';
}

// ---------- value resolution ----------

type Namespace = 'spacing' | 'size' | 'color' | 'fontSize' | 'radius' | 'shadowSize' | 'weight' | 'family' | 'leading' | 'tracking' | 'opacity' | 'zIndex' | 'rotate' | 'scale' | 'skew' | 'blur' | 'lineClamp' | 'fit';

type Resolved =
  | { kind: 'dp'; dp: number; raw: string }
  | { kind: 'sp'; sp: number; raw: string }
  | { kind: 'color'; color: string; raw: string }
  | { kind: 'weight'; weight: string; raw: string }
  | { kind: 'family'; family: string; raw: string }
  | { kind: 'fraction'; fraction: number; raw: string }
  | { kind: 'fit'; raw: string }
  | { kind: 'none'; raw: string };

function resolveDp(raw: string): number | null {
  const v = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw;
  if (v.endsWith('px')) return Number.parseFloat(v);
  if (v.endsWith('rem') || v.endsWith('em')) {
    const n = Number.parseFloat(v);
    return Number.isNaN(n) ? null : Math.round(n * 16);
  }
  if (v.endsWith('deg')) return Number.parseFloat(v);
  if (/^\d+(\.\d+)?$/.test(v)) return Number.parseFloat(v);
  return null;
}

function resolveFraction(raw: string): number | null {
  if (raw === 'full' || raw === 'screen') return 1;
  if (raw === 'auto') return null;
  const m = raw.match(/^(\d+)\/(\d+)$/);
  if (m) {
    const d = Number(m[2] ?? 0);
    if (d === 0) return null;
    return Number(m[1]) / d;
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const v = raw.slice(1, -1);
    if (v.endsWith('%')) return Number.parseFloat(v) / 100;
    if (/^\d+(\.\d+)?$/.test(v)) return Math.max(0, Math.min(1, Number.parseFloat(v)));
    return null;
  }
  return null;
}

function resolveColor(raw: string): string | null {
  const a = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : null;
  if (a) return cssColorToKt(a);
  let base = raw;
  let opacity: number | null = null;
  const slash = raw.lastIndexOf('/');
  if (slash > 0) {
    base = raw.slice(0, slash);
    const opRaw = raw.slice(slash + 1);
    const n = opRaw.endsWith('%') ? Number(opRaw.slice(0, -1)) : Number(opRaw);
    opacity = Number.isNaN(n) ? null : n;
  }
  const hex = tailwindColorHex(base);
  if (hex === null) return null;
  if (opacity === null || opacity >= 100) return colorLiteral(hex);
  const alpha = Math.max(0, Math.min(100, opacity));
  const argb = ((Math.round(alpha * 2.55) << 24) | hex) >>> 0;
  return `Color(0x${argb.toString(16).padStart(8, '0').toUpperCase()})`;
}

// Percentage-based filter values (brightness/contrast/saturate): bare integers
// in [min,max] (e.g. 150 -> 1.5) or arbitrary [1.5] / [150%].
function pctValue(raw: string, min: number, max: number): number | null {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const v = raw.slice(1, -1);
    const n = v.endsWith('%') ? Number.parseFloat(v) / 100 : Number.parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n / 100;
}

function resolveValue(ns: Namespace, raw: string): Resolved | null {
  switch (ns) {
    case 'spacing': {
      const v = SPACING[raw] ?? resolveDp(raw);
      return v === null || v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
    case 'size': {
      const f = resolveFraction(raw);
      if (f !== null) return { kind: 'fraction', fraction: f, raw };
      const v = SPACING[raw] ?? resolveDp(raw);
      return v === null || v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
    case 'color': {
      const c = resolveColor(raw);
      return c ? { kind: 'color', color: c, raw } : null;
    }
    case 'fontSize': {
      const v = FONT_SIZE[raw];
      return v === undefined ? null : { kind: 'sp', sp: v, raw };
    }
    case 'radius': {
      const v = RADIUS[raw] ?? resolveDp(raw);
      return v === null || v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
    case 'shadowSize': {
      const v = SHADOW_SIZE[raw] ?? resolveDp(raw);
      return v === null || v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
    case 'weight': {
      const v = WEIGHT[raw];
      return v ? { kind: 'weight', weight: v, raw } : null;
    }
    case 'family': {
      const v = FONT_FAMILY[raw];
      return v ? { kind: 'family', family: v, raw } : null;
    }
    case 'leading': {
      const v = LEADING[raw];
      return v === undefined ? null : { kind: 'sp', sp: v, raw };
    }
    case 'tracking': {
      const v = TRACKING[raw];
      return v === undefined ? null : { kind: 'sp', sp: v, raw };
    }
case 'opacity': {
      let f: number | null = null;
      if (raw.startsWith('[') && raw.endsWith(']')) {
        const v = raw.slice(1, -1);
        f = v.endsWith('%') ? Number.parseFloat(v) / 100 : Number.parseFloat(v);
        if (f === null || Number.isNaN(f)) f = null;
      } else {
        f = OPACITY_VALUES.has(Number(raw)) ? Number(raw) / 100 : null;
      }
      if (f === null) return null;
      return { kind: 'fraction', fraction: Math.max(0, Math.min(1, f)), raw };
    }
    case 'fit': {
      return { kind: 'fit', raw };
    }
    case 'zIndex': {
      return Z_INDEX.has(raw) ? { kind: 'dp', dp: Number(raw), raw } : null;
    }
    case 'rotate': {
      const v = ROTATE[raw] ?? resolveDp(raw);
      return v === null || v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
    case 'scale': {
      let f: number | null = null;
      if (raw.startsWith('[') && raw.endsWith(']')) {
        const v = raw.slice(1, -1);
        f = v.endsWith('%') ? Number.parseFloat(v) / 100 : Number.parseFloat(v);
        if (Number.isNaN(f)) f = null;
      } else {
        f = SCALE[raw] ?? null;
      }
      return f === null ? null : { kind: 'fraction', fraction: f, raw };
    }
    case 'skew': {
      const v = SKEW[raw] ?? resolveDp(raw);
      return v === null || v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
    case 'blur': {
      const v = raw === '' ? BLUR['DEFAULT'] : BLUR[raw] ?? resolveDp(raw);
      return v === null || v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
    case 'lineClamp': {
      const v = LINE_CLAMP[raw];
      return v === undefined ? null : { kind: 'dp', dp: v, raw };
    }
  }
}

function resolveNs(nsList: Namespace[], value: string): Resolved | null {
  for (const ns of nsList) {
    const r = resolveValue(ns, value);
    if (r) return r;
  }
  return null;
}

// ---------- output model ----------

export interface TextParams {
  maxLines?: number;
  softWrap?: boolean;
  overflow?: 'Ellipsis' | 'Clip';
  transform?: 'upper' | 'lower' | 'cap';
}

export interface ModifierParts {
  alpha: string[];
  margin: string[];
  scroll: string[];
  transform: string[];
  shadow: string[];
  clip: string[];
  background: string[];
  border: string[];
  size: string[];
  padding: string[];
  stacking: string[];
  align: string[];
  posMod: string[];
  textStyle: string[];
  scale: string[];
  text: TextParams;
  hidden?: boolean;
  flow?: boolean;
  position?: 'absolute' | 'fixed' | 'relative';
  divide?: { axis: 'x' | 'y'; width: number; color: string; style: 'solid' | 'dashed' | 'dotted' };
}
export function emptyParts(): ModifierParts {
  return {
    alpha: [], margin: [], scroll: [], transform: [], shadow: [], clip: [], background: [],
    border: [], size: [], padding: [], stacking: [], align: [], posMod: [], textStyle: [], scale: [], text: {},
  };
}

export function mergeParts(target: ModifierParts, src: ModifierParts): void {
  for (const key of ['alpha', 'margin', 'scroll', 'transform', 'shadow', 'clip', 'background', 'border', 'size', 'padding', 'stacking', 'align', 'posMod', 'textStyle'] as const) {
    for (const v of src[key]) target[key].push(v);
  }
  if (src.hidden) target.hidden = true;
  if (src.flow !== undefined) target.flow = src.flow;
  if (src.position !== undefined) target.position = src.position;
  if (src.text.maxLines !== undefined) target.text.maxLines = src.text.maxLines;
  if (src.text.softWrap !== undefined) target.text.softWrap = src.text.softWrap;
  if (src.text.overflow !== undefined) target.text.overflow = src.text.overflow;
  if (src.text.transform !== undefined) target.text.transform = src.text.transform;
  if (src.divide) target.divide = src.divide;
}

export function isHidden(classes: string[], custom?: Map<string, ModifierParts>): boolean {
  if (classes.includes('hidden')) return true;
  if (custom) {
    for (const c of classes) {
      if (custom.get(c)?.hidden) return true;
    }
  }
  return false;
}

export interface LayoutArgs {
  horizontalAlignment?: string;
  verticalAlignment?: string;
  horizontalArrangement?: string;
  verticalArrangement?: string;
  grid?: { cols: number; gapX: number | null; gapY: number | null };
}

export type Axis = 'column' | 'row' | 'grid';

// ---------- utility spec table ----------

type Bucket = 'alpha' | 'margin' | 'scroll' | 'transform' | 'shadow' | 'clip' | 'background' | 'border' | 'size' | 'padding' | 'stacking' | 'align' | 'posMod' | 'textStyle' | 'scale' | 'text' | 'layout' | 'flow' | 'grid' | 'position' | 'drop';

// Order in which modifier fragments are chained (outermost first).
const BUCKET_ORDER: Array<'alpha' | 'margin' | 'scroll' | 'transform' | 'shadow' | 'clip' | 'background' | 'border' | 'size' | 'padding' | 'stacking' | 'align' | 'posMod'> = ['alpha', 'margin', 'transform', 'shadow', 'clip', 'background', 'border', 'size', 'scroll', 'padding', 'stacking', 'align', 'posMod'];

interface Insets {
  top: number | null;
  end: number | null;
  bottom: number | null;
  start: number | null;
}

interface Ctx {
  parts: ModifierParts;
  layout: LayoutArgs;
  axis: Axis;
  borderWidth: number | null;
  borderColor: string | null;
  borderColorFromSide: boolean;
  borderStyle: 'dashed' | 'dotted' | null;
  borderSides: { top: number | null; end: number | null; bottom: number | null; start: number | null };
  ringWidth: number | null;
  ringColor: string | null;
  outlineWidth: number | null;
  outlineColor: string | null;
  outlineStyle: 'dashed' | 'dotted' | null;
  shadowElevation: number | null;
  shadowColor: string | null;
  gradDir: string | null;
  gradFrom: string | null;
  gradVia: string | null;
  gradTo: string | null;
  divide: { axis: 'x' | 'y' | null; width: number; color: string | null; style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none' | null };
  gridCols: number | null;
  gapX: number | null;
  gapY: number | null;
  position: 'absolute' | 'fixed' | 'relative' | null;
  insets: Insets;
  neg: boolean;
  // True when the element being classified is an ancestor of the routed
  // content slot ({props.children}) — i.e. the layout shell's page scroll
  // container. Only such containers key their vertical scroll by route.
  scrollRouteKeyed: boolean;
}

function makeCtx(parts: ModifierParts, axis: Axis, scrollRouteKeyed = false): Ctx {
  return {
    parts, layout: {}, axis,
    borderWidth: null, borderColor: null, borderColorFromSide: false,
    borderStyle: null, borderSides: { top: null, end: null, bottom: null, start: null },
    ringWidth: null, ringColor: null, outlineWidth: null, outlineColor: null, outlineStyle: null,
    shadowElevation: null, shadowColor: null,
    gradDir: null, gradFrom: null, gradVia: null, gradTo: null,
    divide: { axis: null, width: 1, color: null, style: null },
    gridCols: null, gapX: null, gapY: null,
    position: null, insets: { top: null, end: null, bottom: null, start: null },
    neg: false, scrollRouteKeyed,
  };
}

interface UtilitySpec {
  name: string;
  bucket: Bucket;
  ns: Namespace[];
  render: (r: Resolved, ctx: Ctx) => void;
}

function pushText(ctx: Ctx, arg: string): void {
  ctx.parts.textStyle.push(arg);
}

const PADDING_TPL: Record<string, string> = {
  all: 'padding(${dp}.dp)',
  x: 'padding(horizontal = ${dp}.dp)',
  y: 'padding(vertical = ${dp}.dp)',
  top: 'padding(top = ${dp}.dp)',
  end: 'padding(end = ${dp}.dp)',
  bottom: 'padding(bottom = ${dp}.dp)',
  start: 'padding(start = ${dp}.dp)',
};

// Negative margins (-m-4, -mt-2, ...) pull the element toward that side via
// offset(); positive margins keep the padding-based approximation.
const NEG_OFFSET_TPL: Record<string, string> = {
  all: 'offset(x = -${dp}.dp, y = -${dp}.dp)',
  x: 'offset(x = -${dp}.dp)',
  y: 'offset(y = -${dp}.dp)',
  top: 'offset(y = -${dp}.dp)',
  end: 'offset(x = -${dp}.dp)',
  bottom: 'offset(y = -${dp}.dp)',
  start: 'offset(x = -${dp}.dp)',
};

function dpSide(bucket: 'padding' | 'margin', side: string): (r: Resolved, ctx: Ctx) => void {
  return (r, ctx): void => {
    if (r.kind !== 'dp') return;
    if (bucket === 'margin' && ctx.neg) {
      if (r.dp === 0) return;
      const tpl = NEG_OFFSET_TPL[side];
      if (tpl) ctx.parts[bucket].push(tpl.replaceAll('${dp}', String(r.dp)));
      return;
    }
    const tpl = PADDING_TPL[side];
    if (tpl) ctx.parts[bucket].push(tpl.replace('${dp}', String(r.dp)));
  };
}

const sizeFill = (axis: 'w' | 'h') => (r: Resolved, ctx: Ctx): void => {
  if (r.kind === 'fraction') {
    if (axis === 'w') ctx.parts.size.push(r.fraction === 1 ? 'fillMaxWidth()' : `fillMaxWidth(${r.fraction}f)`);
    else ctx.parts.size.push(r.fraction === 1 ? 'fillMaxHeight()' : `fillMaxHeight(${r.fraction}f)`);
  } else if (r.kind === 'dp') {
    ctx.parts.size.push(axis === 'w' ? `width(${r.dp}.dp)` : `height(${r.dp}.dp)`);
  }
};

const sizeIn = (dir: 'w' | 'h', minMax: 'min' | 'max') => (r: Resolved, ctx: Ctx): void => {
  if (r.kind === 'fraction' && r.fraction === 1 && minMax === 'min') {
    ctx.parts.size.push(dir === 'w' ? 'fillMaxWidth()' : 'fillMaxHeight()');
    return;
  }
  if (r.kind !== 'dp') return;
  if (dir === 'w') ctx.parts.size.push(`widthIn(${minMax} = ${r.dp}.dp)`);
  else ctx.parts.size.push(`heightIn(${minMax} = ${r.dp}.dp)`);
};

const CORNER_TPL: Record<string, string> = {
  t: 'RoundedCornerShape(topStart = X.dp, topEnd = X.dp)',
  b: 'RoundedCornerShape(bottomEnd = X.dp, bottomStart = X.dp)',
  l: 'RoundedCornerShape(topStart = X.dp, bottomStart = X.dp)',
  r: 'RoundedCornerShape(topEnd = X.dp, bottomEnd = X.dp)',
  tl: 'RoundedCornerShape(topStart = X.dp)',
  tr: 'RoundedCornerShape(topEnd = X.dp)',
  br: 'RoundedCornerShape(bottomEnd = X.dp)',
  bl: 'RoundedCornerShape(bottomStart = X.dp)',
};

const noop = (_r: Resolved, _ctx: Ctx): void => {};

function gradientExpr(dir: string, from: string, via: string | null, to: string): string {
  const colors = via ? [from, via, to] : [from, to];
  const list = (items: string[]): string => `listOf(${items.join(', ')})`;
  switch (dir) {
    case 'to-r': return `Brush.horizontalGradient(${list(colors)})`;
    case 'to-l': return `Brush.horizontalGradient(${list([...colors].reverse())})`;
    case 'to-b': return `Brush.verticalGradient(${list(colors)})`;
    case 'to-t': return `Brush.verticalGradient(${list([...colors].reverse())})`;
    case 'to-tr': return `Brush.linearGradient(${list(colors)}, start = Offset(0f, 1f), end = Offset(1f, 0f))`;
    case 'to-tl': return `Brush.linearGradient(${list(colors)}, start = Offset(1f, 1f), end = Offset(0f, 0f))`;
    case 'to-br': return `Brush.linearGradient(${list(colors)}, start = Offset(0f, 0f), end = Offset(1f, 1f))`;
    case 'to-bl': return `Brush.linearGradient(${list(colors)}, start = Offset(1f, 0f), end = Offset(0f, 1f))`;
    default: return `Brush.linearGradient(${list(colors)})`;
  }
}

function sideBorder(side: 'top' | 'end' | 'bottom' | 'start'): (r: Resolved, ctx: Ctx) => void {
  return (r, ctx): void => {
    const v = r.raw;
    if (v === '' || v === 'px') { ctx.borderSides[side] = 1; return; }
    if (/^\d+$/.test(v)) { ctx.borderSides[side] = Number(v); return; }
    const c = neutralToken(v, 'border') ?? resolveColor(v);
    if (c) { ctx.borderColor = c; ctx.borderColorFromSide = true; }
  };
}

// Inset values are Tailwind spacing tokens (spacing * 4dp) or arbitrary dp.
// auto / unresolvable values resolve to null (drop the pin).
function insetValue(raw: string): number | null {
  const v = SPACING[raw];
  if (v !== undefined) return v;
  if (raw === 'auto') return null;
  const dp = resolveDp(raw);
  return dp === null || Number.isNaN(dp) ? null : dp;
}

// Absolute/fixed positioning inside a Box parent: anchor from the pinned
// sides. Both sides on an axis stretch the child (fillMax + padding); one
// side pins to that edge (align + offset, inward for end/bottom).
function positionModifier(ins: Insets): string | null {
  const { top, end, bottom, start } = ins;
  const hasT = top !== null, hasE = end !== null, hasB = bottom !== null, hasS = start !== null;
  if (!hasT && !hasB && !hasS && !hasE) return null;
  const stretchV = hasT && hasB;
  const stretchH = hasS && hasE;
  const mods: string[] = [];
  if (stretchV) {
    mods.push('fillMaxHeight()');
    if (top !== 0 || bottom !== 0) mods.push(`padding(top = ${top}.dp, bottom = ${bottom}.dp)`);
  }
  if (stretchH) {
    mods.push('fillMaxWidth()');
    if (start !== 0 || end !== 0) mods.push(`padding(start = ${start}.dp, end = ${end}.dp)`);
  }
  if (!(stretchV && stretchH)) {
    const vAnchor = hasT ? 'Top' : hasB ? 'Bottom' : 'Top';
    const hAnchor = hasS ? 'Start' : hasE ? 'End' : 'Start';
    mods.push(`align(Alignment.${vAnchor}${hAnchor})`);
  }
  const ox = !stretchH ? (hasS ? start : hasE ? -end : null) : null;
  const oy = !stretchV ? (hasT ? top : hasB ? -bottom : null) : null;
  if ((ox !== null && ox !== 0) || (oy !== null && oy !== 0)) {
    mods.push(ox !== null && ox !== 0 && oy !== null && oy !== 0
      ? `offset(x = ${ox}.dp, y = ${oy}.dp)`
      : ox !== null && ox !== 0 ? `offset(x = ${ox}.dp)` : `offset(y = ${oy}.dp)`);
  }
  return mods.length === 0 ? null : mods.join('.');
}

export function isAbsolute(classes: string[]): boolean {
  return classes.includes('absolute') || classes.includes('fixed');
}

const UTILITIES: UtilitySpec[] = [
  // ---- text style (exact-name utilities) ----
  { name: 'text-center', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textAlign = TextAlign.Center') },
  { name: 'text-left', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textAlign = TextAlign.Start') },
  { name: 'text-right', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textAlign = TextAlign.End') },
  { name: 'text-justify', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textAlign = TextAlign.Justify') },
  { name: 'text-start', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textAlign = TextAlign.Start') },
  { name: 'text-end', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textAlign = TextAlign.End') },
  { name: 'italic', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'fontStyle = FontStyle.Italic') },
  { name: 'underline', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textDecoration = TextDecoration.Underline') },
  { name: 'overline', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textDecoration = TextDecoration.Overline') },
  { name: 'line-through', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textDecoration = TextDecoration.LineThrough') },
  { name: 'no-underline', bucket: 'textStyle', ns: [], render: (_r, ctx) => pushText(ctx, 'textDecoration = TextDecoration.None') },
  // ---- typography ----
  { name: 'text', bucket: 'textStyle', ns: ['fontSize', 'color'], render: (r, ctx) => {
    if (r.kind === 'sp') {
      pushText(ctx, `fontSize = ${r.sp}.sp`);
      const lh = FONT_LINE_HEIGHT[r.raw];
      if (lh !== undefined) pushText(ctx, `lineHeight = ${lh}.sp`);
    } else if (r.kind === 'color') {
      pushText(ctx, `color = ${neutralToken(r.raw, 'text') ?? r.color}`);
    }
  } },
  { name: 'font', bucket: 'textStyle', ns: ['weight', 'family'], render: (r, ctx) => {
    if (r.kind === 'weight') pushText(ctx, `fontWeight = ${r.weight}`);
    else if (r.kind === 'family') pushText(ctx, `fontFamily = ${r.family}`);
  } },
  { name: 'leading', bucket: 'textStyle', ns: ['leading'], render: (r, ctx) => { if (r.kind === 'sp') pushText(ctx, `lineHeight = ${r.sp}.sp`); } },
  { name: 'tracking', bucket: 'textStyle', ns: ['tracking'], render: (r, ctx) => { if (r.kind === 'sp') pushText(ctx, `letterSpacing = ${r.sp}.sp`); } },
  { name: 'decoration', bucket: 'textStyle', ns: ['color'], render: (r, ctx) => { if (r.kind === 'color') pushText(ctx, `textDecorationColor = ${r.color}`); } },
  // ---- Text composable params ----
  { name: 'line-clamp', bucket: 'text', ns: ['lineClamp'], render: (r, ctx) => { if (r.kind === 'dp') { ctx.parts.text.maxLines = r.dp; ctx.parts.text.overflow = 'Ellipsis'; } } },
  { name: 'line-clamp-none', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.maxLines = undefined; ctx.parts.text.overflow = undefined; } },
  { name: 'truncate', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.maxLines = 1; ctx.parts.text.overflow = 'Ellipsis'; } },
  { name: 'text-ellipsis', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.overflow = 'Ellipsis'; } },
  { name: 'text-clip', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.overflow = 'Clip'; } },
  { name: 'text-wrap', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.softWrap = true; } },
  { name: 'text-nowrap', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.softWrap = false; } },
  { name: 'text-balance', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.softWrap = true; } },
  { name: 'text-pretty', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.softWrap = true; } },
  { name: 'whitespace', bucket: 'text', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === 'nowrap' || v === 'pre') ctx.parts.text.softWrap = false;
    else if (v === 'normal' || v === 'pre-line' || v === 'pre-wrap' || v === 'break-spaces') ctx.parts.text.softWrap = true;
  } },
  // ---- text case transforms (applied to the string at the Text call site) ----
  { name: 'uppercase', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.transform = 'upper'; } },
  { name: 'lowercase', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.transform = 'lower'; } },
  { name: 'capitalize', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.transform = 'cap'; } },
  { name: 'normal-case', bucket: 'text', ns: [], render: (_r, ctx) => { ctx.parts.text.transform = undefined; } },
  // ---- padding / margin ----
  { name: 'p', bucket: 'padding', ns: ['spacing'], render: dpSide('padding', 'all') },
  { name: 'px', bucket: 'padding', ns: ['spacing'], render: dpSide('padding', 'x') },
  { name: 'py', bucket: 'padding', ns: ['spacing'], render: dpSide('padding', 'y') },
  { name: 'pt', bucket: 'padding', ns: ['spacing'], render: dpSide('padding', 'top') },
  { name: 'pr', bucket: 'padding', ns: ['spacing'], render: dpSide('padding', 'end') },
  { name: 'pb', bucket: 'padding', ns: ['spacing'], render: dpSide('padding', 'bottom') },
  { name: 'pl', bucket: 'padding', ns: ['spacing'], render: dpSide('padding', 'start') },
  { name: 'm', bucket: 'margin', ns: ['spacing'], render: dpSide('margin', 'all') },
  { name: 'mx', bucket: 'margin', ns: ['spacing'], render: dpSide('margin', 'x') },
  { name: 'my', bucket: 'margin', ns: ['spacing'], render: dpSide('margin', 'y') },
  { name: 'mt', bucket: 'margin', ns: ['spacing'], render: dpSide('margin', 'top') },
  { name: 'mr', bucket: 'margin', ns: ['spacing'], render: dpSide('margin', 'end') },
  { name: 'mb', bucket: 'margin', ns: ['spacing'], render: dpSide('margin', 'bottom') },
  { name: 'ml', bucket: 'margin', ns: ['spacing'], render: dpSide('margin', 'start') },
  // ---- sizing ----
  { name: 'w', bucket: 'size', ns: ['size'], render: sizeFill('w') },
  { name: 'h', bucket: 'size', ns: ['size'], render: sizeFill('h') },
  { name: 'size', bucket: 'size', ns: ['size'], render: (r, ctx) => { if (r.kind === 'dp') ctx.parts.size.push(`size(${r.dp}.dp)`); } },
  { name: 'min-w', bucket: 'size', ns: ['size'], render: sizeIn('w', 'min') },
  { name: 'max-w', bucket: 'size', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '') return;
    const named = MAX_W[v];
    if (named !== undefined) { if (named > 0) ctx.parts.size.push(`widthIn(max = ${named}.dp)`); return; }
    const dp = resolveDp(v);
    if (dp !== null) ctx.parts.size.push(`widthIn(max = ${dp}.dp)`);
  } },
  { name: 'min-h', bucket: 'size', ns: ['size'], render: sizeIn('h', 'min') },
  { name: 'max-h', bucket: 'size', ns: ['size'], render: sizeIn('h', 'max') },
  { name: 'container', bucket: 'size', ns: [], render: (_r, ctx) => { ctx.parts.size.push('widthIn(max = 1280.dp)'); } },
  { name: 'aspect', bucket: 'size', ns: [], render: (r, ctx) => {
    const raw = r.raw;
    if (raw === 'auto') return;
    let expr: string | null = null;
    if (raw === 'square') expr = 'aspectRatio(1f)';
    else if (raw === 'video') expr = 'aspectRatio(16f / 9f)';
    else if (raw.startsWith('[') && raw.endsWith(']')) {
      const v = raw.slice(1, -1);
      const m = v.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (m) expr = `aspectRatio(${m[1]}f / ${m[2]}f)`;
      else if (/^\d+(\.\d+)?$/.test(v)) expr = `aspectRatio(${v}f)`;
    }
    if (expr) ctx.parts.size.push(expr);
  } },
  // ---- color surfaces ----
  { name: 'bg', bucket: 'background', ns: ['color'], render: (r, ctx) => { if (r.kind === 'color') ctx.parts.background.push(`background(${neutralToken(r.raw, 'bg') ?? r.color})`); } },
  { name: 'opacity', bucket: 'alpha', ns: ['opacity'], render: (r, ctx) => { if (r.kind === 'fraction') ctx.parts.alpha.push(`alpha(${r.fraction.toFixed(3)}f)`); } },
  { name: 'invisible', bucket: 'alpha', ns: [], render: (_r, ctx) => { ctx.parts.alpha.push('alpha(0.000f)'); } },
  // ---- gradients ----
  { name: 'bg-gradient', bucket: 'background', ns: [], render: (r, ctx) => { ctx.gradDir = r.raw; } },
  { name: 'from', bucket: 'background', ns: ['color'], render: (r, ctx) => { if (r.kind === 'color') ctx.gradFrom = r.color; } },
  { name: 'via', bucket: 'background', ns: ['color'], render: (r, ctx) => { if (r.kind === 'color') ctx.gradVia = r.color; } },
  { name: 'to', bucket: 'background', ns: ['color'], render: (r, ctx) => { if (r.kind === 'color') ctx.gradTo = r.color; } },
  // ---- decoration ----
  { name: 'rounded', bucket: 'clip', ns: [], render: (r, ctx) => {
    const raw = r.raw;
    const m = raw.match(/^(t|b|l|r|tl|tr|br|bl)-(.*)$/);
    let side: string | null = null;
    let sizeRaw = raw;
    if (m) {
      side = m[1] ?? null;
      sizeRaw = m[2] ?? '';
    }
    const radius = sizeRaw === '' ? 4 : RADIUS[sizeRaw] ?? resolveDp(sizeRaw);
    if (radius === null || radius === undefined) return;
    if (side === null) {
      ctx.parts.clip.push(`clip(RoundedCornerShape(${radius}.dp))`);
    } else {
      const tpl = CORNER_TPL[side];
      if (tpl) ctx.parts.clip.push(`clip(${tpl.replace(/X/g, String(radius))})`);
    }
  } },
  { name: 'shadow', bucket: 'shadow', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '') { ctx.shadowElevation = 3; return; }
    if (v === 'none') { ctx.shadowElevation = 0; return; }
    const size = SHADOW_SIZE[v];
    if (size !== undefined) { ctx.shadowElevation = size; return; }
    const c = resolveColor(v);
    if (c) { ctx.shadowColor = c; return; }
    const dp = resolveDp(v);
    if (dp !== null) ctx.shadowElevation = dp;
  } },
  { name: 'drop-shadow', bucket: 'shadow', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '') { ctx.shadowElevation = 3; return; }
    if (v === 'none') { ctx.shadowElevation = 0; return; }
    const size = SHADOW_SIZE[v];
    if (size !== undefined) { ctx.shadowElevation = size; return; }
    const c = resolveColor(v);
    if (c) { ctx.shadowColor = c; return; }
    const dp = resolveDp(v);
    if (dp !== null) ctx.shadowElevation = dp;
  } },
  // ---- borders ----
  { name: 'border', bucket: 'border', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '' || v === 'px') { ctx.borderWidth = 1; return; }
    if (v === 'none') { ctx.borderWidth = 0; return; }
    if (/^\d+$/.test(v)) { ctx.borderWidth = Number(v); return; }
    const c = neutralToken(v, 'border') ?? resolveColor(v);
    if (c) { ctx.borderColor = c; return; }
  } },
  { name: 'border-t', bucket: 'border', ns: [], render: sideBorder('top') },
  { name: 'border-r', bucket: 'border', ns: [], render: sideBorder('end') },
  { name: 'border-b', bucket: 'border', ns: [], render: sideBorder('bottom') },
  { name: 'border-l', bucket: 'border', ns: [], render: sideBorder('start') },
  { name: 'border-x', bucket: 'border', ns: [], render: (r, ctx) => { sideBorder('start')(r, ctx); sideBorder('end')(r, ctx); } },
  { name: 'border-y', bucket: 'border', ns: [], render: (r, ctx) => { sideBorder('top')(r, ctx); sideBorder('bottom')(r, ctx); } },
  { name: 'border-dashed', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.borderStyle = 'dashed'; } },
  { name: 'border-dotted', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.borderStyle = 'dotted'; } },
  // ---- rings / outlines (approximated with border) ----
  { name: 'ring', bucket: 'border', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '') { ctx.ringWidth = 3; return; }
    if (v === 'none' || v === 'inset') { ctx.ringWidth = 0; return; }
    const w = RING[v];
    if (w !== undefined) { ctx.ringWidth = w; return; }
    const c = neutralToken(v, 'border') ?? resolveColor(v);
    if (c) { ctx.ringColor = c; return; }
  } },
  { name: 'outline', bucket: 'border', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '' || v === 'none') return;
    if (/^\d+$/.test(v)) { ctx.outlineWidth = Number(v); return; }
    const c = neutralToken(v, 'border') ?? resolveColor(v);
    if (c) { ctx.outlineColor = c; return; }
  } },
  { name: 'outline-dashed', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.outlineStyle = 'dashed'; } },
  { name: 'outline-dotted', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.outlineStyle = 'dotted'; } },
  // ---- divide (child borders) ----
  { name: 'divide-x', bucket: 'border', ns: [], render: (r, ctx) => {
    ctx.divide.axis = 'x';
    const v = r.raw;
    if (v === '' || v === 'px') ctx.divide.width = 1;
    else if (/^\d+$/.test(v)) ctx.divide.width = Number(v);
  } },
  { name: 'divide-y', bucket: 'border', ns: [], render: (r, ctx) => {
    ctx.divide.axis = 'y';
    const v = r.raw;
    if (v === '' || v === 'px') ctx.divide.width = 1;
    else if (/^\d+$/.test(v)) ctx.divide.width = Number(v);
  } },
  { name: 'divide', bucket: 'border', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '') return;
    if (v === 'px') { ctx.divide.width = 1; return; }
    if (/^\d+$/.test(v)) { ctx.divide.width = Number(v); return; }
    const c = neutralToken(v, 'border') ?? resolveColor(v);
    if (c) { ctx.divide.color = c; }
  } },
  { name: 'divide-solid', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.divide.style = 'solid'; } },
  { name: 'divide-dashed', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.divide.style = 'dashed'; } },
  { name: 'divide-dotted', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.divide.style = 'dotted'; } },
  { name: 'divide-double', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.divide.style = 'solid'; } },
  { name: 'divide-none', bucket: 'border', ns: [], render: (_r, ctx) => { ctx.divide.style = 'none'; } },
  // ---- object-fit (Image content scale) ----
  { name: 'object', bucket: 'scale', ns: ['fit'], render: (r, ctx) => {
    if (r.kind === 'fit') {
      const m: Record<string, string> = { cover: 'ContentScale.Crop', contain: 'ContentScale.Fit', fill: 'ContentScale.FillBounds', none: 'ContentScale.None', 'scale-down': 'ContentScale.Inside' };
      const v = m[r.raw];
      if (v) ctx.parts.scale.push(v);
    }
  } },
  // ---- overflow / scrolling ----
  { name: 'overflow', bucket: 'clip', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === 'hidden' || v === 'clip' || v === 'x-hidden' || v === 'y-hidden') ctx.parts.clip.push('clip(RoundedCornerShape(0.dp))');
    // A vertical page-scroll container (an ancestor of the routed content
    // slot) is keyed by route so forward navigation starts at the top and
    // back navigation restores the previous offset (NavHost-style). Nested
    // scroll regions stay independent per element, like CSS — an
    // overflow-y-auto/overflow-x-auto never shares scroll position with
    // anything else (rows and strips each scroll on their own).
    else if (v === 'y-auto' || v === 'y-scroll') ctx.parts.scroll.push(`verticalScroll(${ctx.scrollRouteKeyed ? 'rememberRouteScrollState()' : 'rememberScrollState()'})`);
    else if (v === 'x-auto' || v === 'x-scroll') ctx.parts.scroll.push('horizontalScroll(rememberScrollState())');
  } },
  // ---- transforms ----
  { name: 'rotate', bucket: 'transform', ns: ['rotate'], render: (r, ctx) => { if (r.kind === 'dp' && r.dp !== 0) ctx.parts.transform.push(`rotate(${r.dp}f)`); } },
  { name: 'scale', bucket: 'transform', ns: ['scale'], render: (r, ctx) => { if (r.kind === 'fraction' && r.fraction !== 1) ctx.parts.transform.push(`scale(${r.fraction}f)`); } },
  { name: 'scale-x', bucket: 'transform', ns: ['scale'], render: (r, ctx) => { if (r.kind === 'fraction' && r.fraction !== 1) ctx.parts.transform.push(`graphicsLayer { scaleX = ${r.fraction}f }`); } },
  { name: 'scale-y', bucket: 'transform', ns: ['scale'], render: (r, ctx) => { if (r.kind === 'fraction' && r.fraction !== 1) ctx.parts.transform.push(`graphicsLayer { scaleY = ${r.fraction}f }`); } },
  { name: 'translate-x', bucket: 'transform', ns: ['spacing'], render: (r, ctx) => { if (r.kind === 'dp' && r.dp !== 0) ctx.parts.transform.push(`offset(x = ${r.dp}.dp)`); } },
  { name: 'translate-y', bucket: 'transform', ns: ['spacing'], render: (r, ctx) => { if (r.kind === 'dp' && r.dp !== 0) ctx.parts.transform.push(`offset(y = ${r.dp}.dp)`); } },
  { name: 'skew-x', bucket: 'transform', ns: ['skew'], render: (r, ctx) => { if (r.kind === 'dp' && r.dp !== 0) ctx.parts.transform.push(`veskSkew(kotlin.math.tan(kotlin.math.PI / 180 * ${r.dp}).toFloat(), 0f)`); } },
  { name: 'skew-y', bucket: 'transform', ns: ['skew'], render: (r, ctx) => { if (r.kind === 'dp' && r.dp !== 0) ctx.parts.transform.push(`veskSkew(0f, kotlin.math.tan(kotlin.math.PI / 180 * ${r.dp}).toFloat())`); } },
  { name: 'blur', bucket: 'transform', ns: ['blur'], render: (r, ctx) => { if (r.kind === 'dp' && r.dp > 0) ctx.parts.transform.push(`blur(${r.dp}.dp)`); } },
  // ---- color filters (color-matrix based, see veskColorFilter in Runtime.kt) ----
  { name: 'brightness', bucket: 'transform', ns: [], render: (r, ctx) => {
    const mult = pctValue(r.raw, 0, 200);
    if (mult !== null && mult !== 1) ctx.parts.transform.push(`veskBrightness(${mult.toFixed(3)}f)`);
  } },
  { name: 'contrast', bucket: 'transform', ns: [], render: (r, ctx) => {
    const c = pctValue(r.raw, 0, 200);
    if (c !== null && c !== 1) ctx.parts.transform.push(`veskContrast(${c.toFixed(3)}f)`);
  } },
  { name: 'saturate', bucket: 'transform', ns: [], render: (r, ctx) => {
    const s = pctValue(r.raw, 0, 200);
    if (s !== null && s !== 1) ctx.parts.transform.push(`veskSaturate(${s.toFixed(3)}f)`);
  } },
  { name: 'hue-rotate', bucket: 'transform', ns: [], render: (r, ctx) => {
    let deg: number | null = null;
    const v = r.raw;
    if (v.startsWith('[') && v.endsWith(']')) {
      const n = Number.parseFloat(v.slice(1, -1).replace(/deg$/, ''));
      if (!Number.isNaN(n)) deg = n;
    } else {
      const n = Number(v);
      if ([0, 15, 30, 60, 90, 180].includes(n)) deg = n;
    }
    if (deg !== null && deg !== 0) ctx.parts.transform.push(`veskHueRotate(${deg}f)`);
  } },
  { name: 'grayscale', bucket: 'transform', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '0') return;
    if (v.startsWith('[') && v.endsWith(']')) {
      const n = pctValue(v, 0, 100);
      if (n !== null && n !== 0) ctx.parts.transform.push(`veskGrayscale(${n.toFixed(3)}f)`);
      return;
    }
    ctx.parts.transform.push('veskGrayscale(1f)');
  } },
  { name: 'invert', bucket: 'transform', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '0') return;
    if (v.startsWith('[') && v.endsWith(']')) {
      const n = pctValue(v, 0, 100);
      if (n !== null && n !== 0) ctx.parts.transform.push(`veskInvert(${n.toFixed(3)}f)`);
      return;
    }
    ctx.parts.transform.push('veskInvert(1f)');
  } },
  { name: 'sepia', bucket: 'transform', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === '0') return;
    if (v.startsWith('[') && v.endsWith(']')) {
      const n = pctValue(v, 0, 100);
      if (n !== null && n !== 0) ctx.parts.transform.push(`veskSepia(${n.toFixed(3)}f)`);
      return;
    }
    ctx.parts.transform.push('veskSepia(1f)');
  } },
  // ---- stacking ----
  { name: 'z', bucket: 'stacking', ns: ['zIndex'], render: (r, ctx) => { if (r.kind === 'dp') ctx.parts.stacking.push(`zIndex(${r.dp}f)`); } },
  // ---- align self (only valid inside Row/Column scope; stripped at top level) ----
  { name: 'self', bucket: 'align', ns: [], render: (r, ctx) => {
    const v = r.raw;
    if (v === 'auto') return;
    if (ctx.axis === 'column') {
      if (v === 'start') ctx.parts.align.push('align(Alignment.Start)');
      else if (v === 'end') ctx.parts.align.push('align(Alignment.End)');
      else if (v === 'center') ctx.parts.align.push('align(Alignment.CenterHorizontally)');
      else if (v === 'stretch') ctx.parts.align.push('fillMaxWidth()');
    } else {
      if (v === 'start') ctx.parts.align.push('align(Alignment.Top)');
      else if (v === 'end') ctx.parts.align.push('align(Alignment.Bottom)');
      else if (v === 'center') ctx.parts.align.push('align(Alignment.CenterVertically)');
      else if (v === 'stretch') ctx.parts.align.push('fillMaxHeight()');
    }
  } },
  // ---- flex weight (children of Row/Column) ----
  { name: 'flex', bucket: 'size', ns: [], render: (r, ctx) => { if (r.raw === '1' || r.raw === 'auto') ctx.parts.size.push('weight(1f)'); } },
  { name: 'grow', bucket: 'size', ns: [], render: (r, ctx) => { if (r.raw === '') ctx.parts.size.push('weight(1f)'); } },
  // ---- flex wrap (container switches to FlowRow/FlowColumn) ----
  { name: 'flex-wrap', bucket: 'flow', ns: [], render: (_r, ctx) => { ctx.parts.flow = true; } },
  { name: 'flex-wrap-reverse', bucket: 'flow', ns: [], render: (_r, ctx) => { ctx.parts.flow = true; } },
  { name: 'flex-nowrap', bucket: 'flow', ns: [], render: (_r, ctx) => { ctx.parts.flow = false; } },
  // ---- layout ----
  { name: 'flex-row', bucket: 'layout', ns: [], render: noop },
  { name: 'flex-col', bucket: 'layout', ns: [], render: noop },
  { name: 'flex-row-reverse', bucket: 'layout', ns: [], render: noop },
  { name: 'flex-col-reverse', bucket: 'layout', ns: [], render: noop },
  { name: 'items', bucket: 'layout', ns: [], render: (r, ctx) => {
    if (ctx.axis === 'column') {
      if (r.raw === 'center') ctx.layout.horizontalAlignment = 'Alignment.CenterHorizontally';
      else if (r.raw === 'start') ctx.layout.horizontalAlignment = 'Alignment.Start';
      else if (r.raw === 'end') ctx.layout.horizontalAlignment = 'Alignment.End';
    } else {
      if (r.raw === 'center') ctx.layout.verticalAlignment = 'Alignment.CenterVertically';
      else if (r.raw === 'start') ctx.layout.verticalAlignment = 'Alignment.Top';
      else if (r.raw === 'end') ctx.layout.verticalAlignment = 'Alignment.Bottom';
    }
  } },
  { name: 'justify', bucket: 'layout', ns: [], render: (r, ctx) => {
    const horiz: Record<string, string> = { center: 'Center', start: 'Start', end: 'End', between: 'SpaceBetween', around: 'SpaceAround', evenly: 'SpaceEvenly' };
    const vert: Record<string, string> = { center: 'Center', start: 'Top', end: 'Bottom', between: 'SpaceBetween', around: 'SpaceAround', evenly: 'SpaceEvenly' };
    if (ctx.axis === 'column') {
      const v = vert[r.raw];
      if (v) ctx.layout.verticalArrangement = `Arrangement.${v}`;
    } else {
      const v = horiz[r.raw];
      if (v) ctx.layout.horizontalArrangement = `Arrangement.${v}`;
    }
  } },
  { name: 'gap', bucket: 'layout', ns: ['spacing'], render: (r, ctx) => {
    if (r.kind !== 'dp') return;
    if (ctx.axis === 'grid') { ctx.gapX = r.dp; ctx.gapY = r.dp; return; }
    if (ctx.axis === 'column') ctx.layout.verticalArrangement = `Arrangement.spacedBy(${r.dp}.dp)`;
    else ctx.layout.horizontalArrangement = `Arrangement.spacedBy(${r.dp}.dp)`;
  } },
  { name: 'gap-x', bucket: 'layout', ns: ['spacing'], render: (r, ctx) => {
    if (r.kind !== 'dp') return;
    if (ctx.axis === 'grid') { ctx.gapX = r.dp; return; }
    if (ctx.axis === 'row') ctx.layout.horizontalArrangement = `Arrangement.spacedBy(${r.dp}.dp)`;
  } },
  { name: 'gap-y', bucket: 'layout', ns: ['spacing'], render: (r, ctx) => {
    if (r.kind !== 'dp') return;
    if (ctx.axis === 'grid') { ctx.gapY = r.dp; return; }
    if (ctx.axis === 'column') ctx.layout.verticalArrangement = `Arrangement.spacedBy(${r.dp}.dp)`;
  } },
  { name: 'space-x', bucket: 'layout', ns: ['spacing'], render: (r, ctx) => {
    if (r.kind === 'dp' && ctx.axis === 'row') ctx.layout.horizontalArrangement = `Arrangement.spacedBy(${r.dp}.dp)`;
  } },
  { name: 'space-y', bucket: 'layout', ns: ['spacing'], render: (r, ctx) => {
    if (r.kind === 'dp' && ctx.axis === 'column') ctx.layout.verticalArrangement = `Arrangement.spacedBy(${r.dp}.dp)`;
  } },
  // ---- grid (container mode; cells chunked into weighted rows by codegen) ----
  { name: 'grid', bucket: 'grid', ns: [], render: (_r, ctx) => { if (ctx.gridCols === null) ctx.gridCols = 1; } },
  { name: 'inline-grid', bucket: 'grid', ns: [], render: (_r, ctx) => { if (ctx.gridCols === null) ctx.gridCols = 1; } },
  { name: 'grid-cols', bucket: 'grid', ns: [], render: (r, ctx) => {
    const raw = r.raw;
    if (raw === 'none') { ctx.gridCols = 1; return; }
    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      if (n >= 1 && n <= 48) ctx.gridCols = n;
    }
  } },
  { name: 'grid-rows', bucket: 'grid', ns: [], render: noop },
  { name: 'grid-flow', bucket: 'grid', ns: [], render: noop },
  // ---- positioning ----
  { name: 'absolute', bucket: 'position', ns: [], render: (_r, ctx) => { ctx.position = 'absolute'; } },
  { name: 'fixed', bucket: 'position', ns: [], render: (_r, ctx) => { ctx.position = 'fixed'; } },
  { name: 'relative', bucket: 'position', ns: [], render: (_r, ctx) => { ctx.position = 'relative'; } },
  { name: 'static', bucket: 'position', ns: [], render: (_r, ctx) => { ctx.position = null; } },
  { name: 'inset', bucket: 'position', ns: [], render: (r, ctx) => {
    const v = insetValue(r.raw);
    const n = ctx.neg && v !== null ? -v : v;
    ctx.insets.top = n; ctx.insets.end = n; ctx.insets.bottom = n; ctx.insets.start = n;
  } },
  { name: 'inset-x', bucket: 'position', ns: [], render: (r, ctx) => {
    const v = insetValue(r.raw);
    const n = ctx.neg && v !== null ? -v : v;
    ctx.insets.start = n; ctx.insets.end = n;
  } },
  { name: 'inset-y', bucket: 'position', ns: [], render: (r, ctx) => {
    const v = insetValue(r.raw);
    const n = ctx.neg && v !== null ? -v : v;
    ctx.insets.top = n; ctx.insets.bottom = n;
  } },
  { name: 'top', bucket: 'position', ns: [], render: (r, ctx) => { const v = insetValue(r.raw); if (v !== null) ctx.insets.top = ctx.neg ? -v : v; } },
  { name: 'right', bucket: 'position', ns: [], render: (r, ctx) => { const v = insetValue(r.raw); if (v !== null) ctx.insets.end = ctx.neg ? -v : v; } },
  { name: 'bottom', bucket: 'position', ns: [], render: (r, ctx) => { const v = insetValue(r.raw); if (v !== null) ctx.insets.bottom = ctx.neg ? -v : v; } },
  { name: 'left', bucket: 'position', ns: [], render: (r, ctx) => { const v = insetValue(r.raw); if (v !== null) ctx.insets.start = ctx.neg ? -v : v; } },
  // ---- recognized but not expressible in Compose -> dropped ----
  { name: 'order', bucket: 'drop', ns: [], render: noop },
  { name: 'basis', bucket: 'drop', ns: [], render: noop },
  { name: 'col-span', bucket: 'drop', ns: [], render: noop },
  { name: 'row-span', bucket: 'drop', ns: [], render: noop },
  { name: 'col-start', bucket: 'drop', ns: [], render: noop },
  { name: 'col-end', bucket: 'drop', ns: [], render: noop },
  { name: 'row-start', bucket: 'drop', ns: [], render: noop },
  { name: 'row-end', bucket: 'drop', ns: [], render: noop },
  { name: 'auto-cols', bucket: 'drop', ns: [], render: noop },
  { name: 'auto-rows', bucket: 'drop', ns: [], render: noop },
  { name: 'col', bucket: 'drop', ns: [], render: noop },
  { name: 'row', bucket: 'drop', ns: [], render: noop },
  { name: 'columns', bucket: 'drop', ns: [], render: noop },
  { name: 'space', bucket: 'drop', ns: [], render: noop },
  { name: 'content', bucket: 'drop', ns: [], render: noop },
  { name: 'place', bucket: 'drop', ns: [], render: noop },
  { name: 'place-items', bucket: 'drop', ns: [], render: noop },
  { name: 'place-self', bucket: 'drop', ns: [], render: noop },
  { name: 'justify-items', bucket: 'drop', ns: [], render: noop },
  { name: 'justify-self', bucket: 'drop', ns: [], render: noop },
  { name: 'float', bucket: 'drop', ns: [], render: noop },
  { name: 'clear', bucket: 'drop', ns: [], render: noop },
  { name: 'list', bucket: 'drop', ns: [], render: noop },
  { name: 'not-italic', bucket: 'drop', ns: [], render: noop },
  { name: 'normal-nums', bucket: 'drop', ns: [], render: noop },
  { name: 'ordinal', bucket: 'drop', ns: [], render: noop },
  { name: 'slashed-zero', bucket: 'drop', ns: [], render: noop },
  { name: 'lining-nums', bucket: 'drop', ns: [], render: noop },
  { name: 'oldstyle-nums', bucket: 'drop', ns: [], render: noop },
  { name: 'proportional-nums', bucket: 'drop', ns: [], render: noop },
  { name: 'tabular-nums', bucket: 'drop', ns: [], render: noop },
  { name: 'diagonal-fractions', bucket: 'drop', ns: [], render: noop },
  { name: 'stacked-fractions', bucket: 'drop', ns: [], render: noop },
  { name: 'select', bucket: 'drop', ns: [], render: noop },
  { name: 'cursor', bucket: 'drop', ns: [], render: noop },
  { name: 'pointer-events', bucket: 'drop', ns: [], render: noop },
  { name: 'object', bucket: 'drop', ns: [], render: noop },
  { name: 'overscroll', bucket: 'drop', ns: [], render: noop },
  { name: 'scroll', bucket: 'drop', ns: [], render: noop },
  { name: 'touch', bucket: 'drop', ns: [], render: noop },
  { name: 'snap', bucket: 'drop', ns: [], render: noop },
  { name: 'align', bucket: 'drop', ns: [], render: noop },
  { name: 'accent', bucket: 'drop', ns: [], render: noop },
  { name: 'caret', bucket: 'drop', ns: [], render: noop },
  { name: 'appearance', bucket: 'drop', ns: [], render: noop },
  { name: 'resize', bucket: 'drop', ns: [], render: noop },
  { name: 'will-change', bucket: 'drop', ns: [], render: noop },
  { name: 'fill', bucket: 'drop', ns: [], render: noop },
  { name: 'stroke', bucket: 'drop', ns: [], render: noop },
  { name: 'underline-offset', bucket: 'drop', ns: [], render: noop },
  { name: 'ring-offset', bucket: 'drop', ns: [], render: noop },
  { name: 'outline-offset', bucket: 'drop', ns: [], render: noop },
  { name: 'filter', bucket: 'drop', ns: [], render: noop },
  { name: 'backdrop', bucket: 'drop', ns: [], render: noop },
  { name: 'mix-blend', bucket: 'drop', ns: [], render: noop },
  { name: 'bg-blend', bucket: 'drop', ns: [], render: noop },
  { name: 'transform', bucket: 'drop', ns: [], render: noop },
  { name: 'origin', bucket: 'drop', ns: [], render: noop },
  { name: 'transition', bucket: 'drop', ns: [], render: noop },
  { name: 'duration', bucket: 'drop', ns: [], render: noop },
  { name: 'ease', bucket: 'drop', ns: [], render: noop },
  { name: 'delay', bucket: 'drop', ns: [], render: noop },
  { name: 'animate', bucket: 'drop', ns: [], render: noop },
  { name: 'break', bucket: 'drop', ns: [], render: noop },
  { name: 'break-after', bucket: 'drop', ns: [], render: noop },
  { name: 'break-before', bucket: 'drop', ns: [], render: noop },
  { name: 'break-inside', bucket: 'drop', ns: [], render: noop },
  { name: 'hyphens', bucket: 'drop', ns: [], render: noop },
  { name: 'indent', bucket: 'drop', ns: [], render: noop },
  { name: 'sr-only', bucket: 'drop', ns: [], render: noop },
  { name: 'not-sr-only', bucket: 'drop', ns: [], render: noop },
  { name: 'visible', bucket: 'drop', ns: [], render: noop },
  { name: 'collapse', bucket: 'drop', ns: [], render: noop },
  { name: 'block', bucket: 'drop', ns: [], render: noop },
  { name: 'inline', bucket: 'drop', ns: [], render: noop },
  { name: 'inline-block', bucket: 'drop', ns: [], render: noop },
  { name: 'inline-flex', bucket: 'drop', ns: [], render: noop },
  { name: 'flow-root', bucket: 'drop', ns: [], render: noop },
  { name: 'contents', bucket: 'drop', ns: [], render: noop },
  { name: 'list-item', bucket: 'drop', ns: [], render: noop },
  { name: 'table', bucket: 'drop', ns: [], render: noop },
  { name: 'table-row', bucket: 'drop', ns: [], render: noop },
  { name: 'table-cell', bucket: 'drop', ns: [], render: noop },
  { name: 'inline-table', bucket: 'drop', ns: [], render: noop },
  { name: 'table-caption', bucket: 'drop', ns: [], render: noop },
  { name: 'table-column', bucket: 'drop', ns: [], render: noop },
  { name: 'table-column-group', bucket: 'drop', ns: [], render: noop },
  { name: 'table-footer-group', bucket: 'drop', ns: [], render: noop },
  { name: 'table-header-group', bucket: 'drop', ns: [], render: noop },
  { name: 'table-row-group', bucket: 'drop', ns: [], render: noop },
  { name: 'border-collapse', bucket: 'drop', ns: [], render: noop },
  { name: 'border-separate', bucket: 'drop', ns: [], render: noop },
  { name: 'border-spacing', bucket: 'drop', ns: [], render: noop },
  { name: 'table-auto', bucket: 'drop', ns: [], render: noop },
  { name: 'table-fixed', bucket: 'drop', ns: [], render: noop },
  { name: 'caption', bucket: 'drop', ns: [], render: noop },
  { name: 'sticky', bucket: 'drop', ns: [], render: noop },
  { name: 'isolate', bucket: 'drop', ns: [], render: noop },
  { name: 'box-border', bucket: 'drop', ns: [], render: noop },
  { name: 'box-content', bucket: 'drop', ns: [], render: noop },
  { name: 'box-decoration', bucket: 'drop', ns: [], render: noop },
  { name: 'antialiased', bucket: 'drop', ns: [], render: noop },
  { name: 'subpixel-antialiased', bucket: 'drop', ns: [], render: noop },
];

const SORTED_UTILITIES: UtilitySpec[] = [...UTILITIES].sort((a, b) => b.name.length - a.name.length);

// ---------- tokenizer ----------

const RESPONSIVE_VARIANTS = new Set(['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'portrait', 'landscape']);

function splitVariants(cls: string): { variants: string[]; base: string } {
  const parts = cls.split(':');
  if (parts.length <= 1) return { variants: [], base: cls };
  return { variants: parts.slice(0, -1), base: parts[parts.length - 1] ?? '' };
}

function matchSpec(cls: string): { spec: UtilitySpec; value: string } | null {
  for (const spec of SORTED_UTILITIES) {
    if (cls === spec.name) return { spec, value: '' };
    if (cls.startsWith(spec.name + '-')) return { spec, value: cls.slice(spec.name.length + 1) };
  }
  return null;
}

function skippedByVariant(variants: string[]): boolean {
  return variants.some((v) => !RESPONSIVE_VARIANTS.has(v));
}

// ---------- public API ----------

export function classify(classes: string[], custom?: Map<string, ModifierParts>, axis: Axis = 'column', scrollRouteKeyed = false): ModifierParts {
  const parts = emptyParts();
  const ctx = makeCtx(parts, axis, scrollRouteKeyed);
  const unhandled: string[] = [];

  for (const cls0 of classes) {
    const { variants, base: base0 } = splitVariants(cls0);
    if (variants.length > 0 && skippedByVariant(variants)) continue;
    let neg = false;
    let base = base0;
    if (base.startsWith('-') && base.length > 1) { neg = true; base = base.slice(1); } // negative utilities (-m-4)
    const m = matchSpec(base);
    if (!m) {
      unhandled.push(base);
      continue;
    }
    const { spec, value } = m;
    if (spec.bucket === 'drop' || spec.bucket === 'layout' || spec.bucket === 'grid') continue;
    const resolved = spec.ns.length > 0 ? resolveNs(spec.ns, value) : ({ kind: 'none', raw: value } satisfies Resolved);
    if (spec.ns.length > 0 && !resolved) continue; // known utility, unresolvable value -> dropped
    ctx.neg = neg;
    spec.render(resolved!, ctx);
    ctx.neg = false;
  }

  // per-side border (border-t/r/b/l, border-x/y)
  const s = ctx.borderSides;
  const hasSideBorder = s.top !== null || s.end !== null || s.bottom !== null || s.start !== null;
  // all-side border
  if (ctx.borderWidth !== null) {
    if (ctx.borderWidth > 0) {
      if (ctx.borderStyle && !hasSideBorder) {
        const dashes = ctx.borderStyle === 'dotted' ? 'floatArrayOf(0.1f, 8f)' : 'floatArrayOf(12f, 12f)';
        parts.border.push(`veskDashedBorder(${ctx.borderWidth}.dp, ${ctx.borderColor ?? defaultBorder()}, ${dashes})`);
      } else {
        parts.border.push(`border(${ctx.borderWidth}.dp, ${ctx.borderColor ?? defaultBorder()})`);
      }
    }
  } else if (ctx.borderColor !== null && !ctx.borderColorFromSide && !hasSideBorder) {
    parts.border.push(`border(1.dp, ${ctx.borderColor})`);
  }
  if (hasSideBorder) {
    parts.border.push(`veskSideBorder(top = ${s.top ?? 0}.dp, end = ${s.end ?? 0}.dp, bottom = ${s.bottom ?? 0}.dp, start = ${s.start ?? 0}.dp, ${ctx.borderColor ?? defaultBorder()})`);
  }
  // ring -> border approximation
  if (ctx.ringWidth !== null && ctx.ringWidth > 0) {
    parts.border.push(`border(${ctx.ringWidth}.dp, ${ctx.ringColor ?? 'Color(0x803B82F6)'})`);
  } else if (ctx.ringColor !== null) {
    parts.border.push(`border(1.dp, ${ctx.ringColor})`);
  }
  // outline -> border approximation
  if (ctx.outlineWidth !== null && ctx.outlineWidth > 0) {
    if (ctx.outlineStyle) {
      const dashes = ctx.outlineStyle === 'dotted' ? 'floatArrayOf(0.1f, 8f)' : 'floatArrayOf(12f, 12f)';
      parts.border.push(`veskDashedBorder(${ctx.outlineWidth}.dp, ${ctx.outlineColor ?? defaultBorder()}, ${dashes})`);
    } else {
      parts.border.push(`border(${ctx.outlineWidth}.dp, ${ctx.outlineColor ?? defaultBorder()})`);
    }
  } else if (ctx.outlineColor !== null) {
    parts.border.push(`border(1.dp, ${ctx.outlineColor})`);
  }
  // shadow (elevation + optional tint color)
  if (ctx.shadowElevation !== null && ctx.shadowElevation > 0) {
    parts.shadow.push(ctx.shadowColor
      ? `shadow(${ctx.shadowElevation}.dp, ambientColor = ${ctx.shadowColor}, spotColor = ${ctx.shadowColor})`
      : `shadow(${ctx.shadowElevation}.dp)`);
  } else if (ctx.shadowColor !== null) {
    parts.shadow.push(`shadow(3.dp, ambientColor = ${ctx.shadowColor}, spotColor = ${ctx.shadowColor})`);
  }
  // gradient
  if (ctx.gradDir && (ctx.gradFrom || ctx.gradTo)) {
    parts.background.push(`background(${gradientExpr(ctx.gradDir, ctx.gradFrom ?? 'Color(0x00000000)', ctx.gradVia, ctx.gradTo ?? 'Color(0x00000000)')})`);
  }
  // divide
  if (ctx.divide.axis && ctx.divide.width > 0 && ctx.divide.style !== 'none') {
    const style = ctx.divide.style === 'dotted' || ctx.divide.style === 'dashed' ? ctx.divide.style : 'solid';
    parts.divide = { axis: ctx.divide.axis, width: ctx.divide.width, color: ctx.divide.color ?? defaultBorder(), style };
  }
  // positioning: relative nudges via offset, absolute/fixed pin inside a Box
  if (ctx.position === 'relative') {
    parts.position = 'relative';
    const ox = ctx.insets.start !== null ? ctx.insets.start : ctx.insets.end !== null ? -ctx.insets.end : null;
    const oy = ctx.insets.top !== null ? ctx.insets.top : ctx.insets.bottom !== null ? -ctx.insets.bottom : null;
    if ((ox ?? 0) !== 0 || (oy ?? 0) !== 0) {
      parts.transform.push(ox !== null && oy !== null
        ? `offset(x = ${ox}.dp, y = ${oy}.dp)`
        : ox !== null ? `offset(x = ${ox}.dp)` : `offset(y = ${oy}.dp)`);
    }
  } else if (ctx.position === 'absolute' || ctx.position === 'fixed') {
    parts.position = ctx.position;
    const m = positionModifier(ctx.insets);
    if (m) parts.posMod.push(m);
  }

  if (custom) {
    for (const cls of unhandled) {
      const p = custom.get(cls);
      if (p) mergeParts(parts, p);
    }
  }

  return parts;
}

export function buildModifier(parts: ModifierParts): string | null {
  const all: string[] = [];
  for (const key of BUCKET_ORDER) {
    for (const v of parts[key]) all.push(v);
  }
  if (all.length === 0) return null;
  return `Modifier.${all.join('.')}`;
}

export function resolveModifier(classes: string[], custom?: Map<string, ModifierParts>): string | null {
  return buildModifier(classify(classes, custom));
}

export function buildTextStyle(parts: ModifierParts): string | null {
  // Later utilities win (CSS cascade): keep the last value per style property.
  const last = new Map<string, string>();
  for (const a of parts.textStyle) {
    const name = a.slice(0, a.indexOf('=')).trim();
    last.set(name, a);
  }
  if (last.size === 0) return null;
  return `TextStyle(${[...last.values()].join(', ')})`;
}

export function resolveTextStyle(classes: string[], custom?: Map<string, ModifierParts>): string | null {
  return buildTextStyle(classify(classes, custom));
}

export function layoutArgs(classes: string[], axis: Axis): LayoutArgs {
  const ctx = makeCtx(emptyParts(), axis);
  for (const cls of classes) {
    if (cls.startsWith('-')) continue;
    const { variants, base } = splitVariants(cls);
    if (variants.length > 0 && skippedByVariant(variants)) continue;
    const m = matchSpec(base);
    if (!m) continue;
    const { spec, value } = m;
    if (spec.bucket !== 'layout' && spec.bucket !== 'grid') continue;
    const resolved = spec.ns.length > 0 ? resolveNs(spec.ns, value) : ({ kind: 'none', raw: value } satisfies Resolved);
    if (spec.ns.length > 0 && !resolved) continue;
    spec.render(resolved!, ctx);
  }
  if (ctx.gridCols !== null) {
    ctx.layout.grid = { cols: ctx.gridCols, gapX: ctx.gapX, gapY: ctx.gapY };
  }
  return ctx.layout;
}

export function elementAxis(classes: string[]): Axis {
  if (classes.includes('grid') || classes.includes('inline-grid')) return 'grid';
  if (classes.includes('flex-col') || classes.includes('flex-col-reverse')) return 'column';
  if (classes.includes('flex-row') || classes.includes('flex') || classes.includes('flex-row-reverse')) return 'row';
  return 'column';
}
