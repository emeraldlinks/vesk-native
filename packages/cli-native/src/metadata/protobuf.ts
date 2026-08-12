// Decoding of the `kotlin.Metadata` `d1` payload for JVM class files.
//
// `d1` is not plain protobuf: it is a BitEncoding-encoded byte stream whose
// front carries a length-delimited `JvmProtoBuf.StringTableTypes` message (the
// type descriptors for the `d2` string table) followed by the declaration
// message — `ProtoBuf.Class` for kinds 1/3, `ProtoBuf.Package` for kinds
// 2/5. Field numbers below follow `metadata.proto` / `jvm_metadata.proto`
// from the Kotlin metadata schema (kotlinx-metadata-jvm 0.9.0).

const UTF8_MODE_MARKER = 0x0000;
const EIGHT_TO_SEVEN_MODE_MARKER = 0xffff;

// BitEncoding.decodeBytes: marker dispatch + 7-to-8 bit decode.
function decodeBitEncoding(d1: string[]): Uint8Array {
  let start = 0;
  let mode: 'utf8' | '8to7' | 'none' = 'none';
  if (d1.length > 0 && (d1[0]?.length ?? 0) > 0) {
    const marker = d1[0]?.charCodeAt(0) ?? 0;
    if (marker === UTF8_MODE_MARKER) {
      mode = 'utf8';
      start = 1;
    } else if (marker === EIGHT_TO_SEVEN_MODE_MARKER) {
      mode = '8to7';
      start = 1;
    }
  }
  let data: Uint8Array;
  if (mode === 'utf8') {
    const first = d1[0];
    const parts = start === 0 ? d1 : [first?.slice(1) ?? '', ...d1.slice(1)];
    data = concatChars(parts);
  } else {
    data = concatChars(d1.map((s) => (start === 0 ? s : s.slice(1))));
    data = decode7to8(addModuloByte(data, 0x7f));
  }
  return data;
}

function concatChars(strings: string[]): Uint8Array {
  let total = 0;
  for (const s of strings) total += s.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const s of strings) {
    for (let i = 0; i < s.length; i++) out[p++] = s.charCodeAt(i) & 0xff;
  }
  return out;
}

function addModuloByte(data: Uint8Array, inc: number): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = ((data[i] ?? 0) + inc) & 0x7f;
  return out;
}

// Combines the least-significant 7 bits of every input byte into a big bit
// string, then slices it back into 8-bit groups (trailing padding dropped).
function decode7to8(data: Uint8Array): Uint8Array {
  const resultLength = Math.floor((7 * data.length) / 8);
  const result = new Uint8Array(resultLength);
  let byteIndex = 0;
  let bit = 0;
  for (let i = 0; i < resultLength; i++) {
    const firstPart = ((data[byteIndex] ?? 0) & 0xff) >>> bit;
    byteIndex++;
    const secondPart = ((data[byteIndex] ?? 0) & ((1 << (bit + 1)) - 1)) << (7 - bit);
    result[i] = (firstPart + secondPart) & 0xff;
    if (bit === 6) {
      byteIndex++;
      bit = 0;
    } else {
      bit++;
    }
  }
  return result;
}

// ---------------------------------------------------------------- protobuf

class ProtoReader {
  pos = 0;
  private readonly buf: Uint8Array;
  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  varint(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const b = this.buf[this.pos] ?? 0;
      this.pos++;
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) return result >>> 0;
      shift += 7;
      if (shift > 35) throw new Error('varint too long');
    }
  }

  bytes(len: number): Uint8Array {
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }

  lengthDelimited(): Uint8Array {
    const len = this.varint();
    return this.bytes(len);
  }

  skip(wireType: number): void {
    if (wireType === 0) {
      this.varint();
    } else if (wireType === 1) {
      this.pos += 8;
    } else if (wireType === 2) {
      this.bytes(this.varint());
    } else if (wireType === 5) {
      this.pos += 4;
    } else {
      throw new Error(`unsupported wire type ${wireType}`);
    }
  }

  get atEnd(): boolean {
    return this.pos >= this.buf.length;
  }

  static walk(buf: Uint8Array, onField: (field: number, wireType: number, r: ProtoReader) => void): void {
    const r = new ProtoReader(buf);
    while (!r.atEnd) {
      const tag = r.varint();
      const field = tag >>> 3;
      const wireType = tag & 7;
      onField(field, wireType, r);
    }
  }
}

