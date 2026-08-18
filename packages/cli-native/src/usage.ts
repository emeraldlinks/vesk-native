import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse, generateIR } from '@vesk/compiler';
import { StaticNode } from '@vesk/compiler/src/ir';
import { walkIR } from '@compiler-native/walk-ir';
import { findComponentDecls } from '@compiler-native/props';
import type { JsNode } from '@compiler-native/js2kt';
import { collectVskFiles } from '@cli-native/constants';
import { RUNTIME_HELPERS } from '@cli-native/runtime-templates';

const HELPER_FN_NAMES: Record<string, string> = {
  rememberDeviceApi: 'veskDeviceApi',
  VeskPhotoPicker: 'veskDeviceApi',
  VeskCamera: 'veskDeviceApi',
  VeskRecorder: 'veskDeviceApi',
  VeskFileInput: 'veskDeviceApi',
  VeskNotification: 'veskDeviceApi',
  VeskBatteryStatus: 'veskDeviceApi',
  VeskNetworkStatus: 'veskDeviceApi',
  VeskLocation: 'veskDeviceApi',
  VeskApps: 'veskDeviceApi',
  VeskContacts: 'veskDeviceApi',
  VeskCallLog: 'veskDeviceApi',
  VeskMessages: 'veskDeviceApi',
  VeskAccounts: 'veskDeviceApi',
  VeskClipboard: 'veskDeviceApi',
  VeskCopyToClipboard: 'veskDeviceApi',
  VeskVibrate: 'veskDeviceApi',
  VeskTorch: 'veskDeviceApi',
  VeskScreenshot: 'veskDeviceApi',
  VeskShareText: 'veskDeviceApi',
  VeskShareFile: 'veskDeviceApi',
  VeskBiometricAuth: 'veskDeviceApi',
  VeskBluetooth: 'veskDeviceApi',
  VeskBluetoothToggle: 'veskDeviceApi',
  VeskBluetoothScan: 'veskDeviceApi',
  VeskScreenRecord: 'veskDeviceApi',
  VeskQrCode: 'veskQr',
  VeskQrScanner: 'veskQr',
  VeskVolume: 'veskDeviceApi',
  VeskSetVolume: 'veskDeviceApi',
  VeskBrightness: 'veskDeviceApi',
  VeskKeepAwake: 'veskDeviceApi',
  VeskOrientation: 'veskDeviceApi',
  VeskDeviceInfo: 'veskDeviceApi',
  VeskStorage: 'veskDeviceApi',
  VeskSensor: 'veskDeviceApi',
  VeskToast: 'veskDeviceApi',
  VeskSound: 'veskDeviceApi',
  VeskWallpaper: 'veskDeviceApi',
  VeskCalendar: 'veskDeviceApi',
  VeskNfc: 'veskDeviceApi',
  VeskSim: 'veskDeviceApi',
  VeskDial: 'veskDeviceApi',
  VeskSms: 'veskDeviceApi',
  VeskEmail: 'veskDeviceApi',
  VeskLink: 'veskDeviceApi',
  VeskMap: 'veskDeviceApi',
  VeskAlarm: 'veskDeviceApi',
  VeskOpenSettings: 'veskDeviceApi',
  VeskOpenApp: 'veskDeviceApi',
  VeskSpeak: 'veskDeviceApi',
  VeskWebSocket: 'veskWebSocket',
  VeskEventSource: 'veskEventSource',
  VeskDragData: 'veskDragDrop',
  veskDraggable: 'veskDragDrop',
  veskDropTarget: 'veskDragDrop',
  setTimeout: 'VeskTimers',
  setInterval: 'VeskTimers',
  clearTimeout: 'VeskTimers',
  clearInterval: 'VeskTimers',
  veskAppSetup: 'VeskAppContext',
  fetch: 'VeskFetch',
  localGetItem: 'VeskWebStorage',
  localSetItem: 'VeskWebStorage',
  localRemoveItem: 'VeskWebStorage',
  localClear: 'VeskWebStorage',
  localKey: 'VeskWebStorage',
  localLength: 'VeskWebStorage',
  sessionGetItem: 'VeskWebStorage',
  sessionSetItem: 'VeskWebStorage',
  sessionRemoveItem: 'VeskWebStorage',
  sessionClear: 'VeskWebStorage',
  sessionKey: 'VeskWebStorage',
  sessionLength: 'VeskWebStorage',
  openDatabase: 'VeskSqlite',
  jsSafe: 'jsSafe',
  signUp: 'VeskAuth',
  signIn: 'VeskAuth',
  signOut: 'VeskAuth',
  currentUser: 'VeskAuth',
  isSignedIn: 'VeskAuth',
  count: 'JsConsole',
  countReset: 'JsConsole',
  time: 'JsConsole',
  timeEnd: 'JsConsole',
  motionAnimate: 'motionCore',
  motionSpring: 'motionCore',
  motionTween: 'motionCore',
  motionEase: 'motionCore',
  motionCubicBezier: 'motionCore',
  motionSteps: 'motionCore',
  motionReverseEasing: 'motionCore',
  motionMirrorEasing: 'motionCore',
  motionDelay: 'motionCore',
  rememberMotionRef: 'motionCore',
  motionGraphics: 'motionCore',
  motionStagger: 'motionStagger',
  motionInView: 'motionInView',
  motionScroll: 'motionScroll',
  motionDrag: 'motionDrag',
  motionHover: 'motionHover',
  motionPress: 'motionPress',
  motionFocus: 'motionFocus',
};

