package app

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.SpringSpec
import androidx.compose.animation.core.TweenSpec
import androidx.compose.animation.core.animateTo
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.unit.Dp
import app.navigation.LocalNavController
import app.navigation.NavController
import kotlin.time.TimeSource
import kotlin.math.pow
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch


// Native counterparts of @vesk/runtime exports referenced by copied .vsk files.

fun truthy(v: Any?): Boolean = when (v) {
    null -> false
    is Boolean -> v
    is String -> v.isNotEmpty()
    is Number -> { val d = v.toDouble(); d != 0.0 && !d.isNaN() }
    else -> true
}

// JS ToNumber: unparseable strings, and objects/arrays (JS Number(object) ->
// NaN except single-element arrays), produce NaN like the browser; "" and
// whitespace-only are 0, "0x10" is 16, "Infinity" is Infinity.
fun num(v: Any?): Double = when (v) {
    is Number -> v.toDouble()
    is String -> jsToNumber(v)
    is Boolean -> if (v) 1.0 else 0.0
    else -> Double.NaN
}

private fun jsToNumber(s: String): Double {
    val t = s.trim()
    if (t.isEmpty()) return 0.0
    if (t == "Infinity" || t == "+Infinity") return Double.POSITIVE_INFINITY
    if (t == "-Infinity") return Double.NEGATIVE_INFINITY
    if (t[0] == '0' && t.length > 2 && (t[1] == 'x' || t[1] == 'X' || t[1] == 'b' || t[1] == 'B' || t[1] == 'o' || t[1] == 'O')) {
        val base = when (t[1]) {
            'x', 'X' -> 16
            'b', 'B' -> 2
            else -> 8
        }
        var d = 0.0
        for (j in 2 until t.length) {
            val c = t[j]
            val dv = when (c) {
                in '0'..'9' -> c - '0'
                in 'a'..'f' -> c - 'a' + 10
                in 'A'..'F' -> c - 'A' + 10
                else -> return Double.NaN
            }
            if (dv >= base) return Double.NaN
            d = d * base + dv
        }
        return d
    }
    return t.toDoubleOrNull() ?: Double.NaN
}


// Platform seam (Phase 3 slice 1): the portable DeviceApi surface — the
// composable factory plus the full public property/method set with the
// browser-facing default argument values. The android actual (below) supplies
// the implementations and strips the defaults (KMP: defaults live on the
// expect side only); android pages keep resolving the defaults from here.
@Composable
expect fun rememberDeviceApi(): DeviceApi