// ---------------------------------------------------- StringTableTypes + names

interface RecordMsg {
  range: number;
  predefinedIndex?: number;
  operation?: number;
  substringIndex?: [number, number];
  replaceChar?: [number, number];
  string?: string;
}

function decodeRecords(buf: Uint8Array): RecordMsg[] {
  const out: RecordMsg[] = [];
  ProtoReader.walk(buf, (field, wireType, r) => {
    if (field === 1 && wireType === 2) out.push(decodeRecord(r.lengthDelimited()));
  });
  return out;
}

function decodeRecord(buf: Uint8Array): RecordMsg {
  const rec: RecordMsg = { range: 1 };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 1:
        rec.range = r.varint();
        break;
      case 2:
        rec.predefinedIndex = r.varint();
        break;
      case 3:
        rec.operation = r.varint();
        break;
      case 4: {
        const list = wireType === 2 ? packedVarints(r) : [r.varint()];
        const a = list[0];
        const b = list[1];
        if (a !== undefined && b !== undefined) rec.substringIndex = [a, b];
        break;
      }
      case 5: {
        const list = wireType === 2 ? packedVarints(r) : [r.varint()];
        const a = list[0];
        const b = list[1];
        if (a !== undefined && b !== undefined) rec.replaceChar = [a, b];
        break;
      }
      case 6:
        rec.string = utf8(r.lengthDelimited());
        break;
      default:
        r.skip(wireType);
    }
  });
  return rec;
}

function packedVarints(r: ProtoReader): number[] {
  const sub = new ProtoReader(r.lengthDelimited());
  const out: number[] = [];
  while (!sub.atEnd) out.push(sub.varint());
  return out;
}

function utf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0) {
      out += String.fromCharCode(((b0 & 0x1f) << 6) | ((bytes[i + 1] ?? 0) & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0) {
      out += String.fromCharCode(((b0 & 0x0f) << 12) | (((bytes[i + 1] ?? 0) & 0x3f) << 6) | ((bytes[i + 2] ?? 0) & 0x3f));
      i += 3;
    } else {
      const cp =
        ((b0 & 0x07) << 18) |
        (((bytes[i + 1] ?? 0) & 0x3f) << 12) |
        (((bytes[i + 2] ?? 0) & 0x3f) << 6) |
        ((bytes[i + 3] ?? 0) & 0x3f);
      out += String.fromCodePoint(cp);
      i += 4;
    }
  }
  return out;
}

const PREDEFINED_STRINGS = [
  'kotlin/Any',
  'kotlin/Nothing',
  'kotlin/Unit',
  'kotlin/Throwable',
  'kotlin/Number',
  'kotlin/Byte',
  'kotlin/Double',
  'kotlin/Float',
  'kotlin/Int',
  'kotlin/Long',
  'kotlin/Short',
  'kotlin/Boolean',
  'kotlin/Char',
  'kotlin/CharSequence',
  'kotlin/String',
  'kotlin/Comparable',
  'kotlin/Enum',
  'kotlin/Array',
  'kotlin/ByteArray',
  'kotlin/DoubleArray',
  'kotlin/FloatArray',
  'kotlin/IntArray',
  'kotlin/LongArray',
  'kotlin/ShortArray',
  'kotlin/BooleanArray',
  'kotlin/CharArray',
  'kotlin/Cloneable',
  'kotlin/Annotation',
  'kotlin/collections/Iterable',
  'kotlin/collections/MutableIterable',
  'kotlin/collections/Collection',
  'kotlin/collections/MutableCollection',
  'kotlin/collections/List',
  'kotlin/collections/MutableList',
  'kotlin/collections/Set',
  'kotlin/collections/MutableSet',
  'kotlin/collections/Map',
  'kotlin/collections/MutableMap',
  'kotlin/collections/Map.Entry',
  'kotlin/collections/MutableMap.MutableEntry',
  'kotlin/collections/Iterator',
  'kotlin/collections/MutableIterator',
  'kotlin/collections/ListIterator',
  'kotlin/collections/MutableListIterator',
];

