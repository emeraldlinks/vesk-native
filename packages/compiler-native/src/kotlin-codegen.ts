import { parse as webParse } from '@vesk/compiler/src/parser';
import { generateIR } from '@vesk/compiler/src/ir-generator';
import { parse } from '@compiler-native/parser';
import {
  StaticNode,
  TextNode,
  DynamicBinding,
  OpaqueDynamicRegion,
  MapRegion,
  ComponentCall,
  Expression,
  TrackDecl,
  RuntimeStatement,
  HeadBlock,
  ServerBlock,
  ClientBlock,
  SlotNode,
  WhileLoop,
  SwitchBlock,
  TryCatch,
  ForLoop,
} from '@vesk/compiler/src/ir';
import type { IRNode } from '@vesk/compiler/src/ir';
import { collectTrackedNames, transformTracked } from '@vesk/compiler/src/client-codegen';
import type { TrackedInfo } from '@vesk/compiler/src/client-codegen';
import { Js2Kt, KtErrors } from '@compiler-native/js2kt';
import type { JsNode } from '@compiler-native/js2kt';
import { ktIdent } from '@compiler-native/js2kt';
import { findComponentDecls, generatePropsClass, inferPropsFromUsage, generateInferredPropsClass, objectPatternNames, collectCallableNames } from '@compiler-native/props';
import { elementInfo, CONTAINER_TAGS } from '@compiler-native/elements';
import { BROWSER_API_EXPORTS } from '@compiler-native/browser-api';
import type { LibExportSig, LibParamSig, VskLibTag, VskLibSurface } from '@compiler-native/elements';
import { layoutArgs, elementAxis } from '@compiler-native/layout-args';
import { classify, buildModifier, buildTextStyle, isHidden, isAbsolute, RADIUS } from '@compiler-native/tailwind';
import type { ModifierParts } from '@compiler-native/tailwind';
import { parseCssClasses } from '@compiler-native/css';
import { walkIR } from '@compiler-native/walk-ir';
import { relative } from 'node:path';
import { FRAMEWORK_NPM_SPECIFIERS, collectHeaderSymbols, declarationName, importSource, importSpecifiers, npmImportLines, pkgImportLines, resolveJsTsTarget, resolveVskTarget, sanitizeIdent, slugFor, splitVskHeader, toPosix, transformModuleStatements, vskImportLines } from '@compiler-native/modules';
import type { ModuleExport, ModuleRegistry } from '@compiler-native/modules';

// The runtime's router components are the only non-`.vsk` callables emitted
// through `componentCallLines` (their Props data classes live in the runtime
// template). Everything else must be a custom component or an imported
// `.vsklib` tag — anything else is a hard build error.
const FRAMEWORK_COMPONENT_CALLS = new Set(['Link', 'NavLink', 'Outlet']);

export interface CompileOptions {
  packageName?: string;
  componentsWithoutProps?: Set<string>;
  /** Every custom component name declared in any app .vsk file (with or
   *  without props). Used to distinguish real components from unknown tags. */
  componentNames?: Set<string>;
  customClasses?: Map<string, ModifierParts>;
  scopedCustomClasses?: Map<string, Map<string, ModifierParts>>;
  imageResources?: Map<string, string>;
  mediaResources?: Map<string, string>;
  rootName?: string;
  /** Project-relative path of this .vsk file (enables header import/export support). */
  fileRel?: string;
  /** App directory, for resolving relative .vsk imports. */
  appDir?: string;
  /** Project-wide export registry built from every .vsk header. */
  moduleRegistry?: ModuleRegistry;
  /** Per-file unique slug map (from buildModuleRegistry); falls back to slugFor. */
  moduleSlugs?: Map<string, string>;
  /** Project JS/TS module rel path -> compiled exports (from the CLI's module compiler). */
  projectModuleRegistry?: Map<string, Map<string, ModuleExport>>;
  /** npm specifier -> exported name -> { pkg, name } for compiled npm modules. */
  npmRegistry?: Map<string, Map<string, ModuleExport>>;
  /** Installed .vsklib libraries (id -> JS surface). Resolved only via
   *  explicit `import { X } from '@vesk/<id>'` header imports — a library is
   *  never globally in scope without an import. */
  vsklibRegistry?: Map<string, VskLibSurface>;
}

const CLASS_ATTRS = new Set(['class', 'className']);

// Padding classes are lifted out of the Button modifier and turned into
// contentPadding so the pill surface keeps its shape (a modifier padding on a
// Button would inset the surface and leave a bare background ring).
const BTN_PAD_RE = /^p(?:[trblxy])?-(\d+)$/;

// Kotlin storage type for a track() cell from its init source text (no
// regex): plain decimal ints stay Int, float/exponent literals become Double
// so fractional writes (scroll progress, tween values) keep their value.
// Non-numeric inits return null and keep the plain `.value = rhs` write path.
function inferTrackCellType(init: string): string | null {
  let inner = init.trim();
  if (inner.startsWith('track(') && inner.endsWith(')')) inner = inner.slice(6, -1).trim();
  if (inner.length === 0) return null;
  let digit = false;
  let float = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]!;
    if (c >= '0' && c <= '9') {
      digit = true;
    } else if ((c === '-' || c === '+') && i === 0) {
      // leading sign
    } else if (c === '.' || c === 'e' || c === 'E') {
      float = true;
    } else {
      return null;
    }
  }
  if (!digit) return null;
  return float ? 'Double' : 'Int';
}

function buttonPadding(classes: string[]): { h: number; v: number } | null {
  let h = 0;
  let v = 0;
  for (const c of classes) {
    const m = c.match(/^p(?:([trblxy])-)?(\d+)$/);
    if (!m) continue;
    const dp = Number(m[2]) * 4;
    const side = m[1] ?? 'all';
    if (side === 'all' || side === 'x' || side === 'l' || side === 'r') h = Math.max(h, dp);
    if (side === 'all' || side === 'y' || side === 't' || side === 'b') v = Math.max(v, dp);
  }
  return h === 0 && v === 0 ? null : { h, v };
}

function buttonShape(classes: string[]): string | null {
  for (const c of classes) {
    if (!c.startsWith('rounded')) continue;
    if (c === 'rounded-full') return 'RoundedCornerShape(9999.dp)';
    const suffix = c.slice('rounded'.length).replace(/^-/, '');
    const r = RADIUS[suffix === '' ? 'DEFAULT' : suffix];
    if (r !== undefined) return `RoundedCornerShape(${r}.dp)`;
  }
  return null;
}

// Absolute on-device paths and content/file URIs resolve at runtime; anything
// else is a project asset bundled to res/drawable (web-style /media/... path).
function isFileImageSrc(src: string): boolean {
  return src.startsWith('/storage/') || src.startsWith('/data/') || src.startsWith('content://') || src.startsWith('file://');
}

// <img src="..."> -> Image(painter = veskBundledImage(name)) for bundled
// assets, Image(bitmap = veskFileImage(path)) for runtime file paths.
function imageLines(node: StaticNode, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null, boxScope = false): string[] {
  const classes = em.classList(node);
  if (isHidden(classes, em.customClasses)) return [];
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const parts = classify(classes, em.customClasses, parentAxis === 'row' ? 'row' : 'column');
  emitTailwindWarnings(parts, em);
  if (parentAxis === null) stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  modifier = prependModifier(modifier, extraModifier);

  let painterArg: string | null = null;
  let bitmapArg: string | null = null;
  const staticSrc = node.attributes.find((a) => a.name.toLowerCase() === 'src')?.value;
  const dynSrc = em.dynamicAttrs(node).get('src');
  if (staticSrc !== undefined && staticSrc.length > 0) {
    if (isFileImageSrc(staticSrc)) {
      bitmapArg = `veskFileImage(${em.ktString(staticSrc)})`;
    } else {
      const res = em.imageResources?.get(staticSrc);
      if (res) {
        painterArg = `veskBundledImage(${em.ktString(res)})`;
      } else {
        em.err.warn(null, `<img src="${staticSrc}">: project file not found (looked up ${em.imageResources ? 'bundled assets' : 'no image map'})`);
      }
    }
  } else if (dynSrc) {
    bitmapArg = `veskFileImage(${em.j2k.expr(dynSrc).trimStart()})`;
  } else {
    em.err.warn(null, `<img> is missing a src attribute`);
  }

  if (!painterArg && !bitmapArg) return [pad + 'Box {}'];
  const scale = parts.scale[0] ?? 'ContentScale.Fit';
  const lines = [pad + 'Image('];
  lines.push(padIn + (painterArg ? `painter = ${painterArg},` : `bitmap = ${bitmapArg},`));
  lines.push(padIn + 'contentDescription = null,');
  if (modifier) lines.push(padIn + `modifier = ${modifier},`);
  if (scale !== 'ContentScale.Fit') lines.push(padIn + `contentScale = ${scale},`);
  lines.push(pad + ')');
  return lines;
}

// Collect every static src on <img> elements (AST-only, no regex).
export function extractImageSources(source: string): Array<{ src: string; component: string }> {
  return extractMediaSources(source).filter((m) => m.element === 'img');
}

// Collect every static src on <img> / <video> / <audio> elements (AST-only,
// no regex). The CLI uses this to bundle project assets (drawable/raw) and to
// detect device-file references for storage permissions.
export function extractMediaSources(source: string): Array<{ src: string; element: 'img' | 'video' | 'audio'; component: string }> {
  const out: Array<{ src: string; element: 'img' | 'video' | 'audio'; component: string }> = [];
  try {
    const ast = webParse(source, { filename: 'component.vsk' });
    const ir = generateIR(ast, source);
    for (const comp of ir.components) {
      walkIR(comp.body, (node) => {
        if (node instanceof StaticNode) {
          const tag = node.tag.toLowerCase();
          if (tag === 'img' || tag === 'video' || tag === 'audio') {
            const src = node.attributes.find((a) => a.name.toLowerCase() === 'src')?.value;
            if (src) out.push({ src, element: tag, component: comp.name });
          }
        }
      });
    }
  } catch {
    // Unparsable files are reported by the compile step itself.
  }
  return out;
}

// <video src controls autoplay loop muted> / <audio ...> -> veskVideo /
// veskAudio runtime helpers. Project-relative srcs are bundled to res/raw and
// referenced via the veskBundledMediaUrl seam; device paths/content URIs stream at
// runtime. A video without explicit sizing gets a 16:9 default.
function mediaLines(node: StaticNode, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null, boxScope = false): string[] {
  const classes = em.classList(node);
  if (isHidden(classes, em.customClasses)) return [];
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const parts = classify(classes, em.customClasses, parentAxis === 'row' ? 'row' : 'column');
  emitTailwindWarnings(parts, em);
  if (parentAxis === null) stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  if (node.tag === 'video' && parts.size.length === 0) modifier = `${modifier ? modifier + '.' : ''}fillMaxWidth().aspectRatio(16f / 9f)`;
  modifier = prependModifier(modifier, extraModifier);

  const has = (name: string) => node.attributes.some((a) => a.name === name);
  let urlArg: string | null = null;
  const staticSrc = node.attributes.find((a) => a.name.toLowerCase() === 'src')?.value;
  const dynSrc = em.dynamicAttrs(node).get('src');
  if (staticSrc !== undefined && staticSrc.length > 0) {
    if (isFileImageSrc(staticSrc)) {
      urlArg = em.ktString(staticSrc);
    } else {
      const res = em.mediaResources?.get(staticSrc);
      if (res) {
        urlArg = `veskBundledMediaUrl(${em.ktString(res)})`;
      } else {
        em.err.warn(null, `<${node.tag} src="${staticSrc}">: project file not found (looked up ${em.mediaResources ? 'bundled media' : 'no media map'})`);
      }
    }
  } else if (dynSrc) {
    urlArg = em.j2k.expr(dynSrc).trimStart();
  } else {
    em.err.warn(null, `<${node.tag}> is missing a src attribute`);
  }

  if (!urlArg) return [pad + 'Box {}'];
  const args: string[] = [];
  args.push(`${padIn}url = ${urlArg},`);
  const boolAttrs: Array<[string, string]> = [['controls', 'controls'], ['autoplay', 'autoplay'], ['loop', 'loop'], ['muted', 'muted']];
  for (const [name, kt] of boolAttrs) {
    if (has(name)) args.push(`${padIn}${kt} = true,`);
  }
  if (modifier) args.push(`${padIn}modifier = ${modifier},`);
  const SCALE_SHORT: Record<string, string> = {
    'ContentScale.Crop': 'crop',
    'ContentScale.FillBounds': 'fill',
    'ContentScale.None': 'none',
    'ContentScale.Fit': 'fit',
    'ContentScale.Inside': 'fit',
  };
  const scale = parts.scale[0] ? SCALE_SHORT[parts.scale[0]!] : null;
  if (node.tag === 'video' && scale && scale !== 'fit') args.push(`${padIn}scale = "${scale}",`);
  return [pad + `${node.tag === 'video' ? 'veskVideo' : 'veskAudio'}(`, ...args, pad + ')'];
}

