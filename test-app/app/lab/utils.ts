export function titleCase(s: string): string {
    return s.split(' ').map(w => w.toUpperCase().charAt(0) + w.toLowerCase().substring(1)).join(' ')
}

export function clamp(x: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, x))
}

export const shippedFrom = 'lab/utils.ts'
