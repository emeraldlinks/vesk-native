export interface LayoutArgs {
  horizontalAlignment?: string;
  verticalAlignment?: string;
  horizontalArrangement?: string;
  verticalArrangement?: string;
}

const SPACING: Record<string, number> = {
  '0': 0, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10, '3': 12, '3.5': 14,
  '4': 16, '5': 20, '6': 24, '7': 28, '8': 32, '9': 36, '10': 40, '11': 44,
  '12': 48, '14': 56, '16': 64, '20': 80, '24': 96, '28': 112, '32': 128,
  '36': 144, '40': 160, '44': 176, '48': 192, '52': 208, '56': 224, '60': 240,
  '64': 256, '72': 288, '80': 320, '96': 384,
};

function gapArrangement(gap: number | null): string | null {
  return gap === null ? null : `Arrangement.spacedBy(${gap}.dp)`;
}

export function layoutArgs(classes: string[], axis: 'column' | 'row'): LayoutArgs {
  const args: LayoutArgs = {};
  let gap: number | null = null;

  for (const c of classes) {
    if (c === 'items-center') {
      if (axis === 'column') args.horizontalAlignment = 'Alignment.CenterHorizontally';
      else args.verticalAlignment = 'Alignment.CenterVertically';
    } else if (c === 'items-start') {
      if (axis === 'column') args.horizontalAlignment = 'Alignment.Start';
      else args.verticalAlignment = 'Alignment.Top';
    } else if (c === 'items-end') {
      if (axis === 'column') args.horizontalAlignment = 'Alignment.End';
      else args.verticalAlignment = 'Alignment.Bottom';
    } else if (c === 'justify-center') {
      if (axis === 'column') args.verticalArrangement = 'Arrangement.Center';
      else args.horizontalArrangement = 'Arrangement.Center';
    } else if (c === 'justify-between') {
      if (axis === 'column') args.verticalArrangement = 'Arrangement.SpaceBetween';
      else args.horizontalArrangement = 'Arrangement.SpaceBetween';
    } else if (c === 'justify-around') {
      if (axis === 'column') args.verticalArrangement = 'Arrangement.SpaceAround';
      else args.horizontalArrangement = 'Arrangement.SpaceAround';
    } else if (c === 'justify-end') {
      if (axis === 'column') args.verticalArrangement = 'Arrangement.Bottom';
      else args.horizontalArrangement = 'Arrangement.End';
    } else if (c.startsWith('gap-')) {
      const scale = c.slice('gap-'.length);
      if (SPACING[scale] !== undefined) gap = SPACING[scale];
    }
  }

  const spaced = gapArrangement(gap);
  if (spaced) {
    if (axis === 'column') args.verticalArrangement = spaced;
    else args.horizontalArrangement = spaced;
  }

  return args;
}

export function elementAxis(classes: string[]): 'column' | 'row' {
  return classes.includes('flex-row') ? 'row' : 'column';
}
