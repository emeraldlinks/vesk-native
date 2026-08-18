// Native-to-web device API shim for `vesk dev --web` (Phase 2 of
// plans/vesk-native-preview-hmr.md). The web compiler does nothing about
// device.* — page code calls `rememberDeviceApi()` bare, so this classic
// script must exist BEFORE the client bundle and define it as a global.
//
// Rules (from the plan's mapping table):
//   - Map to a REAL browser API only where a genuine Web API exists
//     (Notification, File input, MediaRecorder, clipboard, vibrate, Web
//     Share, speechSynthesis, geolocation, Battery Status, Network
//     Information, Origin Private File System, URL schemes).
//   - Everything unmapped: console.warn no-op with a sensible default — never
//     throw, never crash the page.
//
// Dev-only tooling: this script ships nowhere in a built app.
export const WEB_PREVIEW_SHIM = `
(function () {
  'use strict';
  var warn = function (name) {
    console.warn('[vesk preview] device.' + name + ' has no browser equivalent here — no-op');
  };
  var pick = function (accept, capture, setStateKey, onDone, withName) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = function () {
      var file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) { if (onDone) onDone(null); return; }
      var uri = URL.createObjectURL(file);
      if (setStateKey) device[setStateKey] = uri;
      if (onDone) onDone(withName ? uri : uri, withName ? file.name : undefined);
    };
    input.click();
  };
  var opfs = function () {
    return navigator.storage && navigator.storage.getDirectory ? navigator.storage.getDirectory() : null;
  };
  var unwrapHandle = function (h) { return h instanceof Promise ? h : Promise.resolve(h); };
  // Reactive state slots: the preview server bridges the tree-shaken runtime
  // namespace to globalThis.__veskRuntime (track is always in its used set),
  // so reads of device.<slot> in page code go through cell.get() — they
  // subscribe to effects and re-render like Compose snapshot state on native.
  // Cells are created lazily on first access because the runtime module loads
  // after this classic script.
  var rt = function () { return globalThis.__veskRuntime || null; };
  var slot = function (name, init) {
    var cell = null;
    var ensure = function () {
      if (cell) return cell;
      var t = rt();
      cell = t && t.track ? t.track(init) : { get: function () { return init; }, set: function () {} };
      return cell;
    };
    Object.defineProperty(device, name, {
      enumerable: true,
      configurable: true,
      get: function () { return ensure().get(); },
      set: function (v) { ensure().set(v); },
    });
  };
  var device = {
    // ---- internal (non-reactive) ----
    _recorder: null,
    // ---- unmapped surfaces: warn no-op with callback-safe defaults ----
    // ---- file pickers: real <input type="file"> + File API ----
    pickImage: function (onDone) { pick('image/*', null, 'lastImage', onDone, true); },
    pickPhoto: function (onDone) { pick('image/*', null, 'lastPhoto', onDone, true); },
    pickAudio: function (onDone) { pick('audio/*', null, 'lastAudio', onDone, true); },
    pickVideo: function (onDone) { pick('video/*', null, 'lastVideo', onDone, true); },
    pickFile: function (onDone, mime) {
      pick(mime || '*/*', null, 'lastFile', function (uri) {
        device.lastFileName = uri ? decodeURIComponent(uri.split('/').pop() || '') : null;
        if (onDone) onDone(uri, device.lastFileName);
      }, true);
    },
    capturePhoto: function (onDone) { pick('image/*', 'user', 'lastPhoto', onDone); },
    captureVideo: function (onDone) { pick('video/*', 'user', 'lastVideo', onDone); },
    // ---- notifications: real Notification API ----
    notify: function (title, text, onTap) {
      if (!('Notification' in window)) { warn('notify'); if (onTap) onTap(); return; }
      try {
        var show = function () {
          var n = new Notification(title, { body: text });
          if (onTap) n.onclick = onTap;
        };
        if (Notification.permission === 'granted') show();
        else Notification.requestPermission().then(function (p) { if (p === 'granted') show(); });
      } catch (e) { warn('notify'); }
    },
    // ---- recording: real MediaRecorder API ----
    startRecording: function (onStarted) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { warn('startRecording'); if (onStarted) onStarted(null); return; }
      try {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
          var rec = new MediaRecorder(stream);
          var chunks = [];
          rec.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
          rec.onstop = function () {
            device.lastRecording = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
            stream.getTracks().forEach(function (t) { t.stop(); });
          };
          rec.start();
          device._recorder = rec;
          device.recording = true;
          if (onStarted) onStarted(device.lastRecording);
        }).catch(function () { warn('startRecording'); });
      } catch (e) { warn('startRecording'); }
    },
    stopRecording: function () {
      if (device._recorder && device._recorder.state !== 'inactive') { try { device._recorder.stop(); } catch (e) {} }
      device.recording = false;
      return device.lastRecording;
    },
    startScreenRecord: function (onStarted) { warn('startScreenRecord'); if (onStarted) onStarted(null); },
    stopScreenRecord: function () { return device.lastScreenRecord; },
    // ---- clipboard: real Clipboard API ----
    readClipboard: function (onDone) {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) { device.clipboardText = t; if (onDone) onDone(t); }).catch(function () { if (onDone) onDone(null); });
      } else { warn('readClipboard'); if (onDone) onDone(null); }
    },
    copyToClipboard: function (value, onDone) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(value)).then(function () { if (onDone) onDone(true); }).catch(function () { if (onDone) onDone(false); });
      } else { warn('copyToClipboard'); if (onDone) onDone(false); }
    },
    // ---- haptics / share / speech: real Web APIs ----
    vibrate: function (millis, onDone) {
      if (navigator.vibrate) { try { navigator.vibrate(millis || 200); } catch (e) {} if (onDone) onDone(true); }
      else { warn('vibrate'); if (onDone) onDone(false); }
    },
    shareText: function (text, onDone) {
      if (navigator.share) {
        navigator.share({ text: String(text) }).then(function () { if (onDone) onDone(true); }).catch(function () { if (onDone) onDone(false); });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(text)).then(function () { if (onDone) onDone(true); }).catch(function () { if (onDone) onDone(false); });
      } else { warn('shareText'); if (onDone) onDone(false); }
    },
    shareFile: function (path, mime, onDone) { warn('shareFile'); if (onDone) onDone(false); },
    speak: function (text, onDone) {
      if ('speechSynthesis' in window) { try { speechSynthesis.speak(new SpeechSynthesisUtterance(String(text))); if (onDone) onDone(true); } catch (e) { if (onDone) onDone(false); } }
      else { warn('speak'); if (onDone) onDone(false); }
    },
    // ---- geolocation / battery / network: real Web APIs ----
    getLocation: function (onDone) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            var coords = pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
            device.lastLocation = coords;
            if (onDone) onDone(coords, null);
          },
          function () { warn('getLocation'); if (onDone) onDone(null, null); }
        );
      } else { warn('getLocation'); if (onDone) onDone(null, null); }
    },
    getBattery: function (onDone) {
      if (navigator.getBattery) {
        navigator.getBattery().then(function (b) {
          device.batteryLevel = Math.round(b.level * 100); device.charging = b.charging;
          if (onDone) onDone(device.batteryLevel, device.charging);
        }).catch(function () { if (onDone) onDone(0, false); });
      } else { warn('getBattery'); if (onDone) onDone(0, false); }
    },
    refreshNetwork: function (onDone) {
      device.networkType = (navigator.connection && navigator.connection.effectiveType) || null;
      device.networkAvailable = navigator.onLine;
      if (onDone) onDone(device.networkType, device.networkAvailable);
    },
    // ---- OPFS file system (Origin Private File System — real API) ----
    listFiles: function (dir, onDone) {
      var root = opfs();
      if (!root) { warn('listFiles'); if (onDone) onDone([]); return; }
      unwrapHandle(root).then(function (r) { return r.getDirectoryHandle(dir || '', { create: false }); })
        .then(function (d) { return d.keys ? (async function () { var names = []; for await (var k of d.keys()) names.push(k); return names; })() : []; })
        .then(function (names) { if (onDone) onDone(names.map(String)); })
        .catch(function () { if (onDone) onDone([]); });
    },
    writeFile: function (name, content, onDone) {
      var root = opfs();
      if (!root) { warn('writeFile'); if (onDone) onDone(null); return; }
      unwrapHandle(root).then(function (r) { return r.getFileHandle(name, { create: true }); })
        .then(function (h) { return h.createWritable(); })
        .then(function (w) { return w.write(String(content)).then(function () { return w.close(); }); })
        .then(function () { if (onDone) onDone(name); })
        .catch(function () { if (onDone) onDone(null); });
    },
    readFile: function (name, onDone) {
      var root = opfs();
      if (!root) { warn('readFile'); if (onDone) onDone(null); return; }
      unwrapHandle(root).then(function (r) { return r.getFileHandle(name); })
        .then(function (h) { return h.getFile(); })
        .then(function (f) { return f.text(); })
        .then(function (t) { if (onDone) onDone(t); })
        .catch(function () { if (onDone) onDone(null); });
    },
    deleteFile: function (name, onDone) {
      var root = opfs();
      if (!root) { warn('deleteFile'); if (onDone) onDone(false); return; }
      unwrapHandle(root).then(function (r) { return r.removeEntry(name); })
        .then(function () { if (onDone) onDone(true); })
        .catch(function () { if (onDone) onDone(false); });
    },
    // ---- URL schemes (tel:, mailto:, sms:, window.open) — genuine ----
    dial: function (number, onDone) { try { location.href = 'tel:' + encodeURIComponent(String(number)); if (onDone) onDone(true); } catch (e) { if (onDone) onDone(false); } },
    sendSms: function (number, text, onDone) { try { location.href = 'sms:' + encodeURIComponent(String(number)) + '?body=' + encodeURIComponent(String(text || '')); if (onDone) onDone(true); } catch (e) { if (onDone) onDone(false); } },
    sendEmail: function (to, subject, body, onDone) { try { location.href = 'mailto:' + encodeURIComponent(String(to || '')) + '?subject=' + encodeURIComponent(String(subject || '')) + '&body=' + encodeURIComponent(String(body || '')); if (onDone) onDone(true); } catch (e) { if (onDone) onDone(false); } },
    openUrl: function (url, onDone) { try { window.open(String(url), '_blank'); if (onDone) onDone(true); } catch (e) { if (onDone) onDone(false); } },
    openMaps: function (query, onDone) { try { window.open('https://www.google.com/maps/search/' + encodeURIComponent(String(query || '')), '_blank'); if (onDone) onDone(true); } catch (e) { if (onDone) onDone(false); } },
    // ---- unmapped surfaces: warn no-op with callback-safe defaults ----
    listApps: function (onDone) { warn('listApps'); if (onDone) onDone([]); },
    listContacts: function (onDone) { warn('listContacts'); if (onDone) onDone([]); },
    listCallLogs: function (onDone) { warn('listCallLogs'); if (onDone) onDone([]); },
    listMessages: function (onDone) { warn('listMessages'); if (onDone) onDone([]); },
    listAccounts: function (onDone) { warn('listAccounts'); if (onDone) onDone([]); },
    listCalendarEvents: function (onDone) { warn('listCalendarEvents'); if (onDone) onDone([]); },
    captureScreenshot: function (onDone) { warn('captureScreenshot'); if (onDone) onDone(null); },
    toggleTorch: function (onDone) { warn('toggleTorch'); if (onDone) onDone(false); },
    checkBiometrics: function (onDone) { warn('checkBiometrics'); if (onDone) onDone(false, null); },
    authenticate: function (onDone) { warn('authenticate'); if (onDone) onDone(false, 'unavailable'); },
    refreshBluetooth: function (onDone) { warn('refreshBluetooth'); if (onDone) onDone(false, []); },
    toggleBluetooth: function (enabled, onDone) { warn('toggleBluetooth'); if (onDone) onDone(false); },
    scanBluetooth: function (seconds, onDone) { warn('scanBluetooth'); if (onDone) onDone([]); },
    generateQrCode: function (text, onDone, size) { warn('generateQrCode'); if (onDone) onDone(null); },
    scanQr: function (onResult) { warn('scanQr'); if (onResult) onResult(null); },
    refreshVolume: function (onDone) { warn('refreshVolume'); if (onDone) onDone(0, null); },
    setVolume: function (level, onDone) { warn('setVolume'); if (onDone) onDone(false); },
    setRingerMode: function (mode, onDone) { warn('setRingerMode'); if (onDone) onDone(false); },
    setScreenBrightness: function (level, onDone) { warn('setScreenBrightness'); if (onDone) onDone(false); },
    resetScreenBrightness: function (onDone) { warn('resetScreenBrightness'); if (onDone) onDone(false); },
    setKeepAwake: function (on, onDone) { warn('setKeepAwake'); if (onDone) onDone(false); },
    refreshStorage: function (onDone) { warn('refreshStorage'); if (onDone) onDone('0', '0'); },
    lockOrientation: function (mode, onDone) { warn('lockOrientation'); if (onDone) onDone(false); },
    readSensor: function (type, onDone) { warn('readSensor'); if (onDone) onDone(null); },
    openSettings: function (section, onDone) { warn('openSettings'); if (onDone) onDone(false); },
    setAlarm: function (hour, minute, title, onDone) { warn('setAlarm'); if (onDone) onDone(false); },
    openApp: function (packageName, onDone) { warn('openApp'); if (onDone) onDone(false); },
    toast: function (text, long, onDone) { console.info('[vesk preview] toast:', text); if (onDone) onDone(true); },
    playSound: function (kind, onDone) { warn('playSound'); if (onDone) onDone(false); },
    setWallpaper: function (path, onDone) { warn('setWallpaper'); if (onDone) onDone(false); },
    refreshNfc: function (onDone) { warn('refreshNfc'); if (onDone) onDone(false, false); },
    refreshTelephony: function (onDone) { warn('refreshTelephony'); if (onDone) onDone(null, null); },
    refreshDeviceInfo: function (onDone) { warn('refreshDeviceInfo'); if (onDone) onDone(''); }
  };
  // Reactive props (mirror the native DeviceApi surface): picks, sensors,
  // toggles and recorders land here so pages re-render on change.
  slot('lastImage', null); slot('lastAudio', null); slot('lastFile', null); slot('lastFileName', null);
  slot('lastPhoto', null); slot('lastVideo', null); slot('lastRecording', null);
  slot('recording', false); slot('screenRecording', false);
  slot('batteryLevel', 0); slot('charging', false);
  slot('networkType', (navigator.connection && navigator.connection.effectiveType) || null);
  slot('networkAvailable', navigator.onLine);
  slot('wifiEnabled', null); slot('locationEnabled', null); slot('lastLocation', null);
  slot('installedApps', []); slot('contacts', []); slot('callLogs', []); slot('messages', []); slot('accounts', []);
  slot('clipboardText', null); slot('lastScreenshot', null);
  slot('torchEnabled', false); slot('torchAvailable', false);
  slot('appFiles', []); slot('biometricAvailable', false); slot('biometricTypes', null);
  slot('bluetoothEnabled', false); slot('bluetoothDevices', []);
  slot('scanningQr', false); slot('lastQrCodePath', null);
  slot('mediaVolume', 0); slot('ringerMode', 'normal'); slot('screenBrightness', 0); slot('keepAwake', false);
  slot('storageFree', 0); slot('storageTotal', 0); slot('ramFree', 0); slot('ramTotal', 0);
  slot('calendarEvents', []); slot('nfcAvailable', false); slot('nfcEnabled', false);
  slot('carrier', null); slot('simState', null);
  slot('deviceModel', navigator.platform || null); slot('deviceManufacturer', null);
  slot('androidVersion', null); slot('screenSize', screen.width + 'x' + screen.height);
  globalThis.rememberDeviceApi = function () { return device; };
})();
`;