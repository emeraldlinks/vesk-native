export type ElementKind = 'container' | 'text' | 'button' | 'input' | 'image' | 'video' | 'audio';

const TEXT_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'label', 'strong', 'em', 'small',
  'blockquote', 'pre', 'code', 'a', 'abbr', 'b', 'i', 'u', 'mark', 'sub', 'sup', 'time',
]);

export const CONTAINER_TAGS = new Set([
  'div', 'section', 'header', 'footer', 'main', 'nav', 'article', 'aside',
  'ul', 'ol', 'form', 'figure', 'details', 'summary', 'fieldset',
]);

export interface ElementInfo {
  kind: ElementKind;
  composable: string;
}

// A .vsk element tag backed by an installed Kotlin library (.vsklib binding).
// PascalCase tags arrive in the IR as ComponentCall nodes; the compiler emits
// the library's composable directly and adds the page-file imports it needs.
export interface VskLibTag {
  /** Kotlin callable emitted for this tag (fully-qualified or short name). */
  composable: string;
  /** Kotlin imports the page file needs for this callable. */
  imports: string[];
  /** .vsk prop name -> composable parameter name. */
  attrs: Record<string, string>;
  /** .vsk prop name -> declared parameter shape, for type-directed literal
   *  translation of attribute values (list literals, enum strings, numbers). */
  attrShapes?: Record<string, LibParamSig>;
  /** Children render into a trailing content lambda (default false). */
  container?: boolean;
  /** Fully-qualified `@RequiresOptIn` markers the composable is annotated
   *  with; generated files that use this tag get a `@file:OptIn(...)` line. */
  optIn?: string[];
}

// ---------------------------------------------------------------------------
// Library export signatures. Auto-generated bindings (Phase 9g) describe each
// JS-callable library name (`import { X } from '@vesk/<id>'`) with the Kotlin
// parameter shapes so the compiler can translate JS object/array/enum/string
// literals into Kotlin constructor calls with correct types.
// ---------------------------------------------------------------------------

export type LibParamShape =
  | 'number'
  | 'string'
  | 'boolean'
  | 'array'
  | 'object'
  | 'enum'
  | 'function'
  | 'any'
  | 'void'
  | 'other';

export interface LibParamSig {
  /** Parameter name in the Kotlin declaration. */
  name: string;
  shape: LibParamShape;
  /** Dotted Kotlin type (e.g. `kotlin.Float`, `co.yml.charts.common.model.Point`). */
  typeName?: string;
  /** Element signature for `array` shapes. */
  elem?: LibParamSig;
  /** Element signatures for `object` shapes that are `kotlin.Pair` (2 args). */
  pairElements?: LibParamSig[];
  /** Enum constant names when shape is `enum`. */
  enumValues?: string[];
}

export interface LibExportSig {
  /** JS-visible name (metadata declaration name). */
  name: string;
  /** Kotlin reference used at the call site (usually the simple name). */
  target: string;
  /** Fully-qualified Kotlin class/function for the import statement. */
  qualified: string;
  /** Doc comment emitted above the generated TS declaration — describes the
   *  call form, return semantics and any caveats. Best-effort guidance for
   *  dev tooling; never used for translation. */
  jsdoc?: string;
  /** True when this export is a class constructor (object factory). */
  isConstructor: boolean;
  /** True when this export is an enum (member access maps to constants). */
  isEnum?: boolean;
  /** Enum constant names (or nested sealed-object member names) when `isEnum`. */
  enumValues?: string[];
  /** Parameter signatures in declaration order. */
  params: LibParamSig[];
  /** Parameter names that may be omitted (Kotlin default values). */
  defaultParams: string[];
  /** Shape of the returned value. */
  returnShape: LibParamShape;
}

// The JS-visible surface of an installed .vsklib library (`import { X } from
// '@vesk/<id>'`). `exports` are the script-callable names (constructors,
// enums, functions) with type signatures; `tags` are the markup names
// resolved in .vsk headers.
export interface VskLibSurface {
  exports: Map<string, LibExportSig>;
  tags: Record<string, VskLibTag>;
}

export function elementInfo(tag: string): ElementInfo {
  if (tag === 'button') return { kind: 'button', composable: 'Button' };
  if (tag === 'input' || tag === 'textarea') return { kind: 'input', composable: 'OutlinedTextField' };
  if (tag === 'img') return { kind: 'image', composable: 'Image' };
  if (tag === 'video') return { kind: 'video', composable: 'veskVideo' };
  if (tag === 'audio') return { kind: 'audio', composable: 'veskAudio' };
  if (TEXT_TAGS.has(tag)) return { kind: 'text', composable: 'Text' };
  if (CONTAINER_TAGS.has(tag)) return { kind: 'container', composable: 'container' };
  return { kind: 'container', composable: 'container' };
}

export function isVoidTag(tag: string): boolean {
  return (
    tag === 'br' || tag === 'hr' || tag === 'img' || tag === 'meta' ||
    tag === 'link' || tag === 'input' || tag === 'wbr' ||
    tag === 'video' || tag === 'audio'
  );
}
