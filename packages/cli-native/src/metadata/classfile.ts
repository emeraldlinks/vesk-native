// Minimal JVM classfile parser: constant pool, class/method access flags,
// and RuntimeVisible/RuntimeInvisible annotations. Enough to extract the
// `kotlin.Metadata` annotation and per-method annotations (@Composable) from
// compiled Kotlin artifacts — no regex, pure byte parsing.

export interface AnnotationElementValueConst {
  kind: 'const';
  value: string | number | boolean;
}
export interface AnnotationElementValueEnum {
  kind: 'enum';
  typeName: string;
  constName: string;
}
export interface AnnotationElementValueClass {
  kind: 'class';
  value: string;
}
export interface AnnotationElementValueAnnotation {
  kind: 'annotation';
  value: AnnotationValue;
}
export interface AnnotationElementValueArray {
  kind: 'array';
  values: AnnotationElementValue[];
}
export type AnnotationElementValue =
  | AnnotationElementValueConst
  | AnnotationElementValueEnum
  | AnnotationElementValueClass
  | AnnotationElementValueAnnotation
  | AnnotationElementValueArray;

export interface AnnotationValue {
  type: string;
  elements: Record<string, AnnotationElementValue>;
}

export interface MethodInfo {
  name: string;
  descriptor: string;
  access: number;
  annotations: AnnotationValue[];
  /** Annotations per parameter (RuntimeVisible/RuntimeInvisibleParameterAnnotations). */
  parameterAnnotations: AnnotationValue[][];
}

export interface FieldInfo {
  name: string;
  descriptor: string;
  access: number;
}

export interface ClassFileInfo {
  thisClass: string;
  superClass: string | null;
  access: number;
  annotations: AnnotationValue[];
  fields: FieldInfo[];
  methods: MethodInfo[];
}

const TAG_UTF8 = 1;
const TAG_INTEGER = 3;
const TAG_FLOAT = 4;
const TAG_LONG = 5;
const TAG_DOUBLE = 6;
const TAG_CLASS = 7;
const TAG_STRING = 8;
const TAG_FIELDREF = 9;
const TAG_METHODREF = 10;
const TAG_INTERFACE_METHODREF = 11;
const TAG_NAME_AND_TYPE = 12;
const TAG_METHOD_HANDLE = 15;
const TAG_METHOD_TYPE = 16;
const TAG_DYNAMIC = 17;
const TAG_INVOKE_DYNAMIC = 18;
const TAG_MODULE = 19;
const TAG_PACKAGE = 20;

const ATTR_RUNTIME_VISIBLE_ANNOTATIONS = 'RuntimeVisibleAnnotations';
const ATTR_RUNTIME_INVISIBLE_ANNOTATIONS = 'RuntimeInvisibleAnnotations';
const ATTR_RUNTIME_VISIBLE_PARAMETER_ANNOTATIONS = 'RuntimeVisibleParameterAnnotations';
const ATTR_RUNTIME_INVISIBLE_PARAMETER_ANNOTATIONS = 'RuntimeInvisibleParameterAnnotations';

function parseParameterAnnotations(r: Reader, cp: CpTable): AnnotationValue[][] {
  const count = r.u1();
  const out: AnnotationValue[][] = [];
  for (let i = 0; i < count; i++) out.push(parseAnnotations(r, cp));
  return out;
}