expect class DeviceApi {
    var lastImage: String?
    var lastAudio: String?
    var lastFile: String?
    var lastFileName: String?
    var lastPhoto: String?
    var lastVideo: String?
    var lastRecording: String?
    var recording: Boolean
    var batteryLevel: Int
    var charging: Boolean
    var networkType: String?
    var networkAvailable: Boolean
    var wifiEnabled: Boolean
    var locationEnabled: Boolean
    var lastLocation: String?
    var installedApps: List<String>
    var contacts: List<String>
    var callLogs: List<String>
    var messages: List<String>
    var accounts: List<String>
    var clipboardText: String?
    var lastScreenshot: String?
    var torchEnabled: Boolean
    var torchAvailable: Boolean
    var appFiles: List<String>
    var biometricAvailable: Boolean
    var biometricTypes: String?
    var bluetoothEnabled: Boolean
    var bluetoothDevices: List<String>
    var scanningQr: Boolean
    var lastQrCodePath: String?
    var screenRecording: Boolean
    var lastScreenRecord: String?
    var mediaVolume: Int
    var ringerMode: String?
    var screenBrightness: Float
    var keepAwake: Boolean
    var storageFree: Long
    var storageTotal: Long
    var ramFree: Long
    var ramTotal: Long
    var calendarEvents: List<String>
    var nfcAvailable: Boolean
    var nfcEnabled: Boolean
    var carrier: String?
    var simState: String?
    var deviceModel: String?
    var deviceManufacturer: String?
    var androidVersion: String?
    var screenSize: String?
    fun pickImage(onDone: ((String?) -> Unit)? = null)
    fun pickAudio(onDone: ((String?) -> Unit)? = null)
    fun pickFile(onDone: ((String?, String?) -> Unit)? = null, mime: String = "*/*")
    fun capturePhoto(onDone: ((String?) -> Unit)? = null)
    fun captureVideo(onDone: ((String?) -> Unit)? = null)
    fun startRecording(onStarted: ((String?) -> Unit)? = null)
    fun stopRecording(): String?
    fun notify(title: String, text: String, onTap: (() -> Unit)? = null)
    fun getBattery(onDone: ((Int, Boolean) -> Unit)? = null)
    fun refreshNetwork(onDone: ((String?, Boolean) -> Unit)? = null)
    fun getLocation(onDone: ((String?, String?) -> Unit)? = null)
    fun listApps(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100)
    fun listContacts(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100)
    fun listCallLogs(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100)
    fun listMessages(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100)
    fun listAccounts(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100)
    fun readClipboard(onDone: ((String?) -> Unit)? = null)
    fun copyToClipboard(value: String, onDone: ((Boolean) -> Unit)? = null)
    fun vibrate(millis: Long = 200, onDone: ((Boolean) -> Unit)? = null)
    fun toggleTorch(onDone: ((Boolean) -> Unit)? = null)
    fun captureScreenshot(onDone: ((String?) -> Unit)? = null)
    fun shareText(text: String, onDone: ((Boolean) -> Unit)? = null)
    fun shareFile(path: String, mime: String? = null, onDone: ((Boolean) -> Unit)? = null)
    fun listFiles(dir: String = "", onDone: ((List<String>) -> Unit)? = null)
    fun writeFile(name: String, content: String, onDone: ((String?) -> Unit)? = null)
    fun readFile(name: String, onDone: ((String?) -> Unit)? = null)
    fun deleteFile(name: String, onDone: ((Boolean) -> Unit)? = null)
    fun checkBiometrics(onDone: ((Boolean, String?) -> Unit)? = null)
    fun authenticate(onDone: ((Boolean, String?) -> Unit)? = null)
    fun refreshBluetooth(onDone: ((Boolean, List<String>) -> Unit)? = null)
    fun toggleBluetooth(enabled: Boolean, onDone: ((Boolean) -> Unit)? = null)
    fun scanBluetooth(seconds: Int = 5, onDone: ((List<String>) -> Unit)? = null)
    fun generateQrCode(text: String, onDone: ((String?) -> Unit)? = null, size: Int = 512)
    fun scanQr(onResult: ((String?) -> Unit)? = null)
    fun startScreenRecord(onStarted: ((String?) -> Unit)? = null)
    fun stopScreenRecord(): String?
    fun refreshVolume(onDone: ((Int, String?) -> Unit)? = null)
    fun setVolume(level: Int, onDone: ((Boolean) -> Unit)? = null)
    fun setRingerMode(mode: String, onDone: ((Boolean) -> Unit)? = null)
    fun setScreenBrightness(level: Int, onDone: ((Boolean) -> Unit)? = null)
    fun resetScreenBrightness(onDone: ((Boolean) -> Unit)? = null)
    fun setKeepAwake(on: Boolean, onDone: ((Boolean) -> Unit)? = null)
    fun refreshStorage(onDone: ((String, String) -> Unit)? = null)
    fun lockOrientation(mode: String, onDone: ((Boolean) -> Unit)? = null)
    fun readSensor(type: String, onDone: ((String?) -> Unit)? = null)
    fun dial(number: String, onDone: ((Boolean) -> Unit)? = null)
    fun sendSms(number: String, text: String, onDone: ((Boolean) -> Unit)? = null)
    fun sendEmail(to: String, subject: String, body: String, onDone: ((Boolean) -> Unit)? = null)
    fun openUrl(url: String, onDone: ((Boolean) -> Unit)? = null)
    fun openMaps(query: String, onDone: ((Boolean) -> Unit)? = null)
    fun openSettings(section: String? = null, onDone: ((Boolean) -> Unit)? = null)
    fun setAlarm(hour: Int, minute: Int, title: String, onDone: ((Boolean) -> Unit)? = null)
    fun openApp(packageName: String, onDone: ((Boolean) -> Unit)? = null)
    fun toast(text: String, long: Boolean = false, onDone: ((Boolean) -> Unit)? = null)
    fun playSound(kind: String? = null, onDone: ((Boolean) -> Unit)? = null)
    fun setWallpaper(path: String, onDone: ((Boolean) -> Unit)? = null)
    fun listCalendarEvents(onDone: ((List<String>) -> Unit)? = null, limit: Int = 50)
    fun refreshNfc(onDone: ((Boolean, Boolean) -> Unit)? = null)
    fun refreshTelephony(onDone: ((String?, String?) -> Unit)? = null)
    fun refreshDeviceInfo(onDone: ((String) -> Unit)? = null)
    fun speak(text: String, onDone: ((Boolean) -> Unit)? = null)
}