// Button content: plain text children (static and/or dynamic) merge into one
// Text styled with the button's text-* classes. Conditional regions, spans and
// other nested elements are emitted as real children inside the Button.
// Declarative native device elements (option C): <photo-picker>, <camera>,
// <recorder>, <file-input>, <notification>, plus every system-capability
// element (<battery-status>, <location>, <contacts>, <biometric-auth>,
// <qr-code>, <screen-record>, ...). They compile to the same runtime surface
// as the script device API — the page picks whichever fits.
const DEVICE_TAGS: Record<string, string> = {
  'photo-picker': 'VeskPhotoPicker',
  camera: 'VeskCamera',
  recorder: 'VeskRecorder',
  'file-input': 'VeskFileInput',
  notification: 'VeskNotification',
  'battery-status': 'VeskBatteryStatus',
  'network-status': 'VeskNetworkStatus',
  location: 'VeskLocation',
  apps: 'VeskApps',
  contacts: 'VeskContacts',
  'call-log': 'VeskCallLog',
  messages: 'VeskMessages',
  accounts: 'VeskAccounts',
  clipboard: 'VeskClipboard',
  'copy-to-clipboard': 'VeskCopyToClipboard',
  vibrate: 'VeskVibrate',
  torch: 'VeskTorch',
  screenshot: 'VeskScreenshot',
  'share-text': 'VeskShareText',
  'share-file': 'VeskShareFile',
  'biometric-auth': 'VeskBiometricAuth',
  bluetooth: 'VeskBluetooth',
  'bluetooth-toggle': 'VeskBluetoothToggle',
  'bluetooth-scan': 'VeskBluetoothScan',
  'screen-record': 'VeskScreenRecord',
  'qr-code': 'VeskQrCode',
  'qr-scanner': 'VeskQrScanner',
  volume: 'VeskVolume',
  'set-volume': 'VeskSetVolume',
  brightness: 'VeskBrightness',
  'keep-awake': 'VeskKeepAwake',
  orientation: 'VeskOrientation',
  'device-info': 'VeskDeviceInfo',
  'storage-status': 'VeskStorage',
  sensor: 'VeskSensor',
  toast: 'VeskToast',
  sound: 'VeskSound',
  wallpaper: 'VeskWallpaper',
  calendar: 'VeskCalendar',
  nfc: 'VeskNfc',
  sim: 'VeskSim',
  dial: 'VeskDial',
  sms: 'VeskSms',
  email: 'VeskEmail',
  'open-link': 'VeskLink',
  map: 'VeskMap',
  alarm: 'VeskAlarm',
  'open-settings': 'VeskOpenSettings',
  'open-app': 'VeskOpenApp',
  speak: 'VeskSpeak',
};

