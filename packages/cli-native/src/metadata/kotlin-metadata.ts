// Extraction of the `kotlin.Metadata` annotation from a parsed class file.
// The annotation carries the kind (`k`), metadata version (`mv`), the encoded
// declaration table (`d1`) and the string table (`d2`) that together describe
// the Kotlin declarations behind the class.

import type { ClassFileInfo } from './classfile.js';
import { annotationOf, type AnnotationElementValue } from './classfile.js';

export interface KotlinMetadata {
  kind: number;
  mv: number[];
  xi: number;
  xs?: string;
  pn?: string;
  d1: string[];
  d2: string[];
}

const METADATA_DESC = 'Lkotlin/Metadata;';

export function extractKotlinMetadata(cf: ClassFileInfo): KotlinMetadata | null {
  const ann = annotationOf(cf, METADATA_DESC);
  if (!ann) return null;
  const el = ann.elements;
  const k = intValue(el['k']);
  if (k === undefined || k === null) return null;
  const d1 = stringArrayValue(el['d1']);
  const d2 = stringArrayValue(el['d2']);
  if (!d1 || !d2) return null;
  return {
    kind: k,
    mv: intArrayValue(el['mv']) ?? [1, 1, 0],
    xi: intValue(el['xi']) ?? 0,
    xs: stringValue(el['xs']),
    pn: stringValue(el['pn']),
    d1,
    d2,
  };
}

function intValue(v: AnnotationElementValue | undefined): number | undefined {
  if (!v || v.kind !== 'const' || typeof v.value !== 'number') return undefined;
  return v.value;
}

function stringValue(v: AnnotationElementValue | undefined): string | undefined {
  if (!v || v.kind !== 'const' || typeof v.value !== 'string') return undefined;
  return v.value;
}

function intArrayValue(v: AnnotationElementValue | undefined): number[] | undefined {
  if (!v || v.kind !== 'array') return undefined;
  const out: number[] = [];
  for (const item of v.values) {
    if (item.kind === 'const' && typeof item.value === 'number') out.push(item.value);
  }
  return out;
}

function stringArrayValue(v: AnnotationElementValue | undefined): string[] | undefined {
  if (!v || v.kind !== 'array') return undefined;
  const out: string[] = [];
  for (const item of v.values) {
    if (item.kind === 'const' && typeof item.value === 'string') out.push(item.value);
  }
  return out;
}