class NameResolver {
  private readonly records: RecordMsg[];
  private readonly strings: string[];
  private readonly localNames: Set<number>;
  constructor(records: RecordMsg[], strings: string[], localNames: number[]) {
    this.records = [];
    for (const rec of records) {
      for (let i = 0; i < rec.range; i++) this.records.push(rec);
    }
    this.strings = strings;
    this.localNames = new Set(localNames);
  }

  private record(index: number): RecordMsg {
    return this.records[index] ?? { range: 1 };
  }

  getName(index: number): string {
    return this.resolve(this.record(index), index);
  }

  private resolve(rec: RecordMsg, index: number): string {
    let s: string;
    if (rec.string !== undefined) {
      s = rec.string;
    } else if (rec.predefinedIndex !== undefined && rec.predefinedIndex >= 0 && rec.predefinedIndex < PREDEFINED_STRINGS.length) {
      s = PREDEFINED_STRINGS[rec.predefinedIndex] ?? '';
    } else {
      s = this.strings[index] ?? '';
    }
    const sub = rec.substringIndex;
    if (sub && sub[0] >= 0 && sub[1] <= s.length && sub[0] <= sub[1]) {
      s = s.slice(sub[0], sub[1]);
    }
    const rep = rec.replaceChar;
    if (rep && rep[0] >= 0 && rep[1] >= 0) {
      s = s.split(String.fromCharCode(rep[0])).join(String.fromCharCode(rep[1]));
    }
    switch (rec.operation) {
      case 1: // INTERNAL_TO_CLASS_ID: replaceAll('$', '.')
        s = s.replaceAll('$', '.');
        break;
      case 2: // DESC_TO_CLASS_ID: strip surrounding 'L' ';', then '$' -> '.'
        if (s.length >= 2) s = s.slice(1, -1);
        s = s.replaceAll('$', '.');
        break;
    }
    return s;
  }

  isLocal(index: number): boolean {
    return this.localNames.has(index);
  }
}

// ------------------------------------------------------------- message types

export interface TypeMsg {
  /** Dotted class name (e.g. `kotlin.String`, `co.yml.charts...`). */
  className?: string;
  typeParamId?: number;
  args: (TypeMsg | number)[];
  nullable: boolean;
  flags: number;
}

export interface ValueParameterMsg {
  flags: number;
  name: string;
  type: TypeMsg | null;
  typeId?: number;
  vararg: TypeMsg | null;
  varargTypeId?: number;
}

export interface FunctionMsg {
  flags: number;
  name: string;
  returnType: TypeMsg | null;
  returnTypeId?: number;
  typeParams: unknown[];
  receiverType: TypeMsg | null;
  receiverTypeId?: number;
  valueParams: ValueParameterMsg[];
  typeTable: TypeTableMsg | null;
}

export interface ConstructorMsg {
  flags: number;
  valueParams: ValueParameterMsg[];
}

export interface PropertyMsg {
  flags: number;
  name: string;
  returnType: TypeMsg | null;
  returnTypeId?: number;
  typeParams: unknown[];
  receiverType: TypeMsg | null;
  receiverTypeId?: number;
  valueParams: ValueParameterMsg[];
  getterFlags?: number;
  setterFlags?: number;
  typeTable: TypeTableMsg | null;
}

export interface TypeTableMsg {
  types: TypeMsg[];
  firstNullable: number;
}

export interface ClassMsg {
  flags: number;
  fqName: string;
  functions: FunctionMsg[];
  properties: PropertyMsg[];
  typeParams: unknown[];
  typeTable: TypeTableMsg | null;
  constructors: ConstructorMsg[];
  enumEntries: string[];
  companionObjectName: string | null;
  superTypes: TypeMsg[];
  superTypeIds: number[];
  nestedClassNames: string[];
  sealedSubclassNames: string[];
}

export interface PackageMsg {
  functions: FunctionMsg[];
  properties: PropertyMsg[];
  typeTable: TypeTableMsg | null;
}