// Whitespace-tolerant token scan: every identifier immediately followed by
// '(' (optional whitespace between) counts as a call. No regex — this is a
// plain character scan, so formatting/whitespace variations can't break it.
function scanKtCalls(src: string): Set<string> {
  const calls = new Set<string>();
  const isIdent = (ch: number): boolean =>
    (ch >= 97 && ch <= 122) || (ch >= 65 && ch <= 90) || (ch >= 48 && ch <= 57) || ch === 95;
  let i = 0;
  while (i < src.length) {
    const c = src.charCodeAt(i);
    if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95) {
      const start = i;
      while (i < src.length && isIdent(src.charCodeAt(i))) i++;
      const ident = src.slice(start, i);
      let j = i;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n' || src[j] === '\r')) j++;
      if (src[j] === '(') calls.add(ident);
    } else {
      i++;
    }
  }
  return calls;
}

export function collectRuntimeUsage(appDir: string): Set<string> {
  const used = new Set<string>();
  // MainActivity.kt (app module) unconditionally references VeskDeviceSession
  // for notification-tap handling, so its helper is always emitted.
  used.add('veskDeviceCore');
  // Generated page Kotlin lives in the :shared module — portable pages land in
  // commonMain, android-only pages (and the runtime actuals) in androidMain.
  // The usage scan follows them both.
  const scanDirs = [
    join(dirname(appDir), 'shared', 'src', 'androidMain', 'kotlin', 'app'),
    join(dirname(appDir), 'shared', 'src', 'commonMain', 'kotlin', 'app'),
  ];
  for (const scanDir of scanDirs) {
    if (!existsSync(scanDir)) continue;
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.kt') && e.name !== 'Runtime.kt') files.push(p);
      }
    };
    walk(scanDir);
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const call of scanKtCalls(src)) {
        const unit = HELPER_FN_NAMES[call] ?? call;
        if (RUNTIME_HELPERS[unit]) used.add(unit);
      }
    }
  }
  return used;
}

const DEVICE_APIS = new Set([
  'pickImage',
  'pickAudio',
  'pickFile',
  'capturePhoto',
  'captureVideo',
  'startRecording',
  'stopRecording',
  'notify',
  'getBattery',
  'refreshNetwork',
  'getLocation',
  'listApps',
  'listContacts',
  'listCallLogs',
  'listMessages',
  'listAccounts',
  'readClipboard',
  'copyToClipboard',
  'vibrate',
  'toggleTorch',
  'captureScreenshot',
  'shareText',
  'shareFile',
  'listFiles',
  'writeFile',
  'readFile',
  'deleteFile',
  'checkBiometrics',
  'authenticate',
  'refreshBluetooth',
  'toggleBluetooth',
  'scanBluetooth',
  'generateQrCode',
  'scanQr',
  'startScreenRecord',
  'stopScreenRecord',
  'refreshVolume',
  'setVolume',
  'setRingerMode',
  'setScreenBrightness',
  'resetScreenBrightness',
  'setKeepAwake',
  'refreshStorage',
  'lockOrientation',
  'readSensor',
  'dial',
  'sendSms',
  'sendEmail',
  'openUrl',
  'openMaps',
  'openSettings',
  'setAlarm',
  'openApp',
  'toast',
  'playSound',
  'setWallpaper',
  'listCalendarEvents',
  'refreshNfc',
  'refreshTelephony',
  'refreshDeviceInfo',
  'speak',
]);

