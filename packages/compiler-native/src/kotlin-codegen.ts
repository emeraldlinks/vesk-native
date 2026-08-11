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
import { findComponentDecls, generatePropsClass, inferPropsFromUsage, generateInferredPropsClass } from '@compiler-native/props';
import { elementInfo, CONTAINER_TAGS } from '@compiler-native/elements';
import { layoutArgs, elementAxis } from '@compiler-native/layout-args';
import { classify, buildModifier, buildTextStyle, isHidden, isAbsolute, RADIUS } from '@compiler-native/tailwind';
import type { ModifierParts } from '@compiler-native/tailwind';
import { parseCssClasses } from '@compiler-native/css';
import { walkIR } from '@compiler-native/walk-ir';

export interface CompileOptions {
  packageName?: string;
  componentsWithoutProps?: Set<string>;
  customClasses?: Map<string, ModifierParts>;
  scopedCustomClasses?: Map<string, Map<string, ModifierParts>>;
  imageResources?: Map<string, string>;
  mediaResources?: Map<string, string>;
  rClass?: string;
  rootName?: string;
}

const CLASS_ATTRS = new Set(['class', 'className']);

// Padding classes are lifted out of the Button modifier and turned into
// contentPadding so the pill surface keeps its shape (a modifier padding on a
// Button would inset the surface and leave a bare background ring).
const BTN_PAD_RE = /^p(?:[trblxy])?-(\d+)$/;

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