class Reader {
  private pos = 0;
  private readonly buf: Uint8Array;
  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  u1(): number {
    const b = this.buf[this.pos] ?? 0;
    this.pos += 1;
    return b;
  }
  u2(): number {
    const b0 = this.buf[this.pos] ?? 0;
    const b1 = this.buf[this.pos + 1] ?? 0;
    const v = (b0 << 8) | b1;
    this.pos += 2;
    return v;
  }
  u4(): number {
    const b0 = this.buf[this.pos] ?? 0;
    const b1 = this.buf[this.pos + 1] ?? 0;
    const b2 = this.buf[this.pos + 2] ?? 0;
    const b3 = this.buf[this.pos + 3] ?? 0;
    const v = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    this.pos += 4;
    return v | 0;
  }
  u8(): bigint {
    const hi = BigInt(this.u4()) << 32n;
    const lo = BigInt(this.u4() >>> 0);
    return hi | lo;
  }
  skip(n: number): void {
    this.pos += n;
  }
  bytes(n: number): Uint8Array {
    const out = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  get offset(): number {
    return this.pos;
  }
}

// Modified UTF-8 (JVM): standard UTF-8 plus CESU-8 surrogate pairs and the
// 0xC0 0x80 encoding for NUL.
function decodeModifiedUtf8(bytes: Uint8Array): string {
  const chars: number[] = [];
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    if (b0 < 0x80) {
      chars.push(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0) {
      chars.push(((b0 & 0x1f) << 6) | ((bytes[i + 1] ?? 0) & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0) {
      chars.push(((b0 & 0x0f) << 12) | (((bytes[i + 1] ?? 0) & 0x3f) << 6) | ((bytes[i + 2] ?? 0) & 0x3f));
      i += 3;
    } else {
      const a = ((b0 & 0x07) << 12) | (((bytes[i + 1] ?? 0) & 0x3f) << 6) | ((bytes[i + 2] ?? 0) & 0x3f);
      const b = ((bytes[i + 3] ?? 0) & 0x0f) << 12 | (((bytes[i + 4] ?? 0) & 0x3f) << 6) | ((bytes[i + 5] ?? 0) & 0x3f);
      chars.push(0xd800 + ((a - 0x10000) >> 10), 0xdc00 + ((a - 0x10000) & 0x3ff));
      chars.push(b);
      i += 6;
    }
  }
  return String.fromCharCode(...chars);
}

interface CpEntry {
  tag: number;
  value: unknown;
}

type CpTable = (CpEntry | null)[];

function readCpEntry(r: Reader): CpEntry | null {
  const tag = r.u1();
  switch (tag) {
    case TAG_UTF8: {
      const len = r.u2();
      return { tag, value: decodeModifiedUtf8(r.bytes(len)) };
    }
    case TAG_INTEGER:
      return { tag, value: r.u4() };
    case TAG_FLOAT:
      return { tag, value: r.u4() };
    case TAG_LONG:
      return { tag, value: r.u8() };
    case TAG_DOUBLE:
      return { tag, value: r.u8() };
    case TAG_CLASS:
      return { tag, value: r.u2() };
    case TAG_STRING:
      return { tag, value: r.u2() };
    case TAG_FIELDREF:
    case TAG_METHODREF:
    case TAG_INTERFACE_METHODREF:
      return { tag, value: [r.u2(), r.u2()] };
    case TAG_NAME_AND_TYPE:
      return { tag, value: [r.u2(), r.u2()] };
    case TAG_METHOD_HANDLE:
      return { tag, value: [r.u1(), r.u2()] };
    case TAG_METHOD_TYPE:
      return { tag, value: r.u2() };
    case TAG_DYNAMIC:
    case TAG_INVOKE_DYNAMIC:
      return { tag, value: [r.u2(), r.u2()] };
    case TAG_MODULE:
    case TAG_PACKAGE:
      return { tag, value: r.u2() };
    default:
      throw new Error(`unknown constant pool tag ${tag}`);
  }
}

function parseAnnotations(r: Reader, cp: CpTable): AnnotationValue[] {
  const count = r.u2();
  const out: AnnotationValue[] = [];
  for (let i = 0; i < count; i++) out.push(parseAnnotation(r, cp));
  return out;
}

function parseAnnotation(r: Reader, cp: CpTable): AnnotationValue {
  const typeIndex = r.u2();
  const type = cpString(cp, typeIndex);
  const pairCount = r.u2();
  const elements: Record<string, AnnotationElementValue> = {};
  for (let i = 0; i < pairCount; i++) {
    const name = cpString(cp, r.u2());
    elements[name] = parseElementValue(r, cp);
  }
  return { type, elements };
}

function parseElementValue(r: Reader, cp: CpTable): AnnotationElementValue {
  const tag = String.fromCharCode(r.u1());
  switch (tag) {
    case 'B':
    case 'C':
    case 'S':
    case 'Z':
    case 'I':
      return { kind: 'const', value: cpInt(cp, r.u2()) };
    case 'J':
      return { kind: 'const', value: cpLong(cp, r.u2()) };
    case 'F':
    case 'D':
      return { kind: 'const', value: cpInt(cp, r.u2()) };
    case 's':
      return { kind: 'const', value: cpString(cp, r.u2()) };
    case 'e': {
      const typeName = cpString(cp, r.u2());
      const constName = cpString(cp, r.u2());
      return { kind: 'enum', typeName, constName };
    }
    case 'c':
      return { kind: 'class', value: cpString(cp, r.u2()) };
    case '@':
      return { kind: 'annotation', value: parseAnnotation(r, cp) };
    case '[': {
      const count = r.u2();
      const values: AnnotationElementValue[] = [];
      for (let i = 0; i < count; i++) values.push(parseElementValue(r, cp));
      return { kind: 'array', values };
    }
    default:
      throw new Error(`unknown annotation element tag '${tag}'`);
  }
}

function cpString(cp: CpTable, index: number): string {
  const e = cp[index - 1];
  if (!e || (e.tag !== TAG_UTF8 && e.tag !== TAG_STRING)) return '';
  return e.value as string;
}

function cpInt(cp: CpTable, index: number): number {
  const e = cp[index - 1];
  if (!e || e.tag !== TAG_INTEGER) return 0;
  return e.value as number;
}

function cpLong(cp: CpTable, index: number): number {
  const e = cp[index - 1];
  if (!e || e.tag !== TAG_LONG) return 0;
  return Number(e.value);
}

interface MemberInfo {
  access: number;
  name: string;
  descriptor: string;
  attributes: { name: string; data: Uint8Array }[];
}

// Reads the constant pool. Long/Double constants occupy two slots; the phantom
// second slot is padded with null so array index + 1 == constant-pool index.
function readConstantPool(r: Reader): CpTable {
  const cpCount = r.u2();
  const cp: CpTable = [];
  let i = 1;
  while (i < cpCount) {
    const entry = readCpEntry(r);
    if (!entry) break;
    cp.push(entry);
    if (entry.tag === TAG_LONG || entry.tag === TAG_DOUBLE) cp.push(null);
    i += entry.tag === TAG_LONG || entry.tag === TAG_DOUBLE ? 2 : 1;
  }
  return cp;
}

function parseMembers(r: Reader, cp: CpTable): MemberInfo[] {
  const count = r.u2();
  const out: MemberInfo[] = [];
  for (let i = 0; i < count; i++) {
    const access = r.u2();
    const name = cpString(cp, r.u2());
    const descriptor = cpString(cp, r.u2());
    const attrCount = r.u2();
    const attributes: MemberInfo['attributes'] = [];
    for (let j = 0; j < attrCount; j++) {
      const nameIdx = r.u2();
      const len = r.u4();
      attributes.push({ name: cpString(cp, nameIdx), data: r.bytes(len) });
    }
    out.push({ access, name, descriptor, attributes });
  }
  return out;
}

export function parseClassFile(buf: Uint8Array): ClassFileInfo {
  const r = new Reader(buf);
  const magic = r.u4();
  if (magic >>> 0 !== 0xcafebabe) throw new Error('not a JVM class file');
  r.u2(); // minor
  r.u2(); // major
  const cp = readConstantPool(r);
  const access = r.u2();
  const thisClassIdx = r.u2();
  const superClassIdx = r.u2();
  const thisClass = cpString(cp, cp[thisClassIdx - 1]?.value as number);
  const superClass = superClassIdx !== 0 ? cpString(cp, cp[superClassIdx - 1]?.value as number) : null;
  const ifaceCount = r.u2();
  r.skip(ifaceCount * 2);
  const fields = parseMembers(r, cp).map((m) => ({ name: m.name, descriptor: m.descriptor, access: m.access }));
  const methods = parseMembers(r, cp).map((m) => {
    let annotations: AnnotationValue[] = [];
    let parameterAnnotations: AnnotationValue[][] = [];
    for (const attr of m.attributes) {
      if (attr.name === ATTR_RUNTIME_VISIBLE_ANNOTATIONS || attr.name === ATTR_RUNTIME_INVISIBLE_ANNOTATIONS) {
        annotations = annotations.concat(parseAnnotations(new Reader(attr.data), cp));
      } else if (attr.name === ATTR_RUNTIME_VISIBLE_PARAMETER_ANNOTATIONS || attr.name === ATTR_RUNTIME_INVISIBLE_PARAMETER_ANNOTATIONS) {
        if (parameterAnnotations.length === 0) parameterAnnotations = parseParameterAnnotations(new Reader(attr.data), cp);
      }
    }
    return { name: m.name, descriptor: m.descriptor, access: m.access, annotations, parameterAnnotations };
  });
  const attrCount = r.u2();
  let classAnnotations: AnnotationValue[] = [];
  for (let i = 0; i < attrCount; i++) {
    const nameIdx = r.u2();
    const len = r.u4();
    const data = r.bytes(len);
    const name = cpString(cp, nameIdx);
    if (name === ATTR_RUNTIME_VISIBLE_ANNOTATIONS || name === ATTR_RUNTIME_INVISIBLE_ANNOTATIONS) {
      try {
        classAnnotations = classAnnotations.concat(parseAnnotations(new Reader(data), cp));
      } catch (e) {
        const hex = Array.from(data.slice(0, 64)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
        throw new Error(`class annotation parse failed for ${thisClass}: ${(e as Error).message} (attr ${name}, ${len} bytes: ${hex})`);
      }
    }
  }
  return { thisClass, superClass, access, annotations: classAnnotations, fields, methods };
}

// Debug aid: raw class attribute list (name index + resolved name + byte
// length) in file order, used to diagnose constant-pool/attribute drift.
export function classAttributeList(buf: Uint8Array): { index: number; name: string; len: number }[] {
  const r = new Reader(buf);
  if ((r.u4() >>> 0) !== 0xcafebabe) throw new Error('not a JVM class file');
  r.u2(); // minor
  r.u2(); // major
  const cp = readConstantPool(r);
  r.u2(); // access
  r.u2(); // this
  r.u2(); // super
  const ifaceCount = r.u2();
  r.skip(ifaceCount * 2);
  parseMembers(r, cp); // fields
  parseMembers(r, cp); // methods
  const attrCount = r.u2();
  const out: { index: number; name: string; len: number }[] = [];
  for (let i = 0; i < attrCount; i++) {
    const idx = r.u2();
    const len = r.u4();
    out.push({ index: idx, name: cpString(cp, idx), len });
    r.bytes(len);
  }
  return out;
}

// Debug aid: dump resolved constant-pool Utf8 strings by index (1-based),
// mirroring javap's `#N = Utf8 ...` output for diffing.
export function dumpCpStrings(buf: Uint8Array): string[] {
  const r = new Reader(buf);
  if ((r.u4() >>> 0) !== 0xcafebabe) throw new Error('not a JVM class file');
  r.u2();
  r.u2();
  const out: string[] = [];
  const cp = readConstantPool(r);
  for (const entry of cp) {
    out.push(entry ? (entry.tag === TAG_UTF8 ? (entry.value as string) : `#tag${entry.tag}`) : '<long/double phantom slot>');
  }
  return out;
}

// Debug aid: per-slot tag + file offset for the constant pool.
export function dumpCpSlots(buf: Uint8Array, from: number, to: number): { slot: number; tag: number; offset: number }[] {
  const r = new Reader(buf);
  if ((r.u4() >>> 0) !== 0xcafebabe) throw new Error('not a JVM class file');
  r.u2();
  r.u2();
  const cpCount = r.u2();
  const out: { slot: number; tag: number; offset: number }[] = [];
  let i = 1;
  while (i < cpCount) {
    const at = r.offset;
    const entry = readCpEntry(r);
    if (!entry) break;
    if (i >= from && i <= to) out.push({ slot: i, tag: entry.tag, offset: at });
    if ((entry.tag === TAG_LONG || entry.tag === TAG_DOUBLE) && i + 1 >= from && i + 1 <= to) {
      out.push({ slot: i + 1, tag: entry.tag, offset: at });
    }
    i += entry.tag === TAG_LONG || entry.tag === TAG_DOUBLE ? 2 : 1;
  }
  return out;
}

export function annotationOf(cf: ClassFileInfo, descriptor: string): AnnotationValue | null {
  return cf.annotations.find((a) => a.type === descriptor) ?? null;
}

export function methodAnnotationOf(m: MethodInfo, descriptor: string): AnnotationValue | null {
  return m.annotations.find((a) => a.type === descriptor) ?? null;
}

export function paramAnnotationOf(m: MethodInfo, paramIndex: number, descriptor: string): AnnotationValue | null {
  const list = m.parameterAnnotations[paramIndex];
  if (!list) return null;
  return list.find((a) => a.type === descriptor) ?? null;
}

export const ACC_PUBLIC = 0x0001;
export const ACC_PRIVATE = 0x0002;
export const ACC_PROTECTED = 0x0004;
export const ACC_STATIC = 0x0008;
export const ACC_INTERFACE = 0x0200;
export const ACC_ABSTRACT = 0x0400;
export const ACC_BRIDGE = 0x0040;
export const ACC_SYNTHETIC = 0x1000;
export const ACC_ENUM = 0x4000;