// Manifest permissions a device API needs. Loose (normal) permissions are
// declared unconditionally; the rest are added here so the manifest only
// carries what the app actually uses, and runtime grants happen on first use.
export const API_PERMISSIONS: Record<string, string[]> = {
  startRecording: ['android.permission.RECORD_AUDIO'],
  scanQr: ['android.permission.CAMERA'],
  getLocation: ['android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION'],
  listContacts: ['android.permission.READ_CONTACTS'],
  listCallLogs: ['android.permission.READ_CALL_LOG'],
  listMessages: ['android.permission.READ_SMS'],
  listAccounts: ['android.permission.GET_ACCOUNTS'],
  refreshNetwork: ['android.permission.ACCESS_NETWORK_STATE', 'android.permission.ACCESS_WIFI_STATE'],
  vibrate: ['android.permission.VIBRATE'],
  setVolume: ['android.permission.MODIFY_AUDIO_SETTINGS'],
  setRingerMode: ['android.permission.MODIFY_AUDIO_SETTINGS'],
  setWallpaper: ['android.permission.SET_WALLPAPER'],
  refreshBluetooth: ['android.permission.BLUETOOTH_CONNECT', 'android.permission.BLUETOOTH', 'android.permission.BLUETOOTH_ADMIN'],
  toggleBluetooth: ['android.permission.BLUETOOTH_CONNECT', 'android.permission.BLUETOOTH', 'android.permission.BLUETOOTH_ADMIN'],
  scanBluetooth: ['android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT'],
  listCalendarEvents: ['android.permission.READ_CALENDAR'],
  checkBiometrics: ['android.permission.USE_BIOMETRIC'],
  authenticate: ['android.permission.USE_BIOMETRIC'],
  startScreenRecord: ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION'],
  fetch: ['android.permission.INTERNET'],
  WebSocket: ['android.permission.INTERNET'],
  EventSource: ['android.permission.INTERNET'],
};

// Permissions that only exist for a bounded SDK range (legacy Bluetooth APIs).
export const MAX_SDK_PERMS: Record<string, string> = {
  'android.permission.READ_EXTERNAL_STORAGE': '32',
  'android.permission.BLUETOOTH': '30',
  'android.permission.BLUETOOTH_ADMIN': '30',
};

// Declarative device elements (option C) need the same manifest surface as
// their script counterparts: <camera> captures, <recorder> records,
// <notification> posts notifications. Tag usage feeds the manifest scan too.
const DEVICE_ELEMENT_APIS: Record<string, Set<string>> = {
  'photo-picker': new Set(),
  camera: new Set(['capturePhoto', 'captureVideo']),
  recorder: new Set(['startRecording', 'stopRecording']),
  'file-input': new Set(),
  notification: new Set(['notify']),
  'battery-status': new Set(['getBattery']),
  'network-status': new Set(['refreshNetwork']),
  location: new Set(['getLocation']),
  apps: new Set(['listApps']),
  contacts: new Set(['listContacts']),
  'call-log': new Set(['listCallLogs']),
  messages: new Set(['listMessages']),
  accounts: new Set(['listAccounts']),
  clipboard: new Set(['readClipboard']),
  'copy-to-clipboard': new Set(['copyToClipboard']),
  vibrate: new Set(['vibrate']),
  torch: new Set(['toggleTorch']),
  screenshot: new Set(['captureScreenshot']),
  'share-text': new Set(['shareText']),
  'share-file': new Set(['shareFile']),
  'biometric-auth': new Set(['checkBiometrics', 'authenticate']),
  bluetooth: new Set(['refreshBluetooth']),
  'bluetooth-toggle': new Set(['toggleBluetooth', 'refreshBluetooth']),
  'bluetooth-scan': new Set(['scanBluetooth']),
  'screen-record': new Set(['startScreenRecord', 'stopScreenRecord']),
  'qr-code': new Set(['generateQrCode']),
  'qr-scanner': new Set(['scanQr']),
  volume: new Set(['refreshVolume']),
  'set-volume': new Set(['setVolume', 'refreshVolume']),
  brightness: new Set(['setScreenBrightness', 'resetScreenBrightness']),
  'keep-awake': new Set(['setKeepAwake']),
  orientation: new Set(['lockOrientation']),
  'device-info': new Set(['refreshDeviceInfo']),
  'storage-status': new Set(['refreshStorage']),
  sensor: new Set(['readSensor']),
  toast: new Set(['toast']),
  sound: new Set(['playSound']),
  wallpaper: new Set(['setWallpaper']),
  calendar: new Set(['listCalendarEvents']),
  nfc: new Set(['refreshNfc']),
  sim: new Set(['refreshTelephony']),
  dial: new Set(['dial']),
  sms: new Set(['sendSms']),
  email: new Set(['sendEmail']),
  link: new Set(['openUrl']),
  map: new Set(['openMaps']),
  alarm: new Set(['setAlarm']),
  'open-settings': new Set(['openSettings']),
  'open-app': new Set(['openApp']),
  speak: new Set(['speak']),
};

