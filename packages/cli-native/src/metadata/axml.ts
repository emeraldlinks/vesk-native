// Binary AndroidManifest.xml (AXML) parser: extracts uses-sdk minSdkVersion and
// uses-permission entries from an AAR's packaged manifest. Chunk layout follows
// the AXML resource format (RES_XML_TYPE chunks, string pool, start elements).

export interface AxmlManifest {
  minSdk?: number;
  permissions: string[];
}

const CHUNK_STRING_POOL = 0x0001;
const CHUNK_START_ELEMENT = 0x0102;
const UTF8_FLAG = 0x100;
const NO_INDEX = 0xffffffff;
const TYPE_INT_DEC = 0x10;
const TYPE_INT_HEX = 0x11;

class AxmlReader {
  private pos = 0;
  private readonly buf: Uint8Array;
  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  u16(): number {
    const b0 = this.buf[this.pos] ?? 0;
    const b1 = this.buf[this.pos + 1] ?? 0;
    const v = (b0 << 8) | b1;
    this.pos += 2;
    return v;
  }
  u32(): number {
    const b0 = this.buf[this.pos] ?? 0;
    const b1 = this.buf[this.pos + 1] ?? 0;
    const b2 = this.buf[this.pos + 2] ?? 0;
    const b3 = this.buf[this.pos + 3] ?? 0;
    const v = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    this.pos += 4;
    return v >>> 0;
  }
  i32(): number {
    return this.u32() | 0;
  }
  u8(): number {
    const b = this.buf[this.pos] ?? 0;
    this.pos += 1;
    return b;
  }
  slice(start: number, end: number): Uint8Array {
    return this.buf.subarray(start, end);
  }
  skip(n: number): void {
    this.pos += n;
  }
  byteAt(pos: number): number {
    return this.buf[pos] ?? 0;
  }
  setPos(pos: number): void {
    this.pos = pos;
  }
  get offset(): number {
    return this.pos;
  }
}

function decodeUtf8(bytes: Uint8Array): string {
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
    } else {
      out += String.fromCharCode(((b0 & 0x0f) << 12) | (((bytes[i + 1] ?? 0) & 0x3f) << 6) | ((bytes[i + 2] ?? 0) & 0x3f));
      i += 3;
    }
  }
  return out;
}

interface StringPool {
  strings: string[];
}

function parseStringPool(r: AxmlReader): StringPool {
  const chunkStart = r.offset - 4;
  r.u16(); // chunkType
  r.u16(); // headerSize
  const chunkSize = r.u32();
  const stringCount = r.u32();
  r.u32(); // styleCount
  const flags = r.u32();
  const stringsStart = r.u32();
  r.u32(); // stylesStart
  const utf8 = (flags & UTF8_FLAG) !== 0;
  const offsets: number[] = [];
  for (let i = 0; i < stringCount; i++) offsets.push(r.u32());
  const strings: string[] = [];
  for (let i = 0; i < stringCount; i++) {
    const p = chunkStart + stringsStart + (offsets[i] ?? 0);
    if (p >= chunkStart + chunkSize) {
      strings.push('');
      continue;
    }
    if (utf8) {
      const len = readUtf8Length(r, p);
      const start = r.offset;
      strings.push(decodeUtf8(r.slice(start, start + len)));
      r.setPos(start + len);
    } else {
      const charCount = r.u16();
      let s = '';
      for (let c = 0; c < charCount; c++) {
        const unit = (r.byteAt(r.offset) << 8) | r.byteAt(r.offset + 1);
        r.skip(2);
        s += String.fromCharCode(unit);
      }
      strings.push(s);
    }
  }
  return { strings };
}

function readUtf8Length(r: AxmlReader, pos: number): number {
  const b0 = r.byteAt(pos);
  if ((b0 & 0x80) === 0) {
    r.setPos(pos + 1);
    return b0;
  }
  r.setPos(pos + 2);
  return ((b0 & 0x7f) << 8) | r.byteAt(pos + 1);
}

interface XmlElement {
  name: string;
  attrs: { name: string; rawValue?: string; dataType?: number; data?: number }[];
}