export interface MetadataDecode {
  class: ClassMsg | null;
  pkg: PackageMsg | null;
}

function decodeType(buf: Uint8Array, resolver: NameResolver): TypeMsg {
  const t: TypeMsg = { args: [], nullable: false, flags: 0 };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 1:
        t.flags = r.varint();
        break;
      case 2: {
        const argBuf = r.lengthDelimited();
        let typeRef: TypeMsg | number | undefined;
        ProtoReader.walk(argBuf, (af, aw, ar) => {
          if (af === 2) typeRef = decodeType(ar.lengthDelimited(), resolver);
          else if (af === 3) typeRef = ar.varint();
          else ar.skip(aw);
        });
        if (typeRef === undefined) typeRef = { args: [], nullable: false, flags: 0 };
        t.args.push(typeRef);
        break;
      }
      case 3:
        t.nullable = r.varint() !== 0;
        break;
      case 6:
        t.className = resolver.getName(r.varint()).replaceAll('/', '.');
        break;
      case 7:
        t.typeParamId = r.varint();
        break;
      case 9:
        r.varint(); // type_parameter_name — not needed
        break;
      default:
        r.skip(wireType);
    }
  });
  return t;
}

function decodeTypeTable(buf: Uint8Array, resolver: NameResolver): TypeTableMsg {
  const table: TypeTableMsg = { types: [], firstNullable: -1 };
  ProtoReader.walk(buf, (field, wireType, r) => {
    if (field === 1 && wireType === 2) table.types.push(decodeType(r.lengthDelimited(), resolver));
    else if (field === 2 && wireType === 0) table.firstNullable = r.varint();
    else r.skip(wireType);
  });
  return table;
}

function decodeValueParameter(buf: Uint8Array, resolver: NameResolver): ValueParameterMsg {
  const v: ValueParameterMsg = { flags: 0, name: '', type: null, vararg: null };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 1:
        v.flags = r.varint();
        break;
      case 2:
        v.name = resolver.getName(r.varint());
        break;
      case 3:
        v.type = decodeType(r.lengthDelimited(), resolver);
        break;
      case 4:
        v.vararg = decodeType(r.lengthDelimited(), resolver);
        break;
      case 5:
        v.typeId = r.varint();
        break;
      case 6:
        v.varargTypeId = r.varint();
        break;
      default:
        r.skip(wireType);
    }
  });
  return v;
}

function decodeConstructor(buf: Uint8Array, resolver: NameResolver): ConstructorMsg {
  const c: ConstructorMsg = { flags: 0, valueParams: [] };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 1:
        c.flags = r.varint();
        break;
      case 2:
        c.valueParams.push(decodeValueParameter(r.lengthDelimited(), resolver));
        break;
      default:
        r.skip(wireType);
    }
  });
  return c;
}

function decodeEnumEntry(buf: Uint8Array, resolver: NameResolver): string {
  let name = '';
  ProtoReader.walk(buf, (field, wireType, r) => {
    if (field === 1) name = resolver.getName(r.varint());
    else r.skip(wireType);
  });
  return name;
}

function decodeFunction(buf: Uint8Array, resolver: NameResolver): FunctionMsg {
  const f: FunctionMsg = {
    flags: 0,
    name: '',
    returnType: null,
    typeParams: [],
    receiverType: null,
    valueParams: [],
    typeTable: null,
  };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 1:
        r.varint(); // old_flags
        break;
      case 2:
        f.name = resolver.getName(r.varint());
        break;
      case 3:
        f.returnType = decodeType(r.lengthDelimited(), resolver);
        break;
      case 4:
        f.typeParams.push(0);
        r.skip(wireType);
        break;
      case 5:
        f.receiverType = decodeType(r.lengthDelimited(), resolver);
        break;
      case 6:
        f.valueParams.push(decodeValueParameter(r.lengthDelimited(), resolver));
        break;
      case 7:
        f.returnTypeId = r.varint();
        break;
      case 8:
        f.receiverTypeId = r.varint();
        break;
      case 9:
        f.flags = r.varint();
        break;
      case 30:
        f.typeTable = decodeTypeTable(r.lengthDelimited(), resolver);
        break;
      default:
        r.skip(wireType);
    }
  });
  return f;
}