// Scan every .vsk script for `device.<api>()` calls and device element tags
// (AST + IR walk, no regex) so the manifest can declare what the native
// surface needs: RECORD_AUDIO when a page records, a FileProvider when a page
// captures camera output, POST_NOTIFICATIONS when a page posts notifications.
export function collectDeviceApiUsage(appDir: string): Set<string> {
  const used = new Set<string>();
  const walk = (node: JsNode): void => {
    if (node.type === 'CallExpression') {
      const callee = node.callee as JsNode | null;
      if (callee?.type === 'MemberExpression') {
        const obj = callee.object as JsNode | null;
        const prop = callee.property as JsNode | null;
        if (obj?.type === 'Identifier' && obj.name === 'device') {
          const api = prop?.type === 'Identifier' ? (prop.name as string) : null;
          if (api && DEVICE_APIS.has(api)) used.add(api);
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type') continue;
      const v = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(v)) {
        for (const item of v) if (item && typeof item === 'object') walk(item as JsNode);
      } else if (v && typeof v === 'object') {
        walk(v as JsNode);
      }
    }
  };
  for (const f of collectVskFiles(appDir)) {
    const source = readFileSync(f, 'utf8');
    const ast = parse(source) as unknown as JsNode;
    for (const d of findComponentDecls(ast)) walk(d.node);
    const root = generateIR(ast, source);
    walkIR(root.components.flatMap((c) => c.body), (node) => {
      if (node instanceof StaticNode) {
        const apis = DEVICE_ELEMENT_APIS[node.tag];
        if (apis) for (const api of apis) used.add(api);
      }
    });
  }
  return used;
}

// Browser APIs mapped by the native runtime (Web Storage, fetch, sqlite,
// auth/sessions). Scanning the AST for these decides their manifest needs
// (INTERNET for fetch) the same way device-API usage drives device
// permissions — the compiler maps them, never a JS shim.
const BROWSER_APIS = new Set([
  'fetch', 'localStorage', 'sessionStorage', 'openSqlite',
  'signUp', 'signIn', 'signOut', 'currentUser', 'isSignedIn',
  'WebSocket', 'EventSource',
]);

// iOS Info.plist usage keys derived from device-API usage, the same way
// API_PERMISSIONS derives Android manifest permissions. Every entry is the
// API's Android-permission -> Apple usage-key counterpart, key names and
// purposes verified against Apple's Info.plist key reference / protected
// resources docs (never invented):
//   RECORD_AUDIO                 -> NSMicrophoneUsageDescription
//   CAMERA                       -> NSCameraUsageDescription
//   ACCESS_*_LOCATION (foreground)-> NSLocationWhenInUseUsageDescription
//   READ_CONTACTS                -> NSContactsUsageDescription
//   READ_CALENDAR                -> NSCalendarsUsageDescription
//   USE_BIOMETRIC                -> NSFaceIDUsageDescription
//   BLUETOOTH_*                  -> NSBluetoothAlwaysUsageDescription
// capturePhoto/captureVideo need NSCameraUsageDescription on iOS even though
// Android grants them no CAMERA permission: UIImagePickerController refuses
// to open without the key.
// Fail closed: API_PERMISSIONS entries with NO Apple iOS usage-key counterpart
// stay unmapped so no bogus key is emitted — READ_CALL_LOG (iOS exposes no
// call-history API), READ_SMS / GET_ACCOUNTS (no SMS/account-read API),
// SET_WALLPAPER (no wallpaper API), VIBRATE / MODIFY_AUDIO_SETTINGS /
// ACCESS_NETWORK_STATE / ACCESS_WIFI_STATE / INTERNET (no privacy prompt on
// iOS), and FOREGROUND_SERVICE_MEDIA_PROJECTION (ReplayKit shows its own
// system dialog; only mic capture adds a key — hence startScreenRecord ->
// NSMicrophoneUsageDescription).
const DEVICE_API_IOS_USAGE: Record<string, string> = {
  capturePhoto: 'NSCameraUsageDescription',
  captureVideo: 'NSCameraUsageDescription',
  scanQr: 'NSCameraUsageDescription',
  startRecording: 'NSMicrophoneUsageDescription',
  startScreenRecord: 'NSMicrophoneUsageDescription',
  getLocation: 'NSLocationWhenInUseUsageDescription',
  listContacts: 'NSContactsUsageDescription',
  listCalendarEvents: 'NSCalendarsUsageDescription',
  checkBiometrics: 'NSFaceIDUsageDescription',
  authenticate: 'NSFaceIDUsageDescription',
  refreshBluetooth: 'NSBluetoothAlwaysUsageDescription',
  toggleBluetooth: 'NSBluetoothAlwaysUsageDescription',
  scanBluetooth: 'NSBluetoothAlwaysUsageDescription',
};

const IOS_USAGE_STRINGS: Record<string, string> = {
  NSCameraUsageDescription: 'Take photos, record video or scan QR codes on pages in this app.',
  NSMicrophoneUsageDescription: 'Record audio or screen recordings on pages in this app.',
  NSLocationWhenInUseUsageDescription: 'Show your location on pages in this app.',
  NSContactsUsageDescription: 'List contacts you choose to share with a page in this app.',
  NSCalendarsUsageDescription: 'Show calendar events on pages in this app.',
  NSFaceIDUsageDescription: 'Unlock secure actions on pages in this app with Face ID.',
  NSBluetoothAlwaysUsageDescription: 'Connect to nearby devices from pages in this app.',
};

// The usage-key entries for the iOS Info.plist, pruned to what the app's
// device-API calls actually need (same rule as API_PERMISSIONS: never emit a
// key "just in case"). Only keys with a purpose string are emitted — a key
// that cannot be verified is never filled in.
export function iosUsageStrings(deviceApis: Set<string>): Map<string, string> {
  const usage = new Map<string, string>();
  for (const api of deviceApis) {
    const key = DEVICE_API_IOS_USAGE[api];
    if (!key) continue;
    const purpose = IOS_USAGE_STRINGS[key];
    if (purpose) usage.set(key, purpose);
  }
  return usage;
}

export function collectBrowserApiUsage(appDir: string): Set<string> {
  const used = new Set<string>();
  const walk = (node: JsNode): void => {
    if (node.type === 'CallExpression') {
      const callee = node.callee as JsNode | null;
      const api = callee?.type === 'Identifier' ? (callee.name as string) : null;
      if (api && BROWSER_APIS.has(api)) used.add(api);
    }
    if (node.type === 'MemberExpression') {
      const obj = node.object as JsNode | null;
      if (obj?.type === 'Identifier' && (obj.name === 'localStorage' || obj.name === 'sessionStorage')) used.add(obj.name);
    }
    if (node.type === 'NewExpression') {
      const callee = node.callee as JsNode | null;
      const api = callee?.type === 'Identifier' ? (callee.name as string) : null;
      if (api && BROWSER_APIS.has(api)) used.add(api);
    }
    for (const key of Object.keys(node)) {
      if (key === 'type') continue;
      const v = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(v)) {
        for (const item of v) if (item && typeof item === 'object') walk(item as JsNode);
      } else if (v && typeof v === 'object') {
        walk(v as JsNode);
      }
    }
  };
  for (const f of collectVskFiles(appDir)) {
    const source = readFileSync(f, 'utf8');
    const ast = parse(source) as unknown as JsNode;
    for (const d of findComponentDecls(ast)) walk(d.node);
  }
  return used;
}

// Real bodies for usage-pruned device APIs. The generator inlines them into
// veskDeviceApi only when the corresponding device API is actually called;
// otherwise a stub replaces the body and the framework keeps the heavy
// dependency (androidx.biometric, zxing, CameraX + ML Kit) out of the build.