function deviceApiLines(node: StaticNode, em: Emitter, level: number, extraModifier: string | null, boxScope = false): string[] {
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const fnName = DEVICE_TAGS[node.tag]!;
  const classes = em.classList(node);
  const parts = classify(classes, em.customClasses, undefined);
  emitTailwindWarnings(parts, em);
  stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  modifier = prependModifier(modifier, extraModifier);
  const attrs = em.dynamicAttrs(node);
  const has = (name: string) => node.attributes.some((a) => a.name === name);
  const args: string[] = [];

  // Static text attributes fall back to bound expressions, then a default.
  const textAttr = (name: string, fallback: string | null): string | null => {
    const staticVal = em.staticAttr(node, name);
    if (staticVal !== null && staticVal.length > 0) return em.ktString(staticVal);
    const dyn = attrs.get(name);
    if (dyn) return em.j2k.expr(dyn).trimStart();
    return fallback;
  };
  // Integer attributes (e.g. duration="200") resolve to number literals;
  // digit-only check (no regex) since these are compiler-level values.
  const intAttr = (name: string, fallback: string | null): string | null => {
    const staticVal = em.staticAttr(node, name);
    if (staticVal !== null && staticVal.length > 0) {
      let digits = true;
      for (const ch of staticVal) if (!(ch >= '0' && ch <= '9')) { digits = false; break; }
      if (digits) return staticVal;
    }
    const dyn = attrs.get(name);
    if (dyn) return em.j2k.expr(dyn).trimStart();
    return fallback;
  };
  const label = em.staticAttr(node, 'label');
  if (label) args.push(`${padIn}label = ${em.ktString(label)},`);

  switch (fnName) {
    case 'VeskPhotoPicker': {
      const onPick = attrs.get('onpick');
      args.push(`${padIn}onPick = ${onPick ? em.j2k.expr(onPick).trimStart() : '{ _ -> }'},`);
      break;
    }
    case 'VeskCamera': {
      const onDone = attrs.get('ondone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _ -> }'},`);
      if (has('video')) args.push(`${padIn}video = true,`);
      break;
    }
    case 'VeskRecorder': {
      const onDone = attrs.get('ondone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _ -> }'},`);
      break;
    }
    case 'VeskFileInput': {
      const onDone = attrs.get('ondone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _, _ -> }'},`);
      const mime = textAttr('mime', null);
      if (mime) args.push(`${padIn}mime = ${mime},`);
      break;
    }
    case 'VeskNotification': {
      args.push(`${padIn}title = ${textAttr('title', '""')},`);
      args.push(`${padIn}text = ${textAttr('text', '""')},`);
      const onTap = attrs.get('ontap');
      if (onTap) args.push(`${padIn}onTap = ${em.j2k.expr(onTap).trimStart()},`);
      break;
    }
    case 'VeskCopyToClipboard': {
      args.push(`${padIn}value = ${textAttr('value', '""')},`);
      const onDone = attrs.get('ondone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _ -> }'},`);
      break;
    }
    case 'VeskShareText': {
      args.push(`${padIn}text = ${textAttr('text', '""')},`);
      const onDone = attrs.get('ondone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskShareFile': {
      const path = textAttr('path', null);
      if (path) args.push(`${padIn}path = ${path},`);
      const mime = textAttr('mime', null);
      if (mime) args.push(`${padIn}mime = ${mime},`);
      const onDone = attrs.get('ondone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskVibrate': {
      const duration = intAttr('duration', null);
      if (duration) args.push(`${padIn}duration = ${duration},`);
      const onDone = attrs.get('ondone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskQrCode': {
      // <qr-code value="..."> renders the QR bitmap directly (no button).
      args.push(`${padIn}value = ${textAttr('value', '""')},`);
      break;
    }
    case 'VeskSetVolume':
    case 'VeskBrightness': {
      // Numeric actions: <set-volume value="60"> / <brightness value="80">.
      const value = intAttr('value', null);
      if (value) args.push(`${padIn}value = ${value},`);
      const onDone = attrs.get('ondone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskKeepAwake': {
      // Boolean action: <keep-awake value="true">.
      const staticVal = em.staticAttr(node, 'value');
      const value = staticVal !== null ? (staticVal === 'false' ? 'false' : 'true') : 'true';
      args.push(`${padIn}value = ${value},`);
      const onDone = attrs.get('ondone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskAlarm': {
      // <alarm hour="8" minute="30" title="Wake up">.
      const hour = intAttr('hour', null);
      if (hour) args.push(`${padIn}hour = ${hour},`);
      const minute = intAttr('minute', null);
      if (minute) args.push(`${padIn}minute = ${minute},`);
      const title = textAttr('title', null);
      if (title) args.push(`${padIn}title = ${title},`);
      const onDone = attrs.get('ondone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    default: {
      // Generic trigger elements (battery-status, location, apps, contacts,
      // call-log, messages, accounts, clipboard, torch, screenshot, sensor,
      // dial, sms, email, open-link, map, open-settings, open-app, ...):
      // every allow-listed scalar attribute passes through as a named arg,
      // and bound callbacks resolve as lambdas. Missing args fall back to the
      // composable's Kotlin defaults, so <battery-status/> alone works.
      const SCALAR_ARGS = ['value', 'text', 'title', 'mime', 'path', 'kind', 'type', 'section', 'mode', 'number', 'url', 'query', 'to', 'subject', 'body', 'app', 'duration'];
      for (const name of SCALAR_ARGS) {
        const v = textAttr(name, null);
        if (v) args.push(`${padIn}${name} = ${v},`);
      }
      for (const cbName of ['onDone', 'onPick', 'onTap', 'onResult']) {
        const cb = attrs.get(cbName);
        if (cb) args.push(`${padIn}${cbName} = ${em.j2k.expr(cb).trimStart()},`);
      }
      break;
    }
  }

  if (modifier) args.push(`${padIn}modifier = ${modifier},`);
  return [pad + `${fnName}(`, ...args, pad + ')'];
}

function emitButton(node: StaticNode, classes: string[], attrs: Map<string, JsNode>, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null, boxScope = false): string[] {
  const onClick = attrs.get('onclick');
  const onClickKt = onClick ? em.j2k.expr(onClick).trimStart() : '{}';
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);

  const isTexty = (c: IRNode) => c instanceof TextNode || (c instanceof DynamicBinding && c.kind === 'text');
  const blocker = node.children.filter((c) => !isTexty(c));

  let contentLines: string[] = [];
  const btnDefaultColor = 'MaterialTheme.colorScheme.onSurface';
  if (blocker.length === 0) {
    const t = textContent(node.children, em);
    if (t !== '""') contentLines = splitLines(makeTextCall(t, classes, level, em, false, parentAxis, null, btnDefaultColor, false, boxScope));
  } else {
    for (const child of node.children) {
      if (isTexty(child)) {
        const t = child instanceof TextNode ? em.ktString(child.value) : dynamicText(em.exprOf((child as DynamicBinding).expression));
        if (t !== '""') contentLines.push(...splitLines(makeTextCall(t, classes, level, em, false, parentAxis, null, btnDefaultColor, false, boxScope)));
      } else {
        contentLines.push(...emitChild(child, em, level, parentAxis, null, false, boxScope));
      }
    }
  }

  const lines: string[] = [];
  lines.push(pad + 'Button(');
  lines.push(`${padIn}onClick = jsSafe(${onClickKt}),`);
  const modClasses = classes.filter((c) => !BTN_PAD_RE.test(c));
  const modifier = modifierFor(modClasses, em, parentAxis, false, extraModifier, boxScope);
  if (modifier) lines.push(`${padIn}modifier = ${modifier},`);
  const shape = buttonShape(classes);
  if (shape) lines.push(`${padIn}shape = ${shape},`);
  lines.push(`${padIn}colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),`);
  lines.push(`${padIn}elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),`);
  const padVal = buttonPadding(classes);
  if (padVal) lines.push(`${padIn}contentPadding = PaddingValues(horizontal = ${padVal.h}.dp, vertical = ${padVal.v}.dp),`);
  lines.push(pad + ') {');
  lines.push(...contentLines);
  lines.push(pad + '}');
  return lines;
}

const IMPORTS = `import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowColumn
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex`;

class Emitter {
  err: KtErrors;
  j2k: Js2Kt;
  tracked: Map<string, TrackedInfo>;
  componentsWithoutProps?: Set<string>;
  componentNames?: Set<string>;
  customClasses?: Map<string, ModifierParts>;
  imageResources?: Map<string, string>;
  mediaResources?: Map<string, string>;
  libraryTags?: Map<string, VskLibTag>;
  libImports: Set<string>;
  vsklibRegistry?: Map<string, VskLibSurface>;
  libraryExports: Map<string, LibExportSig>;
  motionExports: Set<string>;
  refCells: Set<string>;

  constructor(err: KtErrors, tracked: Map<string, TrackedInfo>, componentsWithoutProps?: Set<string>, customClasses?: Map<string, ModifierParts>, imageResources?: Map<string, string>, mediaResources?: Map<string, string>, libraryTags?: Map<string, VskLibTag>, libImports: Set<string> = new Set(), componentNames?: Set<string>, vsklibRegistry?: Map<string, VskLibSurface>, libraryExports: Map<string, LibExportSig> = new Map(), libraryMemberExports: Map<string, Map<string, LibExportSig>> = new Map(), motionExports: Set<string> = new Set(), refCells: Set<string> = new Set(), cellTypes: Map<string, string> = new Map()) {
    this.err = err;
    this.j2k = new Js2Kt(err, cellTypes);
    this.j2k.libraryExports = libraryExports;
    this.j2k.libraryMemberExports = libraryMemberExports;
    this.j2k.motionExports = motionExports;
    this.j2k.libImports = libImports;
    this.tracked = tracked;
    this.componentsWithoutProps = componentsWithoutProps;
    this.componentNames = componentNames ?? componentsWithoutProps;
    this.customClasses = customClasses;
    this.imageResources = imageResources;
    this.mediaResources = mediaResources;
    this.libraryTags = libraryTags;
    this.libImports = libImports;
    this.vsklibRegistry = vsklibRegistry;
    this.libraryExports = libraryExports;
    this.motionExports = motionExports;
    this.refCells = refCells;
  }

  private guardCount = 0;
  shimmerCount = 0;
  nextGuardName(): string {
    return `__veskErr${++this.guardCount}`;
  }

  withParamAliases<T>(aliases: Map<string, string>, fn: () => T): T {
    return this.j2k.withParamAliases(aliases, fn);
  }

  ktString(value: string): string {
    return this.j2k.ktString(value);
  }

  ensureAst(expr: Expression): JsNode | null {
    if (expr.ast) return expr.ast as JsNode;
    if (expr.raw) {
      try {
        const program = parse(`let __vsk_expr = (${expr.raw});`) as unknown as {
          body: Array<{ declarations: Array<{ init: JsNode | undefined }> }>;
        };
        const init = program.body[0]?.declarations[0]?.init;
        if (init) {
          (expr as { ast: unknown }).ast = init;
          return init;
        }
      } catch (e) {
        this.err.warn(null, `could not parse expression: ${expr.raw}: ${(e as Error).message}`);
      }
    }
    return null;
  }

  exprOf(expr: Expression): string {
    const transformed = transformTracked(expr, this.tracked);
    const ast = this.parseExprInit(transformed);
    return ast;
  }

  // Coerce a library tag attribute value against its typed attr shape
  // (from `attrShapes`): plain string literals become enum constants, object
  // literals become constructor calls, arrays become listOf(...). Returns
  // null when the value should fall through to the plain expression path.
  libraryAttrValue(shape: LibParamSig, expr: Expression): string | null {
    const ast = this.ensureAst(expr);
    if (!ast) return null;
    if (shape.shape === 'enum') {
      if (ast.type === 'Literal' && typeof (ast.value as unknown) === 'string') {
        const values = shape.enumValues ?? [];
        const member = ast.value as string;
        if (!values.includes(member)) {
          this.err.warn(null, `enum attribute expects one of: ${values.join(', ')} (got '${member}')`);
          return `error("vesk: invalid enum value '${member}'")`;
        }
        if (!shape.typeName) return null;
        this.libImports.add(`import ${shape.typeName}`);
        return `${ktIdent(shape.typeName.slice(shape.typeName.lastIndexOf('.') + 1))}.${ktIdent(member)}`;
      }
      return this.j2k.libArg(shape, ast);
    }
    if (shape.shape === 'object' || shape.shape === 'array') {
      if (shape.shape === 'object' && shape.typeName) this.ensureLibraryObject(shape.typeName);
      return this.j2k.libArg(shape, ast);
    }
    return null;
  }

  // Make a constructor export (referenced by a tag's attrShapes typeName)
  // resolvable in this file's script scope so bare object-literal attributes
  // like lineChartData={{ ... }} translate to constructor calls.
  ensureLibraryObject(typeName: string): void {
    if (this.j2k.libraryExports.size > 0) {
      for (const sig of this.j2k.libraryExports.values()) {
        if (sig.qualified === typeName) return;
      }
    }
    if (!this.vsklibRegistry) return;
    for (const surface of this.vsklibRegistry.values()) {
      for (const sig of surface.exports.values()) {
        if (sig.qualified === typeName) {
          this.j2k.libraryExports.set(sig.name, sig);
          return;
        }
      }
    }
  }

  stmtOf(node: RuntimeStatement): string {
    const transformed = transformTracked(node, this.tracked);
    try {
      const program = parse(`{ ${transformed} }`) as unknown as {
        body: Array<{ body: Array<JsNode> }>;
      };
      const stmts = program.body[0]?.body;
      if (!stmts || stmts.length === 0) {
        this.err.warn(null, `could not parse runtime statement: ${transformed}`);
        return transformed;
      }
      return stmts.map((s) => this.j2k.stmt(s)).join('\n');
    } catch (e) {
      this.err.warn(null, `could not parse runtime statement: ${transformed}: ${(e as Error).message}`);
      return transformed;
    }
  }

  // Translate a raw JS statement snippet (e.g. a C-style for-loop init like
  // `let i = 0`) through the native parser + js2kt.
  stmtText(code: string): string {
    const trimmed = code.endsWith(';') ? code.slice(0, -1) : code;
    try {
      const program = parse(`{ ${trimmed} }`) as unknown as {
        body: Array<{ body: Array<JsNode> }>;
      };
      const stmts = program.body[0]?.body;
      if (!stmts || stmts.length === 0) return '';
      return stmts.map((s) => this.j2k.stmt(s)).join('\n');
    } catch (e) {
      this.err.warn(null, `could not parse statement snippet: ${trimmed}: ${(e as Error).message}`);
      return trimmed;
    }
  }

  parseExprInit(init: string): string {
    try {
      const program = parse(`let __vsk_init = ${init};`) as unknown as {
        body: Array<{ declarations: Array<{ init: JsNode }> }>;
      };
      const exprAst = program.body[0]?.declarations[0]?.init;
      if (!exprAst) {
        this.err.warn(null, `could not parse track init: ${init}`);
        return init;
      }
      return this.j2k.expr(exprAst);
    } catch (e) {
      this.err.warn(null, `could not parse track init: ${init}: ${(e as Error).message}`);
      return init;
    }
  }

  parseTrackInit(init: string): string {
    try {
      const program = parse(`let __vsk_init = ${init};`) as unknown as {
        body: Array<{ declarations: Array<{ init: JsNode }> }>;
      };
      const exprAst = program.body[0]?.declarations[0]?.init;
      if (!exprAst) {
        this.err.warn(null, `could not parse track init: ${init}`);
        return init;
      }
      const call = exprAst as unknown as {
        type?: string;
        callee?: { type?: string; name?: string };
        arguments?: Array<unknown>;
      };
      if (call.type === 'CallExpression' && call.callee?.name === 'track' && call.arguments?.[0]) {
        return this.j2k.expr(call.arguments[0] as JsNode);
      }
      return this.j2k.expr(exprAst);
    } catch (e) {
      this.err.warn(null, `could not parse track init: ${init}: ${(e as Error).message}`);
      return init;
    }
  }

  classList(node: StaticNode): string[] {
    const attr = node.attributes.find((a) => CLASS_ATTRS.has(a.name.toLowerCase()));
    if (!attr) return [];
    return attr.value.split(/\s+/).filter(Boolean);
  }

  staticAttr(node: StaticNode, name: string): string | null {
    const lower = name.toLowerCase();
    const attr = node.attributes.find((a) => a.name.toLowerCase() === lower);
    return attr ? attr.value : null;
  }

  bindRefVar(node: StaticNode): string | null {
    const ref = node.children.find(
      (c) => c instanceof DynamicBinding && c.kind === 'attribute' && c.target?.toLowerCase() === 'ref'
    ) as DynamicBinding | undefined;
    if (!ref) return null;
    const ast = this.ensureAst(ref.expression);
    if (!ast) return null;
    const call = ast as unknown as {
      type?: string;
      callee?: { type?: string; name?: string };
      arguments?: Array<{ type?: string; name?: string }>;
    };
    if (
      call.type === 'CallExpression' &&
      call.callee?.type === 'Identifier' &&
      (call.callee.name === 'bindValue' || call.callee.name === 'bindChecked') &&
      call.arguments?.[0]?.type === 'Identifier'
    ) {
      return call.arguments[0].name as string;
    }
    return null;
  }

  dynamicAttrs(node: StaticNode): Map<string, JsNode> {
    const out = new Map<string, JsNode>();
    for (const child of node.children) {
      if (child instanceof DynamicBinding && child.kind === 'attribute' && child.target) {
        const transformed = transformTracked(child.expression, this.tracked);
        try {
          const program = parse(`let __vsk_attr = ${transformed};`) as unknown as {
            body: Array<{ declarations: Array<{ init: JsNode }> }>;
          };
          const exprAst = program.body[0]?.declarations[0]?.init;
          if (exprAst) {
            out.set(child.target.toLowerCase(), exprAst);
          } else {
            this.err.warn(null, `could not parse dynamic attribute: ${transformed}`);
          }
        } catch (e) {
          this.err.warn(null, `could not parse dynamic attribute: ${transformed}: ${(e as Error).message}`);
        }
      }
    }
    return out;
  }

  // A tracked cell that an element `ref={name}` binds can hold a MotionRef
  // (the element animates via `animate(ref, ...)`); a plain `mutableStateOf`
  // cell is typed by its initializer so `null` stays String?-like. Ref-bound
  // null-initialized cells widen to Any? so the MotionRef assignment compiles.
  trackDecl(node: TrackDecl): string {
    const init = this.parseTrackInit(node.init);
    let typed: string;
    if (init.trim() === 'null') {
      typed = this.refCells.has(node.name) ? 'mutableStateOf<Any?>(null)' : 'mutableStateOf<String?>(null)';
    } else {
      typed = `mutableStateOf(${init})`;
    }
    if (node.rawName) {
      return `val ${node.name} = remember { ${typed} }\n\tval ${node.rawName} = ${node.name}`;
    }
    return `val ${node.name} = remember { ${typed} }`;
  }

  // motion element refs: `ref={name}` where `name` is a tracked cell. The
  // value is replaced at runtime by rememberMotionRef(), and the element's
  // modifier gains `.motionGraphics(ref)` so animate()/inView()/scroll() can
  // drive it. Returns the raw cell Kotlin name (cellName) or null when the
  // ref is not a motion ref (form `ref={bindValue(x)}` keeps its input
  // binding).
  refCount = 0;
  motionRefBinding(node: StaticNode): string | null {
    const ref = node.children.find(
      (c) => c instanceof DynamicBinding && c.kind === 'attribute' && c.target?.toLowerCase() === 'ref'
    ) as DynamicBinding | undefined;
    if (!ref) return null;
    const ast = this.ensureAst(ref.expression);
    if (!ast || ast.type !== 'Identifier') return null;
    const info = this.tracked.get((ast as { name?: string }).name as string);
    if (!info) return null;
    return info.cellName;
  }

  emitTopLevel(node: IRNode, level: number, parentAxis: 'column' | 'row' | null = null): string[] {
    if (node instanceof StaticNode) {
      return emitElement(node, this, level, parentAxis);
    }
    return emitChild(node, this, level, parentAxis);
  }
}

function splitLines(code: string): string[] {
  return code.split('\n');
}

// Web block-level boxes: fill the parent width in block flow (Column), but stay
// content-sized as flex items (Row children). Form elements and custom
// components behave inline-block and keep their natural size.
const BLOCK_TAGS = new Set<string>([
  ...CONTAINER_TAGS,
  'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'pre',
]);

function hasExplicitWidth(classes: string[]): boolean {
  for (const c of classes) {
    if (c.startsWith('w-') || c.startsWith('min-w-') || c.startsWith('max-w-') || c.startsWith('size-')) return true;
  }
  return false;
}

function fillMaxWidth(classes: string[], tag: string, parentAxis: 'column' | 'row' | null): boolean {
  return parentAxis !== 'row' && BLOCK_TAGS.has(tag) && !hasExplicitWidth(classes);
}

function prependFill(modifier: string | null): string | null {
  if (modifier === null) return 'Modifier.fillMaxWidth()';
  return `Modifier.fillMaxWidth().${modifier.slice('Modifier.'.length)}`;
}

// Modifier.weight() and Modifier.align() are only valid inside Row/Column
// scope, so they are stripped from top-level elements. extraModifier is
// prepended (outermost) — used by divide-* child borders.
function stripScopeMods(parts: ModifierParts): void {
  parts.size = parts.size.filter((s) => !s.startsWith('weight('));
  parts.align = parts.align.filter((s) => !s.startsWith('align(') && !s.startsWith('fillMax'));
}

function emitTailwindWarnings(parts: ModifierParts, em: Emitter): void {
  if (parts.warnings) {
    for (const cls of parts.warnings) {
      em.err.warn(null, `CSS animation class "${cls}" is not supported in native — use motion.animate() instead`);
    }
  }
}

function modifierFor(classes: string[], em: Emitter, parentAxis: 'column' | 'row' | null, fillWidth: boolean, extraModifier: string | null = null, boxScope = false): string | null {
  const parts = classify(classes, em.customClasses, parentAxis === 'row' ? 'row' : 'column');
  emitTailwindWarnings(parts, em);
  if (parentAxis === null) stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  if (fillWidth) modifier = prependFill(modifier);
  return prependModifier(modifier, extraModifier);
}

// True when this element's subtree renders the routed content slot
// ({props.children} -> SlotNode -> content()). Only such a container is the
// page-level scroll: it stays composed across route changes, so its vertical
// scroll is keyed by route (forward = top, back = restore). Nested scroll
// regions inside page content never contain the slot and stay independent.
function containsSlot(node: IRNode): boolean {
  const anyContains = (list: IRNode[]) => list.some((n) => n instanceof StaticNode || n instanceof ComponentCall ? containsSlot(n) : false);
  if (!(node instanceof StaticNode || node instanceof ComponentCall)) return false;
  for (const child of node.children) {
    if (child instanceof SlotNode) return true;
    if (child instanceof StaticNode || child instanceof ComponentCall) {
      if (containsSlot(child)) return true;
    } else if (child instanceof OpaqueDynamicRegion) {
      if (anyContains(child.consequentNodes) || anyContains(child.alternateNodes)) return true;
    } else if (child instanceof MapRegion) {
      if (anyContains(child.bodyTemplate) || anyContains(child.alternateNodes)) return true;
    } else if (child instanceof WhileLoop || child instanceof ForLoop) {
      if (anyContains(child.bodyTemplate)) return true;
    } else if (child instanceof SwitchBlock) {
      if (child.cases.some((c) => anyContains(c.body))) return true;
    } else if (child instanceof TryCatch) {
      if (anyContains(child.bodyTemplate) || anyContains(child.catchBody)) return true;
    }
  }
  return false;
}

function prependModifier(modifier: string | null, extra: string | null): string | null {
  if (extra === null || extra === '') return modifier;
  if (modifier === null) return extra;
  return `${extra}.${modifier.slice('Modifier.'.length)}`;
}

function dynamicText(expr: string): string {
  return `(${expr}).toString()`;
}

function textContent(children: IRNode[], em: Emitter): string {
  const parts: string[] = [];
  for (const child of children) {
    if (child instanceof TextNode) {
      parts.push(em.ktString(child.value));
    } else if (child instanceof DynamicBinding && child.kind === 'text') {
      parts.push(dynamicText(em.exprOf(child.expression)));
    } else if (child instanceof DynamicBinding && child.kind === 'attribute') {
      // attribute bindings are consumed elsewhere
    }
  }
  return parts.length === 0 ? '""' : parts.join(' + ');
}

function makeTextCall(text: string, classes: string[], level: number, em: Emitter, fillWidth = false, parentAxis: 'column' | 'row' | null = null, extraModifier: string | null = null, defaultColor: string | null = null, flowParent = false, boxScope = false): string {
  const pad = '\t'.repeat(level);
  const parts = classify(classes, em.customClasses, parentAxis === 'row' ? 'row' : 'column');
  emitTailwindWarnings(parts, em);
  if (parentAxis === null || flowParent) stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  if (fillWidth) modifier = prependFill(modifier);
  modifier = prependModifier(modifier, extraModifier);
  const style = buildTextStyle(parts);
  let textExpr = text;
  const xform = parts.text.transform;
  if (xform === 'upper') textExpr = `(${text}).uppercase()`;
  else if (xform === 'lower') textExpr = `(${text}).lowercase()`;
  else if (xform === 'cap') textExpr = `(${text}).replaceFirstChar { it.uppercase() }`;
  const lines = [pad + 'Text('];
  lines.push(`${pad}\ttext = ${textExpr},`);
  if (modifier) lines.push(`${pad}\tmodifier = ${modifier},`);
  if (style) lines.push(`${pad}\tstyle = ${style},`);
  if (defaultColor && !(style ?? '').includes('color =')) lines.push(`${pad}\tcolor = ${defaultColor},`);
  const tp = parts.text;
  if (tp.maxLines !== undefined) lines.push(`${pad}\tmaxLines = ${tp.maxLines},`);
  if (tp.softWrap === false) lines.push(`${pad}\tsoftWrap = false,`);
  if (tp.overflow !== undefined) lines.push(`${pad}\toverflow = TextOverflow.${tp.overflow},`);
  lines.push(pad + ')');
  return lines.join('\n');
}

// A .vsklib library tag (e.g. <CoilImage src="..." alt="..."/>): emit the
// binding's composable with props mapped to its parameters. `class`/`className`
// become the modifier; unknown props are hard errors so a typo never silently
// miscompiles. Children render into a trailing content lambda when the binding
// is a container.
function libraryTagLines(node: ComponentCall, em: Emitter, level: number, parentAxis: 'column' | 'row' | null = null, flowParent = false, boxScope = false): string[] {
  const binding = em.libraryTags?.get(node.componentName);
  if (!binding) return [componentCallLines(node, em, level, parentAxis, flowParent, boxScope)];
  for (const imp of binding.imports) {
    em.libImports.add(imp.startsWith('import ') ? imp : `import ${imp}`);
  }

  // `<Shimmer>` is a modifier wrapper: it renders its children inside a Box
  // whose modifier applies the library's shimmer effect. This is the
  // markup-native surface for the valentinilk shimmer lib — its Shimmer value
  // can't be constructed from JS (the @Composable rememberShimmer factory is
  // the supported entry point), so the binding wraps children in the same way
  // a user would write `Modifier.shimmer(rememberShimmer(...))`.
  if (binding.shimmer) return shimmerWrapperLines(node, em, level, parentAxis, flowParent, boxScope);

  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const argLines: string[] = [];
  for (const p of node.props) {
    const param = binding.attrs[p.name];
    if (p.name === 'class' || p.name === 'className') {
      const raw = (p.value.raw ?? '').trim();
      const cls = raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw[raw.length - 1] === raw[0]
        ? raw.slice(1, -1)
        : raw;
      const classes = cls.split(/\s+/).filter(Boolean);
      const fill = parentAxis !== 'row';
      const modifier = modifierFor(classes, em, parentAxis, fill, null, boxScope);
      if (modifier) argLines.push(`${padIn}modifier = ${modifier},`);
      continue;
    }
    if (!param) {
      em.err.warn(null, `<${node.componentName}> has no attribute "${p.name}" — library tag attributes: ${Object.keys(binding.attrs).join(', ')}`);
      continue;
    }
    const shape = binding.attrShapes?.[param];
    if (shape && shape.shape !== 'any') {
      const coerced = em.libraryAttrValue(shape, p.value);
      if (coerced !== null) {
        argLines.push(`${padIn}${ktIdent(param)} = ${coerced},`);
        continue;
      }
    }
    argLines.push(`${padIn}${ktIdent(param)} = ${em.exprOf(p.value)},`);
  }
  for (const sp of node.spreadProps) {
    em.err.warn(null, `spread props are not supported in library tags: ...${sp.raw}`);
  }
  const out: string[] = [];
  out.push(pad + `${binding.composable}(`);
  out.push(...argLines);
  if (binding.container && node.children.length > 0) {
    out.push(pad + `) {`);
    for (const child of node.children) {
      out.push(...emitChild(child, em, level + 1, parentAxis, null, flowParent, boxScope));
    }
    out.push(pad + `}`);
  } else {
    out.push(pad + `)`);
  }
  return out;
}

function shimmerWrapperLines(node: ComponentCall, em: Emitter, level: number, parentAxis: 'column' | 'row' | null = null, flowParent = false, boxScope = false): string[] {
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const varName = `__shimmer${++em.shimmerCount}`;
  const shimmerMod = `Modifier.shimmer(${varName})`;
  let classMod: string | null = null;
  for (const p of node.props) {
    if (p.name === 'class' || p.name === 'className') {
      const raw = (p.value.raw ?? '').trim();
      const cls = raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw[raw.length - 1] === raw[0]
        ? raw.slice(1, -1)
        : raw;
      classMod = modifierFor(cls.split(/\s+/).filter(Boolean), em, parentAxis, true, shimmerMod, boxScope);
      continue;
    }
    em.err.warn(null, `<Shimmer> does not support attribute "${p.name}"`);
  }
  const out: string[] = [];
  out.push(pad + `val ${varName} = rememberShimmer(ShimmerBounds.View, defaultShimmerTheme)`);
  out.push(pad + `Box(`);
  out.push(padIn + `modifier = ${classMod ?? shimmerMod},`);
  out.push(pad + `) {`);
  for (const child of node.children) {
    out.push(...emitChild(child, em, level + 1, parentAxis, null, flowParent, boxScope));
  }
  out.push(pad + `}`);
  return out;
}

function componentCallLines(node: ComponentCall, em: Emitter, level: number, parentAxis: 'column' | 'row' | null = null, flowParent = false, boxScope = false): string {
  const propArgs = node.props.map((p) => `${ktIdent(p.name)} = ${em.exprOf(p.value)}`);
  for (const sp of node.spreadProps) {
    em.err.warn(null, `spread props are not supported in component calls: ...${sp.raw}`);
  }
  const args = propArgs.length ? propArgs.join(', ') : '';
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const out: string[] = [];
  const withoutProps = em.componentsWithoutProps?.has(node.componentName) ?? false;
  if (withoutProps) {
    out.push(pad + `${node.componentName}()`);
  } else {
    out.push(pad + `${node.componentName}(props = ${node.componentName}Props(${args}))`);
  }
  if (node.children.length > 0) {
    out.push(padIn + '{');
    for (const child of node.children) {
      out.push(...emitChild(child, em, level + 2, parentAxis, null, flowParent, boxScope));
    }
    out.push(padIn + '}');
  }
  return out.join('\n');
}

// Drag and drop (markup-level): `draggable` makes an element a drag source
// (payload = the `dragdata` attribute or the element's text content), and
// `ondrop` makes it a drop target whose callback receives the dropped text
// as (String?). The modifiers chain onto the element's computed modifier.
function dragModifier(node: StaticNode, em: Emitter): string | null {
  let m = '';
  const draggable = node.attributes.some((a) => a.name.toLowerCase() === 'draggable');
  if (draggable) {
    const attrs = em.dynamicAttrs(node);
    const staticData = em.staticAttr(node, 'dragdata');
    const dynData = attrs.get('dragdata');
    let data: string;
    if (staticData !== null && staticData.length > 0) {
      data = em.ktString(staticData);
    } else if (dynData) {
      data = em.j2k.expr(dynData).trimStart();
    } else {
      const t = textContent(node.children, em);
      data = t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? em.ktString(t.slice(1, -1)) : t;
    }
    m += `.veskDraggable(VeskDragData(${data}))`;
  }
  const ondrop = em.dynamicAttrs(node).get('ondrop');
  if (ondrop) m += `.veskDropTarget(${em.j2k.expr(ondrop).trimStart()})`;
  return m.length > 0 ? m : null;
}

function emitElement(node: StaticNode, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null = null, flowParent = false, boxScope = false): string[] {
  const dropMod = dragModifier(node, em);
  if (dropMod && extraModifier) extraModifier += dropMod;
  else if (dropMod) extraModifier = `Modifier${dropMod}`;
  if (DEVICE_TAGS[node.tag]) {
    // Bound attributes (onPick=..., title=...) arrive as DynamicBinding
    // children; only real element children (markup) are an error.
    const structural = node.children.filter(
      (c) => !(c instanceof DynamicBinding) && !(c instanceof TextNode)
    );
    if (structural.length > 0) em.err.warn(null, `<${node.tag}> does not take children — label is built in`);
    return deviceApiLines(node, em, level, extraModifier, boxScope);
  }
  const info = elementInfo(node.tag);
  const classes = em.classList(node);
  if (isHidden(classes, em.customClasses)) return [];
  const attrs = em.dynamicAttrs(node);
  const onclick = attrs.get('onclick');
  if (onclick && info.kind !== 'button') {
    const clickMod = `Modifier.clickable { jsSafe(${em.j2k.expr(onclick).trimStart()}) }`;
    extraModifier = prependModifier(extraModifier, clickMod);
  }
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  // motion element refs: `ref={tracked}` replaces the cell value with a
  // MotionRef and chains `.motionGraphics(ref)` onto the element modifier.
  // Form inputs keep their bindValue/bindChecked ref semantics instead.
  let prologue: string[] = [];
  const refCell = info.kind === 'input' ? null : em.motionRefBinding(node);
  if (refCell) {
    const refName = `__veskRef${++em.refCount}`;
    prologue = [pad + `val ${refName} = rememberMotionRef()`, pad + `${refCell}.value = ${refName}`];
    extraModifier = prependModifier(extraModifier, `Modifier.motionGraphics(${refName})`);
  }
  // absolute/fixed elements are out of flow: shrink-to-fit, never block-fill
  const fillWidth = fillMaxWidth(classes, node.tag, parentAxis) && !isAbsolute(classes);

  if (info.kind === 'image') {
    return [...prologue, ...imageLines(node, em, level, parentAxis, extraModifier, boxScope)];
  }

  if (info.kind === 'video' || info.kind === 'audio') {
    return [...prologue, ...mediaLines(node, em, level, parentAxis, extraModifier, boxScope)];
  }

  if (info.kind === 'text') {
    const content = textContent(node.children, em);
    const nonText = node.children.filter(
      (c) => !(c instanceof TextNode) && !(c instanceof DynamicBinding)
    );
    if (nonText.length === 0) {
      return [...prologue, ...splitLines(makeTextCall(content, classes, level, em, fillWidth, parentAxis, extraModifier, null, flowParent, boxScope))];
    }
    const lines: string[] = [];
    const modifier = modifierFor(classes, em, parentAxis, fillWidth, extraModifier, boxScope);
    if (modifier) {
      lines.push(pad + `Column(modifier = ${modifier}) {`);
    } else {
      lines.push(pad + 'Column {');
    }
    if (content !== '""') lines.push(`${padIn}Text(${content})`);
    for (const child of nonText) {
      lines.push(...emitChild(child, em, level + 1, 'column', null, false, false));
    }
    lines.push(pad + '}');
    return [...prologue, ...lines];
  }

  if (info.kind === 'button') {
    return [...prologue, ...emitButton(node, classes, attrs, em, level, parentAxis, extraModifier, boxScope)];
  }

  if (info.kind === 'input') {
    const type = em.staticAttr(node, 'type');
    const bindVar = em.bindRefVar(node);
    const valueExpr = attrs.get('value');
    const checkedExpr = attrs.get('checked');
    const modifier = modifierFor(classes, em, parentAxis, false, extraModifier, boxScope);
    const modLine = modifier ? `${padIn}modifier = ${modifier},` : '';
    const lines: string[] = [];
    if (type === 'checkbox' || type === 'radio') {
      const checked = bindVar ? `${bindVar}.value` : checkedExpr ? em.j2k.expr(checkedExpr) : 'false';
      const onChange = bindVar ? `{ ${bindVar}.value = it }` : '{}';
      lines.push(pad + 'Checkbox(');
      lines.push(`${padIn}checked = ${checked},`);
      lines.push(`${padIn}onCheckedChange = ${onChange},`);
      if (modLine) lines.push(modLine);
      lines.push(pad + ')');
      return lines;
    }
    const value = bindVar ? `${bindVar}.value` : valueExpr ? em.j2k.expr(valueExpr) : '""';
    const onValueChange = bindVar ? `{ ${bindVar}.value = it }` : '{}';
    const placeholder = em.staticAttr(node, 'placeholder');
    const lines2: string[] = [];
    lines2.push(pad + 'OutlinedTextField(');
    lines2.push(`${padIn}value = ${value},`);
    lines2.push(`${padIn}onValueChange = ${onValueChange},`);
    if (node.tag === 'textarea') lines2.push(`${padIn}singleLine = false,`);
    if (modLine) lines2.push(modLine);
    if (placeholder) lines2.push(`${padIn}placeholder = { Text(${em.ktString(placeholder)}) },`);
    lines2.push(pad + ')');
    return lines2;
  }

  const axis = elementAxis(classes);
  const layout = layoutArgs(classes, axis);
  const layoutArgsLines: string[] = [];
  if (layout.horizontalAlignment) layoutArgsLines.push(`${padIn}horizontalAlignment = ${layout.horizontalAlignment},`);
  if (layout.verticalAlignment) layoutArgsLines.push(`${padIn}verticalAlignment = ${layout.verticalAlignment},`);
  if (layout.horizontalArrangement) layoutArgsLines.push(`${padIn}horizontalArrangement = ${layout.horizontalArrangement},`);
  if (layout.verticalArrangement) layoutArgsLines.push(`${padIn}verticalArrangement = ${layout.verticalArrangement},`);

  const argLines: string[] = [];
  const containerParts = classify(classes, em.customClasses, axis, containsSlot(node));
  emitTailwindWarnings(containerParts, em);
  const flow = containerParts.flow === true;
  if (parentAxis === null || flow || flowParent) stripScopeMods(containerParts); // Flow layouts have no align/weight scope
  if (!boxScope) containerParts.posMod = [];
  let modifier = buildModifier(containerParts);
  if (fillWidth) modifier = prependFill(modifier);
  modifier = prependModifier(modifier, extraModifier);
  if (modifier) argLines.push(`${padIn}modifier = ${modifier},`);

  const gridInfo = layout.grid ?? null;
  const isFlex = classes.includes('flex') || classes.includes('flex-row') || classes.includes('flex-col') || classes.includes('flex-row-reverse') || classes.includes('flex-col-reverse');
  const boxParent = !gridInfo && !isFlex && (containerParts.position === 'relative' || containerParts.position === 'fixed');

  const divide = containerParts.divide;

  if (gridInfo) {
    return [...prologue, ...gridLines(node, em, level, pad, padIn, modifier, gridInfo, divide)];
  }

  const composable = boxParent
    ? 'Box'
    : flow
      ? (axis === 'row' ? 'FlowRow' : 'FlowColumn')
      : (axis === 'row' ? 'Row' : 'Column');
  // Flow layouts share Row/Column arrangement param names but have no
  // vertical/horizontalAlignment: cross-axis centering maps to Arrangement.Center.
  const alignArgs = flow
    ? [
        ...layoutArgsLines.filter((l) => !l.replace(/^\s+/, '').startsWith('verticalAlignment =') && !l.replace(/^\s+/, '').startsWith('horizontalAlignment =')),
        ...(axis === 'row' && layout.verticalAlignment === 'Alignment.CenterVertically' && !layout.verticalArrangement
          ? [`${padIn}verticalArrangement = Arrangement.Center,`]
          : []),
        ...(axis === 'column' && layout.horizontalAlignment === 'Alignment.CenterHorizontally' && !layout.horizontalArrangement
          ? [`${padIn}horizontalArrangement = Arrangement.Center,`]
          : []),
      ]
    : layoutArgsLines;
  argLines.push(...alignArgs);

  const lines: string[] = [];
  const childrenLines: string[] = [];
  const childAxis: 'column' | 'row' | null = boxParent ? 'column' : (axis === 'grid' ? 'column' : axis);
  const childBox = boxParent;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    if (divide && i > 0) {
      childrenLines.push(...emitChild(child, em, level + 1, childAxis, divideBorderMod(divide), flow, childBox));
    } else {
      childrenLines.push(...emitChild(child, em, level + 1, childAxis, null, flow, childBox));
    }
  }

  const callPad = flow ? `${pad}@OptIn(ExperimentalLayoutApi::class)\n${pad}` : pad;
  if (argLines.length === 0 && childrenLines.length === 0) {
    lines.push(callPad + `${composable} {}`);
    return [...prologue, ...lines];
  }
  if (argLines.length === 0) {
    lines.push(callPad + `${composable} {`);
    lines.push(...childrenLines);
    lines.push(pad + '}');
    return [...prologue, ...lines];
  }
  lines.push(callPad + `${composable}(`);
  lines.push(...argLines);
  lines.push(pad + ') {');
  lines.push(...childrenLines);
  lines.push(pad + '}');
  return [...prologue, ...lines];
}

// Grid containers emit as a Column of weighted rows: each child is
// Modifier.weight(1f) inside a Row, so columns share width; the Column's
// verticalArrangement carries gap-y and each Row's horizontalArrangement
// carries gap-x. Last row may be short, like web auto-flow.
function gridLines(
  node: StaticNode,
  em: Emitter,
  level: number,
  pad: string,
  padIn: string,
  modifier: string | null,
  grid: { cols: number; gapX: number | null; gapY: number | null },
  divide: ModifierParts['divide'],
): string[] {
  const lines: string[] = [];
  const open: string[] = [pad + 'Column('];
  if (modifier) open.push(`${padIn}modifier = ${modifier},`);
  if (grid.gapY !== null) open.push(`${padIn}verticalArrangement = Arrangement.spacedBy(${grid.gapY}.dp),`);
  open.push(pad + ') {');
  lines.push(...open);
  const rowPad = '\t'.repeat(level + 1);
  const cols = Math.max(1, grid.cols);
  for (let i = 0; i < node.children.length; i += cols) {
    const rowChildren = node.children.slice(i, i + cols);
    const rowArgs: string[] = [];
    if (grid.gapX !== null) rowArgs.push(`${rowPad}\thorizontalArrangement = Arrangement.spacedBy(${grid.gapX}.dp),`);
    const rowMods: string[] = [];
    if (i > 0 && divide && divide.axis === 'y') rowMods.push(divideBorderMod(divide));
    if (rowArgs.length === 0 && rowMods.length === 0) {
      lines.push(rowPad + 'Row {');
    } else {
      lines.push(rowPad + 'Row(');
      if (rowMods.length) lines.push(`${rowPad}\tmodifier = ${rowMods[0]},`);
      lines.push(...rowArgs);
      lines.push(rowPad + ') {');
    }
    for (let j = 0; j < rowChildren.length; j++) {
      const child = rowChildren[j]!;
      let cellExtra = 'Modifier.weight(1f)';
      if (divide && j > 0) cellExtra += `.${divideBorderMod(divide).slice('Modifier.'.length)}`;
      lines.push(...emitChild(child, em, level + 2, 'row', cellExtra, false, false));
    }
    lines.push(rowPad + '}');
  }
  lines.push(pad + '}');
  return lines;
}

function divideBorderMod(divide: NonNullable<ModifierParts['divide']>): string {
  if (divide.style === 'dashed' || divide.style === 'dotted') {
    const dashes = divide.style === 'dotted' ? 'floatArrayOf(0.1f, 8f)' : 'floatArrayOf(12f, 12f)';
    return divide.axis === 'y'
      ? `Modifier.veskDivideLine(horizontal = true, width = ${divide.width}.dp, color = ${divide.color}, dashes = ${dashes})`
      : `Modifier.veskDivideLine(horizontal = false, width = ${divide.width}.dp, color = ${divide.color}, dashes = ${dashes})`;
  }
  return divide.axis === 'y'
    ? `Modifier.veskSideBorder(top = ${divide.width}.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, ${divide.color})`
    : `Modifier.veskSideBorder(top = 0.dp, end = 0.dp, bottom = 0.dp, start = ${divide.width}.dp, ${divide.color})`;
}

// Can an IR node run as plain Kotlin inside a try/catch guard? Only runtime
// statements and statement-only conditionals are allowed — anything that
// emits a composable invocation (markup, track decls, loops, calls) renders
// outside the guard.
function isGuardSafe(n: IRNode): boolean {
  if (n instanceof RuntimeStatement) return true;
  if (n instanceof OpaqueDynamicRegion) {
    return (n.consequentNodes as IRNode[]).every(isGuardSafe) && (n.alternateNodes as IRNode[]).every(isGuardSafe);
  }
  return false;
}

function emitChild(child: IRNode, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null = null, flowParent = false, boxScope = false): string[] {
  const pad = '\t'.repeat(level);

  if (child instanceof StaticNode) {
    return emitElement(child, em, level, parentAxis, extraModifier, flowParent, boxScope);
  }
  if (child instanceof TextNode) {
    return splitLines(makeTextCall(em.ktString(child.value), [], level, em, false, parentAxis, extraModifier, null, flowParent, boxScope));
  }
  if (child instanceof DynamicBinding) {
    if (child.kind === 'text') {
      const raw = child.expression.raw ?? '';
      // Motion side-effects (inView, scroll, animate) return Unit — render
      // them as LaunchedEffect blocks instead of Text(text = "kotlin.Unit").
      if (raw.includes('motionInView(') || raw.includes('motionScroll(') || raw.includes('motionAnimate(') || raw.includes('motionStagger(')) {
        return [pad + `LaunchedEffect(Unit) { ${em.exprOf(child.expression)} }`];
      }
      return splitLines(makeTextCall(dynamicText(em.exprOf(child.expression)), [], level, em, false, parentAxis, extraModifier, null, flowParent, boxScope));
    }
    return [];
  }
  if (child instanceof OpaqueDynamicRegion) {
    const cond = em.exprOf(child.condition);
    const out: string[] = [];
    out.push(pad + `if (truthy(${cond})) {`);
    for (const n of child.consequentNodes) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    out.push(pad + `} else {`);
    for (const n of child.alternateNodes) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof MapRegion) {
    const arrExpr = em.exprOf(child.expression);
    const item = child.itemVariable;
    const keyExpr = child.keyExpr ? em.exprOf(child.keyExpr) : null;
    const out: string[] = [];
    out.push(pad + `LazyColumn {`);
    out.push(pad + `\titems(${arrExpr}${keyExpr ? `, key = { ${keyExpr} }` : ''}) { ${item} ->`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 2, 'column', extraModifier, flowParent, boxScope));
    out.push(pad + `\t}`);
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof ComponentCall) {
    if (em.libraryTags?.has(child.componentName)) {
      return libraryTagLines(child, em, level, parentAxis, flowParent, boxScope);
    }
    const name = child.componentName;
    const known = (em.componentNames?.has(name) ?? false) || FRAMEWORK_COMPONENT_CALLS.has(name);
    if (!known) {
      let hint = '';
      if (em.vsklibRegistry) {
        for (const [libId, surface] of em.vsklibRegistry) {
          if (surface.tags[name]) {
            hint = ` — this is an installed library tag; import it in the header: import { ${name} } from '@vesk/${libId}'`;
            break;
          }
        }
      }
      em.err.warn(null, `<${name}>: unknown component${hint}`);
    }
    return splitLines(componentCallLines(child, em, level, parentAxis, flowParent, boxScope));
  }
  if (child instanceof TrackDecl) {
    return splitLines(em.trackDecl(child)).map((l) => pad + l);
  }
  if (child instanceof RuntimeStatement) {
    return splitLines(em.stmtOf(child)).map((l) => pad + l);
  }
  if (child instanceof HeadBlock) {
    em.err.note('{#head} blocks are not supported in native');
    return [];
  }
  if (child instanceof ServerBlock) {
    em.err.warn(null, '{#server} blocks are not supported in native');
    return [pad + `error("server block not supported in vesk-native")`];
  }
  if (child instanceof ClientBlock) {
    return child.children.length ? emitChild(child.children[0]!, em, level, parentAxis, extraModifier, flowParent, boxScope) : [];
  }
  if (child instanceof SlotNode) {
    return [pad + `content()`];
  }
  if (child instanceof WhileLoop) {
    const cond = em.exprOf(child.condition);
    const out: string[] = [];
    if ((child as { isDoWhile?: boolean }).isDoWhile) {
      out.push(pad + `do {`);
      for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
      out.push(pad + `} while (truthy(${cond}));`);
    } else {
      out.push(pad + `while (truthy(${cond})) {`);
      for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
      out.push(pad + `}`);
    }
    return out;
  }
  if (child instanceof SwitchBlock) {
    const disc = em.exprOf(child.discriminant);
    const out: string[] = [];
    out.push(pad + `when (${disc}) {`);
    for (const c of child.cases) {
      const test = c.test ? em.exprOf(c.test) : null;
      out.push(pad + `\t${test === null ? 'else' : test} -> {`);
      // Kotlin `when` branches are exclusive (no fallthrough), so the `break`
      // statements the web markup inserts after each case body are a no-op
      // here — emitting them would not compile.
      const bodyNodes = (c.body as IRNode[]).filter(
        (n) => !(n instanceof RuntimeStatement) || (n.ast as { type?: string } | null)?.type !== 'BreakStatement',
      );
      for (const n of bodyNodes) out.push(...emitChild(n, em, level + 2, parentAxis, extraModifier, flowParent, boxScope));
      out.push(pad + '\t}');
    }
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof TryCatch) {
    const catchParam = child.catchParamName ?? 'e';
    const guard = em.nextGuardName();
    const out: string[] = [];
    // Compose forbids try/catch around composable invocations, so the try
    // body's plain statements run in a guarded block first; markup renders
    // only when the guard stayed healthy, and the catch body renders (with
    // the catch parameter aliased to the guard) otherwise.
    const bodyGuard = child.bodyTemplate.filter(isGuardSafe);
    const bodyRender = child.bodyTemplate.filter((n) => !isGuardSafe(n));
    const catchGuard = child.catchBody.filter(isGuardSafe);
    const catchRender = child.catchBody.filter((n) => !isGuardSafe(n));
    out.push(pad + `var ${guard}: Throwable? = null`);
    out.push(pad + `try {`);
    for (const n of bodyGuard) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    out.push(pad + `} catch (${guard}_caught: Throwable) {`);
    out.push(pad + `\t${guard} = ${guard}_caught`);
    for (const n of catchGuard) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    out.push(pad + `}`);
    out.push(pad + `if (${guard} == null) {`);
    for (const n of bodyRender) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    out.push(pad + `} else {`);
    for (const n of catchRender) {
      const lines = em.withParamAliases(new Map([[catchParam, guard]]), () =>
        emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope),
      );
      out.push(...lines);
    }
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof ForLoop) {
    const cond = em.exprOf(child.condition);
    const out: string[] = [];
    if (child.kind === 'for-in') {
      const rawLeft = child.init.trim();
      const name = ['const ', 'let ', 'var '].some((kw) => rawLeft.startsWith(kw))
        ? rawLeft.slice(rawLeft.indexOf(' ') + 1).trim()
        : rawLeft;
      // JS for-in iterates keys; Kotlin iterating a Map yields entries, so go
      // through the runtime keys view for exact object/map semantics.
      out.push(pad + `for (${name} in jsMapKeys(${cond})) {`);
      for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
      out.push(pad + `}`);
      return out;
    }
    if (child.init) {
      const init = em.stmtText(child.init);
      const trimmedInit = init.endsWith(';') ? init.slice(0, -1) : init;
      if (trimmedInit) out.push(pad + trimmedInit);
    }
    out.push(pad + `while (truthy(${cond})) {`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    if (child.update) {
      const update = em.stmtText(child.update);
      const trimmedUpdate = update.endsWith(';') ? update.slice(0, -1) : update;
      if (trimmedUpdate) out.push(pad + `\t${trimmedUpdate}`);
    }
    out.push(pad + `}`);
    return out;
  }
  return [];
}

export interface CompileResult {
  kt: string;
  errors: string[];
  notes: string[];
  /** `@vesk/<libId>` libraries this file imports (usage-based page placement
   *  between commonMain and androidMain is decided from these). */
  libraryIds: string[];
  /** Project-relative targets of the `.vsk` components this file imports
   *  (transitive portability: a page is portable only if the components it
   *  imports are portable too). */
  vskTargets: string[];
  /** Project-relative targets of the JS/TS modules this file imports. */
  jsTsTargets: string[];
  /** Bare npm specifiers this file imports (their compiled `app.vmod` files
   *  must land in the same source set as this page). */
  npmTargets: string[];
}

// <head><link rel="stylesheet" href="..."> — CSS files are global; <style>
// blocks inside a component are component-scoped: they resolve only for
// elements of that component (scoped wins over global on name clashes).
export interface CssCollection {
  classes: Map<string, ModifierParts>;
  scoped: Map<string, Map<string, ModifierParts>>;
  skipped: string[];
}

export function extractStylesheetLinks(source: string): string[] {
  const out: string[] = [];
  try {
    const ast = webParse(source, { filename: 'component.vsk' });
    const ir = generateIR(ast, source);
    for (const comp of ir.components) {
      walkIR(comp.body, (node) => {
        if (node instanceof StaticNode && node.tag.toLowerCase() === 'head') {
          for (const child of node.children) {
            if (!(child instanceof StaticNode) || child.tag.toLowerCase() !== 'link') continue;
            const attrs = new Map(child.attributes.map((a) => [a.name.toLowerCase(), a.value]));
            const rel = (attrs.get('rel') ?? '').toLowerCase();
            const href = attrs.get('href');
            if (rel === 'stylesheet' && href) out.push(href);
          }
        }
      });
    }
  } catch {
    // Unparsable files are reported by the compile step itself.
  }
  return out;
}

export function collectCustomCss(sources: Array<{ source: string; filename?: string }>): CssCollection {
  const classes = new Map<string, ModifierParts>();
  const scoped = new Map<string, Map<string, ModifierParts>>();
  const skipped: string[] = [];
  for (const { source, filename } of sources) {
    try {
      const ast = webParse(source, { filename: filename ?? 'component.vsk' });
      const ir = generateIR(ast, source);
      for (const comp of ir.components) {
        if (comp.style) {
          const r = parseCssClasses(comp.style);
          let own = scoped.get(comp.name);
          if (!own) {
            own = new Map<string, ModifierParts>();
            scoped.set(comp.name, own);
          }
          for (const [k, v] of r.classes) own.set(k, v);
          skipped.push(...r.skipped);
        }
      }
    } catch (e) {
      skipped.push(`could not parse styles in ${filename ?? '?'}: ${(e as Error).message}`);
    }
  }
  return { classes, scoped, skipped };
}

// A header export/declaration is emitted at file top with its registry-mangled
// Kotlin name; a same-file alias import keeps the plain name working in the
// component's own script and markup.
function renameDeclared(node: JsNode, kotlinName: string): JsNode {
  const id = { type: 'Identifier', name: kotlinName } as JsNode;
  if (node.type === 'VariableDeclaration') {
    const decls = (node.declarations as JsNode[]) ?? [];
    const first = decls[0] ?? ({} as JsNode);
    return { ...node, declarations: [{ ...first, id }] } as JsNode;
  }
  return { ...node, id } as JsNode;
}

// `import { ... } from 'motion'` (motion.dev): the JS names that have native
// Kotlin/Compose mappings in the app runtime. Anything else is a hard error so
// a script never silently miscompiles a motion API we have not mapped yet.
const KNOWN_MOTION = new Set([
  'animate', 'spring', 'stagger', 'inView', 'scroll', 'delay',
  'cubicBezier', 'steps', 'mirrorEasing', 'reverseEasing',
  'easeIn', 'easeOut', 'easeInOut', 'circIn', 'circOut', 'circInOut',
  'backIn', 'backOut', 'backInOut', 'anticipate',
]);

function emitVskHeader(
  source: string,
  fileRel: string,
  appDir: string,
  registry: ModuleRegistry | undefined,
  npmRegistry: Map<string, Map<string, { pkg: string; name: string }>> | undefined,
  slugs: Map<string, string> | undefined,
  projectRegistry: Map<string, Map<string, { pkg: string; name: string }>> | undefined,
  vsklibRegistry: Map<string, VskLibSurface> | undefined,
  err: KtErrors,
  libExportImports: Set<string> = new Set(),
): { imports: string[]; decls: string[]; libraryTags: Map<string, VskLibTag>; libraryExports: Map<string, LibExportSig>; libraryMemberExports: Map<string, Map<string, LibExportSig>>; motionExports: Set<string>; libraryIds: Set<string>; vskTargets: Set<string>; jsTsTargets: Set<string>; npmTargets: Set<string> } {
  const imports: string[] = [];
  const decls: string[] = [];
  const aliases: string[] = [];
  const libraryTags = new Map<string, VskLibTag>();
  const libraryExports = new Map<string, LibExportSig>();
  const libraryMemberExports = new Map<string, Map<string, LibExportSig>>();
  const motionExports = new Set<string>();
  const libraryIds = new Set<string>();
  const vskTargets = new Set<string>();
  const jsTsTargets = new Set<string>();
  const npmTargets = new Set<string>();
  const { header } = splitVskHeader(source);
  if (!header.trim()) return { imports, decls, libraryTags, libraryExports, libraryMemberExports, motionExports, libraryIds, vskTargets, jsTsTargets, npmTargets };

  const { symbols, error } = collectHeaderSymbols(header);
  if (error) {
    err.warn(null, error);
    return { imports, decls, libraryTags, libraryExports, libraryMemberExports, motionExports, libraryIds, vskTargets, jsTsTargets, npmTargets };
  }
  for (const e of symbols.expressions) err.warn(e, `top-level expression statements are not supported in a .vsk script header`);
  const slug = slugs?.get(fileRel) ?? slugFor(fileRel);
  const j2k = new Js2Kt(err);
  j2k.libImports = libExportImports;
  const localKt = (name: string): string => sanitizeIdent(`${slug}_${name}`);

  for (const imp of symbols.imports) {
    const spec = importSource(imp);
    let lines: string[] = [];
    let errors: string[] = [];
    if (FRAMEWORK_NPM_SPECIFIERS.has(spec)) {
      // motion.dev animations compile to the app runtime's motion helpers
      // (motionAnimate/motionSpring/motionTween/motionEase/motionStagger/
      // motionInView/motionScroll + rememberMotionRef/Modifier.motionGraphics).
      // Names are validated here so an unmapped motion export fails the build.
      for (const s of (imp.specifiers as JsNode[]) ?? []) {
        if (s.type !== 'ImportSpecifier') {
          errors.push(`import '${spec}': only named imports are supported`);
          continue;
        }
        const imported = (s.imported as JsNode).name as string;
        if (!KNOWN_MOTION.has(imported)) {
          errors.push(`import '${imported}' from '${spec}': no native Kotlin mapping yet (available: ${[...KNOWN_MOTION].sort().join(', ')})`);
        } else {
          motionExports.add(imported);
        }
      }
    } else if (spec === '@vesk/browser') {
      // Built-in browser-API surface (sqlite, web storage, auth, fetch,
      // timers, alert, console, JSON). These names compile to Vesk* runtime
      // helpers by name, so importing is purely for IDE/tooling; validation
      // fails closed on unknown names instead of silently compiling nothing.
      const names = BROWSER_API_EXPORTS.map((d) => d.name);
      for (const s of (imp.specifiers as JsNode[]) ?? []) {
        if (s.type !== 'ImportSpecifier') {
          errors.push(`import '${spec}': only named imports are supported from '@vesk/browser'`);
          continue;
        }
        const imported = (s.imported as JsNode).name as string;
        if (!names.includes(imported)) {
          errors.push(`import '${imported}' from '@vesk/browser': not a vesk browser API (available: ${names.join(', ')})`);
        }
      }
    } else if (spec.startsWith('@vesk/')) {
      // Installed Kotlin library: `import { CoilImage } from '@vesk/coil'`.
      // Only explicitly imported names are in scope — installing a library
      // never puts its tags in every file implicitly.
      const libId = spec.slice('@vesk/'.length);
      const lib = vsklibRegistry?.get(libId);
      if (!lib) {
        errors.push(`import '${spec}': unknown .vsklib library — install it with: vesk add ${libId}`);
      } else {
        libraryIds.add(libId);
        const tagNames = Object.keys(lib.tags);
        for (const s of (imp.specifiers as JsNode[]) ?? []) {
          if (s.type !== 'ImportSpecifier') {
            errors.push(`import '${spec}': only named imports are supported from .vsklib libraries`);
            continue;
          }
          const imported = (s.imported as JsNode).name as string;
          const tag = lib.tags[imported];
          if (tag) {
            libraryTags.set(imported, tag);
          } else {
            const sig = lib.exports.get(imported);
            if (sig) {
              // Constructor/enum export: the Kotlin class is imported by its
              // fully-qualified name and made callable in the script scope.
              imports.push(`import ${sig.qualified}`);
              libraryExports.set(imported, sig);
              // Imported object exports (e.g. `Lucide`) expose their members
              // as Kotlin extension properties; remember the library's full
              // export surface so `Lucide.AArrowDown` member reads can emit
              // the extension's top-level import (`import ...AArrowDown`).
              if (!sig.isEnum && !sig.isConstructor) {
                libraryMemberExports.set(imported, lib.exports);
              }
            } else if (lib.exports.has(imported)) {
              errors.push(`import '${imported}' from '@vesk/${libId}': this export has no JS-callable binding yet (markup tags: ${tagNames.map((t) => `<${t}>`).join(', ') || 'none'})`);
            } else {
              errors.push(`import '${imported}' from '@vesk/${libId}': not exported (available: ${[...tagNames, ...lib.exports.keys()].join(', ')})`);
            }
          }
        }
      }
    } else if (resolveVskTarget(spec, fileRel, appDir)) {
      const r = vskImportLines(imp, fileRel, appDir, registry ?? new Map());
      lines = r.lines;
      errors = r.errors;
      const target = resolveVskTarget(spec, fileRel, appDir);
      if (target) vskTargets.add(target);
    } else {
      const jsTsTarget = resolveJsTsTarget(spec, fileRel, appDir);
      if (jsTsTarget && projectRegistry?.has(jsTsTarget)) {
        const r = pkgImportLines(imp, spec, projectRegistry.get(jsTsTarget) ?? new Map());
        lines = r.lines;
        errors = r.errors;
        jsTsTargets.add(jsTsTarget);
      } else if (jsTsTarget) {
        errors.push(`import '${spec}': target ${jsTsTarget} was not compiled (no module registry)`);
      } else if (npmRegistry && npmRegistry.size > 0) {
        const r = npmImportLines(imp, npmRegistry);
        lines = r.lines;
        errors = r.errors;
        if (npmRegistry.has(spec)) npmTargets.add(spec);
      } else {
        errors.push(`import '${spec}': could not resolve module (no registry)`);
      }
    }
    for (const l of lines) imports.push(l);
    for (const e of errors) err.warn(null, e);
  }
  j2k.libraryExports = libraryExports;
  j2k.motionExports = motionExports;

  const emitDecl = (name: string, node: JsNode, kotlinName: string, isDefaultExpr: boolean): void => {
    let kt: string;
    if (isDefaultExpr && node.type !== 'FunctionDeclaration' && node.type !== 'ClassDeclaration') {
      kt = `val ${kotlinName} = ${j2k.expr(node)};`;
    } else {
      kt = j2k.stmt(renameDeclared(node, kotlinName));
    }
    decls.push(kt);
    if (name !== 'default' && sanitizeIdent(name) !== kotlinName) aliases.push(`import app.${kotlinName} as ${sanitizeIdent(name)}`);
  };

  for (const e of symbols.exportDecls) {
    const name = e.name;
    const kotlinName = (registry?.get(fileRel)?.get(name) || localKt(name)) as string;
    emitDecl(name, e.node, kotlinName, name === 'default');
  }
  for (const d of symbols.decls) {
    emitDecl(d.name, d.node, localKt(d.name), false);
  }

  imports.push(...aliases);
  return { imports, decls, libraryTags, libraryExports, libraryMemberExports, motionExports, libraryIds, vskTargets, jsTsTargets, npmTargets };
}

export interface ProjectModuleCompile {
  /** export name -> compiled Kotlin reference, for the header import registry. */
  registryEntry: Map<string, ModuleExport>;
  /** Kotlin declarations for the whole module (exports and private decls). */
  kt: string;
}

export interface ProjectModuleCompileOptions {
  /** Kotlin package the declarations are emitted into. Default 'app'. */
  packageName?: string;
  /** Map a JS name to its Kotlin declaration name. Default `${slug}_${name}`
   *  (sanitized); npm entry modules pass the identity so exports keep their
   *  names inside `app.vmod.<pkg>`. */
  kotlinName?: (jsName: string) => string;
  /** Emit `import <pkg>.<decl> as <name>` self-aliases so the module's own
   *  top-level references resolve (declaration names are prefixed). */
  selfAlias?: boolean;
  /** Resolve an import binding to a Kotlin import line (npm module graph).
   *  Absent => warned and skipped (project modules have no graph yet). */
  resolveImport?: (source: string, local: string, imported: string) => { line?: string; error?: string } | null;
  /** Resolve a re-exported name to the target module's export (npm module
   *  graph). Absent => warned and skipped. */
  resolveReExport?: (source: string, local: string) => ModuleExport | null;
  /** Accept top-level expression statements (class-augmentation patterns in
   *  generated ESM). Default false. */
  allowExpressions?: boolean;
}

// Compile a standalone JS/TS module (pure scripts — no components) to Kotlin
// plus its export registry. Import/export/declaration statements only, plus
// (for npm packages) the class-augmentation patterns generated ESM uses.
export function compileProjectModule(source: string, fileRel: string, err: KtErrors, opts: ProjectModuleCompileOptions = {}): ProjectModuleCompile {
  const packageName = opts.packageName ?? 'app';
  const slug = slugFor(fileRel);
  const nameFor = opts.kotlinName ?? ((n: string): string => sanitizeIdent(`${slug}_${n}`));
  const { symbols, error } = collectHeaderSymbols(source);
  if (error) {
    err.warn(null, error);
    return { registryEntry: new Map(), kt: '' };
  }
  const j2k = new Js2Kt(err);
  const registryEntry = new Map<string, ModuleExport>();
  const decls: string[] = [];
  const importLines: string[] = [];
  const emitDecl = (node: JsNode, kotlinName: string, isDefaultExpr: boolean): void => {
    let kt: string;
    if (isDefaultExpr && node.type !== 'FunctionDeclaration' && node.type !== 'ClassDeclaration') {
      kt = `val ${kotlinName} = ${j2k.expr(node)};`;
    } else {
      kt = j2k.stmt(renameDeclared(node, kotlinName));
    }
    decls.push(kt);
  };

  for (const imp of symbols.imports) {
    const spec = importSource(imp);
    for (const s of importSpecifiers(imp)) {
      if (s.kind === 'namespace') {
        err.warn(imp, `namespace imports are not supported`);
        continue;
      }
      if (opts.resolveImport) {
        const r = opts.resolveImport(spec, s.local, s.name);
        if (r?.error) err.warn(imp, r.error);
        else if (r?.line) importLines.push(r.line);
      } else {
        err.warn(imp, `imports inside project modules are not supported yet: '${spec}'`);
      }
    }
  }

  let emitted: JsNode[] = [];
  if (opts.allowExpressions && symbols.program) {
    const t = transformModuleStatements(symbols.program);
    for (const e of t.errors) err.warn(null, e);
    emitted = t.statements.filter(
      (s) => s.type !== 'ImportDeclaration' && s.type !== 'ExportNamedDeclaration' && s.type !== 'ExportAllDeclaration' && s.type !== 'ExportDefaultDeclaration',
    );
  } else {
    for (const e of symbols.expressions) err.warn(e, `top-level expression statements are not supported in a module`);
    emitted = symbols.decls.map((d) => d.node);
  }

  for (const node of emitted) {
    if (node.type === 'VariableDeclaration' || node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      const name = declarationName(node);
      if (name === null) {
        err.warn(node, 'could not determine module declaration name');
        continue;
      }
      emitDecl(node, nameFor(name), false);
    } else if (node.type === 'ExpressionStatement') {
      err.warn(node, 'unsupported top-level expression in module');
    }
  }

  for (const e of symbols.exportDecls) {
    const exportName = e.name === 'default' ? 'default' : e.name;
    const kotlinName = nameFor(exportName);
    emitDecl(e.node, kotlinName, e.name === 'default');
    registryEntry.set(exportName, { pkg: packageName, name: kotlinName });
  }
  for (const a of symbols.aliasExports) {
    registryEntry.set(a.exported, { pkg: packageName, name: nameFor(a.local) });
  }
  const reAliasLines: string[] = [];
  for (const re of symbols.reExports) {
    if (re.exported === '*') {
      err.warn(null, `export * from '${re.source}' is not supported`);
      continue;
    }
    if (opts.resolveReExport) {
      const target = opts.resolveReExport(re.source, re.local);
      if (target) {
        registryEntry.set(re.exported, target);
        reAliasLines.push(`val ${sanitizeIdent(re.exported)} get() = ${target.pkg}.${target.name}`);
      } else {
        err.warn(null, `re-export '${re.exported}' from '${re.source}' could not be resolved`);
      }
    } else {
      err.warn(null, `re-exports inside project modules are not supported yet: '${re.exported}' from '${re.source}'`);
    }
  }

  if (opts.selfAlias) {
    const aliasFor = (jsName: string): void => {
      const ktName = nameFor(jsName);
      const plain = sanitizeIdent(jsName);
      if (plain !== ktName) importLines.push(`import ${packageName}.${ktName} as ${plain}`);
    };
    for (const e of symbols.exportDecls) aliasFor(e.name === 'default' ? 'default' : e.name);
    for (const d of symbols.decls) aliasFor(d.name);
  }

  if (err.errors.length > 0) return { registryEntry, kt: '' };
  return { registryEntry, kt: [...importLines, ...reAliasLines, ...decls].join('\n') };
}

function runCompile(source: string, filename: string, options: CompileOptions): CompileResult {
  const err = new KtErrors();
  const pkg = options.packageName ?? 'app';

  const ast = webParse(source, { filename });
  const ir = generateIR(ast, source);
  const decls = findComponentDecls(ast as unknown as JsNode);

  const customClasses = options.customClasses ?? new Map<string, ModifierParts>();
  const scoped = options.scopedCustomClasses ?? new Map<string, Map<string, ModifierParts>>();
  if (!options.customClasses) {
    const r = collectCustomCss([{ source, filename }]);
    for (const [k, v] of r.classes) customClasses.set(k, v);
    for (const [comp, own] of r.scoped) scoped.set(comp, own);
    for (const s of new Set(r.skipped)) err.note(s);
  }

  const out: string[] = [];

  // .vsklib library tag imports are collected per-file as tags are emitted
  // and spliced in right after the static import block.
  const libImports = new Set<string>();
  let fileLibraryTags: Map<string, VskLibTag> | undefined;
  const fileLibraryExports = new Map<string, LibExportSig>();
  const fileLibraryMemberExports = new Map<string, Map<string, LibExportSig>>();
  const fileMotionExports = new Set<string>();
  const fileLibraryIds = new Set<string>();
  const fileVskTargets = new Set<string>();
  const fileJsTsTargets = new Set<string>();
  const fileNpmTargets = new Set<string>();
  // Experimental-API opt-in markers required by the library tags this file
  // uses; emitted as `@file:OptIn(...)` before the package declaration.
  const fileOptIns = new Set<string>();

  if (options.fileRel && options.appDir) {
    const appDir = options.appDir;
    const importerRel = toPosix(options.fileRel).startsWith('/')
      ? toPosix(relative(appDir, options.fileRel))
      : toPosix(options.fileRel);
    const headerOut = emitVskHeader(source, importerRel, appDir, options.moduleRegistry, options.npmRegistry, options.moduleSlugs, options.projectModuleRegistry, options.vsklibRegistry, err, libImports);
    for (const l of headerOut.imports) libImports.add(l);
    if (headerOut.decls.length) out.push('', ...headerOut.decls);
    if (headerOut.libraryTags.size > 0) {
      fileLibraryTags = headerOut.libraryTags;
      for (const tag of headerOut.libraryTags.values()) {
        for (const marker of tag.optIn ?? []) fileOptIns.add(marker);
      }
    }
    for (const [name, sig] of headerOut.libraryExports) fileLibraryExports.set(name, sig);
    for (const [name, members] of headerOut.libraryMemberExports) fileLibraryMemberExports.set(name, members);
    for (const name of headerOut.motionExports) fileMotionExports.add(name);
    for (const id of headerOut.libraryIds) fileLibraryIds.add(id);
    for (const t of headerOut.vskTargets) fileVskTargets.add(t);
    for (const t of headerOut.jsTsTargets) fileJsTsTargets.add(t);
    for (const t of headerOut.npmTargets) fileNpmTargets.add(t);
  }
  out.unshift(`package ${pkg}`, '', IMPORTS, '');
  // `@file:` annotations must precede the package statement, so these are
  // unshifted after the package block.
  if (fileOptIns.size > 0) {
    out.unshift(`@file:OptIn(${[...fileOptIns].map((m) => `${m}::class`).join(', ')})`, '');
  }

  out.push('');

  for (const comp of ir.components) {
    const decl = decls.find((d) => d.name === comp.name);
    let propsParam = decl?.params[0] ?? null;
    if (propsParam?.type === 'Identifier' && propsParam.name === 'content') propsParam = null;
    let propsClass = '';
    let propsParamDefault = false;
    const destructuredNames: string[] = [];
    const bodyNode = (decl?.node.body as JsNode | undefined) ?? null;
    if (propsParam) {
      propsClass = generatePropsClass(comp.name, propsParam);
      if (!propsClass) {
        const callables = collectCallableNames(bodyNode);
        // ObjectPattern like `{ onReady }` — extract property names directly
        const opNames = objectPatternNames(propsParam);
        if (opNames.length > 0) {
          destructuredNames.push(...opNames);
          propsClass = generateInferredPropsClass(comp.name, opNames, callables);
        } else {
          const names = inferPropsFromUsage(bodyNode);
          propsClass = generateInferredPropsClass(comp.name, names, callables);
        }
      }
      propsParamDefault = true;
    }
    if (propsClass) out.push(propsClass);

    const tracked = collectTrackedNames(comp.body);
    // Kotlin storage type per tracked cell, from the init source text (no
    // regex): decimal ints stay Int, float/exponent literals become Double so
    // fractional writes (e.g. a scroll progress) keep their value. Everything
    // else stays untyped and keeps the plain `.value = rhs` write path.
    const cellTypes = new Map<string, string>();
    for (const node of comp.body) {
      if (node instanceof TrackDecl) {
        const t = inferTrackCellType(node.init);
        if (t) cellTypes.set(node.name, t);
      }
    }
    // Tracked cells referenced by element `ref={name}` bindings: these widen
    // to Any? (they hold a MotionRef at runtime) and their elements get the
    // rememberMotionRef/motionGraphics pipeline.
    const refCells = new Set<string>();
    walkIR(comp.body, (node) => {
      if (node instanceof StaticNode) {
        for (const c of node.children) {
          if (c instanceof DynamicBinding && c.kind === 'attribute' && c.target?.toLowerCase() === 'ref' && c.expression.raw) {
            const name = c.expression.raw.trim();
            if (tracked.has(name)) refCells.add(name);
          }
        }
      }
    });
    let resolvedClasses = customClasses;
    const own = scoped.get(comp.name);
    if (own) {
      resolvedClasses = new Map(customClasses);
      for (const [k, v] of own) resolvedClasses.set(k, v); // scoped wins over global
    }
    const em = new Emitter(err, tracked, options.componentsWithoutProps, resolvedClasses, options.imageResources, options.mediaResources, fileLibraryTags, libImports, options.componentNames, options.vsklibRegistry, fileLibraryExports, fileLibraryMemberExports, fileMotionExports, refCells, cellTypes);

    const propsArg = propsClass ? `props: ${comp.name}Props${propsParamDefault ? ` = ${comp.name}Props()` : ''}` : '';
    const params = [propsArg, 'content: @Composable () -> Unit = {}'].filter(Boolean).join(', ');
    out.push('@Composable', `fun ${comp.name}(${params}) {`);

    // Destructure ObjectPattern props into local vals
    if (destructuredNames.length > 0) {
      for (const name of destructuredNames) {
        out.push(`\tval ${ktIdent(name)} = props.${ktIdent(name)}`);
      }
    }

    const isRoot = comp.name === options.rootName;
    const bodyLines: string[] = [];
    if (isRoot) {
      out.push('\tColumn(');
      out.push('\t\tmodifier = Modifier.fillMaxSize(),');
      out.push('\t) {');
      for (const node of comp.body) bodyLines.push(...em.emitTopLevel(node, 2, 'column'));
      out.push(...bodyLines, '\t}', '}', '');
    } else {
      for (const node of comp.body) bodyLines.push(...em.emitTopLevel(node, 1));
      out.push(...bodyLines, '}', '');
    }
  }

  if (libImports.size > 0) {
    out.splice(4, 0, ...[...libImports].sort(), '');
  }

  return { kt: out.join('\n').trimEnd() + '\n', errors: err.errors, notes: err.notes, libraryIds: [...fileLibraryIds], vskTargets: [...fileVskTargets], jsTsTargets: [...fileJsTsTargets], npmTargets: [...fileNpmTargets] };
}

export function compileVsk(source: string, filename: string, options: CompileOptions = {}): string {
  return runCompile(source, filename, options).kt;
}

export function compileVskResult(source: string, filename: string, options: CompileOptions = {}): CompileResult {
  return runCompile(source, filename, options);
}

export function getCompileErrors(source: string, filename: string, options: CompileOptions = {}): string[] {
  return runCompile(source, filename, options).errors;
}