function decodeProperty(buf: Uint8Array, resolver: NameResolver): PropertyMsg {
  const p: PropertyMsg = {
    flags: 0,
    name: '',
    returnType: null,
    typeParams: [],
    receiverType: null,
    valueParams: [],
    typeTable: null,
  };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 1:
        r.varint(); // old_flags
        break;
      case 2:
        p.name = resolver.getName(r.varint());
        break;
      case 3:
        p.returnType = decodeType(r.lengthDelimited(), resolver);
        break;
      case 4:
        p.typeParams.push(0);
        r.skip(wireType);
        break;
      case 5:
        p.receiverType = decodeType(r.lengthDelimited(), resolver);
        break;
      case 6:
        p.valueParams.push(decodeValueParameter(r.lengthDelimited(), resolver));
        break;
      case 7:
        p.getterFlags = r.varint();
        break;
      case 8:
        p.setterFlags = r.varint();
        break;
      case 9:
        p.returnTypeId = r.varint();
        break;
      case 10:
        p.receiverTypeId = r.varint();
        break;
      case 11:
        p.flags = r.varint();
        break;
      case 30:
        p.typeTable = decodeTypeTable(r.lengthDelimited(), resolver);
        break;
      default:
        r.skip(wireType);
    }
  });
  return p;
}

function decodeClass(buf: Uint8Array, resolver: NameResolver): ClassMsg {
  const c: ClassMsg = {
    flags: 0,
    fqName: '',
    functions: [],
    properties: [],
    typeParams: [],
    typeTable: null,
    constructors: [],
    enumEntries: [],
    companionObjectName: null,
    superTypes: [],
    superTypeIds: [],
    nestedClassNames: [],
    sealedSubclassNames: [],
  };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 1:
        c.flags = r.varint();
        break;
      case 2: {
        const list = wireType === 2 ? packedVarints(r) : [r.varint()];
        for (const id of list) c.superTypeIds.push(id);
        break;
      }
      case 3:
        c.fqName = resolver.getName(r.varint());
        break;
      case 4:
        c.companionObjectName = resolver.getName(r.varint());
        break;
      case 5:
        c.typeParams.push(0);
        r.skip(wireType);
        break;
      case 6:
        c.superTypes.push(decodeType(r.lengthDelimited(), resolver));
        break;
      case 7: {
        const list = wireType === 2 ? packedVarints(r) : [r.varint()];
        for (const id of list) c.nestedClassNames.push(resolver.getName(id));
        break;
      }
      case 8:
        c.constructors.push(decodeConstructor(r.lengthDelimited(), resolver));
        break;
      case 9:
        c.functions.push(decodeFunction(r.lengthDelimited(), resolver));
        break;
      case 10:
        c.properties.push(decodeProperty(r.lengthDelimited(), resolver));
        break;
      case 11:
        r.skip(wireType); // type_alias
        break;
      case 13:
        c.enumEntries.push(decodeEnumEntry(r.lengthDelimited(), resolver));
        break;
      case 16: {
        const list = wireType === 2 ? packedVarints(r) : [r.varint()];
        for (const id of list) c.sealedSubclassNames.push(resolver.getName(id));
        break;
      }
      case 30:
        c.typeTable = decodeTypeTable(r.lengthDelimited(), resolver);
        break;
      case 31:
        r.skip(wireType);
        break;
      case 32:
        r.skip(wireType);
        break;
      default:
        r.skip(wireType);
    }
  });
  return c;
}

function decodePackage(buf: Uint8Array, resolver: NameResolver): PackageMsg {
  const p: PackageMsg = { functions: [], properties: [], typeTable: null };
  ProtoReader.walk(buf, (field, wireType, r) => {
    switch (field) {
      case 3:
        p.functions.push(decodeFunction(r.lengthDelimited(), resolver));
        break;
      case 4:
        p.properties.push(decodeProperty(r.lengthDelimited(), resolver));
        break;
      case 5:
        r.skip(wireType);
        break;
      case 30:
        p.typeTable = decodeTypeTable(r.lengthDelimited(), resolver);
        break;
      default:
        r.skip(wireType);
    }
  });
  return p;
}