// <img src="..."> -> Image(painter = painterResource(R.drawable.x)) for bundled
// assets, Image(bitmap = veskFileImage(path)) for runtime file paths.
function imageLines(node: StaticNode, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null, boxScope = false): string[] {
  const classes = em.classList(node);
  if (isHidden(classes, em.customClasses)) return [];
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const parts = classify(classes, em.customClasses, parentAxis === 'row' ? 'row' : 'column');
  if (parentAxis === null) stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  modifier = prependModifier(modifier, extraModifier);

  let painterArg: string | null = null;
  let bitmapArg: string | null = null;
  const staticSrc = node.attributes.find((a) => a.name === 'src')?.value;
  const dynSrc = em.dynamicAttrs(node).get('src');
  if (staticSrc !== undefined && staticSrc.length > 0) {
    if (isFileImageSrc(staticSrc)) {
      bitmapArg = `veskFileImage(${em.ktString(staticSrc)})`;
    } else {
      const res = em.imageResources?.get(staticSrc);
      if (res) {
        painterArg = `painterResource(${em.rClass}.drawable.${res})`;
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
            const src = node.attributes.find((a) => a.name === 'src')?.value;
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
// referenced via android.resource:// URIs; device paths/content URIs stream at
// runtime. A video without explicit sizing gets a 16:9 default.
function mediaLines(node: StaticNode, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null, boxScope = false): string[] {
  const classes = em.classList(node);
  if (isHidden(classes, em.customClasses)) return [];
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  const parts = classify(classes, em.customClasses, parentAxis === 'row' ? 'row' : 'column');
  if (parentAxis === null) stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  if (node.tag === 'video' && parts.size.length === 0) modifier = `${modifier ? modifier + '.' : ''}fillMaxWidth().aspectRatio(16f / 9f)`;
  modifier = prependModifier(modifier, extraModifier);

  const has = (name: string) => node.attributes.some((a) => a.name === name);
  let urlArg: string | null = null;
  const staticSrc = node.attributes.find((a) => a.name === 'src')?.value;
  const dynSrc = em.dynamicAttrs(node).get('src');
  if (staticSrc !== undefined && staticSrc.length > 0) {
    if (isFileImageSrc(staticSrc)) {
      urlArg = em.ktString(staticSrc);
    } else {
      const res = em.mediaResources?.get(staticSrc);
      if (res) {
        urlArg = `"android.resource://${em.rClass.replace(/\.R$/, '')}/" + ${em.rClass}.raw.${res}`;
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
      const onPick = attrs.get('onPick');
      args.push(`${padIn}onPick = ${onPick ? em.j2k.expr(onPick).trimStart() : '{ _ -> }'},`);
      break;
    }
    case 'VeskCamera': {
      const onDone = attrs.get('onDone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _ -> }'},`);
      if (has('video')) args.push(`${padIn}video = true,`);
      break;
    }
    case 'VeskRecorder': {
      const onDone = attrs.get('onDone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _ -> }'},`);
      break;
    }
    case 'VeskFileInput': {
      const onDone = attrs.get('onDone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _, _ -> }'},`);
      const mime = textAttr('mime', null);
      if (mime) args.push(`${padIn}mime = ${mime},`);
      break;
    }
    case 'VeskNotification': {
      args.push(`${padIn}title = ${textAttr('title', '""')},`);
      args.push(`${padIn}text = ${textAttr('text', '""')},`);
      const onTap = attrs.get('onTap');
      if (onTap) args.push(`${padIn}onTap = ${em.j2k.expr(onTap).trimStart()},`);
      break;
    }
    case 'VeskCopyToClipboard': {
      args.push(`${padIn}value = ${textAttr('value', '""')},`);
      const onDone = attrs.get('onDone');
      args.push(`${padIn}onDone = ${onDone ? em.j2k.expr(onDone).trimStart() : '{ _ -> }'},`);
      break;
    }
    case 'VeskShareText': {
      args.push(`${padIn}text = ${textAttr('text', '""')},`);
      const onDone = attrs.get('onDone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskShareFile': {
      const path = textAttr('path', null);
      if (path) args.push(`${padIn}path = ${path},`);
      const mime = textAttr('mime', null);
      if (mime) args.push(`${padIn}mime = ${mime},`);
      const onDone = attrs.get('onDone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskVibrate': {
      const duration = intAttr('duration', null);
      if (duration) args.push(`${padIn}duration = ${duration},`);
      const onDone = attrs.get('onDone');
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
      const onDone = attrs.get('onDone');
      if (onDone) args.push(`${padIn}onDone = ${em.j2k.expr(onDone).trimStart()},`);
      break;
    }
    case 'VeskKeepAwake': {
      // Boolean action: <keep-awake value="true">.
      const staticVal = em.staticAttr(node, 'value');
      const value = staticVal !== null ? (staticVal === 'false' ? 'false' : 'true') : 'true';
      args.push(`${padIn}value = ${value},`);
      const onDone = attrs.get('onDone');
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
      const onDone = attrs.get('onDone');
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
  const onClick = attrs.get('onClick');
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
  lines.push(`${padIn}onClick = ${onClickKt},`);
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
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.res.painterResource
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
  customClasses?: Map<string, ModifierParts>;
  imageResources?: Map<string, string>;
  mediaResources?: Map<string, string>;
  rClass: string;

  constructor(err: KtErrors, tracked: Map<string, TrackedInfo>, componentsWithoutProps?: Set<string>, customClasses?: Map<string, ModifierParts>, imageResources?: Map<string, string>, mediaResources?: Map<string, string>, rClass = 'app.R') {
    this.err = err;
    this.j2k = new Js2Kt(err);
    this.tracked = tracked;
    this.componentsWithoutProps = componentsWithoutProps;
    this.customClasses = customClasses;
    this.imageResources = imageResources;
    this.mediaResources = mediaResources;
    this.rClass = rClass;
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
    const attr = node.attributes.find((a) => CLASS_ATTRS.has(a.name));
    if (!attr) return [];
    return attr.value.split(/\s+/).filter(Boolean);
  }

  staticAttr(node: StaticNode, name: string): string | null {
    const attr = node.attributes.find((a) => a.name === name);
    return attr ? attr.value : null;
  }

  bindRefVar(node: StaticNode): string | null {
    const ref = node.children.find(
      (c) => c instanceof DynamicBinding && c.kind === 'attribute' && c.target === 'ref'
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
            out.set(child.target, exprAst);
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

  trackDecl(node: TrackDecl): string {
    const init = this.parseTrackInit(node.init);
    const typed = init.trim() === 'null' ? 'mutableStateOf<String?>(null)' : `mutableStateOf(${init})`;
    if (node.rawName) {
      return `val ${node.name} = remember { ${typed} }\n\tval ${node.rawName} = ${node.name}`;
    }
    return `val ${node.name} = remember { ${typed} }`;
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

function modifierFor(classes: string[], em: Emitter, parentAxis: 'column' | 'row' | null, fillWidth: boolean, extraModifier: string | null = null, boxScope = false): string | null {
  const parts = classify(classes, em.customClasses, parentAxis === 'row' ? 'row' : 'column');
  if (parentAxis === null) stripScopeMods(parts);
  if (!boxScope) parts.posMod = [];
  let modifier = buildModifier(parts);
  if (fillWidth) modifier = prependFill(modifier);
  return prependModifier(modifier, extraModifier);
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
  const draggable = node.attributes.some((a) => a.name === 'draggable');
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
  const pad = '\t'.repeat(level);
  const padIn = '\t'.repeat(level + 1);
  // absolute/fixed elements are out of flow: shrink-to-fit, never block-fill
  const fillWidth = fillMaxWidth(classes, node.tag, parentAxis) && !isAbsolute(classes);

  if (info.kind === 'image') {
    return imageLines(node, em, level, parentAxis, extraModifier, boxScope);
  }

  if (info.kind === 'video' || info.kind === 'audio') {
    return mediaLines(node, em, level, parentAxis, extraModifier, boxScope);
  }

  if (info.kind === 'text') {
    const content = textContent(node.children, em);
    const nonText = node.children.filter(
      (c) => !(c instanceof TextNode) && !(c instanceof DynamicBinding)
    );
    if (nonText.length === 0) {
      return splitLines(makeTextCall(content, classes, level, em, fillWidth, parentAxis, extraModifier, null, flowParent, boxScope));
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
    return lines;
  }

  if (info.kind === 'button') {
    return emitButton(node, classes, attrs, em, level, parentAxis, extraModifier, boxScope);
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
  const containerParts = classify(classes, em.customClasses, axis);
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
    return gridLines(node, em, level, pad, padIn, modifier, gridInfo, divide);
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
    return lines;
  }
  if (argLines.length === 0) {
    lines.push(callPad + `${composable} {`);
    lines.push(...childrenLines);
    lines.push(pad + '}');
    return lines;
  }
  lines.push(callPad + `${composable}(`);
  lines.push(...argLines);
  lines.push(pad + ') {');
  lines.push(...childrenLines);
  lines.push(pad + '}');
  return lines;
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

function emitChild(child: IRNode, em: Emitter, level: number, parentAxis: 'column' | 'row' | null, extraModifier: string | null = null, flowParent = false, boxScope = false): string[] {
  const pad = '\t'.repeat(level);

  if (child instanceof StaticNode) {
    return emitElement(child, em, level, parentAxis, extraModifier, flowParent, boxScope);
  }
  if (child instanceof TextNode) {
    return splitLines(makeTextCall(em.ktString(child.value), [], level, em, false, parentAxis, extraModifier, null, flowParent, boxScope));
  }
  if (child instanceof DynamicBinding) {
    if (child.kind === 'text') return splitLines(makeTextCall(dynamicText(em.exprOf(child.expression)), [], level, em, false, parentAxis, extraModifier, null, flowParent, boxScope));
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
    out.push(pad + `while (truthy(${cond})) {`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof SwitchBlock) {
    const disc = em.exprOf(child.discriminant);
    const out: string[] = [];
    out.push(pad + `when (${disc}) {`);
    for (const c of child.cases) {
      const test = c.test ? em.exprOf(c.test) : null;
      out.push(pad + `\t${test === null ? 'else' : test} -> {`);
      for (const n of c.body) out.push(...emitChild(n, em, level + 2, parentAxis, extraModifier, flowParent, boxScope));
      out.push(pad + '\t}');
    }
    out.push(pad + `}`);
    return out;
  }
  if (child instanceof TryCatch) {
    const catchParam = child.catchParamName ?? 'e';
    const out: string[] = [];
    out.push(pad + `try {`);
    for (const n of child.bodyTemplate) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
    out.push(pad + `} catch (${catchParam}: Exception) {`);
    for (const n of child.catchBody) out.push(...emitChild(n, em, level + 1, parentAxis, extraModifier, flowParent, boxScope));
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
      out.push(pad + `for (${name} in ${cond}) {`);
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
  out.push(`package ${pkg}`, '', IMPORTS, '');

  for (const comp of ir.components) {
    const decl = decls.find((d) => d.name === comp.name);
    let propsParam = decl?.params[0] ?? null;
    if (propsParam?.type === 'Identifier' && propsParam.name === 'content') propsParam = null;
    let propsClass = '';
    let propsParamDefault = false;
    if (propsParam) {
      propsClass = generatePropsClass(comp.name, propsParam);
      if (!propsClass) {
        const names = inferPropsFromUsage((decl?.node.body as JsNode | undefined) ?? null);
        propsClass = generateInferredPropsClass(comp.name, names);
      }
      propsParamDefault = true;
    }
    if (propsClass) out.push(propsClass);

    const tracked = collectTrackedNames(comp.body);
    let resolvedClasses = customClasses;
    const own = scoped.get(comp.name);
    if (own) {
      resolvedClasses = new Map(customClasses);
      for (const [k, v] of own) resolvedClasses.set(k, v); // scoped wins over global
    }
    const em = new Emitter(err, tracked, options.componentsWithoutProps, resolvedClasses, options.imageResources, options.mediaResources, options.rClass);

    const propsArg = propsClass ? `props: ${comp.name}Props${propsParamDefault ? ` = ${comp.name}Props()` : ''}` : '';
    const params = [propsArg, 'content: @Composable () -> Unit = {}'].filter(Boolean).join(', ');
    out.push('@Composable', `fun ${comp.name}(${params}) {`);

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

  return { kt: out.join('\n').trimEnd() + '\n', errors: err.errors, notes: err.notes };
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
