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

export const RADIUS: Record<string, number> = {
  'none': 0, 'sm': 2, 'DEFAULT': 4, 'md': 6, 'lg': 8, 'xl': 12, '2xl': 16, '3xl': 24,
  'full': 9999,
};

export const SHADOW_SIZE: Record<string, number> = {
  'sm': 1, 'DEFAULT': 3, 'md': 6, 'lg': 10, 'xl': 20, '2xl': 30,
};

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

export function colorLiteral(hex: number): string {
  const argb = ((0xff000000 | hex) >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `Color(0x${argb})`;
}

const NAMED_COLORS: Record<string, number> = {
  white: 0xffffff,
  black: 0x000000,
};

export function tailwindColor(className: string): string | null {
  if (className === 'transparent') return 'Color(0x00000000)';
  const parts = className.split('-');
  if (parts.length === 1) {
    const hex = NAMED_COLORS[parts[0] ?? ''];
    return hex === undefined ? null : colorLiteral(hex);
  }
  const shadeStr = parts[parts.length - 1];
  const shade = Number(shadeStr);
  if (!Number.isInteger(shade)) return null;
  const name = parts.slice(0, -1).join('-');
  const hex = PALETTE[name]?.[shade];
  return hex === undefined ? null : colorLiteral(hex);
}

export function resolveModifier(classes: string[]): string | null {
  const lead: string[] = [];
  const body: string[] = [];
  const size: string[] = [];
  const pad: string[] = [];
  let borderColor: string | null = null;
  let borderWidth: number | null = null;
  for (const cls of classes) {
    let v: number | undefined;
    let key: string;
    if (cls === 'flex' || cls === 'flex-col' || cls === 'flex-row' || cls === 'hidden' ||
        cls.startsWith('items-') || cls.startsWith('justify-') || cls.startsWith('gap-') ||
        cls === 'w-screen' || cls === 'h-screen' || cls === 'inset-0' || cls === 'fixed') {
      continue;
    }
    if (cls === 'w-full') { size.push('fillMaxWidth()'); continue; }
    if (cls === 'h-full') { size.push('fillMaxHeight()'); continue; }
    if (cls.startsWith('p-')) { key = cls.slice(2); v = SPACING[key]; if (v !== undefined) pad.push(`padding(${v}.dp)`); continue; }
    if (cls.startsWith('px-')) { key = cls.slice(3); v = SPACING[key]; if (v !== undefined) pad.push(`padding(horizontal = ${v}.dp)`); continue; }
    if (cls.startsWith('py-')) { key = cls.slice(3); v = SPACING[key]; if (v !== undefined) pad.push(`padding(vertical = ${v}.dp)`); continue; }
    if (cls.startsWith('pt-')) { key = cls.slice(3); v = SPACING[key]; if (v !== undefined) pad.push(`padding(top = ${v}.dp)`); continue; }
    if (cls.startsWith('pr-')) { key = cls.slice(3); v = SPACING[key]; if (v !== undefined) pad.push(`padding(end = ${v}.dp)`); continue; }
    if (cls.startsWith('pb-')) { key = cls.slice(3); v = SPACING[key]; if (v !== undefined) pad.push(`padding(bottom = ${v}.dp)`); continue; }
    if (cls.startsWith('pl-')) { key = cls.slice(3); v = SPACING[key]; if (v !== undefined) pad.push(`padding(start = ${v}.dp)`); continue; }
    if (cls.startsWith('bg-')) {
      const c = tailwindColor(cls.slice(3));
      if (c) body.push(`background(${c})`);
      continue;
    }
    if (cls.startsWith('w-')) { key = cls.slice(2); v = SPACING[key]; if (v !== undefined) size.push(`width(${v}.dp)`); continue; }
    if (cls.startsWith('h-')) { key = cls.slice(2); v = SPACING[key]; if (v !== undefined) size.push(`height(${v}.dp)`); continue; }
    if (cls.startsWith('size-')) { key = cls.slice(5); v = SPACING[key]; if (v !== undefined) size.push(`size(${v}.dp)`); continue; }
    if (cls.startsWith('rounded')) {
      key = cls.slice(7).replace(/^-/, '') || 'DEFAULT';
      v = RADIUS[key] ?? 4;
      lead.push(`clip(RoundedCornerShape(${v}.dp))`);
      continue;
    }
    if (cls.startsWith('shadow')) {
      key = cls.slice(6).replace(/^-/, '') || 'DEFAULT';
      v = SHADOW_SIZE[key] ?? 3;
      lead.push(`shadow(${v}.dp)`);
      continue;
    }
    if (cls === 'border' || /^border-(px|\d+)$/.test(cls)) {
      const keyW = cls === 'border' ? '1' : cls.slice(7);
      borderWidth = keyW === 'px' ? 1 : Number(keyW);
      continue;
    }
    if (cls.startsWith('border-')) {
      const c = tailwindColor(cls.slice(7));
      if (c) borderColor = c;
      continue;
    }
    if (cls === 'overflow-hidden') { lead.push(`clip(RoundedCornerShape(0.dp))`); continue; }
  }
  if (borderWidth !== null) {
    body.push(`border(${borderWidth}.dp, ${borderColor ?? 'Color(0x1F000000)'})`);
  } else if (borderColor !== null) {
    body.push(`border(1.dp, ${borderColor})`);
  }
  const all = [...lead, ...body, ...size, ...pad];
  if (all.length === 0) return null;
  return `Modifier.${all.join('.')}`;
}

export function resolveTextStyle(classes: string[]): string | null {
  const args: string[] = [];
  for (const cls of classes) {
    if (cls === 'text-center') { args.push('textAlign = TextAlign.Center'); continue; }
    if (cls === 'text-left') { args.push('textAlign = TextAlign.Left'); continue; }
    if (cls === 'text-right') { args.push('textAlign = TextAlign.Right'); continue; }
    if (cls === 'font-thin') { args.push('fontWeight = FontWeight.Thin'); continue; }
    if (cls === 'font-light') { args.push('fontWeight = FontWeight.Light'); continue; }
    if (cls === 'font-normal') { args.push('fontWeight = FontWeight.Normal'); continue; }
    if (cls === 'font-medium') { args.push('fontWeight = FontWeight.Medium'); continue; }
    if (cls === 'font-semibold') { args.push('fontWeight = FontWeight.SemiBold'); continue; }
    if (cls === 'font-bold') { args.push('fontWeight = FontWeight.Bold'); continue; }
    if (cls === 'font-extrabold') { args.push('fontWeight = FontWeight.ExtraBold'); continue; }
    if (cls === 'font-black') { args.push('fontWeight = FontWeight.Black'); continue; }
    if (cls.startsWith('text-')) {
      const key = cls.slice(5);
      const size = FONT_SIZE[key];
      if (size !== undefined) { args.push(`fontSize = ${size}.sp`); continue; }
      const color = tailwindColor(key);
      if (color) args.push(`color = ${color}`);
    }
  }
  if (args.length === 0) return null;
  return `TextStyle(${args.join(', ')})`;
}