// --------------------------------------------------------------- entry point

export function decodeMetadata(kind: number, d1: string[], d2: string[]): MetadataDecode {
  const bytes = decodeBitEncoding(d1);
  const stream = new ProtoReader(bytes);
  const tableTypesLen = stream.varint();
  const tableTypesBuf = stream.bytes(tableTypesLen);
  const records = decodeRecords(tableTypesBuf);
  let localNames: number[] = [];
  ProtoReader.walk(tableTypesBuf, (field, wireType, r) => {
    if (field === 5 && wireType === 2) {
      const sub = new ProtoReader(r.lengthDelimited());
      while (!sub.atEnd) localNames.push(sub.varint());
    }
  });
  const resolver = new NameResolver(records, d2, localNames);
  const rest = bytes.subarray(stream.pos);
  let cls: ClassMsg | null = null;
  let pkg: PackageMsg | null = null;
  if (kind === 1 || kind === 3) {
    cls = decodeClass(rest, resolver);
  } else if (kind === 2 || kind === 5) {
    pkg = decodePackage(rest, resolver);
  }
  return { class: cls, pkg };
}

// ------------------------------------------------------------------ helpers

export function flagBits(flags: number, offset: number, width: number): number {
  return (flags >>> offset) & ((1 << width) - 1);
}

export const FLAGS = {
  HAS_ANNOTATIONS: 0,
  VISIBILITY: { offset: 1, width: 3 },
  MODALITY: { offset: 4, width: 2 },
  CLASS_KIND: { offset: 6, width: 3 },
  IS_INNER: 9,
  IS_DATA: 10,
  IS_EXTERNAL_CLASS: 11,
  IS_EXPECT_CLASS: 12,
  IS_VALUE_CLASS: 13,
  IS_FUN_INTERFACE: 14,
  HAS_ENUM_ENTRIES: 15,
  MEMBER_KIND: { offset: 6, width: 2 },
  IS_OPERATOR: 8,
  IS_INFIX: 9,
  IS_INLINE: 10,
  IS_TAILREC: 11,
  IS_EXTERNAL_FUNCTION: 12,
  IS_SUSPEND: 13,
  IS_EXPECT_FUNCTION: 14,
  HAS_NON_STABLE_PARAMETER_NAMES: 15,
  IS_VAR: 8,
  HAS_GETTER: 9,
  HAS_SETTER: 10,
  IS_CONST: 11,
  IS_LATEINIT: 12,
  HAS_CONSTANT: 13,
  IS_EXTERNAL_PROPERTY: 14,
  IS_DELEGATED: 15,
  IS_EXPECT_PROPERTY: 16,
  DECLARES_DEFAULT_VALUE: 1,
  IS_CROSSINLINE: 2,
  IS_NOINLINE: 3,
  TYPE_SUSPEND: 0,
  TYPE_DEFINITELY_NOT_NULL: 1,
} as const;

export const VISIBILITY_PUBLIC = 3;
export const MEMBER_KIND_DECLARATION = 0;

/** `CLASS_KIND` bit-field values (offset 6, width 3). */
export const CLASS_KIND = {
  CLASS: 0,
  INTERFACE: 1,
  ENUM: 2,
  ENUM_ENTRY: 3,
  ANNOTATION: 4,
  OBJECT: 5,
  COMPANION_OBJECT: 6,
} as const;

/** `MODALITY` bit-field values (offset 4, width 2). */
export const MODALITY = { FINAL: 0, OPEN: 1, ABSTRACT: 2, SEALED: 3 } as const;

export function typeAt(typeId: number | undefined, inline: TypeMsg | null, table: TypeTableMsg | null): TypeMsg | null {
  if (typeId !== undefined && table && typeId < table.types.length) {
    const t = table.types[typeId];
    if (t) {
      if (table.firstNullable >= 0 && typeId >= table.firstNullable) t.nullable = true;
      return t;
    }
  }
  return inline;
}

// The `?`-style marker used by the JVM descriptor for the given class name
// when no metadata is available (Java-declared artifacts).
export function internalNameToDotted(name: string): string {
  return name.replaceAll('/', '.');
}