export function parseAxml(buf: Uint8Array): AxmlManifest {
  if (buf[0] !== 0x03) return parseTextManifest(decodeUtf8(buf));
  const r = new AxmlReader(buf);
  const manifest: AxmlManifest = { permissions: [] };
  let pool: StringPool | null = null;
  const elements: XmlElement[] = [];

  while (r.offset + 8 <= buf.length) {
    const chunkType = r.u16();
    r.u16(); // headerSize
    const chunkSize = r.u32();
    if (chunkSize < 8 || r.offset + chunkSize - 8 > buf.length) break;
    const chunkEnd = r.offset + chunkSize - 8;
    if (chunkType === CHUNK_STRING_POOL) {
      r.setPos(r.offset - 8);
      pool = parseStringPool(r);
      continue;
    }
    if (chunkType === CHUNK_START_ELEMENT && pool) {
      r.u32(); // lineNumber
      r.u32(); // comment
      r.u32(); // ns
      const nameIdx = r.u32();
      r.u16(); // attrStart
      r.u16(); // attrSize
      const attrCount = r.u16();
      r.u16(); // idIndex
      r.u16(); // classIndex
      r.u16(); // styleIndex
      const attrs: XmlElement['attrs'] = [];
      for (let i = 0; i < attrCount; i++) {
        r.skip(4); // ns
        const attrNameIdx = r.u32();
        const rawIdx = r.u32();
        r.u16(); // typedValue size
        r.u8();
        const dataType = r.u8();
        const data = r.i32();
        attrs.push({
          name: pool.strings[attrNameIdx] ?? '',
          rawValue: rawIdx !== NO_INDEX ? pool.strings[rawIdx] : undefined,
          dataType,
          data,
        });
      }
      elements.push({ name: pool.strings[nameIdx] ?? '', attrs });
      void chunkEnd;
      continue;
    }
    r.setPos(chunkEnd);
  }

  for (const el of elements) {
    if (el.name === 'uses-sdk') {
      for (const a of el.attrs) {
        if (a.name === 'minSdkVersion' && (a.dataType === TYPE_INT_DEC || a.dataType === TYPE_INT_HEX) && a.data !== undefined) {
          manifest.minSdk = a.data;
        }
      }
    } else if (el.name === 'uses-permission') {
      for (const a of el.attrs) {
        if (a.name === 'name' && a.rawValue) manifest.permissions.push(a.rawValue);
      }
    }
  }
  return manifest;
}

// Some AARs (e.g. ycharts) ship a plain-text AndroidManifest.xml instead of
// the aapt2 binary form. Extract uses-sdk/uses-permission with a hand-rolled
// tag scanner (no regex).
function parseTextManifest(xml: string): AxmlManifest {
  const manifest: AxmlManifest = { permissions: [] };
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) break;
    const gt = xml.indexOf('>', lt);
    if (gt < 0) break;
    const tag = xml.slice(lt + 1, gt).trim();
    i = gt + 1;
    if (!tag || tag.startsWith('!') || tag.startsWith('?') || tag.startsWith('/')) continue;
    const { name, attrs } = splitXmlTag(tag);
    if (name === 'uses-sdk') {
      for (const [key, value] of attrs) {
        const local = key.slice(key.indexOf(':') + 1);
        if (local === 'minSdkVersion') manifest.minSdk = Number(value);
      }
    } else if (name === 'uses-permission') {
      for (const [key, value] of attrs) {
        const local = key.slice(key.indexOf(':') + 1);
        if (local === 'name') manifest.permissions.push(value);
      }
    }
  }
  return manifest;
}

function splitXmlTag(tag: string): { name: string; attrs: [string, string][] } {
  const attrs: [string, string][] = [];
  const len = tag.length;
  let i = 0;
  while (i < len && (tag[i] === ' ' || tag[i] === '\t' || tag[i] === '\n' || tag[i] === '\r')) i++;
  let name = '';
  while (i < len && tag[i] !== ' ' && tag[i] !== '\t' && tag[i] !== '\n' && tag[i] !== '\r' && tag[i] !== '/') {
    name += tag[i] ?? '';
    i++;
  }
  while (i < len) {
    while (i < len && (tag[i] === ' ' || tag[i] === '\t' || tag[i] === '\n' || tag[i] === '\r' || tag[i] === '/')) i++;
    if (i >= len) break;
    let key = '';
    while (i < len && tag[i] !== '=' && tag[i] !== ' ' && tag[i] !== '\t' && tag[i] !== '\n' && tag[i] !== '\r') {
      key += tag[i] ?? '';
      i++;
    }
    while (i < len && (tag[i] === ' ' || tag[i] === '\t' || tag[i] === '\n' || tag[i] === '\r')) i++;
    if (tag[i] !== '=') {
      i++;
      continue;
    }
    i++;
    while (i < len && (tag[i] === ' ' || tag[i] === '\t' || tag[i] === '\n' || tag[i] === '\r')) i++;
    const quote = tag[i];
    if (quote !== '"' && quote !== "'") {
      i++;
      continue;
    }
    i++;
    let value = '';
    while (i < len && tag[i] !== quote) {
      value += tag[i] ?? '';
      i++;
    }
    i++;
    attrs.push([key, value]);
  }
  return { name, attrs };
}