// Declarative device elements (style C) — <photo-picker>, <camera> and the
// rest compile to these composables. Each binds its label attribute and
// reports results through onDone/onTap/onPick.
@Composable
expect fun VeskPhotoPicker(label: String = "Pick a photo", onPick: ((String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskCamera(label: String = "Take a photo", onDone: ((String?) -> Unit)? = null, video: Boolean = false, modifier: Modifier = Modifier)
@Composable
expect fun VeskRecorder(label: String = "Record", onDone: ((String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskFileInput(label: String = "Pick a file", mime: String = "*/*", onDone: ((String?, String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskNotification(title: String, text: String, label: String = "Notify", onTap: (() -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskBatteryStatus(label: String = "Battery", onDone: ((Int, Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskNetworkStatus(label: String = "Network", onDone: ((String?, Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskLocation(label: String = "Location", onDone: ((String?, String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskApps(label: String = "Apps", onDone: ((List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskContacts(label: String = "Contacts", onDone: ((List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskCallLog(label: String = "Call log", onDone: ((List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskMessages(label: String = "Messages", onDone: ((List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskAccounts(label: String = "Accounts", onDone: ((List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskClipboard(label: String = "Clipboard", onDone: ((String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskCopyToClipboard(value: String, label: String = "Copy", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskVibrate(label: String = "Vibrate", duration: Long = 200, onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskTorch(label: String = "Torch", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskScreenshot(label: String = "Screenshot", onDone: ((String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskShareText(text: String, label: String = "Share", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskShareFile(path: String? = null, mime: String = "application/octet-stream", label: String = "Share file", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskBiometricAuth(label: String = "Unlock with biometrics", onDone: ((Boolean, String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskBluetooth(label: String = "Bluetooth", onDone: ((Boolean, List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskBluetoothToggle(label: String = "Toggle Bluetooth", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskBluetoothScan(label: String = "Scan devices", onDone: ((List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskScreenRecord(label: String = "Record screen", onDone: ((String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskVolume(label: String = "Volume", onDone: ((Int, String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskSetVolume(value: Int, label: String = "Set volume", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskBrightness(value: Int, label: String = "Set brightness", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskKeepAwake(value: Boolean, label: String = "Keep awake", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskOrientation(mode: String = "auto", label: String = "Set orientation", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskDeviceInfo(label: String = "Device info", onDone: ((String) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskStorage(label: String = "Storage", onDone: ((String, String) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskSensor(type: String = "light", label: String = "Read sensor", onDone: ((String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskToast(text: String, label: String = "Toast", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskSound(kind: String = "notification", label: String = "Play sound", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskWallpaper(path: String? = null, label: String = "Set wallpaper", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskCalendar(label: String = "Calendar", onDone: ((List<String>) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskNfc(label: String = "NFC", onDone: ((Boolean, Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskSim(label: String = "SIM", onDone: ((String?, String?) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskDial(number: String, label: String = "Dial", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskSms(number: String, text: String, label: String = "Send SMS", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskEmail(to: String, subject: String = "", body: String = "", label: String = "Email", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskLink(url: String, label: String = "Open link", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskMap(query: String, label: String = "Open map", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskAlarm(hour: Int, minute: Int, title: String = "Alarm", label: String = "Set alarm", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskOpenSettings(section: String = "main", label: String = "Open settings", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskOpenApp(app: String, label: String = "Open app", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)
@Composable
expect fun VeskSpeak(text: String, label: String = "Speak", onDone: ((Boolean) -> Unit)? = null, modifier: Modifier = Modifier)


// Per-side borders (border-t/r/b/l, border-x/y).
fun Modifier.veskSideBorder(top: Dp, end: Dp, bottom: Dp, start: Dp, color: Color): Modifier = drawBehind {
    val w = floatArrayOf(top.toPx(), end.toPx(), bottom.toPx(), start.toPx())
    val s = size
    if (w[0] > 0f) drawLine(color, Offset(0f, w[0] / 2f), Offset(s.width, w[0] / 2f), w[0])
    if (w[1] > 0f) drawLine(color, Offset(s.width - w[1] / 2f, 0f), Offset(s.width - w[1] / 2f, s.height), w[1])
    if (w[2] > 0f) drawLine(color, Offset(0f, s.height - w[2] / 2f), Offset(s.width, s.height - w[2] / 2f), w[2])
    if (w[3] > 0f) drawLine(color, Offset(w[3] / 2f, 0f), Offset(w[3] / 2f, s.height), w[3])
}


data class NavLinkProps(
    val href: String = "",
    val `class`: String = "",
    val modifier: Modifier = Modifier,
)

@Composable
fun NavLink(props: NavLinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = props.modifier.clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }, onClick = { nav.navigate(props.href) })) {
        content()
    }
}


// Script navigation seam: LocalNavController is only readable in composition,
// but script handlers (Modifier.clickable, timers) run outside it. Components
// whose script uses the navigation surface call veskNavSync() as their first
// composable statement (compiler-emitted), capturing the controller so
// veskNavigate/veskGoBack/veskUseParams work from any script context.
private var veskNavController: NavController? = null

@Composable
fun veskNavSync() {
    veskNavController = LocalNavController.current
}


fun jsString(v: Any?): String = when (v) {
    null -> "null"
    is String -> v
    else -> v.toString()
}


// Platform seam: browser decodeURIComponent semantics (android actual keeps
// the JVM URLDecoder behavior; iOS actual arrives with the CMP milestone).
expect fun jsDecodeURIComponent(v: Any?): String

// useQuery(): the current route's query string as a Map<String, String>.
// AppRouter mirrors the raw query into NavController.currentQuery before the
// page composes; keys and values are percent-decoded (browser URLSearchParams
// semantics), duplicates keep the last value, and keys without '=' map to "".
fun veskUseQuery(): Map<String, String> {
    val raw = veskNavController?.currentQuery?.value ?: return emptyMap()
    if (raw.isEmpty()) return emptyMap()
    val out = mutableMapOf<String, String>()
    for (pair in raw.split('&')) {
        if (pair.isEmpty()) continue
        val eq = pair.indexOf('=')
        val key = if (eq < 0) pair else pair.substring(0, eq)
        val value = if (eq < 0) "" else pair.substring(eq + 1)
        out[jsDecodeURIComponent(key)] = jsDecodeURIComponent(value)
    }
    return out
}


// Platform seam: uncaught exceptions in event handlers, timers, and callbacks
// are reported and the app keeps running — an error in one interaction never
// takes the app down (browser window.onerror semantics). Android logs to
// Logcat; the iOS actual arrives with the CMP milestone.
expect fun jsHandleError(e: Throwable)

// Wrap an event-handler lambda so a throw reports instead of crashing: the
// browser fires window.onerror and the page keeps running, and so do we.
fun jsSafe(fn: () -> Unit): () -> Unit = { try { fn() } catch (e: kotlin.coroutines.cancellation.CancellationException) { throw e } catch (e: Throwable) { jsHandleError(e) } }


fun jsMapGet(map: Any?, key: Any?): Any? = (map as? Map<*, *>)?.get(key)


// JS bracket access (arr[i], str[i], map[key]): out-of-range / missing keys
// yield null (JS undefined) instead of throwing, and numeric-string indices
// coerce like JS property keys ("0" indexes a list). The generic T lets the
// element type flow through from the expected use site (List<String> stays
// String), like JS' dynamic typing.
@Suppress("UNCHECKED_CAST")
fun jsIndex(coll: Any?, key: Any?): Any? = when (coll) {
    is Map<*, *> -> coll.get(key)
    is List<*> -> { val i = jsIndexKey(key); if (i != null && i >= 0 && i < coll.size) coll[i] else null }
    is Array<*> -> { val i = jsIndexKey(key); if (i != null && i >= 0 && i < coll.size) coll[i] else null }
    is String -> { val i = jsIndexKey(key); if (i != null && i >= 0 && i < coll.length) coll[i].toString() else null }
    else -> null
}

fun jsIndexKey(key: Any?): Int? = when (key) {
    is Int -> key
    is Long -> if (key >= Int.MIN_VALUE.toLong() && key <= Int.MAX_VALUE.toLong()) key.toInt() else null
    is Float -> if (key.toDouble() == Math.floor(key.toDouble()) && key >= Int.MIN_VALUE.toFloat() && key <= Int.MAX_VALUE.toFloat()) key.toInt() else null
    is Double -> if (key == Math.floor(key) && key >= Int.MIN_VALUE.toDouble() && key <= Int.MAX_VALUE.toDouble()) key.toInt() else null
    is Short -> key.toInt()
    is Byte -> key.toInt()
    is String -> { val i = key.toIntOrNull() ?: return null; if (i.toString() == key) i else null }
    else -> null
}


fun jsLength(coll: Any?): Int = when (coll) {
    is String -> coll.length
    is CharSequence -> coll.length
    is List<*> -> coll.size
    is Set<*> -> coll.size
    is Map<*, *> -> coll.size
    is Array<*> -> coll.size
    else -> 0
}


object VeskTimers {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val jobs = mutableMapOf<Int, Job>()
    private var nextId = 1
    // JS clamps negative / NaN delays to 0; kotlinx.coroutines delay() throws
    // on negatives (uncaught in the job -> app crash).
    private fun clampDelay(ms: Any?): Long = (ms?.let { num(it) }?.toLong() ?: 0L).coerceAtLeast(0L)
    fun setTimeout(fn: () -> Unit, ms: Any? = 0): Int {
        val id = nextId++
        jobs[id] = scope.launch { delay(clampDelay(ms)); jobs.remove(id); try { fn() } catch (e: Throwable) { jsHandleError(e) } }
        return id
    }
    fun setInterval(fn: () -> Unit, ms: Any? = 0): Int {
        val id = nextId++
        jobs[id] = scope.launch { while (isActive) { delay(clampDelay(ms)); try { fn() } catch (e: Throwable) { jsHandleError(e) } } }
        return id
    }
    fun clearTimeout(id: Any?) { jobs.remove(num(id).toInt())?.cancel() }
    fun clearInterval(id: Any?) { jobs.remove(num(id).toInt())?.cancel() }
}


// Platform seam: the activity anchor that browser-API dialogs and the
// storage/sqlite actuals resolve their Context from. commonMain code only
// ever names the type; the android actual (below) supplies activity +
// setup() as extra members, and the generated App() registers the current
// activity through veskAppSetup().
expect object VeskAppContext


expect object VeskWebStorage {
    fun localGetItem(key: Any?): Any?
    fun localSetItem(key: Any?, value: Any?)
    fun localRemoveItem(key: Any?)
    fun localClear()
    fun localKey(i: Any?): Any?
    fun localLength(): Int
    fun sessionGetItem(key: Any?): Any?
    fun sessionSetItem(key: Any?, value: Any?)
    fun sessionRemoveItem(key: Any?)
    fun sessionClear()
    fun sessionKey(i: Any?): Any?
    fun sessionLength(): Int
}


// Platform seam: the coroutine dispatcher that carries a MonotonicFrameClock
// so Animatable/animateTo can animate (plain Dispatchers.Main crashes without
// one). Android's compose main dispatcher provides it; the iOS actual arrives
// with the CMP milestone.
internal expect fun motionDispatcher(): kotlin.coroutines.CoroutineContext

// Platform seam: the viewport size motionInView uses to test element
// intersection against the bounds captured by the motionGraphics
// onGloballyPositioned hook. Android reports the display size; the iOS actual
// arrives with the CMP milestone.
@Composable
expect fun motionViewportSize(): androidx.compose.ui.unit.IntSize

// motion (motion.dev) native mappings. The easing constants are the real
// motion-utils values verified against the installed motion@13 source: easeIn
// = cubicBezier(0.42,0,1,1), easeOut = cubicBezier(0,0,0.58,1), easeInOut =
// cubicBezier(0.42,0,0.58,1), backOut = cubicBezier(0.33,1.53,0.69,0.99),
// and backIn/circIn* come from motion-utils' reverseEasing/mirrorEasing
// modifiers. motion's spring stiffness/damping/mass map onto Compose
// SpringSpec through the critical damping ratio (damping / 2*sqrt(mass*
// stiffness)); tuning scales differ between the engines, so springs are
// approximate by design.
class MotionRef {
    var alpha: Float by mutableStateOf(1f)
    var scaleX: Float by mutableStateOf(1f)
    var scaleY: Float by mutableStateOf(1f)
    var translateX: Float by mutableStateOf(0f)
    var translateY: Float by mutableStateOf(0f)
    var rotate: Float by mutableStateOf(0f)
    var width: Float by mutableStateOf(0f)
    var height: Float by mutableStateOf(0f)
    var skewX: Float by mutableStateOf(0f)
    var skewY: Float by mutableStateOf(0f)
    var blur: Float by mutableStateOf(0f)
    var brightness: Float by mutableStateOf(1f)
    var contrast: Float by mutableStateOf(1f)
    var bounds: Rect? = null
    var visible: Boolean by mutableStateOf(false)
    var entered: Boolean by mutableStateOf(false)
    internal var viewportW: Int = 0
    internal var viewportH: Int = 0
    // In-flight animate() jobs per property, cancelled when a new animate()
    // targets the same property (motion.dev: starting an animation on a value
    // stops the previous one). animGens tags each claimed job so a job that
    // was superseded while waiting out its delay exits without animating.
    internal val animJobs = mutableMapOf<String, Job?>()
    internal val animGens = mutableMapOf<String, Int>()
    fun onPositioned(b: Rect) {
        bounds = b
        updateVisibility()
    }
    fun updateViewport(w: Int, h: Int) {
        viewportW = w
        viewportH = h
        updateVisibility()
    }
    private fun updateVisibility() {
        val b = bounds ?: return
        val overlaps = b.left < viewportW && b.top < viewportH && b.right > 0f && b.bottom > 0f
        visible = overlaps
        if (overlaps) entered = true
    }
}

@Composable
fun rememberMotionRef(): MotionRef = remember { MotionRef() }

// Markup hook: the compiler appends this modifier when an element has
// ref={cell}. graphicsLayer drives alpha/scale/translation/rotation from the
// ref's state (Compose re-layers on state reads), and onGloballyPositioned
// feeds the ref the viewport-relative bounds for inView checks.
fun Modifier.motionGraphics(ref: MotionRef): Modifier = composed {
    val vs = motionViewportSize()
    ref.updateViewport(vs.width, vs.height)
    graphicsLayer {
        alpha = ref.alpha
        scaleX = ref.scaleX
        scaleY = ref.scaleY
        translationX = ref.translateX
        translationY = ref.translateY
        rotationZ = ref.rotate
        // skew and render-effect properties (blur/brightness/contrast) are
        // stored on MotionRef and animated, but not applied via graphicsLayer
        // which only handles affine transforms.  Width/height affect layout,
        // not drawing, so they are also stored-only for now.
    }.onGloballyPositioned { ref.onPositioned(it.boundsInRoot()) }
}

val easeIn: Easing = CubicBezierEasing(0.42f, 0f, 1f, 1f)
val easeOut: Easing = CubicBezierEasing(0f, 0f, 0.58f, 1f)
val easeInOut: Easing = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)
val backOut: Easing = CubicBezierEasing(0.33f, 1.53f, 0.69f, 0.99f)
val backIn: Easing = Easing { p -> 1f - backOut.transform(1f - p) }
val backInOut: Easing = Easing { p -> if (p <= 0.5f) backIn.transform(p * 2f) / 2f else (2f - backIn.transform(2f * (1f - p))) / 2f }
val circIn: Easing = Easing { p -> (1.0 - kotlin.math.sin(kotlin.math.acos(p.toDouble()))).toFloat() }
val circOut: Easing = Easing { p -> (1.0 - kotlin.math.sin(kotlin.math.acos((1f - p).toDouble()))).toFloat() }
val circInOut: Easing = Easing { p -> if (p <= 0.5f) circIn.transform(p * 2f) / 2f else (2f - circIn.transform(2f * (1f - p))) / 2f }
val anticipate: Easing = Easing { p ->
    if (p >= 1f) 1f
    else {
        val q = p * 2f
        if (q < 1f) 0.5f * backIn.transform(q)
        else 0.5f * (2f - (2.0).pow((-10f * (q - 1f)).toDouble()).toFloat())
    }
}

fun motionEase(v: Any?): Easing = when {
    v is Easing -> v
    v is String -> when (v) {
        "linear" -> LinearEasing
        "easeIn" -> easeIn
        "easeOut" -> easeOut
        "easeInOut" -> easeInOut
        "circIn" -> circIn
        "circOut" -> circOut
        "circInOut" -> circInOut
        "backIn" -> backIn
        "backOut" -> backOut
        "backInOut" -> backInOut
        "anticipate" -> anticipate
        else -> easeOut
    }
    v is List<*> && v.size == 4 -> CubicBezierEasing(num(v[0]).toFloat(), num(v[1]).toFloat(), num(v[2]).toFloat(), num(v[3]).toFloat())
    else -> easeOut
}

fun motionCubicBezier(x1: Any?, y1: Any?, x2: Any?, y2: Any?): Easing =
    CubicBezierEasing(num(x1).toFloat(), num(y1).toFloat(), num(x2).toFloat(), num(y2).toFloat())

fun motionReverseEasing(easing: Any?): Easing {
    val e = easing as? Easing ?: easeInOut
    return Easing { p -> 1f - e.transform(1f - p) }
}

fun motionMirrorEasing(easing: Any?): Easing {
    val e = easing as? Easing ?: easeInOut
    return Easing { p -> if (p <= 0.5f) e.transform(p * 2f) / 2f else (2f - e.transform(2f * (1f - p))) / 2f }
}

fun motionSteps(numSteps: Any?, direction: Any? = "end"): Easing {
    val steps = kotlin.math.max(1, num(numSteps).toInt())
    val dir = direction as? String ?: "end"
    return Easing { p ->
        val progress = if (dir == "end") kotlin.math.min(p, 0.999f) else kotlin.math.max(p, 0.001f)
        val expanded = progress * steps
        val rounded = if (dir == "end") kotlin.math.floor(expanded.toDouble()) else kotlin.math.ceil(expanded.toDouble())
        (kotlin.math.max(0.0, kotlin.math.min(1.0, rounded / steps))).toFloat()
    }
}

fun motionSpring(options: Any? = null): SpringSpec<Float> {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val stiffness = num(jsMapGet(opts, "stiffness")).let { if (it > 0.0) it.toFloat() else 100f }
    val damping = num(jsMapGet(opts, "damping")).let { if (it > 0.0) it.toFloat() else 10f }
    val mass = num(jsMapGet(opts, "mass")).let { if (it > 0.0) it.toFloat() else 1f }
    val restDelta = num(jsMapGet(opts, "restDelta")).let { if (it > 0.0) it.toFloat() else 0.01f }
    val dampingRatio = damping / (2f * kotlin.math.sqrt((mass * stiffness).toDouble()).toFloat())
    return SpringSpec(dampingRatio = dampingRatio, stiffness = stiffness, visibilityThreshold = restDelta)
}

fun motionTween(options: Any? = null): TweenSpec<Float> {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val duration = (num(jsMapGet(opts, "duration")) * 1000.0).toInt().let { if (it >= 0) it else 300 }
    val delayMs = (num(jsMapGet(opts, "delay")) * 1000.0).toInt().coerceAtLeast(0)
    val ease = motionEase(jsMapGet(opts, "ease"))
    return TweenSpec(durationMillis = duration, delay = delayMs, easing = ease)
}

private fun motionSpecFor(opts: Map<*, *>): AnimationSpec<Float> {
    val spring = jsMapGet(opts, "spring")
    if (spring is SpringSpec<*>) return spring as SpringSpec<Float>
    val tween = jsMapGet(opts, "tween")
    if (tween is TweenSpec<*>) return tween as TweenSpec<Float>
    return if (jsString(jsMapGet(opts, "type")) == "spring") motionSpring(opts) else motionTween(opts)
}

private fun optFn(opts: Map<*, *>, key: String): ((Any?) -> Unit)? {
    val v = jsMapGet(opts, key) ?: return null
    if (v is Function1<*, *>) {
        @Suppress("UNCHECKED_CAST")
        return v as (Any?) -> Unit
    }
    if (v is Function0<*>) {
        @Suppress("UNCHECKED_CAST")
        val f = v as () -> Unit
        return { f() }
    }
    return null
}

class MotionControls {
    internal var job: Job? = null
    var time: Double = 0.0
    var speed: Double = 1.0
    var paused: Boolean = false
    var finished: kotlinx.coroutines.Deferred<Boolean>? = null
    fun bind(j: Job, f: kotlinx.coroutines.Deferred<Boolean>) { job = j; finished = f }
    fun stop() { job?.cancel() }
    fun pause() { paused = true }
    fun play() { paused = false }
    fun complete() { job?.cancel() }
    fun cancel() { job?.cancel() }
}

fun motionAnimate(from: Any?, to: Any?, options: Any? = null): MotionControls {
    if (from is MotionRef) return motionAnimateElement(from, to, options)
    return motionAnimateNumber(from, to, options)
}

private fun motionAnimateNumber(from: Any?, to: Any?, options: Any?): MotionControls {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val onUpdate = optFn(opts, "onUpdate")
    val onComplete = optFn(opts, "onComplete")
    val onStop = optFn(opts, "onStop")
    val delaySec = num(jsMapGet(opts, "delay"))
    val repeat = (jsMapGet(opts, "repeat") as? Number)?.toDouble() ?: 0.0
    val repeatType = jsString(jsMapGet(opts, "repeatType")).let { if (it == "reverse" || it == "mirror") it else "loop" }
    val repeatDelay = num(jsMapGet(opts, "repeatDelay"))
    val spec = motionSpecFor(opts)
    val scope = CoroutineScope(SupervisorJob() + motionDispatcher())
    val controls = MotionControls()
    val job = scope.launch {
        if (delaySec > 0) delay((delaySec * 1000.0).toLong())
        val start = num(from).toFloat()
        val target = num(to).toFloat()
        val t0 = TimeSource.Monotonic.markNow()
        var iteration = 0
        while (isActive && (repeat == Double.POSITIVE_INFINITY || iteration <= repeat)) {
            while (controls.paused) { delay(50) }
            val isReversed = repeatType != "loop" && iteration % 2 == 1
            val cur = if (isReversed) target else start
            val dst = if (isReversed) start else target
            val anim = Animatable(cur)
            anim.animateTo(dst, spec) {
                controls.time = t0.elapsedNow().inWholeNanoseconds / 1_000_000_000.0
                onUpdate?.invoke(this.value)
            }
            if (repeat > 0.0 && iteration < repeat) {
                if (repeatDelay > 0) delay((repeatDelay * 1000.0).toLong())
                iteration++
            } else {
                break
            }
        }
        onComplete?.invoke(null)
    }
    val finished = scope.async { job.join(); true }
    controls.bind(job, finished)
    controls.job = job
    return controls
}

private class MotionProp(val key: String, val get: () -> Float, val set: (Float) -> Unit, val frames: List<Float>)

private fun motionAnimateElement(ref: MotionRef, props: Any?, options: Any?): MotionControls {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val target = props as? Map<*, *> ?: emptyMap<Any, Any>()
    val onComplete = optFn(opts, "onComplete")
    val spec = motionSpecFor(opts)
    val delaySec = num(jsMapGet(opts, "delay"))
    val repeat = (jsMapGet(opts, "repeat") as? Number)?.toDouble() ?: 0.0
    val repeatType = jsString(jsMapGet(opts, "repeatType")).let { if (it == "reverse" || it == "mirror") it else "loop" }
    val repeatDelay = num(jsMapGet(opts, "repeatDelay"))
    // Resolve each property to a MotionProp: a multi-stop array is a motion
    // keyframe sequence (keyframes include the start value), a scalar is a
    // single target that starts from the element's current value.
    val resolved = target.mapNotNull { (k, v) ->
        val key = k.toString()
        var get: (() -> Float)? = null
        var set: ((Float) -> Unit)? = null
        when (key) {
            "opacity" -> { get = { ref.alpha }; set = { ref.alpha = it } }
            "scale", "scaleX" -> { get = { ref.scaleX }; set = { ref.scaleX = it } }
            "scaleY" -> { get = { ref.scaleY }; set = { ref.scaleY = it } }
            "translateX", "x" -> { get = { ref.translateX }; set = { ref.translateX = it } }
            "translateY", "y" -> { get = { ref.translateY }; set = { ref.translateY = it } }
            "rotate" -> { get = { ref.rotate }; set = { ref.rotate = it } }
            "width" -> { get = { ref.width }; set = { ref.width = it } }
            "height" -> { get = { ref.height }; set = { ref.height = it } }
            "skewX" -> { get = { ref.skewX }; set = { ref.skewX = it } }
            "skewY" -> { get = { ref.skewY }; set = { ref.skewY = it } }
            "blur" -> { get = { ref.blur }; set = { ref.blur = it } }
            "brightness" -> { get = { ref.brightness }; set = { ref.brightness = it } }
            "contrast" -> { get = { ref.contrast }; set = { ref.contrast = it } }
        }
        if (get == null || set == null) return@mapNotNull null
        val frames = (v as? List<*>)?.map { num(it).toFloat() } ?: listOf(num(v).toFloat())
        MotionProp(key, get, set, frames)
    }
    // Starting a new animate() on a value stops its previous animation
    // immediately (motion.dev motion-value semantics) and starts from the
    // element's current value. Claim this call's generation synchronously so
    // a delayed predecessor that was superseded while waiting exits without
    // animating.
    val gens = mutableMapOf<String, Int>()
    resolved.forEach { p ->
        ref.animJobs[p.key]?.cancel()
        val g = (ref.animGens[p.key] ?: 0) + 1
        gens[p.key] = g
        ref.animGens[p.key] = g
    }
    val scope = CoroutineScope(SupervisorJob() + motionDispatcher())
    val controls = MotionControls()
    val job = scope.launch {
        if (delaySec > 0) delay((delaySec * 1000.0).toLong())
        resolved.map { p ->
            val gen = gens[p.key] ?: 0
            val child = launch {
                if (ref.animGens[p.key] != gen) return@launch
                val isKeyframes = p.frames.size >= 2
                val start = if (isKeyframes) p.frames[0] else p.get()
                val targets = if (isKeyframes) p.frames.drop(1) else p.frames
                var iteration = 0
                while (isActive && (repeat == Double.POSITIVE_INFINITY || iteration <= repeat)) {
                    while (controls.paused) { delay(50) }
                    val isReversed = repeatType != "loop" && iteration % 2 == 1
                    val anim = Animatable(if (isReversed) (targets.lastOrNull() ?: start) else start)
                    if (isReversed) {
                        for (dst in targets.reversed()) anim.animateTo(dst, spec) { p.set(this.value) }
                        anim.animateTo(start, spec) { p.set(this.value) }
                    } else {
                        for (dst in targets) anim.animateTo(dst, spec) { p.set(this.value) }
                    }
                    if (repeat > 0.0 && iteration < repeat) {
                        if (repeatDelay > 0) delay((repeatDelay * 1000.0).toLong())
                        iteration++
                    } else break
                }
            }
            ref.animJobs[p.key] = child
            child.invokeOnCompletion { if (ref.animJobs[p.key] === child) ref.animJobs.remove(p.key) }
            child
        }.forEach { it.join() }
        onComplete?.invoke(null)
    }
    val finished = scope.async { job.join(); true }
    controls.bind(job, finished)
    return controls
}

// motion-utils delay(callback, ms) -> setTimeout with a cancel cleanup.
fun motionDelay(callback: Any?, timeout: Any?): () -> Unit {
    val id = VeskTimers.setTimeout(callback as? () -> Unit ?: {}, timeout)
    return { VeskTimers.clearTimeout(id) }
}


// inView(ref, onStart, { once }): fires when the ref'd element intersects the
// viewport (the element's bounds come from the motionGraphics
// onGloballyPositioned hook; the viewport is the display size).
@Composable
fun motionInView(ref: Any?, onEnter: Any?, options: Any? = null) {
    val target = ref as? MotionRef ?: return
    val cb = onEnter as? () -> Unit ?: return
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val once = jsMapGet(opts, "once")?.let { truthy(it) } ?: true
    LaunchedEffect(target, once) {
        val flow = snapshotFlow { target.entered }
        if (once) {
            flow.filter { it }.take(1).collect { cb() }
        } else {
            flow.filter { it }.collect { cb() }
        }
    }
}

