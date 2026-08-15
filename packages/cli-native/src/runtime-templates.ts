const RUNTIME_IMPORTS_CORE = `package app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.key
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.draganddrop.DragAndDropEvent
import androidx.compose.ui.draganddrop.DragAndDropTarget
import androidx.compose.ui.draganddrop.DragAndDropTransferData
import androidx.compose.ui.draganddrop.toAndroidDragEvent
import android.view.View
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.view.KeyEvent
import android.view.Surface
import android.view.TextureView
import android.widget.MediaController
import android.widget.MediaController.MediaPlayerControl
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import android.accounts.AccountManager
import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContextWrapper
import android.content.IntentFilter
import android.graphics.Bitmap
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.CallLog
import android.provider.ContactsContract
import android.provider.Telephony
import androidx.activity.ComponentActivity
import android.app.ActivityManager
import android.app.WallpaperManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.pm.ActivityInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.hardware.display.DisplayManager
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.media.RingtoneManager
import android.nfc.NfcAdapter
import android.os.StatFs
import android.provider.AlarmClock
import android.provider.CalendarContract
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.telephony.TelephonyManager
import android.view.PixelCopy
import android.view.WindowManager
import android.widget.Toast
import androidx.compose.foundation.draganddrop.dragAndDropSource
import androidx.compose.foundation.draganddrop.dragAndDropTarget
`;

// Imports for the pure-Kotlin runtime core (src/commonMain). This is the
// portable compose ui + coroutines surface only: no android.*. Anything that
// needs a platform API is either an androidMain helper or an expect/actual
// seam declaration (see the `expect` field on the seam helpers below).
export const RUNTIME_COMMON_IMPORTS = `package app

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
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.unit.Dp
import app.navigation.LocalNavController
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
`;

// Imports for heavy dependencies are added only when the app uses the APIs
// that need them: the biometric prompt, QR codes (ZXing), and the QR camera
// overlay (CameraX + ML Kit) each pull a real library, while media sessions
// pull androidx.media. The corresponding gradle dependencies are pruned with
// the exact same conditions, so no class reference ever dangles.
export function runtimeImports(deviceApis: Set<string>, used: Set<string>): string {
  const cond: string[] = [];
  if (deviceApis.has('scanQr')) {
    cond.push(
      'import androidx.camera.core.CameraSelector',
      'import androidx.camera.core.ImageAnalysis',
      'import androidx.camera.core.Preview',
      'import androidx.camera.lifecycle.ProcessCameraProvider',
      'import androidx.camera.view.PreviewView',
      'import androidx.compose.ui.window.Dialog',
      'import androidx.lifecycle.compose.LocalLifecycleOwner',
      'import com.google.mlkit.vision.barcode.BarcodeScannerOptions',
      'import com.google.mlkit.vision.barcode.BarcodeScanning',
      'import com.google.mlkit.vision.barcode.common.Barcode',
      'import com.google.mlkit.vision.common.InputImage',
    );
  }
  if (deviceApis.has('checkBiometrics') || deviceApis.has('authenticate')) {
    cond.push(
      'import androidx.biometric.BiometricManager',
      'import androidx.biometric.BiometricPrompt',
      'import androidx.fragment.app.FragmentActivity',
    );
  }
  if (deviceApis.has('generateQrCode') || used.has('veskQr')) {
    cond.push(
      'import androidx.compose.foundation.Image',
      'import com.google.zxing.BarcodeFormat',
      'import com.google.zxing.EncodeHintType',
      'import com.google.zxing.MultiFormatWriter',
    );
  }
  if (used.has('veskAudio') || used.has('veskVideo') || used.has('veskMediaHub')) {
    cond.push(
      'import androidx.media.app.NotificationCompat.MediaStyle',
      'import androidx.media.session.MediaButtonReceiver',
      'import android.support.v4.media.session.MediaSessionCompat',
    );
  }
  if (used.has('VeskTimers')) {
    cond.push(
      'import kotlinx.coroutines.CoroutineScope',
      'import kotlinx.coroutines.Dispatchers',
      'import kotlinx.coroutines.Job',
      'import kotlinx.coroutines.SupervisorJob',
      'import kotlinx.coroutines.delay',
      'import kotlinx.coroutines.isActive',
      'import kotlinx.coroutines.launch',
    );
  }
  if (used.has('veskYchartsLineChart')) {
    cond.push(
      'import co.yml.charts.axis.AxisData',
      'import co.yml.charts.common.model.Point',
      'import co.yml.charts.ui.linechart.LineChart',
      'import co.yml.charts.ui.linechart.model.Line',
      'import co.yml.charts.ui.linechart.model.LineChartData',
      'import co.yml.charts.ui.linechart.model.LinePlotData',
      'import co.yml.charts.ui.linechart.model.LineStyle',
    );
  }
  return `${RUNTIME_IMPORTS_CORE}${cond.length ? `${cond.join('\n')}\n` : ''}`;
}
export const RUNTIME_CORE = `
// Native counterparts of @vesk/runtime exports referenced by copied .vsk files.

fun truthy(v: Any?): Boolean = when (v) {
    null -> false
    is Boolean -> v
    is String -> v.isNotEmpty()
    is Number -> v != 0
    else -> true
}

fun num(v: Any?): Double = when (v) {
    is Number -> v.toDouble()
    is String -> v.toDoubleOrNull() ?: 0.0
    is Boolean -> if (v) 1.0 else 0.0
    else -> 0.0
}
`;

export const RUNTIME_HELPERS: Record<string, { deps: string[]; src: string; platform?: 'common'; expect?: string }> = {
  'veskMediaHub': { deps: [], src: `
// Shared media coordination: only one vesk player plays at a time (starting
// one pauses the previous), and <audio> exposes its session so system media
// buttons / notifications can drive it.
object VeskMediaHub {
    interface VeskPlayer {
        fun pause()
    }
    var active: VeskPlayer? = null
    var mediaSession: MediaSessionCompat? = null
    fun activate(player: VeskPlayer) {
        val prev = active
        active = player
        if (prev != null && prev !== player) prev.pause()
    }
    fun deactivate(player: VeskPlayer) {
        if (active === player) active = null
    }
}

// Receives system media-button events (headset, lock screen actions) and
// forwards them to the active <audio> session.
class VeskMediaReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        VeskMediaHub.mediaSession?.let { MediaButtonReceiver.handleIntent(it, intent) }
    }
}
` },
  'veskFocus': { deps: [], src: `
// Audio focus: vesk media yields (pause) when another app starts audio, and
// is granted focus when it starts so other apps pause in turn.
object VeskFocus {
    private var audioManager: AudioManager? = null
    private var focusRequest: AudioFocusRequest? = null
    fun request(context: Context, onLoss: () -> Unit, onGain: () -> Unit) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager = am
        val listener = AudioManager.OnAudioFocusChangeListener { change ->
            when (change) {
                AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> onLoss()
                AudioManager.AUDIOFOCUS_GAIN -> onGain()
            }
        }
        if (Build.VERSION.SDK_INT >= 26) {
            val r = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MOVIE).build())
                .setOnAudioFocusChangeListener(listener)
                .build()
            focusRequest = r
            am.requestAudioFocus(r)
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(listener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
        }
    }
    fun abandon(context: Context) {
        val am = audioManager ?: return
        if (Build.VERSION.SDK_INT >= 26) {
            focusRequest?.let { am.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            am.abandonAudioFocus(null)
        }
    }
}
` },
  'veskDeviceCore': { deps: [], src: `
// Shared device primitives: result naming, camera capture URIs, notifications,
// and the tap registry. They live outside any composable so the script API
// (option A state / option B callbacks) and the declarative elements (option
// C) share one implementation.
object VeskDeviceSession {
    // In-process tap registry: notify(..., onTap) stores the callback here and
    // the generated MainActivity fires it when the notification is tapped.
    var notifyTap: (() -> Unit)? = null
}

// Display name of a picked document (OpenDocument/GetContent results).
private fun fileNameOf(context: Context, uri: Uri): String {
    val name = context.contentResolver
        .query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
        ?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
    if (!name.isNullOrEmpty()) return name
    val last = uri.lastPathSegment ?: return "file"
    return last.substringAfterLast('/').ifEmpty { "file" }
}

// Fresh cache file exposed through the FileProvider so the system camera app
// can deposit its output (authority <applicationId>.fileprovider is declared
// in the manifest when a page calls capturePhoto/captureVideo or uses a
// <camera> element).
private fun freshCaptureUri(context: Context, stem: String, ext: String): Uri {
    val dir = java.io.File(context.cacheDir, "vesk_media").apply { mkdirs() }
    val f = java.io.File(dir, "\${stem}_\${System.currentTimeMillis()}\$ext")
    if (f.exists()) f.delete()
    return FileProvider.getUriForFile(context, "\${context.packageName}.fileprovider", f)
}

// Plain notification on the app channel (permission requested at startup).
// onTap runs when the notification is tapped (the tap also opens the app).
private fun veskNotify(context: Context, title: String, text: String, onTap: (() -> Unit)? = null) {
    val channelId = "vesk_general"
    if (Build.VERSION.SDK_INT >= 26) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(channelId) == null) {
            nm.createNotificationChannel(NotificationChannel(channelId, "Vesk", NotificationManager.IMPORTANCE_DEFAULT))
        }
    }
    VeskDeviceSession.notifyTap = onTap
    val act = findActivity(context)
    val contentIntent = if (act != null) {
        android.app.PendingIntent.getActivity(
            context,
            0,
            Intent(context, act.javaClass).apply { putExtra("vesk_notify_tap", true) },
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
        )
    } else null
    val n = NotificationCompat.Builder(context, channelId)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(title)
        .setContentText(text)
        .apply { if (contentIntent != null) setContentIntent(contentIntent) }
        .setAutoCancel(true)
        .build()
    NotificationManagerCompat.from(context).notify(System.currentTimeMillis().toInt(), n)
}
` },
  'veskDeviceApi': {
    deps: ['veskDeviceCore'],
    expect: `
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
`,
    src: `
// Device capability APIs for page scripts (device.pickImage(), ...). The
// surface is deliberately platform-neutral — an iOS / desktop port maps the
// same methods onto its own pickers and recorders — only the implementation
// below touches Android system services, activity result contracts or the
// filesystem.
//
// Two equivalent call styles share this one object:
//   A) state style: results land in observable fields — {device.lastPhoto}
//      bindings recompose the page when they change.
//   B) callback style: every method takes an optional callback that receives
//      the result directly. Page state stays vesk cells — declare with
//      const &[photo, photoCell] = track(null) and assign photo = uri inside
//      the callback; there is no setter function, and cell.set(v) member
//      calls do not survive the native mapping (use assignment or the raw
//      cell's .value).
// Both styles run the same launcher, so mixing them on one page is fine.
@Composable
actual fun rememberDeviceApi(): DeviceApi {
    val context = LocalContext.current

    var pendingPhoto by remember { mutableStateOf<Uri?>(null) }
    var pendingVideo by remember { mutableStateOf<Uri?>(null) }
    var pendingImageCallback by remember { mutableStateOf<((String?) -> Unit)?>(null) }
    var pendingAudioCallback by remember { mutableStateOf<((String?) -> Unit)?>(null) }
    var pendingFileCallback by remember { mutableStateOf<((String?, String?) -> Unit)?>(null) }
    var pendingPhotoCallback by remember { mutableStateOf<((String?) -> Unit)?>(null) }
    var pendingVideoCallback by remember { mutableStateOf<((String?) -> Unit)?>(null) }
    var pendingPerm by remember { mutableStateOf<String?>(null) }
    var pendingPermAction by remember { mutableStateOf<(() -> Unit)?>(null) }

    // Assigned once at the end of rememberDeviceApi(); the launcher closures
    // reference it for state writes, so it must be declared before them.
    var api: DeviceApi? = null
    val pickImageLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        val cb = pendingImageCallback
        pendingImageCallback = null
        api?.lastImage = uri?.toString()
        cb?.invoke(uri?.toString())
    }
    val pickAudioLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        val cb = pendingAudioCallback
        pendingAudioCallback = null
        api?.lastAudio = uri?.toString()
        cb?.invoke(uri?.toString())
    }
    val pickFileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val cb = pendingFileCallback
        pendingFileCallback = null
        if (uri != null) {
            val name = fileNameOf(context, uri)
            api?.lastFile = uri.toString()
            api?.lastFileName = name
            try {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
                )
            } catch (_: SecurityException) { /* provider may not grant persistable access */ }
            cb?.invoke(uri.toString(), name)
        } else {
            cb?.invoke(null, null)
        }
    }
    val takePhotoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        val cb = pendingPhotoCallback
        pendingPhotoCallback = null
        if (ok) api?.lastPhoto = pendingPhoto?.toString()
        cb?.invoke(if (ok) pendingPhoto?.toString() else null)
    }
    val takeVideoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CaptureVideo()) { ok ->
        val cb = pendingVideoCallback
        pendingVideoCallback = null
        if (ok) api?.lastVideo = pendingVideo?.toString()
        cb?.invoke(if (ok) pendingVideo?.toString() else null)
    }
    // Generic runtime-permission gate: one launcher serves every device API
    // (mic, location, contacts, call log, sms, accounts). The pending action
    // runs only when the requested permission is actually granted.
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
        val action = pendingPermAction
        val perm = pendingPerm
        pendingPermAction = null
        pendingPerm = null
        if (perm != null && results[perm] == true) action?.invoke()
    }

    // QR scanning hosts a camera overlay on demand (only while a callback is
    // pending), and screen recording goes through MediaProjection consent.
    var pendingScanCb by remember { mutableStateOf<((String?) -> Unit)?>(null) }
    var pendingScreenRecCb by remember { mutableStateOf<((String?) -> Unit)?>(null) }
    var activeProjection by remember { mutableStateOf<MediaProjection?>(null) }
    var activeRecorder by remember { mutableStateOf<MediaRecorder?>(null) }
    var activeDisplay by remember { mutableStateOf<android.hardware.display.VirtualDisplay?>(null) }

    // Local helpers (declared before use by the launcher closures below).
    fun veskBeginScreenRecord(projection: MediaProjection): String? {
        // API 34+ requires a foreground service typed mediaProjection.
        if (Build.VERSION.SDK_INT >= 30) {
            ContextCompat.startForegroundService(context, Intent(context, VeskScreenRecordService::class.java))
        }
        val dir = java.io.File(context.cacheDir, "vesk_media").apply { mkdirs() }
        val file = java.io.File(dir, "screen_\${System.currentTimeMillis()}.mp4")
        val recorder = MediaRecorder(context)
        recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE)
        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
        recorder.setVideoSize(1280, 720)
        recorder.setVideoFrameRate(30)
        recorder.setVideoEncodingBitRate(4_000_000)
        recorder.setOutputFile(file.absolutePath)
        return runCatching {
            recorder.prepare()
            val surface = recorder.surface
            val display = projection.createVirtualDisplay(
                "vesk_screen_record", 1280, 720,
                context.resources.displayMetrics.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, surface, null, null,
            )
            activeRecorder = recorder
            activeProjection = projection
            activeDisplay = display
            recorder.start()
            file.absolutePath
        }.getOrNull()
    }

    fun veskStopScreenRecord(): String? {
        val recorder = activeRecorder
        val projection = activeProjection
        activeRecorder = null
        activeProjection = null
        activeDisplay?.release()
        activeDisplay = null
        if (recorder != null) {
            runCatching { recorder.stop() }
            recorder.release()
        }
        projection?.stop()
        if (Build.VERSION.SDK_INT >= 30) runCatching { context.stopService(Intent(context, VeskScreenRecordService::class.java)) }
        api?.screenRecording = false
        return api?.lastScreenRecord
    }

    val screenRecLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val cb = pendingScreenRecCb
        pendingScreenRecCb = null
        if (res.resultCode == Activity.RESULT_OK && res.data != null) {
            val mpm = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            val projection = mpm.getMediaProjection(res.resultCode, res.data!!)
            if (projection == null) {
                api?.screenRecording = false
                cb?.invoke(null)
            } else {
                val path = veskBeginScreenRecord(projection)
                api?.screenRecording = path != null
                api?.lastScreenRecord = path
                cb?.invoke(path)
            }
        } else {
            cb?.invoke(null)
        }
    }
    val device = remember(context) {
        DeviceApi(
            context = context,
            imagePicker = { cb ->
                pendingImageCallback = cb
                pickImageLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            },
            audioPicker = { cb ->
                pendingAudioCallback = cb
                pickAudioLauncher.launch("audio/*")
            },
            filePicker = { mime, cb ->
                pendingFileCallback = cb
                pickFileLauncher.launch(arrayOf(mime))
            },
            photoCapture = { cb ->
                pendingPhoto = freshCaptureUri(context, "photo", ".jpg")
                pendingPhotoCallback = cb
                takePhotoLauncher.launch(pendingPhoto!!)
            },
            videoCapture = { cb ->
                pendingVideo = freshCaptureUri(context, "video", ".mp4")
                pendingVideoCallback = cb
                takeVideoLauncher.launch(pendingVideo!!)
            },
            permissionRunner = { perm, action ->
                if (ContextCompat.checkSelfPermission(context, perm) == PackageManager.PERMISSION_GRANTED) action()
                else {
                    pendingPerm = perm
                    pendingPermAction = action
                    permLauncher.launch(arrayOf(perm))
                }
            },
            screenshotCapture = { cb ->
                val act = findActivity(context)
                val view = act?.window?.decorView
                if (act == null || view == null || view.width == 0) {
                    cb?.invoke(null)
                } else {
                    val bmp = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
                    PixelCopy.request(act.window, bmp, { copyResult ->
                        if (copyResult == PixelCopy.SUCCESS) {
                            val dir = java.io.File(context.cacheDir, "vesk_media").apply { mkdirs() }
                            val f = java.io.File(dir, "screenshot_\${System.currentTimeMillis()}.png")
                            runCatching {
                                java.io.FileOutputStream(f).use { out -> bmp.compress(Bitmap.CompressFormat.PNG, 100, out) }
                            }
                            api?.lastScreenshot = if (f.exists()) f.absolutePath else null
                            cb?.invoke(if (f.exists()) f.absolutePath else null)
                        } else {
                            cb?.invoke(null)
                        }
                    }, Handler(Looper.getMainLooper()))
                }
            },
            notifyAction = { title, text, onTap -> veskNotify(context, title, text, onTap) },
            scanStarter = { cb -> pendingScanCb = cb },
            screenRecStarter = { cb ->
                pendingScreenRecCb = cb
                val mpm = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                screenRecLauncher.launch(mpm.createScreenCaptureIntent())
            },
            screenRecStopper = { veskStopScreenRecord() },
        )
    }
    api = device

    // Camera overlay: lives here so both styles reach it — device.scanQr(cb)
    // (style B) and <qr-scanner> (style C) set pendingScanCb. The overlay
    // block below is inlined by the generator only when the app calls
    // device.scanQr or uses <qr-scanner>; otherwise the CameraX/ML Kit stack
    // is not compiled in and its dependencies are not shipped.
    __QR_OVERLAY__

    return device
}

actual class DeviceApi internal constructor(
    private val context: Context,
    private val imagePicker: (cb: ((String?) -> Unit)?) -> Unit,
    private val audioPicker: (cb: ((String?) -> Unit)?) -> Unit,
    private val filePicker: (mime: String, cb: ((String?, String?) -> Unit)?) -> Unit,
    private val photoCapture: (cb: ((String?) -> Unit)?) -> Unit,
    private val videoCapture: (cb: ((String?) -> Unit)?) -> Unit,
    private val permissionRunner: (perm: String, action: () -> Unit) -> Unit,
    private val screenshotCapture: (cb: ((String?) -> Unit)?) -> Unit,
    private val scanStarter: (cb: ((String?) -> Unit)?) -> Unit,
    private val screenRecStarter: (cb: ((String?) -> Unit)?) -> Unit,
    private val screenRecStopper: () -> String?,
    private val notifyAction: (String, String, (() -> Unit)?) -> Unit,
) {
    // Observable state (style A): {device.lastImage} bindings recompose.
    actual var lastImage: String? by mutableStateOf(null)
    actual var lastAudio: String? by mutableStateOf(null)
    actual var lastFile: String? by mutableStateOf(null)
    actual var lastFileName: String? by mutableStateOf(null)
    actual var lastPhoto: String? by mutableStateOf(null)
    actual var lastVideo: String? by mutableStateOf(null)
    actual var lastRecording: String? by mutableStateOf(null)
    actual var recording: Boolean by mutableStateOf(false)
    actual var batteryLevel: Int by mutableStateOf(0)
    actual var charging: Boolean by mutableStateOf(false)
    actual var networkType: String? by mutableStateOf(null)
    actual var networkAvailable: Boolean by mutableStateOf(false)
    actual var wifiEnabled: Boolean by mutableStateOf(false)
    actual var locationEnabled: Boolean by mutableStateOf(false)
    actual var lastLocation: String? by mutableStateOf(null)
    actual var installedApps: List<String> by mutableStateOf(emptyList())
    actual var contacts: List<String> by mutableStateOf(emptyList())
    actual var callLogs: List<String> by mutableStateOf(emptyList())
    actual var messages: List<String> by mutableStateOf(emptyList())
    actual var accounts: List<String> by mutableStateOf(emptyList())
    actual var clipboardText: String? by mutableStateOf(null)
    actual var lastScreenshot: String? by mutableStateOf(null)
    actual var torchEnabled: Boolean by mutableStateOf(false)
    actual var torchAvailable: Boolean by mutableStateOf(false)
    actual var appFiles: List<String> by mutableStateOf(emptyList())
    actual var biometricAvailable: Boolean by mutableStateOf(false)
    actual var biometricTypes: String? by mutableStateOf(null)
    actual var bluetoothEnabled: Boolean by mutableStateOf(false)
    actual var bluetoothDevices: List<String> by mutableStateOf(emptyList())
    actual var scanningQr: Boolean by mutableStateOf(false)
    actual var lastQrCodePath: String? by mutableStateOf(null)
    actual var screenRecording: Boolean by mutableStateOf(false)
    actual var lastScreenRecord: String? by mutableStateOf(null)
    actual var mediaVolume: Int by mutableStateOf(0)
    actual var ringerMode: String? by mutableStateOf(null)
    actual var screenBrightness: Float by mutableStateOf(-1f)
    actual var keepAwake: Boolean by mutableStateOf(false)
    actual var storageFree: Long by mutableStateOf(0)
    actual var storageTotal: Long by mutableStateOf(0)
    actual var ramFree: Long by mutableStateOf(0)
    actual var ramTotal: Long by mutableStateOf(0)
    actual var calendarEvents: List<String> by mutableStateOf(emptyList())
    actual var nfcAvailable: Boolean by mutableStateOf(false)
    actual var nfcEnabled: Boolean by mutableStateOf(false)
    actual var carrier: String? by mutableStateOf(null)
    actual var simState: String? by mutableStateOf(null)
    actual var deviceModel: String? by mutableStateOf(null)
    actual var deviceManufacturer: String? by mutableStateOf(null)
    actual var androidVersion: String? by mutableStateOf(null)
    actual var screenSize: String? by mutableStateOf(null)

    private var recorder: MediaRecorder? = null
    private var recordingFile: java.io.File? = null

    // Style B: pass an optional callback to receive the result directly,
    //     device.pickImage { uri -> photo = uri }
    // or rely on the observable fields above (style A):
    //     device.pickImage()
    actual fun pickImage(onDone: ((String?) -> Unit)?) = imagePicker(onDone)
    actual fun pickAudio(onDone: ((String?) -> Unit)?) = audioPicker(onDone)
    actual fun pickFile(onDone: ((String?, String?) -> Unit)?, mime: String) = filePicker(mime, onDone)
    actual fun capturePhoto(onDone: ((String?) -> Unit)?) = photoCapture(onDone)
    actual fun captureVideo(onDone: ((String?) -> Unit)?) = videoCapture(onDone)

    // Starts recording after the RECORD_AUDIO runtime permission is granted;
    // the system prompt shows on first use. onStarted receives the output
    // path (null if recording could not start).
    actual fun startRecording(onStarted: ((String?) -> Unit)?) {
        permissionRunner(android.Manifest.permission.RECORD_AUDIO) { onStarted?.invoke(beginRecording()) }
    }

    // Stops the recorder and returns the path of the saved file.
    actual fun stopRecording(): String? {
        val r = recorder ?: return null
        val f = recordingFile
        runCatching { r.stop() }
        r.release()
        recorder = null
        recordingFile = null
        recording = false
        if (f != null) lastRecording = f.absolutePath
        return f?.absolutePath
    }

    // Posts a plain notification (title/text) on the app channel; onTap runs
    // when it is tapped (which also opens the app).
    actual fun notify(title: String, text: String, onTap: (() -> Unit)?) = notifyAction(title, text, onTap)

    // Battery level (0-100) and charge state; cached in batteryLevel/charging.
    actual fun getBattery(onDone: ((Int, Boolean) -> Unit)?) {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        @Suppress("DEPRECATION")
        val sticky = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = if (Build.VERSION.SDK_INT >= 33) {
            bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } else {
            sticky?.getIntExtra(BatteryManager.EXTRA_LEVEL, 0) ?: 0
        }
        val status = if (Build.VERSION.SDK_INT >= 33) {
            bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
        } else {
            sticky?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        }
        val chargingState = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        batteryLevel = level
        charging = chargingState
        onDone?.invoke(level, chargingState)
    }

    // Active transport ("wifi"/"cellular"/"ethernet"/null) + internet access;
    // also caches networkType, networkAvailable and wifiEnabled.
    actual fun refreshNetwork(onDone: ((String?, Boolean) -> Unit)?) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val caps = cm.getNetworkCapabilities(cm.activeNetwork)
        val type = when {
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "wifi"
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "cellular"
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "ethernet"
            caps != null -> "other"
            else -> null
        }
        val available = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        val wm = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        val wifi = wm.isWifiEnabled
        networkType = type
        networkAvailable = available
        wifiEnabled = wifi
        onDone?.invoke(type, available)
    }

    // Last known fix (GPS first, network fallback) as lat/lng strings.
    // Requires location services + the ACCESS_FINE_LOCATION runtime permission
    // (granted on first use); state lands in locationEnabled/lastLocation.
    actual fun getLocation(onDone: ((String?, String?) -> Unit)?) {
        fun read(): Unit {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            locationEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            @Suppress("DEPRECATION")
            val loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            val lat = loc?.latitude?.toString()
            val lng = loc?.longitude?.toString()
            lastLocation = if (lat != null && lng != null) "\${lat}, \${lng}" else null
            onDone?.invoke(lat, lng)
        }
        permissionRunner(android.Manifest.permission.ACCESS_FINE_LOCATION, ::read)
    }

    // Launchable apps (labels, sorted, capped); cached in installedApps.
    // Listing needs only a <queries> MAIN/LAUNCHER declaration, no permission.
    actual fun listApps(onDone: ((List<String>) -> Unit)?, limit: Int) {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        @Suppress("DEPRECATION")
        val apps = pm.queryIntentActivities(intent, 0)
            .sortedBy { it.loadLabel(pm).toString().lowercase() }
            .take(limit)
            .map { it.loadLabel(pm).toString() }
        installedApps = apps
        onDone?.invoke(apps)
    }

    // Contacts as "name · number" rows; requires READ_CONTACTS (granted on
    // first use). Cached in contacts.
    actual fun listContacts(onDone: ((List<String>) -> Unit)?, limit: Int) {
        fun read(): Unit {
            val rows = mutableListOf<String>()
            try {
                context.contentResolver.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    arrayOf(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER),
                    null, null, null,
                )?.use { c ->
                    val colName = c.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                    val colNum = c.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER)
                    while (c.moveToNext() && rows.size < limit) {
                        val name = c.getString(colName) ?: ""
                        val num = c.getString(colNum) ?: ""
                        rows += if (name.isBlank()) num else "\${name} · \${num}"
                    }
                }
            } catch (_: SecurityException) { }
            contacts = rows
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_CONTACTS, ::read)
    }

    // Call log as "type · age · number" rows; requires READ_CALL_LOG.
    actual fun listCallLogs(onDone: ((List<String>) -> Unit)?, limit: Int) {
        fun read(): Unit {
            val rows = mutableListOf<String>()
            try {
                context.contentResolver.query(
                    CallLog.Calls.CONTENT_URI,
                    arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION),
                    null, null, CallLog.Calls.DATE + " DESC",
                )?.use { c ->
                    val colNum = c.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
                    val colType = c.getColumnIndexOrThrow(CallLog.Calls.TYPE)
                    val colDate = c.getColumnIndexOrThrow(CallLog.Calls.DATE)
                    val colDur = c.getColumnIndexOrThrow(CallLog.Calls.DURATION)
                    while (c.moveToNext() && rows.size < limit) {
                        val type = when (c.getInt(colType)) {
                            CallLog.Calls.INCOMING_TYPE -> "in"
                            CallLog.Calls.OUTGOING_TYPE -> "out"
                            CallLog.Calls.MISSED_TYPE -> "missed"
                            CallLog.Calls.REJECTED_TYPE -> "rejected"
                            else -> "call"
                        }
                        val ageMin = ((System.currentTimeMillis() - c.getLong(colDate)) / 60000).toInt()
                        val num = c.getString(colNum) ?: "?"
                        val dur = c.getInt(colDur)
                        rows += "\${type} · \${ageMin}m ago · \${num} (\${dur}s)"
                    }
                }
            } catch (_: SecurityException) { }
            callLogs = rows
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_CALL_LOG, ::read)
    }

    // SMS inbox as "sender: body" rows (body trimmed); requires READ_SMS.
    actual fun listMessages(onDone: ((List<String>) -> Unit)?, limit: Int) {
        fun read(): Unit {
            val rows = mutableListOf<String>()
            try {
                context.contentResolver.query(
                    Telephony.Sms.Inbox.CONTENT_URI,
                    arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY),
                    null, null, Telephony.Sms.DATE + " DESC",
                )?.use { c ->
                    val colAddr = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                    val colBody = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
                    while (c.moveToNext() && rows.size < limit) {
                        val addr = c.getString(colAddr) ?: "?"
                        val body = (c.getString(colBody) ?: "").take(60)
                        rows += "\${addr}: \${body}"
                    }
                }
            } catch (_: SecurityException) { }
            messages = rows
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_SMS, ::read)
    }

    // Device accounts as "type · name" rows; requires GET_ACCOUNTS.
    actual fun listAccounts(onDone: ((List<String>) -> Unit)?, limit: Int) {
        fun read(): Unit {
            val rows = AccountManager.get(context).accounts
                .take(limit)
                .map { "\${it.type} · \${it.name}" }
            accounts = rows
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.GET_ACCOUNTS, ::read)
    }

    // Current clipboard text; cached in clipboardText.
    actual fun readClipboard(onDone: ((String?) -> Unit)?) {
        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val text = cm.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString()
        clipboardText = text
        onDone?.invoke(text)
    }

    // Writes text to the clipboard.
    actual fun copyToClipboard(value: String, onDone: ((Boolean) -> Unit)?) {
        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("vesk", value))
        clipboardText = value
        onDone?.invoke(true)
    }

    // Pulses the vibrator (VIBRATE is a normal permission, granted at install).
    actual fun vibrate(millis: Long, onDone: ((Boolean) -> Unit)?) {
        val v = ContextCompat.getSystemService(context, Vibrator::class.java)
        if (v == null) {
            runCatching { java.io.File(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS), "vesk-debug.txt").appendText("\${java.util.Date()}\\nVIBRATE: no Vibrator service\\n") }
            onDone?.invoke(false)
            return
        }
        runCatching {
            if (Build.VERSION.SDK_INT >= 31) {
                v.vibrate(VibrationEffect.createOneShot(millis, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(millis)
            }
        }.onFailure {
            runCatching { java.io.File(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS), "vesk-debug.txt").appendText("\${java.util.Date()}\\nVIBRATE FAIL: \$it\\n") }
        }
        onDone?.invoke(true)
    }

    // Toggles the camera flash (torch mode needs no camera permission); state
    // lands in torchEnabled/torchAvailable.
    actual fun toggleTorch(onDone: ((Boolean) -> Unit)?) {
        val cm = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val id = cm.cameraIdList.firstOrNull { camId ->
            cm.getCameraCharacteristics(camId).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        }
        torchAvailable = id != null
        if (id != null) {
            cm.setTorchMode(id, !torchEnabled)
            torchEnabled = !torchEnabled
        }
        onDone?.invoke(torchEnabled)
    }

    // Captures the current window to a PNG in the cache (also lastScreenshot);
    // needs no media projection — it copies our own window's pixels.
    actual fun captureScreenshot(onDone: ((String?) -> Unit)?) = screenshotCapture(onDone)

    // Opens the system share sheet with plain text.
    actual fun shareText(text: String, onDone: ((Boolean) -> Unit)?) {
        val i = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        context.startActivity(Intent.createChooser(i, "Share"))
        onDone?.invoke(true)
    }

    // Shares a file (device path or content:// URI) through the FileProvider.
    actual fun shareFile(path: String, mime: String?, onDone: ((Boolean) -> Unit)?) {
        val uri = if (path.startsWith("content://")) {
            android.net.Uri.parse(path)
        } else {
            val f = java.io.File(path)
            if (!f.exists()) { onDone?.invoke(false); return }
            FileProvider.getUriForFile(context, "\${context.packageName}.fileprovider", f)
        }
        val i = Intent(Intent.ACTION_SEND).apply {
            type = mime ?: guessMime(path)
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        runCatching { context.startActivity(Intent.createChooser(i, "Share file")) }
        onDone?.invoke(true)
    }

    // Files in the app-private directory (subdirectory via dir); cached in
    // appFiles. Directory entries carry a trailing "/".
    actual fun listFiles(dir: String, onDone: ((List<String>) -> Unit)?) {
        val base = java.io.File(context.filesDir, dir)
        val items = if (base.exists()) {
            base.listFiles()?.sortedBy { it.name }?.map { if (it.isDirectory) "\${it.name}/" else it.name } ?: emptyList()
        } else emptyList()
        appFiles = items
        onDone?.invoke(items)
    }

    // Writes text into the app-private directory; returns the path.
    actual fun writeFile(name: String, content: String, onDone: ((String?) -> Unit)?) {
        val f = java.io.File(context.filesDir, name)
        val path = runCatching { f.parentFile?.mkdirs(); f.writeText(content); f.absolutePath }.getOrNull()
        onDone?.invoke(path)
    }

    // Reads a file from the app-private directory.
    actual fun readFile(name: String, onDone: ((String?) -> Unit)?) {
        val f = java.io.File(context.filesDir, name)
        val text = if (f.exists()) runCatching { f.readText() }.getOrNull() else null
        onDone?.invoke(text)
    }

// Deletes a file from the app-private directory.
    actual fun deleteFile(name: String, onDone: ((Boolean) -> Unit)?) {
        val f = java.io.File(context.filesDir, name)
        val ok = f.exists() && f.delete()
        onDone?.invoke(ok)
    }

    // ---- Biometrics --------------------------------------------------------
    // Checks whether strong/weak biometric hardware (fingerprint/face) is
    // present. Types: "fingerprint" / "face" / "both" / null. The real body
    // is inlined by the generator only when the app calls device.checkBiometrics
    // — otherwise a stub keeps the method available and the androidx.biometric
    // dependency is not shipped.
    actual fun checkBiometrics(onDone: ((Boolean, String?) -> Unit)?) {
        __BIOMETRIC_CHECK_BODY__
    }

    // Prompts the system biometric dialog (fingerprint/face). onDone receives
    // (ok, reason) — ok=false with a message on cancel or missing hardware.
    actual fun authenticate(onDone: ((Boolean, String?) -> Unit)?) {
        __BIOMETRIC_AUTH_BODY__
    }

    // ---- Bluetooth ---------------------------------------------------------
    // Adapter state + bonded devices; BLUETOOTH_CONNECT runtime permission on
    // 12+ (granted on first use; legacy BLUETOOTH/BLUETOOTH_ADMIN are
    // maxSdkVersion-30 only). Adapter state is never read before the runtime
    // permission is granted — on API 31+ that throws SecurityException.
    actual fun refreshBluetooth(onDone: ((Boolean, List<String>) -> Unit)?) {
        permissionRunner(android.Manifest.permission.BLUETOOTH_CONNECT) {
            val ba = context.getSystemService(BluetoothManager::class.java)?.adapter
            val enabled = runCatching { ba?.isEnabled == true }.getOrDefault(false)
            bluetoothEnabled = enabled
            if (ba == null || !enabled) {
                bluetoothDevices = emptyList()
                onDone?.invoke(false, emptyList())
                return@permissionRunner
            }
            val list = runCatching {
                ba.bondedDevices.map { "\${it.name} · \${it.address}" }.sorted()
            }.getOrDefault(emptyList())
            bluetoothDevices = list
            onDone?.invoke(true, list)
        }
    }

    // Turns the Bluetooth adapter on/off. On modern Android the raw
    // enable()/disable() calls are no-ops (and deprecated), so we ask the
    // user through the system enable dialog (on) or the Bluetooth settings
    // screen (off) — the only supported paths since API 30.
    actual fun toggleBluetooth(enabled: Boolean, onDone: ((Boolean) -> Unit)?) {
        permissionRunner(android.Manifest.permission.BLUETOOTH_CONNECT) {
            val ba = context.getSystemService(BluetoothManager::class.java)?.adapter
            if (ba == null) { onDone?.invoke(false); return@permissionRunner }
            val isOn = runCatching { ba.isEnabled }.getOrDefault(false)
            bluetoothEnabled = isOn
            if (enabled == isOn) { onDone?.invoke(true); return@permissionRunner }
            val opened = runCatching {
                if (enabled) context.startActivity(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE))
                else context.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
                true
            }.getOrDefault(false)
            onDone?.invoke(opened)
        }
    }

    // Discovers nearby devices for a few seconds; BLUETOOTH_SCAN on 12+.
    // Results ("name · address") land in bluetoothDevices too.
    actual fun scanBluetooth(seconds: Int, onDone: ((List<String>) -> Unit)?) {
        permissionRunner(android.Manifest.permission.BLUETOOTH_SCAN) {
            permissionRunner(android.Manifest.permission.BLUETOOTH_CONNECT) {
                val ba = context.getSystemService(BluetoothManager::class.java)?.adapter
                if (ba == null || runCatching { !ba.isEnabled }.getOrDefault(true)) {
                    onDone?.invoke(emptyList())
                    return@permissionRunner
                }
                val results = mutableListOf<String>()
                val receiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, i: Intent?) {
                    if (i?.action == BluetoothDevice.ACTION_FOUND) {
                        val d = if (Build.VERSION.SDK_INT >= 33) {
                            i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                        }
                        results += "\${d?.name ?: "?"} · \${d?.address ?: "?"}"
                    }
                }
            }
            runCatching {
                if (Build.VERSION.SDK_INT >= 33) {
                    context.registerReceiver(receiver, IntentFilter(BluetoothDevice.ACTION_FOUND), Context.RECEIVER_NOT_EXPORTED)
                } else {
                    @Suppress("DEPRECATION")
                    context.registerReceiver(receiver, IntentFilter(BluetoothDevice.ACTION_FOUND))
                }
            }
            runCatching { ba.startDiscovery() }
            Handler(Looper.getMainLooper()).postDelayed({
                runCatching { ba.cancelDiscovery() }
                runCatching { context.unregisterReceiver(receiver) }
                val list = results.distinct().sorted()
                bluetoothDevices = list
                onDone?.invoke(list)
            }, seconds * 1000L)
            }
        }
    }

    // ---- QR codes ----------------------------------------------------------
    // Encodes text as a QR bitmap saved to the cache; returns the path (also
    // lastQrCodePath). Inline rendering via <qr-code value="...">. The real
    // body is inlined only when device.generateQrCode is used — otherwise a
    // stub keeps the method and drops the zxing dependency.
    actual fun generateQrCode(text: String, onDone: ((String?) -> Unit)?, size: Int) {
        __QRGEN_BODY__
    }

    // Opens the camera scanner overlay (CameraX + ML Kit; needs the CAMERA
    // runtime permission, granted on first use). While active the
    // device.scanningQr flag is set; onResult receives the decoded text.
    actual fun scanQr(onResult: ((String?) -> Unit)?) {
        permissionRunner(android.Manifest.permission.CAMERA) {
            scanningQr = true
            scanStarter { text ->
                scanningQr = false
                onResult?.invoke(text)
            }
        }
    }

    // ---- Screen recording --------------------------------------------------
    // System consent dialog, then a service-backed capture into the cache.
    // stopScreenRecord() finalizes and returns the output path.
    actual fun startScreenRecord(onStarted: ((String?) -> Unit)?) = screenRecStarter(onStarted)

    actual fun stopScreenRecord(): String? = screenRecStopper()

    // ---- Volume & ringer ---------------------------------------------------
    actual fun refreshVolume(onDone: ((Int, String?) -> Unit)?) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val level = if (max > 0) (am.getStreamVolume(AudioManager.STREAM_MUSIC) * 100 + max / 2) / max else 0
        mediaVolume = level
        ringerMode = when (am.ringerMode) {
            AudioManager.RINGER_MODE_NORMAL -> "normal"
            AudioManager.RINGER_MODE_VIBRATE -> "vibrate"
            AudioManager.RINGER_MODE_SILENT -> "silent"
            else -> null
        }
        onDone?.invoke(mediaVolume, ringerMode)
    }

    // Sets the media stream volume 0-100 (clamped; scaled to the stream max).
    actual fun setVolume(level: Int, onDone: ((Boolean) -> Unit)?) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val clamped = level.coerceIn(0, 100)
        val index = if (max > 0) (clamped * max + 50) / 100 else 0
        am.setStreamVolume(AudioManager.STREAM_MUSIC, index.coerceIn(0, max), 0)
        mediaVolume = clamped
        onDone?.invoke(true)
    }

    // Ringer mode: "normal" / "vibrate" / "silent" (MODIFY_AUDIO_SETTINGS).
    actual fun setRingerMode(mode: String, onDone: ((Boolean) -> Unit)?) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val m = when (mode) {
            "silent" -> AudioManager.RINGER_MODE_SILENT
            "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
            else -> AudioManager.RINGER_MODE_NORMAL
        }
        am.ringerMode = m
        ringerMode = mode
        onDone?.invoke(true)
    }

    // ---- Display -----------------------------------------------------------
    // Window brightness 0-100 (this app's window only); reset restores the
    // system auto setting.
    actual fun setScreenBrightness(level: Int, onDone: ((Boolean) -> Unit)?) {
        val act = findActivity(context)
        val lp = act?.window?.attributes
        if (act == null || lp == null) { onDone?.invoke(false); return }
        lp.screenBrightness = level.coerceIn(0, 100) / 100f
        act.window.attributes = lp
        screenBrightness = lp.screenBrightness
        onDone?.invoke(true)
    }

    actual fun resetScreenBrightness(onDone: ((Boolean) -> Unit)?) {
        val act = findActivity(context)
        val lp = act?.window?.attributes
        if (act == null || lp == null) { onDone?.invoke(false); return }
        lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
        act.window.attributes = lp
        screenBrightness = -1f
        onDone?.invoke(true)
    }

    // Keeps the screen on while this app's window is visible.
    actual fun setKeepAwake(on: Boolean, onDone: ((Boolean) -> Unit)?) {
        val act = findActivity(context)
        if (act == null || act.window == null) { onDone?.invoke(false); return }
        if (on) act.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else act.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        keepAwake = on
        onDone?.invoke(true)
    }

    // ---- Storage & memory --------------------------------------------------
    actual fun refreshStorage(onDone: ((String, String) -> Unit)?) {
        val st = StatFs(context.filesDir.path)
        storageTotal = st.totalBytes
        storageFree = st.availableBytes
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mi = ActivityManager.MemoryInfo()
        am.getMemoryInfo(mi)
        ramTotal = mi.totalMem
        ramFree = mi.availMem
        onDone?.invoke(veskFmtBytes(storageFree), veskFmtBytes(storageTotal))
    }

    // ---- Orientation -------------------------------------------------------
    // "portrait" / "landscape" / "auto".
    actual fun lockOrientation(mode: String, onDone: ((Boolean) -> Unit)?) {
        val act = findActivity(context)
        if (act == null) { onDone?.invoke(false); return }
        act.requestedOrientation = when (mode) {
            "portrait" -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            "landscape" -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            else -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
        onDone?.invoke(true)
    }

    // ---- Sensors -----------------------------------------------------------
    // One-shot read of a hardware sensor: "light", "proximity",
    // "accelerometer", "gyroscope", "temperature" → comma-joined values.
    actual fun readSensor(type: String, onDone: ((String?) -> Unit)?) {
        val sm = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val sensor = when (type) {
            "light" -> sm.getDefaultSensor(Sensor.TYPE_LIGHT)
            "proximity" -> sm.getDefaultSensor(Sensor.TYPE_PROXIMITY)
            "accelerometer" -> sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            "gyroscope" -> sm.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
            "temperature" -> sm.getDefaultSensor(Sensor.TYPE_AMBIENT_TEMPERATURE)
            else -> null
        }
        if (sensor == null) { onDone?.invoke(null); return }
        sm.registerListener(object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                sm.unregisterListener(this)
                onDone?.invoke(event.values.joinToString(", "))
            }
            override fun onAccuracyChanged(s: Sensor?, accuracy: Int) { }
        }, sensor, SensorManager.SENSOR_DELAY_NORMAL)
    }

    // ---- Intent launchers --------------------------------------------------
    private fun launchSafe(intent: Intent): Boolean {
        val failure = runCatching { context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.exceptionOrNull()
        if (failure != null) {
            runCatching { java.io.File(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS), "vesk-debug.txt").appendText("\${java.util.Date()}\\nINTENT FAIL: \${intent.action} \${intent.data}\\n\$failure\\n") }
        }
        return failure == null
    }

    // Dialer pre-filled with the number.
    actual fun dial(number: String, onDone: ((Boolean) -> Unit)?) {
        onDone?.invoke(launchSafe(Intent(Intent.ACTION_DIAL, Uri.parse("tel:\${number}"))))
    }

    // Messenger pre-filled with the recipient + body.
    actual fun sendSms(number: String, text: String, onDone: ((Boolean) -> Unit)?) {
        val i = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:\${number}")).putExtra("sms_body", text)
        onDone?.invoke(launchSafe(i))
    }

    // Mail client with to/subject/body pre-filled.
    actual fun sendEmail(to: String, subject: String, body: String, onDone: ((Boolean) -> Unit)?) {
        val i = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:\${to}"))
            .putExtra(Intent.EXTRA_SUBJECT, subject)
            .putExtra(Intent.EXTRA_TEXT, body)
        onDone?.invoke(launchSafe(i))
    }

    // Opens any URL in the browser.
    actual fun openUrl(url: String, onDone: ((Boolean) -> Unit)?) {
        onDone?.invoke(launchSafe(Intent(Intent.ACTION_VIEW, Uri.parse(url))))
    }

    // Opens Google Maps with a place query.
    actual fun openMaps(query: String, onDone: ((Boolean) -> Unit)?) {
        val uri = "geo:0,0?q=" + Uri.encode(query)
        onDone?.invoke(launchSafe(Intent(Intent.ACTION_VIEW, Uri.parse(uri))))
    }

    // System settings screens: "wifi" / "bluetooth" / "location" / "sound" /
    // "display" / "security" / "apps" / "nfc" / "main".
    actual fun openSettings(section: String?, onDone: ((Boolean) -> Unit)?) {
        val target = when (section) {
            "wifi" -> Settings.ACTION_WIFI_SETTINGS
            "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS
            "location" -> Settings.ACTION_LOCATION_SOURCE_SETTINGS
            "sound" -> Settings.ACTION_SOUND_SETTINGS
            "display" -> Settings.ACTION_DISPLAY_SETTINGS
            "security" -> Settings.ACTION_SECURITY_SETTINGS
            "apps" -> Settings.ACTION_APPLICATION_SETTINGS
            "nfc" -> Settings.ACTION_NFC_SETTINGS
            else -> Settings.ACTION_SETTINGS
        }
        onDone?.invoke(launchSafe(Intent(target)))
    }

    // Sets an alarm clock (system alarm intent).
    actual fun setAlarm(hour: Int, minute: Int, title: String, onDone: ((Boolean) -> Unit)?) {
        val i = Intent(AlarmClock.ACTION_SET_ALARM)
            .putExtra(AlarmClock.EXTRA_HOUR, hour)
            .putExtra(AlarmClock.EXTRA_MINUTES, minute)
            .putExtra(AlarmClock.EXTRA_MESSAGE, title)
        onDone?.invoke(launchSafe(i))
    }

    // Launches an installed app by package name (e.g. "com.android.settings").
    actual fun openApp(packageName: String, onDone: ((Boolean) -> Unit)?) {
        val launch = context.packageManager.getLaunchIntentForPackage(packageName)
        if (launch == null) { onDone?.invoke(false); return }
        onDone?.invoke(launchSafe(launch))
    }

    // ---- Misc system -------------------------------------------------------
    // Android toast (short/long).
    actual fun toast(text: String, long: Boolean, onDone: ((Boolean) -> Unit)?) {
        Toast.makeText(context, text, if (long) Toast.LENGTH_LONG else Toast.LENGTH_SHORT).show()
        onDone?.invoke(true)
    }

    // Plays a system sound: "notification" / "alarm" / "ringtone" / null.
    actual fun playSound(kind: String?, onDone: ((Boolean) -> Unit)?) {
        val uri = when (kind) {
            "notification" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            "alarm" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            "ringtone" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            else -> null
        }
        val tone = RingtoneManager.getRingtone(context, uri)
        if (tone == null) { onDone?.invoke(false); return }
        tone.play()
        onDone?.invoke(true)
    }

    // Sets the home/lock wallpaper from an image file path.
    actual fun setWallpaper(path: String, onDone: ((Boolean) -> Unit)?) {
        val f = java.io.File(path)
        if (!f.exists()) { onDone?.invoke(false); return }
        val wm = WallpaperManager.getInstance(context)
        val ok = runCatching { java.io.FileInputStream(f).use { wm.setStream(it) } }.isSuccess
        onDone?.invoke(ok)
    }

    // Upcoming calendar events as "title · MMM d, HH:mm" rows; READ_CALENDAR
    // runtime permission granted on first use.
    actual fun listCalendarEvents(onDone: ((List<String>) -> Unit)?, limit: Int) {
        fun read(): Unit {
            val rows = mutableListOf<String>()
            try {
                context.contentResolver.query(
                    CalendarContract.Events.CONTENT_URI,
                    arrayOf(CalendarContract.Events.TITLE, CalendarContract.Events.DTSTART),
                    CalendarContract.Events.DTSTART + " >= ?",
                    arrayOf(System.currentTimeMillis().toString()),
                    CalendarContract.Events.DTSTART + " ASC",
                )?.use { c ->
                    val colTitle = c.getColumnIndexOrThrow(CalendarContract.Events.TITLE)
                    val colStart = c.getColumnIndexOrThrow(CalendarContract.Events.DTSTART)
                    while (c.moveToNext() && rows.size < limit) {
                        val title = c.getString(colTitle) ?: "Event"
                        val start = java.text.SimpleDateFormat("MMM d, HH:mm", java.util.Locale.getDefault())
                            .format(java.util.Date(c.getLong(colStart)))
                        rows += "\${title} · \${start}"
                    }
                }
            } catch (_: SecurityException) { }
            calendarEvents = rows
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_CALENDAR, ::read)
    }

    // NFC presence + adapter state.
    actual fun refreshNfc(onDone: ((Boolean, Boolean) -> Unit)?) {
        val na = runCatching { context.getSystemService(Context.NFC_SERVICE) as NfcAdapter }.getOrNull()
        nfcAvailable = na != null
        nfcEnabled = na?.isEnabled == true
        onDone?.invoke(nfcAvailable, nfcEnabled)
    }

    // SIM/carrier info (no permission needed for operator name + state).
    actual fun refreshTelephony(onDone: ((String?, String?) -> Unit)?) {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        carrier = runCatching { tm.simOperatorName ?: tm.networkOperatorName }.getOrNull()?.ifBlank { null }
        simState = when (tm.simState) {
            TelephonyManager.SIM_STATE_READY -> "ready"
            TelephonyManager.SIM_STATE_ABSENT -> "absent"
            TelephonyManager.SIM_STATE_PIN_REQUIRED -> "pin"
            TelephonyManager.SIM_STATE_PUK_REQUIRED -> "puk"
            TelephonyManager.SIM_STATE_NETWORK_LOCKED -> "locked"
            else -> "unknown"
        }
        onDone?.invoke(carrier, simState)
    }

    // Device identity/screen summary for labels and diagnostics.
    actual fun refreshDeviceInfo(onDone: ((String) -> Unit)?) {
        deviceModel = Build.MODEL
        deviceManufacturer = Build.MANUFACTURER
        androidVersion = Build.VERSION.RELEASE
        val dm = context.resources.displayMetrics
        screenSize = "\${dm.widthPixels}x\${dm.heightPixels}"
        val summary = "\${deviceManufacturer} \${deviceModel} · Android \${androidVersion} · \${screenSize}"
        onDone?.invoke(summary)
    }

    // Speaks text with the system TTS engine (callback fires when ready/used).
    actual fun speak(text: String, onDone: ((Boolean) -> Unit)?) {
        var tts: TextToSpeech? = null
        tts = TextToSpeech(context) { status ->
            val engine = tts
            if (status == TextToSpeech.SUCCESS && engine != null) {
                val langOk = engine.setLanguage(java.util.Locale.getDefault()) != TextToSpeech.LANG_MISSING_DATA &&
                    engine.setLanguage(java.util.Locale.getDefault()) != TextToSpeech.LANG_NOT_SUPPORTED
                if (langOk) engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vesk")
                onDone?.invoke(langOk)
            } else {
                onDone?.invoke(false)
            }
        }
    }

    // Starts the in-app audio recorder (mic permission is granted by the
    // caller via permissionRunner).
    internal fun beginRecording(): String? {
        if (recorder != null) return null
        val dir = java.io.File(context.cacheDir, "vesk_media").apply { mkdirs() }
        val f = java.io.File(dir, "recording_\${System.currentTimeMillis()}.m4a")
        return runCatching {
            val r = MediaRecorder(context).apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(96000)
                setAudioSamplingRate(44100)
                setOutputFile(f.absolutePath)
            }
            r.prepare()
            r.start()
            recorder = r
            recordingFile = f
            recording = true
            f.absolutePath
        }.getOrNull()
    }
}

// The hosting Activity for window-level work (screenshot capture).
private fun findActivity(context: Context): Activity? = when (context) {
    is Activity -> context
    is ContextWrapper -> findActivity(context.baseContext)
    else -> null
}

// Best-effort MIME type from a file path (share sheet).
private fun guessMime(path: String): String {
    val ext = path.substringAfterLast('.').lowercase()
    return when (ext) {
        "jpg", "jpeg" -> "image/jpeg"
        "png" -> "image/png"
        "gif" -> "image/gif"
        "webp" -> "image/webp"
        "mp4" -> "video/mp4"
        "webm" -> "video/webm"
        "mp3" -> "audio/mpeg"
        "m4a", "aac" -> "audio/mp4"
        "wav" -> "audio/wav"
        "pdf" -> "application/pdf"
        "txt", "md" -> "text/plain"
        "json" -> "application/json"
        else -> "application/octet-stream"
    }
}

// Human-readable byte count ("12.4 MB").
private fun veskFmtBytes(bytes: Long): String {
    if (bytes < 1024) return "\${bytes} B"
    val kb = bytes / 1024.0
    if (kb < 1024) return "\${String.format("%.1f", kb)} KB"
    val mb = kb / 1024.0
    if (mb < 1024) return "\${String.format("%.1f", mb)} MB"
    val gb = mb / 1024.0
    return "\${String.format("%.1f", gb)} GB"
}

// Foreground service required for MediaProjection screen capture (API 34+).
class VeskScreenRecordService : android.app.Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("vesk_media") == null) {
            nm.createNotificationChannel(NotificationChannel("vesk_media", "Vesk media", NotificationManager.IMPORTANCE_LOW))
        }
        val notif = NotificationCompat.Builder(this, "vesk_media")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Recording screen")
            .setContentText("vesk is capturing the screen")
            .setOngoing(true)
            .build()
        startForeground(9001, notif)
        return START_NOT_STICKY
    }
    override fun onBind(intent: Intent?): android.os.IBinder? = null
}

// ---- Declarative device elements (style C) --------------------------------
// <photo-picker>, <camera>, <recorder>, <file-input>, <notification> and the
// system capability elements below compile to these composables. Every
// element wraps the same DeviceApi the script styles (A/B) use, takes a
// "label" static attribute, and binds results through onDone/onTap/onPick.

@Composable
actual fun VeskPhotoPicker(
    label: String,
    onPick: ((String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.pickImage(onPick) }, modifier = modifier) { Text(label) }
}

// <camera> captures through the system camera app (FileProvider output URI);
// the video attribute switches to video capture.
@Composable
actual fun VeskCamera(
    label: String,
    onDone: ((String?) -> Unit)?,
    video: Boolean,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(
        onClick = { if (video) device.captureVideo(onDone) else device.capturePhoto(onDone) },
        modifier = modifier,
    ) { Text(label) }
}

// <recorder> toggles the mic recorder; onDone receives the saved path when
// recording stops (the same path lands in device.lastRecording).
@Composable
actual fun VeskRecorder(
    label: String,
    onDone: ((String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(
        onClick = {
            if (device.recording) onDone?.invoke(device.stopRecording())
            else device.startRecording()
        },
        modifier = modifier,
    ) { Text(if (device.recording) "Stop recording" else label) }
}

// <file-input mime="..."> picks any document (persistable read/write access
// is taken when the provider allows). onDone receives (uri, displayName).
@Composable
actual fun VeskFileInput(
    label: String,
    mime: String,
    onDone: ((String?, String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.pickFile(onDone, mime) }, modifier = modifier) { Text(label) }
}

// <notification title="..." text="..."> posts on the app channel; onTap runs
// when it is tapped (the tap also opens the app).
@Composable
actual fun VeskNotification(
    title: String,
    text: String,
    label: String,
    onTap: (() -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.notify(title, text, onTap) }, modifier = modifier) { Text(label) }
}

// <battery-status onDone={(level, charging) => ...}> reports battery level
// (0-100) and charge state, also cached in device.batteryLevel/charging.
@Composable
actual fun VeskBatteryStatus(
    label: String,
    onDone: ((Int, Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.getBattery(onDone) }, modifier = modifier) { Text(label) }
}

// <network-status onDone={(type, available) => ...}> reports the active
// transport ("wifi" / "cellular" / "ethernet" / null) and internet access.
@Composable
actual fun VeskNetworkStatus(
    label: String,
    onDone: ((String?, Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshNetwork(onDone) }, modifier = modifier) { Text(label) }
}

// <location onDone={(lat, lng) => ...}> reads the last known fix (GPS first,
// network fallback); requires location services and runtime permission.
@Composable
actual fun VeskLocation(
    label: String,
    onDone: ((String?, String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.getLocation(onDone) }, modifier = modifier) { Text(label) }
}

// <apps onDone={(list) => ...}> lists launchable apps (label, sorted, capped),
// also cached in device.installedApps.
@Composable
actual fun VeskApps(
    label: String,
    onDone: ((List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listApps(onDone) }, modifier = modifier) { Text(label) }
}

// <contacts onDone={(list) => ...}> lists "name · number" rows; requires the
// READ_CONTACTS runtime permission (granted on first use).
@Composable
actual fun VeskContacts(
    label: String,
    onDone: ((List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listContacts(onDone) }, modifier = modifier) { Text(label) }
}

// <call-log onDone={(list) => ...}> lists "type · age · number" rows; requires
// the READ_CALL_LOG runtime permission.
@Composable
actual fun VeskCallLog(
    label: String,
    onDone: ((List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listCallLogs(onDone) }, modifier = modifier) { Text(label) }
}

// <messages onDone={(list) => ...}> lists "sender: body" rows; requires the
// READ_SMS runtime permission.
@Composable
actual fun VeskMessages(
    label: String,
    onDone: ((List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listMessages(onDone) }, modifier = modifier) { Text(label) }
}

// <accounts onDone={(list) => ...}> lists "type · name" rows; requires the
// GET_ACCOUNTS runtime permission.
@Composable
actual fun VeskAccounts(
    label: String,
    onDone: ((List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listAccounts(onDone) }, modifier = modifier) { Text(label) }
}

// <clipboard onDone={(text) => ...}> reads the current clipboard text.
@Composable
actual fun VeskClipboard(
    label: String,
    onDone: ((String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.readClipboard(onDone) }, modifier = modifier) { Text(label) }
}

// <copy-to-clipboard value="..."> writes text to the clipboard.
@Composable
actual fun VeskCopyToClipboard(
    value: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.copyToClipboard(value, onDone) }, modifier = modifier) { Text(label) }
}

// <vibrate duration="200"> pulses the vibrator for the given milliseconds.
@Composable
actual fun VeskVibrate(
    label: String,
    duration: Long,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.vibrate(duration, onDone) }, modifier = modifier) { Text(label) }
}

// <torch> toggles the camera flash (no permission needed for torch mode).
@Composable
actual fun VeskTorch(
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toggleTorch(onDone) }, modifier = modifier) { Text(label) }
}

// <screenshot onDone={(path) => ...}> captures the current window to a PNG in
// the app cache (also device.lastScreenshot).
@Composable
actual fun VeskScreenshot(
    label: String,
    onDone: ((String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.captureScreenshot(onDone) }, modifier = modifier) { Text(label) }
}

// <share-text text="..."> opens the system share sheet with plain text.
@Composable
actual fun VeskShareText(
    text: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.shareText(text, onDone) }, modifier = modifier) { Text(label) }
}

// <share-file path="..." mime="..."> shares a file through its FileProvider
// URI (the path can be a device path or a content:// URI).
@Composable
actual fun VeskShareFile(
    path: String?,
    mime: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { if (path != null) device.shareFile(path, mime, onDone) }, modifier = modifier) { Text(label) }
}

// <biometric-auth> checks hardware then prompts (fingerprint/face);
// onDone = (ok, reason).
@Composable
actual fun VeskBiometricAuth(
    label: String,
    onDone: ((Boolean, String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.checkBiometrics(); device.authenticate(onDone) }, modifier = modifier) { Text(label) }
}

// <bluetooth> refreshes adapter state + bonded devices.
@Composable
actual fun VeskBluetooth(
    label: String,
    onDone: ((Boolean, List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshBluetooth(onDone) }, modifier = modifier) { Text(label) }
}

// <bluetooth-toggle> flips the adapter.
@Composable
actual fun VeskBluetoothToggle(
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toggleBluetooth(!device.bluetoothEnabled, onDone) }, modifier = modifier) { Text(label) }
}

// <bluetooth-scan> discovers nearby devices for a few seconds.
@Composable
actual fun VeskBluetoothScan(
    label: String,
    onDone: ((List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.scanBluetooth(6, onDone) }, modifier = modifier) { Text(label) }
}

// <screen-record> toggles MediaProjection capture (system consent first).
@Composable
actual fun VeskScreenRecord(
    label: String,
    onDone: ((String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(
        onClick = {
            if (device.screenRecording) onDone?.invoke(device.stopScreenRecord())
            else device.startScreenRecord(onDone)
        },
        modifier = modifier,
    ) { Text(if (device.screenRecording) "Stop recording" else label) }
}

// <volume> reports media volume + ringer mode.
@Composable
actual fun VeskVolume(
    label: String,
    onDone: ((Int, String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshVolume(onDone) }, modifier = modifier) { Text(label) }
}

// <set-volume value="60"> sets the media stream volume 0-100.
@Composable
actual fun VeskSetVolume(
    value: Int,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setVolume(value, onDone) }, modifier = modifier) { Text(label) }
}

// <brightness value="80"> sets this window's brightness 0-100.
@Composable
actual fun VeskBrightness(
    value: Int,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setScreenBrightness(value, onDone) }, modifier = modifier) { Text(label) }
}

// <keep-awake value="true"> pins the screen on/off while the app is visible.
@Composable
actual fun VeskKeepAwake(
    value: Boolean,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setKeepAwake(value, onDone) }, modifier = modifier) { Text(label) }
}

// <orientation mode="portrait|landscape|auto"> locks the app orientation.
@Composable
actual fun VeskOrientation(
    mode: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.lockOrientation(mode, onDone) }, modifier = modifier) { Text(label) }
}

// <device-info> reports "manufacturer model · Android X · WxH".
@Composable
actual fun VeskDeviceInfo(
    label: String,
    onDone: ((String) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshDeviceInfo(onDone) }, modifier = modifier) { Text(label) }
}

// <storage-status> reports free/total app storage.
@Composable
actual fun VeskStorage(
    label: String,
    onDone: ((String, String) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshStorage(onDone) }, modifier = modifier) { Text(label) }
}

// <sensor type="light|proximity|accelerometer|gyroscope|temperature">
@Composable
actual fun VeskSensor(
    type: String,
    label: String,
    onDone: ((String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.readSensor(type, onDone) }, modifier = modifier) { Text(label) }
}

// <toast text="..."> shows an Android toast.
@Composable
actual fun VeskToast(
    text: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toast(text, onDone = onDone) }, modifier = modifier) { Text(label) }
}

// <sound kind="notification|alarm|ringtone"> plays a system sound.
@Composable
actual fun VeskSound(
    kind: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.playSound(kind, onDone) }, modifier = modifier) { Text(label) }
}

// <wallpaper path="..."> sets the home/lock wallpaper from an image file.
@Composable
actual fun VeskWallpaper(
    path: String?,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { if (path != null) device.setWallpaper(path, onDone) }, modifier = modifier) { Text(label) }
}

// <calendar> lists upcoming events (READ_CALENDAR prompt on first use).
@Composable
actual fun VeskCalendar(
    label: String,
    onDone: ((List<String>) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listCalendarEvents(onDone) }, modifier = modifier) { Text(label) }
}

// <nfc> refreshes NFC presence + state.
@Composable
actual fun VeskNfc(
    label: String,
    onDone: ((Boolean, Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshNfc(onDone) }, modifier = modifier) { Text(label) }
}

// <sim> refreshes carrier + SIM state.
@Composable
actual fun VeskSim(
    label: String,
    onDone: ((String?, String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshTelephony(onDone) }, modifier = modifier) { Text(label) }
}

// <dial number="+1555..."> opens the dialer pre-filled.
@Composable
actual fun VeskDial(
    number: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.dial(number, onDone) }, modifier = modifier) { Text(label) }
}

// <sms number="..." text="..."> opens the messenger pre-filled.
@Composable
actual fun VeskSms(
    number: String,
    text: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.sendSms(number, text, onDone) }, modifier = modifier) { Text(label) }
}

// <email to="..." subject="..." body="..."> opens the mail client.
@Composable
actual fun VeskEmail(
    to: String,
    subject: String,
    body: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.sendEmail(to, subject, body, onDone) }, modifier = modifier) { Text(label) }
}

// <open-link url="https://..."> opens a URL in the browser.
@Composable
actual fun VeskLink(
    url: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openUrl(url, onDone) }, modifier = modifier) { Text(label) }
}

// <map query="..."> opens Google Maps with a place query.
@Composable
actual fun VeskMap(
    query: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openMaps(query, onDone) }, modifier = modifier) { Text(label) }
}

// <alarm hour="8" minute="30" title="..."> sets an alarm clock.
@Composable
actual fun VeskAlarm(
    hour: Int,
    minute: Int,
    title: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setAlarm(hour, minute, title, onDone) }, modifier = modifier) { Text(label) }
}

// <open-settings section="wifi|bluetooth|location|sound|display|security|apps|nfc|main">
@Composable
actual fun VeskOpenSettings(
    section: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openSettings(section, onDone) }, modifier = modifier) { Text(label) }
}

// <open-app app="com.android.settings"> launches an installed app.
@Composable
actual fun VeskOpenApp(
    app: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openApp(app, onDone) }, modifier = modifier) { Text(label) }
}

// <speak text="..."> speaks the text with the system TTS engine.
@Composable
actual fun VeskSpeak(
    text: String,
    label: String,
    onDone: ((Boolean) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.speak(text, onDone) }, modifier = modifier) { Text(label) }
}
` },
  'veskQr': { deps: ['veskDeviceApi'],
    expect: `
@Composable
expect fun VeskQrCode(value: String = "", modifier: Modifier = Modifier)
@Composable
expect fun VeskQrScanner(label: String = "Scan QR", onResult: ((String?) -> Unit)? = null, modifier: Modifier = Modifier)
`,
    src: `
// QR code helpers: inline <qr-code value="..."> rendering (ZXing) and the
// <qr-scanner> button that opens the camera overlay. Own unit so the zxing
// dependency ships only for apps that actually render or scan QR codes.
// Encodes text to a QR bitmap (ZXing); null when the payload is empty.
private fun veskQrBitmap(text: String, size: Int = 512): ImageBitmap? {
    if (text.isBlank()) return null
    val matrix = runCatching {
        MultiFormatWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to 1))
    }.getOrNull() ?: return null
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    for (x in 0 until size) {
        for (y in 0 until size) {
            bmp.setPixel(x, y, if (matrix.get(x, y)) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
        }
    }
    return bmp.asImageBitmap()
}

// <qr-code value="..."> renders the encoded QR bitmap inline (no button).
@Composable
actual fun VeskQrCode(
    value: String,
    modifier: Modifier,
) {
    val bmp = remember(value) { veskQrBitmap(value) }
    if (bmp != null) Image(bitmap = bmp, contentDescription = null, modifier = modifier)
}

// <qr-scanner> opens the camera overlay and reports the decoded text.
@Composable
actual fun VeskQrScanner(
    label: String,
    onResult: ((String?) -> Unit)?,
    modifier: Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.scanQr(onResult) }, modifier = modifier) { Text(label) }
}
` },
  'veskDragDrop': { deps: [],
    expect: `
expect class VeskDragData(text: String) {
    val text: String
}
expect object VeskDragSession { var pendingText: String? }
expect fun Modifier.veskDraggable(data: VeskDragData): Modifier
@Composable
expect fun Modifier.veskDropTarget(onDrop: (String?) -> Unit): Modifier
`,
    src: `
// Drag and drop (markup-level): drag sources via the draggable attribute,
// drop targets via the ondrop binding. Backed by the platform drag & drop,
// so dragged text also lands in other apps.
actual class VeskDragData actual constructor(actual val text: String)

// Same-app fallback: some devices deliver the platform drag without a
// readable clip, so the source records the pending text at drag start.
actual object VeskDragSession { @Volatile actual var pendingText: String? = null }

actual fun Modifier.veskDraggable(data: VeskDragData): Modifier = this.dragAndDropSource(transferData = {
    VeskDragSession.pendingText = data.text
    DragAndDropTransferData(ClipData.newPlainText("vesk", data.text), flags = View.DRAG_FLAG_GLOBAL)
})

@OptIn(ExperimentalComposeUiApi::class)
@Composable
actual fun Modifier.veskDropTarget(onDrop: (String?) -> Unit): Modifier {
    val ctx = LocalContext.current
    return this.dragAndDropTarget(
        shouldStartDragAndDrop = { true },
        target = object : DragAndDropTarget {
            override fun onDrop(event: DragAndDropEvent): Boolean {
                val text = runCatching { event.toAndroidDragEvent().clipData.getItemAt(0).text?.toString() }.getOrNull()
                    ?: VeskDragSession.pendingText
                onDrop(text)
                return true
            }
        },
    )
}
` },
  'veskVideo': { deps: ['veskMediaHub', 'veskFocus'],
    expect: `
@Composable
expect fun veskVideo(
    url: String?,
    controls: Boolean = false,
    autoplay: Boolean = false,
    loop: Boolean = false,
    muted: Boolean = false,
    scale: String = "fit",
    broadcast: Boolean = __BROADCAST__,
    modifier: Modifier = Modifier,
)
`,
    src: `
// <video src controls autoplay loop muted object-cover> -> TextureView +
// MediaPlayer. Bundled assets arrive as android.resource:// URIs, device paths
// get file:// encoding, picker/camera output arrives as content:// URIs.
// object-cover / object-contain / object-fill map to crop / fit / fill via
// surface transform. Starting playback requests audio focus, pauses any other
// vesk media, and by default broadcasts a media session + notification
// (broadcast=false via media.broadcast in config turns that off).
@Composable
actual fun veskVideo(
    url: String?,
    controls: Boolean,
    autoplay: Boolean,
    loop: Boolean,
    muted: Boolean,
    scale: String,
    broadcast: Boolean,
    modifier: Modifier,
) {
    val context = LocalContext.current
    if (url == null) return
    val title = remember(url) { url.substringAfterLast('/') }
    val textureView = remember(url) { TextureView(context) }
    val player = remember(url) { mutableStateOf<MediaPlayer?>(null) }
    var playing by remember(url) { mutableStateOf(false) }
    var ready by remember(url) { mutableStateOf(false) }

    fun applyTransform(mp: MediaPlayer?, viewW: Int, viewH: Int) {
        val mp = mp ?: return
        val vw = mp.videoWidth
        val vh = mp.videoHeight
        if (vw <= 0 || vh <= 0 || viewW <= 0 || viewH <= 0) return
        val m = Matrix()
        when (scale) {
            "crop" -> {
                val s = maxOf(viewW.toFloat() / vw, viewH.toFloat() / vh)
                m.setScale(s, s)
                m.postTranslate((viewW - vw * s) / 2f, (viewH - vh * s) / 2f)
            }
            "fill" -> m.setScale(viewW.toFloat() / vw, viewH.toFloat() / vh)
            "none" -> Unit
            else -> {
                val s = minOf(viewW.toFloat() / vw, viewH.toFloat() / vh)
                m.setScale(s, s)
                m.postTranslate((viewW - vw * s) / 2f, (viewH - vh * s) / 2f)
            }
        }
        textureView.setTransform(m)
    }

    var startPlay: () -> Unit = {}
    var pausePlay: () -> Unit = {}

    // Media notification (androidx.media MediaStyle) driven by a session so
    // system media controls reach this player too.
    val notify = remember(url) {
        { session: MediaSessionCompat, isPlaying: Boolean ->
            val channelId = "vesk_media"
            if (Build.VERSION.SDK_INT >= 26) {
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val ch = NotificationChannel(channelId, "Media playback", NotificationManager.IMPORTANCE_LOW)
                ch.setShowBadge(false)
                nm.createNotificationChannel(ch)
            }
            val action = when {
                isPlaying -> KeyEvent.KEYCODE_MEDIA_PAUSE
                else -> KeyEvent.KEYCODE_MEDIA_PLAY
            }
            val n = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)
                .setContentTitle(title)
                .setContentText(if (isPlaying) "Playing" else "Paused")
                .setOngoing(isPlaying)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setStyle(MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0))
                .addAction(
                    NotificationCompat.Action(
                        android.R.drawable.ic_media_play,
                        if (isPlaying) "Pause" else "Play",
                        MediaButtonReceiver.buildMediaButtonPendingIntent(context, action.toLong()),
                    )
                )
                .build()
            NotificationManagerCompat.from(context).notify(url.hashCode(), n)
        }
    }

    val session = remember(url) {
        if (!broadcast) null
        else MediaSessionCompat(context, "vesk_video").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { startPlay() }
                override fun onPause() { pausePlay() }
            })
            isActive = true
        }
    }

    // MediaPlayerControl bridges the MediaController overlay to this player
    // while keeping the native semantics: play pauses other vesk media and
    // grabs audio focus; pause releases it.
    val control = remember(url) {
        object : MediaPlayerControl, VeskMediaHub.VeskPlayer {
            override fun start() { startPlay() }
            override fun pause() { pausePlay() }
            override fun getDuration(): Int = player.value?.duration ?: 0
            override fun getCurrentPosition(): Int = player.value?.currentPosition ?: 0
            override fun seekTo(pos: Int) { player.value?.seekTo(pos) }
            override fun isPlaying(): Boolean = player.value?.isPlaying ?: false
            override fun getBufferPercentage(): Int = 0
            override fun canPause(): Boolean = true
            override fun canSeekBackward(): Boolean = true
            override fun canSeekForward(): Boolean = true
            override fun getAudioSessionId(): Int = player.value?.audioSessionId ?: 0
        }
    }

    startPlay = {
        val m = player.value
        if (m != null) {
            if (muted) m.setVolume(0f, 0f)
            VeskMediaHub.activate(control)
            VeskFocus.request(context, onLoss = { pausePlay() }, onGain = {})
            m.start()
            playing = true
            val s = session
            if (s != null) {
                VeskMediaHub.mediaSession = s
                notify(s, true)
            }
        }
    }
    pausePlay = {
        val m = player.value
        if (m != null && m.isPlaying) m.pause()
        playing = false
        VeskFocus.abandon(context)
        VeskMediaHub.deactivate(control)
        session?.let { notify(it, false) }
    }

    val surfaceListener = remember(url, scale) {
        object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                if (player.value != null) return
                val uri = if (url.startsWith("/")) Uri.fromFile(java.io.File(url)) else Uri.parse(url)
                val mp = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MOVIE).build()
                    )
                    setSurface(Surface(surface))
                    setDataSource(context, uri)
                    setOnPreparedListener {
                        ready = true
                        if (muted) setVolume(0f, 0f)
                        applyTransform(this, width, height)
                        if (autoplay) control.start()
                    }
                    setOnVideoSizeChangedListener { _, w, h -> applyTransform(this, w, h) }
                    setOnCompletionListener { mp2 ->
                        if (loop) {
                            mp2.seekTo(0)
                            control.start()
                        } else {
                            playing = false
                            VeskFocus.abandon(context)
                            VeskMediaHub.deactivate(control)
                            session?.let { notify(it, false) }
                        }
                    }
                    setOnErrorListener { _, _, _ -> playing = false; true }
                    prepareAsync()
                }
                player.value = mp
            }
            override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {
                applyTransform(player.value, width, height)
            }
            override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean = true
            override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            player.value?.let { mp -> if (mp.isPlaying) mp.pause(); mp.release() }
            player.value = null
            val s = session
            if (s != null) {
                s.release()
                NotificationManagerCompat.from(context).cancel(url.hashCode())
            }
            VeskFocus.abandon(context)
            VeskMediaHub.deactivate(control)
        }
    }

    key(url) {
        AndroidView(
            factory = {
                textureView.surfaceTextureListener = surfaceListener
                if (controls) {
                    val mc = MediaController(context)
                    mc.setAnchorView(textureView)
                    mc.setMediaPlayer(control)
                }
                textureView
            },
            modifier = modifier,
        )
    }
}
` },
  'veskAudio': { deps: ['veskMediaHub', 'veskFocus'],
    expect: `
@Composable
expect fun veskAudio(
    url: String?,
    controls: Boolean = true,
    autoplay: Boolean = false,
    loop: Boolean = false,
    muted: Boolean = false,
    broadcast: Boolean = __BROADCAST__,
    modifier: Modifier = Modifier,
)
`,
    src: `
// <audio controls autoplay loop muted> -> MediaPlayer backed by a compact
// play/pause bar. Without controls the player is invisible but still plays.
// Starting playback pauses other vesk media, requests audio focus, and by
// default broadcasts a media session + notification (lock screen / quick
// settings / headset buttons). broadcast=false (media.broadcast in config)
// turns the session off per app.
@Composable
actual fun veskAudio(
    url: String?,
    controls: Boolean,
    autoplay: Boolean,
    loop: Boolean,
    muted: Boolean,
    broadcast: Boolean,
    modifier: Modifier,
) {
    val context = LocalContext.current
    if (url == null) return
    val title = remember(url) { url.substringAfterLast('/') }
    var playing by remember(url) { mutableStateOf(false) }
    var ready by remember(url) { mutableStateOf(false) }

    var startPlay: () -> Unit = {}
    var pausePlay: () -> Unit = {}

    val player = remember(url) {
        runCatching {
            MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                isLooping = loop
                if (muted) setVolume(0f, 0f)
                setDataSource(context, if (url.startsWith("/")) Uri.fromFile(java.io.File(url)) else Uri.parse(url))
                setOnPreparedListener {
                    ready = true
                    if (autoplay) startPlay()
                }
                setOnCompletionListener {
                    if (loop) {
                        seekTo(0)
                        startPlay()
                    } else {
                        pausePlay()
                    }
                }
                setOnErrorListener { _, _, _ -> playing = false; true }
                prepareAsync()
            }
        }.getOrNull()
    }

    // Media notification (androidx.media MediaStyle) driven by a session so
    // system media controls reach this player.
    val notify = remember(url) {
        { session: MediaSessionCompat, isPlaying: Boolean ->
            val channelId = "vesk_media"
            if (Build.VERSION.SDK_INT >= 26) {
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val ch = NotificationChannel(channelId, "Media playback", NotificationManager.IMPORTANCE_LOW)
                ch.setShowBadge(false)
                nm.createNotificationChannel(ch)
            }
            val action = when {
                isPlaying -> KeyEvent.KEYCODE_MEDIA_PAUSE
                else -> KeyEvent.KEYCODE_MEDIA_PLAY
            }
            val n = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)
                .setContentTitle(title)
                .setContentText(if (isPlaying) "Playing" else "Paused")
                .setOngoing(isPlaying)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setStyle(MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0))
                .addAction(
                    NotificationCompat.Action(
                        if (isPlaying) android.R.drawable.ic_media_play else android.R.drawable.ic_media_play,
                        if (isPlaying) "Pause" else "Play",
                        MediaButtonReceiver.buildMediaButtonPendingIntent(context, action.toLong()),
                    )
                )
                .build()
            NotificationManagerCompat.from(context).notify(url.hashCode(), n)
        }
    }

    // Playbook used by the bar, the session callback and autoplay alike.
    val hub = remember(url) {
        object : VeskMediaHub.VeskPlayer {
            override fun pause() {
                if (player?.isPlaying != true) return
                pausePlay()
            }
        }
    }
    val createdSession = remember(url) {
        if (!broadcast) null
        else MediaSessionCompat(context, "vesk_audio").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { startPlay() }
                override fun onPause() { pausePlay() }
            })
            isActive = true
        }
    }

    startPlay = {
        if (ready && player != null) {
            VeskMediaHub.activate(hub)
            VeskFocus.request(context, onLoss = { pausePlay() }, onGain = {})
            player.start()
            playing = true
            val s = createdSession
            if (s != null) {
                VeskMediaHub.mediaSession = s
                notify(s, true)
            }
        }
    }
    pausePlay = {
        if (player?.isPlaying == true) player.pause()
        playing = false
        VeskFocus.abandon(context)
        VeskMediaHub.mediaSession = null
        VeskMediaHub.deactivate(hub)
        createdSession?.let { notify(it, false) }
    }

    DisposableEffect(Unit) {
        onDispose {
            player?.let { if (it.isPlaying) it.pause(); it.release() }
            val s = createdSession
            if (s != null) {
                s.release()
                NotificationManagerCompat.from(context).cancel(url.hashCode())
            }
            VeskFocus.abandon(context)
            VeskMediaHub.deactivate(hub)
        }
    }

    if (!controls) return
    if (player == null) {
        Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
            Text(
                "missing audio · " + title,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Button(
            onClick = { if (player.isPlaying) pausePlay() else startPlay() },
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
        ) {
            Text(if (playing) "Pause" else "Play", fontSize = 12.sp)
        }
        Spacer(Modifier.width(12.dp))
        Text(
            if (playing) "Playing" else "Paused",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
` },
  'veskFileImage': { deps: [],
    expect: `
@Composable
expect fun veskFileImage(path: String?): ImageBitmap
`,
    src: `
// <img src="/storage/..."> (or content:// and file://): runtime decode from
// device storage. Missing/unreadable files render a transparent placeholder.
@Composable
actual fun veskFileImage(path: String?): ImageBitmap {
    val context = LocalContext.current
    val bmp = remember(path) {
        if (path == null) null
        else runCatching {
            if (path.startsWith("content://")) {
                context.contentResolver.openInputStream(android.net.Uri.parse(path))?.use {
                    android.graphics.BitmapFactory.decodeStream(it)
                }
            } else {
                android.graphics.BitmapFactory.decodeFile(path)
            }
        }.getOrNull()
    }
    if (bmp != null) return bmp.asImageBitmap()
    return remember(path) { ImageBitmap(1, 1) }
}
` },
  'veskColorFilter': { deps: [], platform: 'common', src: `
// Tailwind color filter base: color-matrix saveLayer; works on all API levels.
private fun Modifier.veskColorFilter(matrix: ColorMatrix): Modifier = drawWithContent {
    val paint = Paint().apply { colorFilter = ColorFilter.colorMatrix(matrix) }
    drawContext.canvas.saveLayer(Rect(0f, 0f, size.width, size.height), paint)
    drawContent()
    drawContext.canvas.restore()
}
` },
  'veskBrightness': { deps: ['veskColorFilter'], platform: 'common', src: `
fun Modifier.veskBrightness(mult: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        mult, 0f, 0f, 0f, 0f,
        0f, mult, 0f, 0f, 0f,
        0f, 0f, mult, 0f, 0f,
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskContrast': { deps: ['veskColorFilter'], platform: 'common', src: `
fun Modifier.veskContrast(c: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        c, 0f, 0f, 0f, 128f * (1f - c),
        0f, c, 0f, 0f, 128f * (1f - c),
        0f, 0f, c, 0f, 128f * (1f - c),
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskGrayscale': { deps: ['veskColorFilter'], platform: 'common', src: `
fun Modifier.veskGrayscale(factor: Float): Modifier = veskColorFilter(
    ColorMatrix().also { it.setToSaturation(1f - factor) }
)
` },
  'veskSaturate': { deps: ['veskColorFilter'], platform: 'common', src: `
fun Modifier.veskSaturate(s: Float): Modifier = veskColorFilter(
    ColorMatrix().also { it.setToSaturation(s) }
)
` },
  'veskInvert': { deps: ['veskColorFilter'], platform: 'common', src: `
fun Modifier.veskInvert(factor: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        -factor, 0f, 0f, 0f, 255f * factor,
        0f, -factor, 0f, 0f, 255f * factor,
        0f, 0f, -factor, 0f, 255f * factor,
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskSepia': { deps: ['veskColorFilter'], platform: 'common', src: `
fun Modifier.veskSepia(factor: Float): Modifier = veskColorFilter(
    ColorMatrix(floatArrayOf(
        0.393f * factor + (1f - factor), 0.769f * factor, 0.189f * factor, 0f, 0f,
        0.349f * factor, 0.686f * factor + (1f - factor), 0.168f * factor, 0f, 0f,
        0.272f * factor, 0.534f * factor, 0.131f * factor + (1f - factor), 0f, 0f,
        0f, 0f, 0f, 1f, 0f,
    ))
)
` },
  'veskHueRotate': { deps: ['veskColorFilter'], platform: 'common', src: `
fun Modifier.veskHueRotate(degrees: Float): Modifier {
    val rad = degrees * kotlin.math.PI / 180.0
    val cosA = kotlin.math.cos(rad).toFloat()
    val sinA = kotlin.math.sin(rad).toFloat()
    return veskColorFilter(
        ColorMatrix(floatArrayOf(
            0.213f + cosA * 0.787f - sinA * 0.213f, 0.715f - cosA * 0.715f - sinA * 0.715f, 0.072f - cosA * 0.072f + sinA * 0.928f, 0f, 0f,
            0.213f - cosA * 0.213f + sinA * 0.143f, 0.715f + cosA * 0.285f + sinA * 0.140f, 0.072f - cosA * 0.072f - sinA * 0.283f, 0f, 0f,
            0.213f - cosA * 0.213f - sinA * 0.787f, 0.715f - cosA * 0.715f + sinA * 0.715f, 0.072f + cosA * 0.928f + sinA * 0.072f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f,
        ))
    )
}
` },
  'veskDashedBorder': { deps: [], platform: 'common', src: `
// Dashed/dotted borders (border-dashed / border-dotted) drawn as strokes
// behind the element content.
fun Modifier.veskDashedBorder(width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val stroke = Stroke(width = width.toPx(), pathEffect = PathEffect.dashPathEffect(dashes))
    drawRoundRect(color = color, style = stroke)
}
` },
  'veskSideBorder': { deps: [], platform: 'common', src: `
// Per-side borders (border-t/r/b/l, border-x/y).
fun Modifier.veskSideBorder(top: Dp, end: Dp, bottom: Dp, start: Dp, color: Color): Modifier = drawBehind {
    val w = floatArrayOf(top.toPx(), end.toPx(), bottom.toPx(), start.toPx())
    val s = size
    if (w[0] > 0f) drawLine(color, Offset(0f, w[0] / 2f), Offset(s.width, w[0] / 2f), w[0])
    if (w[1] > 0f) drawLine(color, Offset(s.width - w[1] / 2f, 0f), Offset(s.width - w[1] / 2f, s.height), w[1])
    if (w[2] > 0f) drawLine(color, Offset(0f, s.height - w[2] / 2f), Offset(s.width, s.height - w[2] / 2f), w[2])
    if (w[3] > 0f) drawLine(color, Offset(w[3] / 2f, 0f), Offset(w[3] / 2f, s.height), w[3])
}
` },
  'veskDivideLine': { deps: [], platform: 'common', src: `
// Single dashed/dotted divider line (divide-dashed / divide-dotted).
fun Modifier.veskDivideLine(horizontal: Boolean, width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val w = width.toPx()
    if (horizontal) {
        drawLine(color, Offset(0f, w / 2f), Offset(size.width, w / 2f), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    } else {
        drawLine(color, Offset(w / 2f, 0f), Offset(w / 2f, size.height), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    }
}
` },
  'veskSkew': { deps: [], platform: 'common', src: `
// Skew transform (skew-x / skew-y) via canvas transform.
fun Modifier.veskSkew(sx: Float, sy: Float): Modifier = drawWithContent {
    val canvas = drawContext.canvas
    canvas.save()
    canvas.skew(sx, sy)
    drawContent()
    canvas.restore()
}
` },
  'Link': { deps: [], platform: 'common', src: `
data class LinkProps(
    val href: String = "",
    val \`class\`: String = "",
)

@Composable
fun Link(props: LinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = Modifier.clickable(onClick = { nav.navigate(props.href) })) {
        content()
    }
}
` },
  'rememberRouteScrollState': { deps: [], platform: 'common', src: `
// Scroll state for overflow-y-auto / overflow-x-auto containers. The scroll
// wrapper (typically a layout shell) stays in composition across navigations,
// so plain rememberScrollState would resume the previous page's offset. The
// NavController keeps one ScrollState per route on the stack: a page that was
// never visited (or was popped) starts at the top; going back restores the
// exact offset the page had when it was left — NavHost-style behaviour.
@Composable
fun rememberRouteScrollState(initial: Int = 0): ScrollState {
    val nav = LocalNavController.current
    val route = nav.currentRoute.value
    return remember(route) { nav.scrollStateFor(route, initial) }
}
` },
  'NavLink': { deps: [], platform: 'common', src: `
data class NavLinkProps(
    val href: String = "",
    val \`class\`: String = "",
)

@Composable
fun NavLink(props: NavLinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = Modifier.clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }, onClick = { nav.navigate(props.href) })) {
        content()
    }
}
` },
  'Outlet': { deps: [], platform: 'common', src: `
@Composable
fun Outlet(content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    val route = nav.currentRoute.value
    if (route.isNotEmpty()) {
        content()
    }
}
` },
  'jsString': { deps: [], platform: 'common', src: `
fun jsString(v: Any?): String = when (v) {
    null -> "null"
    is String -> v
    else -> v.toString()
}
` },
  'jsHandleError': {
    deps: [],
    expect: `
// Platform seam: uncaught exceptions in event handlers, timers, and callbacks
// are reported and the app keeps running — an error in one interaction never
// takes the app down (browser window.onerror semantics). Android logs to
// Logcat; the iOS actual arrives with the CMP milestone.
expect fun jsHandleError(e: Throwable)`,
    src: `
actual fun jsHandleError(e: Throwable) {
    android.util.Log.e("vesk", "uncaught exception (app continues): " + e.message, e)
}
` },
  'jsSafe': { deps: ['jsHandleError'], platform: 'common', src: `
// Wrap an event-handler lambda so a throw reports instead of crashing: the
// browser fires window.onerror and the page keeps running, and so do we.
fun jsSafe(fn: () -> Unit): () -> Unit = { try { fn() } catch (e: Throwable) { jsHandleError(e) } }
` },
  'jsTypeof': { deps: [], platform: 'common', src: `
fun jsTypeof(v: Any?): String = when (v) {
    null -> "object"
    is String -> "string"
    is Boolean -> "boolean"
    is Number -> "number"
    is Function<*> -> "function"
    else -> "object"
}
` },
  'jsGlobalIsNaN': { deps: [], platform: 'common', src: `
fun jsGlobalIsNaN(v: Any?): Boolean = when (v) {
    is Double -> v.isNaN()
    is Float -> v.isNaN()
    is Number -> false
    is Boolean -> false
    null -> false
    is String -> { val t = v.trim(); t.isNotEmpty() && t.toDoubleOrNull() == null }
    else -> true
}
` },
  'jsGlobalIsFinite': { deps: [], platform: 'common', src: `
fun jsGlobalIsFinite(v: Any?): Boolean = when (v) {
    is Double -> v.isFinite()
    is Float -> v.isFinite()
    is Number -> true
    is Boolean -> true
    null -> true
    is String -> { val t = v.trim(); t.isEmpty() || t.toDoubleOrNull()?.isFinite() == true }
    else -> false
}
` },
  'jsStrictIsNaN': { deps: [], platform: 'common', src: `
fun jsStrictIsNaN(v: Any?): Boolean = when (v) {
    is Double -> v.isNaN()
    is Float -> v.isNaN()
    else -> false
}
` },
  'jsStrictIsFinite': { deps: [], platform: 'common', src: `
fun jsStrictIsFinite(v: Any?): Boolean = when (v) {
    is Double -> v.isFinite()
    is Float -> v.isFinite()
    else -> false
}
` },
  'jsIsInteger': { deps: [], platform: 'common', src: `
fun jsIsInteger(v: Any?): Boolean = when (v) {
    is Double -> !v.isNaN() && !v.isInfinite() && v % 1.0 == 0.0
    is Float -> !v.isNaN() && !v.isInfinite() && v % 1.0f == 0.0f
    is Number -> true
    else -> false
}
` },
  'jsParseInt': { deps: ['jsString'], platform: 'common', src: `
fun jsParseInt(v: Any?, radix: Any? = null): Int {
    var s = jsString(v).trim()
    var sign = 1
    if (s.startsWith("-")) { sign = -1; s = s.substring(1) }
    else if (s.startsWith("+")) s = s.substring(1)
    var r = when (radix) { is Number -> radix.toInt(); else -> 10 }
    if (r == 0) r = 10
    if (r == 16 && s.startsWith("0x")) s = s.substring(2)
    else if (r == 16 && s.startsWith("0X")) s = s.substring(2)
    if (r < 2 || r > 36) return 0
    var acc = 0L
    for (ch in s) {
        val d = when (ch) {
            in '0'..'9' -> ch - '0'
            in 'a'..'z' -> ch - 'a' + 10
            in 'A'..'Z' -> ch - 'A' + 10
            else -> break
        }
        if (d >= r) break
        acc = acc * r + d
    }
    return (acc * sign).toInt()
}
` },
  'jsParseFloat': { deps: ['jsString'], platform: 'common', src: `
fun jsParseFloat(v: Any?): Double = jsString(v).trim().toDoubleOrNull() ?: 0.0
` },
  'jsEncodeURIComponent': {
    deps: ['jsString'],
    expect: `
// Platform seam: browser encodeURIComponent semantics. Android uses
// java.net.URLEncoder; the iOS actual arrives with the CMP milestone.
expect fun jsEncodeURIComponent(v: Any?): String`,
    src: `
actual fun jsEncodeURIComponent(v: Any?): String = java.net.URLEncoder.encode(jsString(v), "UTF-8").replace("+", "%20")
` },
  'jsDecodeURIComponent': {
    deps: ['jsString'],
    expect: `
// Platform seam: browser decodeURIComponent semantics (android actual keeps
// the JVM URLDecoder behavior; iOS actual arrives with the CMP milestone).
expect fun jsDecodeURIComponent(v: Any?): String`,
    src: `
actual fun jsDecodeURIComponent(v: Any?): String = java.net.URLDecoder.decode(jsString(v), "UTF-8")
` },
  'jsEncodeURI': {
    deps: ['jsString'],
    expect: `
// Platform seam: browser encodeURI semantics (leaves URI-reserved characters
// unescaped). Android actual = JVM URLEncoder + unescape pass, unchanged.
expect fun jsEncodeURI(v: Any?): String`,
    src: `
actual fun jsEncodeURI(v: Any?): String = java.net.URLEncoder.encode(jsString(v), "UTF-8")
    .replace("+", "%20")
    .replace("%2C", ",")
    .replace("%2F", "/")
    .replace("%3A", ":")
    .replace("%3F", "?")
    .replace("%40", "@")
    .replace("%26", "&")
    .replace("%3D", "=")
    .replace("%2B", "+")
    .replace("%24", "$")
    .replace("%23", "#")
    .replace("%21", "!")
    .replace("%27", "'")
    .replace("%28", "(")
    .replace("%29", ")")
    .replace("%7E", "~")
` },
  'jsDecodeURI': {
    deps: ['jsString'],
    expect: `
// Platform seam: browser decodeURI semantics (android actual = JVM
// URLDecoder, unchanged; iOS actual arrives with the CMP milestone).
expect fun jsDecodeURI(v: Any?): String`,
    src: `
actual fun jsDecodeURI(v: Any?): String = java.net.URLDecoder.decode(jsString(v), "UTF-8")
` },
  'jsRegexExec': { deps: ['jsString'], platform: 'common', src: `
fun jsAsRegex(v: Any?): Regex = when (v) {
    is Regex -> v
    is String -> Regex(v)
    else -> Regex(jsString(v))
}
fun jsRegexExec(re: Any?, s: Any?): List<String?>? = jsAsRegex(re).find(jsString(s))?.let { m ->
    listOf(m.value) + m.groups.drop(1).map { g -> g?.value }
}
` },
  'jsRegexSearch': { deps: ['jsString'], platform: 'common', src: `
fun jsRegexSearch(re: Any?, s: Any?): Int = jsAsRegex(re).find(jsString(s))?.range?.first ?: -1
` },
  'jsStringify': { deps: [], platform: 'common', src: `
fun jsStringify(v: Any?): String = when (v) {
    null -> "null"
    is String -> "\\"$v\\""
    is Boolean -> v.toString()
    is Number -> v.toString()
    is List<*> -> v.joinToString(",", "[", "]") { jsStringify(it) }
    is Map<*, *> -> v.entries.joinToString(",", "{", "}") { "\\"\${it.key}\\": \${jsStringify(it.value)}" }
    else -> "\\"\${v.toString()}\\""
}
` },
  'jsParseJson': {
    deps: ['jsString'],
    expect: `
// Platform seam: JSON.parse. Android actual = org.json (bundled with the
// platform), unchanged; the iOS actual arrives with the CMP milestone.
expect fun jsParseJson(s: Any?): Any?`,
    src: `
actual fun jsParseJson(s: Any?): Any? = jsJsonValue(org.json.JSONTokener(jsString(s)).nextValue())
private fun jsJsonValue(v: Any?): Any? = when (v) {
    org.json.JSONObject.NULL -> null
    is org.json.JSONObject -> {
        val m = LinkedHashMap<String, Any?>()
        val it = v.keys()
        while (it.hasNext()) { val k = it.next(); m[k] = jsJsonValue(v.opt(k)) }
        m
    }
    is org.json.JSONArray -> List(v.length()) { i -> jsJsonValue(v.opt(i)) }
    else -> v
}
` },
  'jsMapOf': { deps: [], platform: 'common', src: `
fun jsMapOf(from: Any?): LinkedHashMap<Any?, Any?> {
    val out = linkedMapOf<Any?, Any?>()
    (from as List<Any?>).forEach { p -> out[(p as List<Any?>)[0]] = p[1] }
    return out
}
` },
  'jsSetOf': { deps: [], platform: 'common', src: `
fun jsSetOf(from: Any?): LinkedHashSet<Any?> {
    val out = linkedSetOf<Any?>()
    (from as List<Any?>).forEach { out.add(it) }
    return out
}
` },
  'jsMapIterable': { deps: [], platform: 'common', src: `
fun jsMapIterable(map: Any?): List<List<Any?>> = (map as Map<*, *>).map { (k, v) -> listOf(k, v) }
` },
  'jsMapGet': { deps: [], platform: 'common', src: `
fun jsMapGet(map: Any?, key: Any?): Any? = (map as? Map<*, *>)?.get(key)
` },
  'jsMapSet': { deps: [], platform: 'common', src: `
@Suppress("UNCHECKED_CAST")
fun jsMapSet(map: Any?, key: Any?, value: Any?): Any? { (map as MutableMap<Any?, Any?>)[key] = value; return map }
` },
  'jsHas': { deps: [], platform: 'common', src: `
fun jsHas(coll: Any?, key: Any?): Boolean = when (coll) {
    is Map<*, *> -> coll.containsKey(key)
    is Set<*> -> coll.contains(key)
    else -> false
}
` },
  'jsDelete': { deps: [], platform: 'common', src: `
fun jsDelete(coll: Any?, key: Any?): Boolean = when (coll) {
    is MutableMap<*, *> -> if (coll.containsKey(key)) { coll.remove(key); true } else false
    is MutableSet<*> -> coll.remove(key)
    else -> false
}
` },
  'jsClear': { deps: [], platform: 'common', src: `
fun jsClear(coll: Any?) { when (coll) {
    is MutableMap<*, *> -> coll.clear()
    is MutableSet<*> -> coll.clear()
    else -> {}
} }
` },
  'jsMapKeys': { deps: [], platform: 'common', src: `
fun jsMapKeys(map: Any?): Set<Any?> = (map as Map<*, *>).keys
` },
  'jsMapValues': { deps: [], platform: 'common', src: `
fun jsMapValues(map: Any?): Collection<Any?> = (map as Map<*, *>).values
` },
  'jsMapEntries': { deps: [], platform: 'common', src: `
fun jsMapEntries(map: Any?): List<List<Any?>> = (map as Map<*, *>).map { (k, v) -> listOf(k, v) }
` },
  'jsSize': { deps: [], platform: 'common', src: `
fun jsSize(coll: Any?): Int = when (coll) {
    is List<*> -> coll.size
    is Set<*> -> coll.size
    is Map<*, *> -> coll.size
    is String -> coll.length
    else -> 0
}
` },
  'jsLength': { deps: [], platform: 'common', src: `
fun jsLength(coll: Any?): Int = when (coll) {
    is String -> coll.length
    is CharSequence -> coll.length
    is List<*> -> coll.size
    is Set<*> -> coll.size
    is Map<*, *> -> coll.size
    is Array<*> -> coll.size
    else -> 0
}
` },
  'jsForEach': { deps: [], platform: 'common', src: `
fun jsForEach(coll: Any?, cb: (Any?, Any?, Any?) -> Any?) { when (coll) {
    is Map<*, *> -> coll.forEach { (k, v) -> cb(v, k, coll) }
    is Set<*> -> coll.forEach { x -> cb(x, x, coll) }
    is List<*> -> coll.forEachIndexed { i, x -> cb(x, i, coll) }
    is Array<*> -> coll.forEachIndexed { i, x -> cb(x, i, coll) }
    else -> throw Exception("jsForEach: not iterable")
} }
` },
  'jsDateValue': {
    deps: ['jsString'],
    expect: `
// Platform seam: Date.parse / Date.valueOf semantics (epoch milliseconds).
// Android actual = java.time.Instant, unchanged; iOS actual arrives with the
// CMP milestone.
expect fun jsDateValue(v: Any?): Long`,
    src: `
actual fun jsDateValue(v: Any?): Long = when (v) {
    is Number -> v.toLong()
    is String -> try { java.time.Instant.parse(jsString(v)).toEpochMilli() } catch (_: Exception) { java.time.Instant.parse(jsString(v).replace(' ', 'T') + "Z").toEpochMilli() }
    else -> 0L
}
` },
  'jsTagged': { deps: [], platform: 'common', src: `
fun jsTagged(tag: (List<String>, List<Any?>) -> Any?, strings: List<String>, values: List<Any?>): Any? = tag(strings, values)
` },
  'JsConsole': { deps: ['jsString'], platform: 'common', src: `
object JsConsole {
    private val counts = mutableMapOf<String, Int>()
    private val times = mutableMapOf<String, Long>()
    fun count(label: Any?) { val k = jsString(label); val c = (counts[k] ?: 0) + 1; counts[k] = c; println("$k: $c") }
    fun countReset(label: Any?) { counts.remove(jsString(label)) }
    fun time(label: Any?) { times[jsString(label)] = TimeSource.Monotonic.markNow().elapsedNow().inWholeNanoseconds }
    fun timeEnd(label: Any?) { val k = jsString(label); val s = times.remove(k) ?: 0L; println("\$k: \${(TimeSource.Monotonic.markNow().elapsedNow().inWholeNanoseconds - s) / 1_000_000.0} ms") }
}
` },
  'VeskTimers': { deps: ['jsHandleError'], platform: 'common', src: `
object VeskTimers {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val jobs = mutableMapOf<Int, Job>()
    private var nextId = 1
    fun setTimeout(fn: () -> Unit, ms: Any? = 0): Int {
        val id = nextId++
        jobs[id] = scope.launch { delay(ms?.let { num(it) }?.toLong() ?: 0L); jobs.remove(id); try { fn() } catch (e: Throwable) { jsHandleError(e) } }
        return id
    }
    fun setInterval(fn: () -> Unit, ms: Any? = 0): Int {
        val id = nextId++
        jobs[id] = scope.launch { while (isActive) { delay(ms?.let { num(it) }?.toLong() ?: 0L); try { fn() } catch (e: Throwable) { jsHandleError(e) } } }
        return id
    }
    fun clearTimeout(id: Any?) { jobs.remove(num(id).toInt())?.cancel() }
    fun clearInterval(id: Any?) { jobs.remove(num(id).toInt())?.cancel() }
}
` },
  'VeskAppContext': { deps: [], src: `
// Activity anchor for browser-API dialogs. The generated App() composable
// registers the current activity (main thread, once per composition).
object VeskAppContext {
    @Volatile var activity: Activity? = null
    fun setup(context: Context) {
        fun resolve(c: Context): Activity? = when (c) {
            is Activity -> c
            is ContextWrapper -> resolve(c.baseContext)
            else -> null
        }
        activity = resolve(context)
    }
}
// Top-level entry point the generated App() composable calls at startup.
fun veskAppSetup(context: Context) = VeskAppContext.setup(context)
` },
  'jsAlert': { deps: ['VeskAppContext'],
    expect: `
expect fun jsAlert(message: Any?)
`,
    src: `
// window.alert: non-blocking native AlertDialog. A blocking dialog cannot run
// on Android's main thread without ANRing, so alert returns immediately with
// Unit (JS undefined) and shows the dialog asynchronously.
actual fun jsAlert(message: Any?) {
    val ctx = VeskAppContext.activity ?: return
    android.app.AlertDialog.Builder(ctx)
        .setMessage(if (message == null) "" else message.toString())
        .setPositiveButton("OK", null)
        .show()
}
` },
  'VeskWebStorage': { deps: ['VeskAppContext'],
    expect: `
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
`,
    src: `
// localStorage / sessionStorage (Web Storage): localStorage persists across
// restarts in SharedPreferences, sessionStorage lives in memory for the
// process lifetime. JS semantics: values are stored as strings, getItem
// returns null for missing keys, key(i) is the i-th key or null.
actual object VeskWebStorage {
    private val prefs by lazy {
        VeskAppContext.activity?.applicationContext
            ?.getSharedPreferences("vesk_web_storage", android.content.Context.MODE_PRIVATE)
    }
    private val session = LinkedHashMap<String?, String>()

    actual fun localGetItem(key: Any?): Any? = prefs?.getString(key?.toString(), null)
    actual fun localSetItem(key: Any?, value: Any?) { prefs?.edit()?.putString(key?.toString(), storeString(value))?.apply() }
    actual fun localRemoveItem(key: Any?) { prefs?.edit()?.remove(key?.toString())?.apply() }
    actual fun localClear() { prefs?.edit()?.clear()?.apply() }
    actual fun localKey(i: Any?): Any? = localKeys().getOrNull(num(i).toInt())
    actual fun localLength(): Int = localKeys().size

    actual fun sessionGetItem(key: Any?): Any? = session[key?.toString()]
    actual fun sessionSetItem(key: Any?, value: Any?) { session.put(key?.toString(), storeString(value)) }
    actual fun sessionRemoveItem(key: Any?) { session.remove(key?.toString()) }
    actual fun sessionClear() { session.clear() }
    actual fun sessionKey(i: Any?): Any? = session.keys.toList().getOrNull(num(i).toInt())
    actual fun sessionLength(): Int = session.size

    private fun localKeys(): List<String> = prefs?.all?.keys?.sorted() ?: emptyList()
    private fun storeString(v: Any?): String = if (v == null) "null" else v.toString()
}
` },
  'VeskFetch': { deps: ['jsParseJson', 'jsMapGet'],
    expect: `
expect class VeskResponse {
    val url: String
    val status: Int
    val statusText: String
    val ok: Boolean
    val headers: Map<String, String>
    fun text(): String
    fun json(): Any?
}
expect object VeskFetch {
    fun fetch(url: String, init: Any? = null): VeskResponse
}
`,
    src: `
// window.fetch mapped natively. The request runs on the IO dispatcher and
// returns a browser-shaped VeskResponse. vesk-native's fetch is synchronous
// (blocking) until async/await lands; the values (status/ok/statusText/
// text()/json()) match browser semantics.
actual class VeskResponse internal constructor(
    actual val url: String,
    actual val status: Int,
    actual val statusText: String,
    actual val ok: Boolean,
    actual val headers: Map<String, String>,
    private val bodyText: String,
) {
    actual fun text(): String = bodyText
    actual fun json(): Any? = jsParseJson(bodyText)
}

actual object VeskFetch {
    actual fun fetch(url: String, init: Any?): VeskResponse {
        val opts = init as? Map<*, *> ?: emptyMap<Any, Any>()
        val method = (jsMapGet(opts, "method") as? String)?.uppercase() ?: "GET"
        val headers = jsMapGet(opts, "headers") as? Map<*, *> ?: emptyMap<Any, Any>()
        val body = jsMapGet(opts, "body")?.toString()
        return kotlinx.coroutines.runBlocking(kotlinx.coroutines.Dispatchers.IO) {
            val conn = runCatching {
                (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply {
                    requestMethod = method
                    connectTimeout = 8000
                    readTimeout = 8000
                    for ((k, v) in headers) setRequestProperty(k.toString(), v.toString())
                    if (body != null && method != "GET" && method != "HEAD") {
                        doOutput = true
                        outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                    }
                }
            }.getOrElse { return@runBlocking VeskResponse(url, 0, it.message ?: "Network error", false, emptyMap(), "") }
            val code = runCatching { conn.responseCode }.getOrElse { conn.disconnect(); return@runBlocking VeskResponse(url, 0, it.message ?: "Network error", false, emptyMap(), "") }
            val text = runCatching {
                (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            }.getOrElse { conn.disconnect(); return@runBlocking VeskResponse(url, 0, it.message ?: "Network error", false, emptyMap(), "") }
            val hdrs = buildMap {
                var i = 0
                while (true) {
                    val k = conn.getHeaderFieldKey(i) ?: break
                    put(k, conn.getHeaderField(i))
                    i++
                }
            }
            conn.disconnect()
            VeskResponse(url, code, conn.responseMessage ?: "", code in 200..299, hdrs, text)
        }
    }
}
` },
  'VeskSqlite': { deps: ['VeskAppContext'],
    expect: `
expect class VeskSqliteDb {
    fun exec(sql: String)
    fun run(sql: String, params: Any? = null): Map<String, Any?>
    fun get(sql: String, params: Any? = null): Map<String, Any?>?
    fun all(sql: String, params: Any? = null): List<Map<String, Any?>>
    fun close()
}
expect object VeskSqlite {
    fun openDatabase(name: String, version: Int = 1): VeskSqliteDb
}
`,
    src: `
// openSqlite(name) — native SQLite with a better-sqlite3-style surface:
// exec/run/get/all/close. Rows are List<Map<String, Any?>>; params bind
// positionally. Handles are cached per database name for the process.
actual class VeskSqliteDb internal constructor(db: android.database.sqlite.SQLiteDatabase) {
    private var database: android.database.sqlite.SQLiteDatabase? = db

    actual fun exec(sql: String) { database?.execSQL(sql) }
    actual fun run(sql: String, params: Any?): Map<String, Any?> {
        val db = database ?: return mapOf("lastInsertRowid" to 0L, "changes" to 0L)
        val stmt = db.compileStatement(sql)
        bindStatement(stmt, params)
        stmt.execute()
        stmt.close()
        var lastId = 0L
        var changes = 0L
        db.rawQuery("SELECT last_insert_rowid() AS id, changes() AS ch", null).use { c ->
            if (c.moveToFirst()) {
                lastId = c.getLong(0)
                changes = c.getLong(1)
            }
        }
        return mapOf("lastInsertRowid" to lastId, "changes" to changes)
    }
    actual fun get(sql: String, params: Any?): Map<String, Any?>? = query(sql, params).firstOrNull()
    actual fun all(sql: String, params: Any?): List<Map<String, Any?>> = query(sql, params)
    actual fun close() { database?.close(); database = null }

    private fun query(sql: String, params: Any?): List<Map<String, Any?>> {
        val db = database ?: return emptyList()
        val cur = db.rawQuery(sql, bindArgs(params))
        return try {
            val cols = cur.columnNames
            val out = mutableListOf<Map<String, Any?>>()
            while (cur.moveToNext()) {
                val row = LinkedHashMap<String, Any?>()
                for (c in cols) row[c] = colValue(cur, c)
                out.add(row)
            }
            out
        } finally {
            cur.close()
        }
    }
    private fun bindStatement(stmt: android.database.sqlite.SQLiteStatement, params: Any?) {
        val list: List<Any?> = when (params) {
            null -> emptyList()
            is List<*> -> params
            is Array<*> -> params.toList()
            else -> return
        }
        list.forEachIndexed { i, v ->
            if (v == null) stmt.bindNull(i + 1) else stmt.bindString(i + 1, bindValue(v) ?: "")
        }
    }
    private fun bindArgs(params: Any?): Array<String?>? = when (params) {
        null -> null
        is List<*> -> params.map { bindValue(it) }.toTypedArray()
        is Array<*> -> params.map { bindValue(it) }.toTypedArray()
        else -> null
    }
    private fun bindValue(v: Any?): String? = when (v) {
        null -> null
        is Boolean -> if (v) "1" else "0"
        else -> v.toString()
    }
    private fun colValue(cur: android.database.Cursor, col: String): Any? {
        val idx = cur.getColumnIndexOrThrow(col)
        return when (cur.getType(idx)) {
            android.database.Cursor.FIELD_TYPE_INTEGER -> cur.getLong(idx)
            android.database.Cursor.FIELD_TYPE_FLOAT -> cur.getDouble(idx)
            android.database.Cursor.FIELD_TYPE_BLOB -> cur.getBlob(idx)
            else -> cur.getString(idx)
        }
    }
}

actual object VeskSqlite {
    private val handles = mutableMapOf<String, VeskSqliteDb>()
    actual fun openDatabase(name: String, version: Int): VeskSqliteDb = handles.getOrPut(name) {
        val ctx = VeskAppContext.activity?.applicationContext
        val db = if (ctx == null) {
            android.database.sqlite.SQLiteDatabase.create(null)
        } else {
            ctx.openOrCreateDatabase(name, android.content.Context.MODE_PRIVATE, null)
        }
        VeskSqliteDb(db)
    }
}
` },
  'VeskAuth': { deps: ['VeskSqlite', 'VeskWebStorage', 'jsMapGet'],
    expect: `
expect object VeskAuth {
    fun signUp(username: Any?, password: Any?): Map<String, Any?>?
    fun signIn(username: Any?, password: Any?): Map<String, Any?>?
    fun signOut()
    fun currentUser(): Map<String, Any?>?
    fun isSignedIn(): Boolean
}
`,
    src: `
// Auth + sessions: users live in a native sqlite database (vesk_auth); the
// current session persists in localStorage so it survives app restarts.
// Passwords are stored as a SHA-256 hash of "username:password" — a native
// hash, never a JS shim.
actual object VeskAuth {
    private const val DB_NAME = "vesk_auth"
    private const val SESSION_USER = "vesk.session.user"
    private const val SESSION_STATE = "vesk.session.signedIn"
    private val db by lazy { VeskSqlite.openDatabase(DB_NAME) }
    private var ready = false

    private fun ensure() {
        if (ready) return
        db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, pass TEXT NOT NULL)")
        ready = true
    }

    actual fun signUp(username: Any?, password: Any?): Map<String, Any?>? {
        val u = username?.toString()?.trim() ?: return null
        val p = password?.toString() ?: ""
        if (u.isEmpty() || p.isEmpty()) return null
        ensure()
        if (db.get("SELECT id FROM users WHERE username = ?", listOf(u)) != null) return null
        db.run("INSERT INTO users (username, pass) VALUES (?, ?)", listOf(u, hash("\$u:\$p")))
        return db.get("SELECT id, username FROM users WHERE username = ?", listOf(u))
    }

    actual fun signIn(username: Any?, password: Any?): Map<String, Any?>? {
        val u = username?.toString()?.trim() ?: return null
        val p = password?.toString() ?: ""
        ensure()
        val user = db.get(
            "SELECT id, username FROM users WHERE username = ? AND pass = ?",
            listOf(u, hash("\$u:\$p")),
        ) ?: return null
        VeskWebStorage.localSetItem(SESSION_USER, jsMapGet(user, "username"))
        VeskWebStorage.localSetItem(SESSION_STATE, "1")
        return user
    }

    actual fun signOut() {
        VeskWebStorage.localRemoveItem(SESSION_USER)
        VeskWebStorage.localRemoveItem(SESSION_STATE)
    }

    actual fun currentUser(): Map<String, Any?>? {
        if (VeskWebStorage.localGetItem(SESSION_STATE) != "1") return null
        val u = VeskWebStorage.localGetItem(SESSION_USER)?.toString() ?: return null
        ensure()
        return db.get("SELECT id, username FROM users WHERE username = ?", listOf(u))
    }

    actual fun isSignedIn(): Boolean = currentUser() != null

    private fun hash(s: String): String = java.security.MessageDigest.getInstance("SHA-256")
        .digest(s.toByteArray(Charsets.UTF_8))
        .joinToString("") { b -> (b.toInt() and 0xFF).toString(16).padStart(2, '0') }
}
` },
  'veskYchartsLineChart': { deps: [],
    expect: `
@Composable
expect fun veskYchartsLineChart(values: List<*>, labels: List<String>, modifier: Modifier = Modifier)
`,
    src: `
// <YLineChart values={[...]} labels={[...]}> — line chart backed by the
// installed YCharts library (co.yml:ycharts), whose LineChart is a Compose
// composable. Included only when a page uses the tag; the gradle dependency
// comes from the installed libraries.json record. The data-point list is
// treated JS-style (List<*> with numeric coercion) so [4, 8, 6] and
// [4.5, 8.2] both render.
@Composable
actual fun veskYchartsLineChart(values: List<*>, labels: List<String>, modifier: Modifier) {
    val numbers = values.map { (it as? Number)?.toFloat() ?: 0f }
    val max = numbers.maxOrNull() ?: 1f
    val min = numbers.minOrNull() ?: 0f
    LineChart(
        modifier = modifier,
        lineChartData = LineChartData(
            linePlotData = LinePlotData(
                lines = listOf(
                    Line(
                        dataPoints = numbers.mapIndexed { i, v -> Point(i.toFloat(), v) },
                        lineStyle = LineStyle(color = Color(0xFF3B82F6), width = 3f)
                    )
                )
            ),
            xAxisData = AxisData.Builder()
                .steps(labels.size)
                .labelData { labels.getOrElse(it) { "" } }
                .build(),
            yAxisData = AxisData.Builder()
                .steps(4)
                .labelData { i -> "\${((min + (max - min) * i / 3f)).toInt()}" }
                .build(),
            isZoomAllowed = false,
        ),
    )
}
` },
  'motionCore': { deps: ['VeskTimers', 'jsString', 'jsMapGet', 'motionDispatcher', 'motionViewportSize'], platform: 'common', src: `
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
    var bounds: Rect? = null
    var visible: Boolean by mutableStateOf(false)
    var entered: Boolean by mutableStateOf(false)
    internal var viewportW: Int = 0
    internal var viewportH: Int = 0
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
    val duration = (num(jsMapGet(opts, "duration")) * 1000.0).toInt().let { if (it > 0) it else 300 }
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
    var finished: kotlinx.coroutines.Deferred<Boolean>? = null
    fun bind(j: Job, f: kotlinx.coroutines.Deferred<Boolean>) { job = j; finished = f }
    fun stop() { job?.cancel() }
    fun pause() { job?.cancel() }
    fun play() { }
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

private fun motionAnimateElement(ref: MotionRef, props: Any?, options: Any?): MotionControls {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val target = props as? Map<*, *> ?: emptyMap<Any, Any>()
    val onComplete = optFn(opts, "onComplete")
    val spec = motionSpecFor(opts)
    val scope = CoroutineScope(SupervisorJob() + motionDispatcher())
    val controls = MotionControls()
    val job = scope.launch {
        val running = target.mapNotNull { (k, v) ->
            val value = (v as? List<*>)?.lastOrNull() ?: v
            val dst = num(value).toFloat()
            var get: (() -> Float)? = null
            var set: ((Float) -> Unit)? = null
            when (k.toString()) {
                "opacity" -> { get = { ref.alpha }; set = { ref.alpha = it } }
                "scale", "scaleX" -> { get = { ref.scaleX }; set = { ref.scaleX = it } }
                "scaleY" -> { get = { ref.scaleY }; set = { ref.scaleY = it } }
                "translateX", "x" -> { get = { ref.translateX }; set = { ref.translateX = it } }
                "translateY", "y" -> { get = { ref.translateY }; set = { ref.translateY = it } }
                "rotate" -> { get = { ref.rotate }; set = { ref.rotate = it } }
            }
            if (get != null && set != null) Triple(get, set, dst) else null
        }
        running.map { (get, set, dst) ->
            launch {
                val anim = Animatable(get())
                anim.animateTo(dst, spec) { set(this.value) }
            }
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
` },
  'motionDispatcher': {
    deps: [],
    expect: `
// Platform seam: the coroutine dispatcher that carries a MonotonicFrameClock
// so Animatable/animateTo can animate (plain Dispatchers.Main crashes without
// one). Android's compose main dispatcher provides it; the iOS actual arrives
// with the CMP milestone.
internal expect fun motionDispatcher(): kotlin.coroutines.CoroutineContext`,
    src: `
internal actual fun motionDispatcher(): kotlin.coroutines.CoroutineContext = androidx.compose.ui.platform.AndroidUiDispatcher.Main
` },
  'motionViewportSize': {
    deps: [],
    expect: `
// Platform seam: the viewport size motionInView uses to test element
// intersection against the bounds captured by the motionGraphics
// onGloballyPositioned hook. Android reports the display size; the iOS actual
// arrives with the CMP milestone.
@Composable
expect fun motionViewportSize(): androidx.compose.ui.unit.IntSize`,
    src: `
@Composable
actual fun motionViewportSize(): androidx.compose.ui.unit.IntSize =
    LocalContext.current.resources.displayMetrics.run { androidx.compose.ui.unit.IntSize(widthPixels, heightPixels) }
` },
  'motionStagger': { deps: ['jsMapGet'], platform: 'common', src: `
// motion-utils stagger(duration, { startDelay, from }): per-index delay.
// The callback form carries a total that vesk scripts rarely know, so the
// from-index default of 0 is assumed (distance = index). The ease option is
// not applied for the same reason (it needs the total).
fun motionStagger(i: Any?, duration: Any?, options: Any? = null): Double {
    val d = num(duration).let { if (it > 0.0) it else 0.1 }
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val startDelay = num(jsMapGet(opts, "startDelay"))
    val from = num(jsMapGet(opts, "from"))
    return startDelay + d * kotlin.math.abs(from - num(i))
}
` },
  'motionInView': { deps: ['motionCore'], platform: 'common', src: `
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
` },
  'motionScroll': { deps: ['jsMapGet'], platform: 'common', src: `
// scroll(onScroll, { axis }): reports scroll progress (0..1) of the current
// route's scroll container — the same ScrollState the layout shell uses, so
// progress follows the page content.
@Composable
fun motionScroll(onScroll: Any?, options: Any? = null) {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val axis = opts["axis"] as? String ?: "y"
    val nav = LocalNavController.current
    val route = nav.currentRoute.value
    val state = remember(route) { nav.scrollStateFor(route, 0) }
    val cb = onScroll as? (Any?) -> Unit ?: return
    LaunchedEffect(state, axis, cb) {
        snapshotFlow { state.value }.collect { v ->
            val max = state.maxValue.toFloat().coerceAtLeast(1f)
            cb(num(v) / max)
        }
    }
}
` },
  'motionDrag': { deps: [], platform: 'common', src: `
// Modifier-producing drag gestures (detectDragGestures). The drag offset is
// passed to the JS handler as an Offset {x, y}.
fun Modifier.motionDrag(
    onDragStart: (() -> Unit)? = null,
    onDrag: ((Any?) -> Unit)? = null,
    onDragEnd: (() -> Unit)? = null,
): Modifier = pointerInput(Unit) {
    detectDragGestures(
        onDragStart = { onDragStart?.invoke() },
        onDrag = { change, amount -> change.consume(); onDrag?.invoke(amount) },
        onDragEnd = { onDragEnd?.invoke() },
        onDragCancel = { onDragEnd?.invoke() },
    )
}
` },
  'motionHover': { deps: [], platform: 'common', src: `
// Modifier-producing hover enter/exit events (awaitPointerEventScope).
fun Modifier.motionHover(
    onHoverStart: (() -> Unit)? = null,
    onHoverEnd: (() -> Unit)? = null,
): Modifier = pointerInput(Unit) {
    awaitPointerEventScope {
        while (true) {
            val event = awaitPointerEvent()
            val t = event.type
            if (t == PointerEventType.Enter) onHoverStart?.invoke()
            else if (t == PointerEventType.Exit) onHoverEnd?.invoke()
        }
    }
}
` },
  'motionPress': { deps: [], platform: 'common', src: `
// Modifier-producing press start/end (detectTapGestures onPress/onTap).
fun Modifier.motionPress(
    onPress: (() -> Unit)? = null,
    onPressEnd: (() -> Unit)? = null,
): Modifier = pointerInput(Unit) {
    detectTapGestures(
        onPress = { onPress?.invoke() },
        onTap = { onPressEnd?.invoke() },
    )
}
` },
  'motionFocus': { deps: [], platform: 'common', src: `
// Modifier-producing focus/blur events (onFocusChanged).
fun Modifier.motionFocus(
    onFocus: (() -> Unit)? = null,
    onBlur: (() -> Unit)? = null,
): Modifier = onFocusChanged { if (it.isFocused) onFocus?.invoke() else onBlur?.invoke() }
` },
};

export const RUNTIME_ORDER = ['veskVideo', 'veskAudio', 'veskFileImage', 'veskDeviceCore', 'veskDeviceApi', 'veskQr', 'veskYchartsLineChart', 'veskDragDrop', 'veskColorFilter', 'veskBrightness', 'veskContrast', 'veskGrayscale', 'veskSaturate', 'veskInvert', 'veskSepia', 'veskHueRotate', 'veskDashedBorder', 'veskSideBorder', 'veskDivideLine', 'veskSkew', 'rememberRouteScrollState', 'Link', 'NavLink', 'Outlet', 'jsString', 'jsHandleError', 'jsSafe', 'jsTypeof', 'jsGlobalIsNaN', 'jsGlobalIsFinite', 'jsStrictIsNaN', 'jsStrictIsFinite', 'jsIsInteger', 'jsParseInt', 'jsParseFloat', 'jsEncodeURIComponent', 'jsDecodeURIComponent', 'jsEncodeURI', 'jsDecodeURI', 'jsRegexExec', 'jsRegexSearch', 'jsStringify', 'jsParseJson', 'jsMapOf', 'jsSetOf', 'jsMapIterable', 'jsMapGet', 'jsMapSet', 'jsHas', 'jsDelete', 'jsClear', 'jsMapKeys', 'jsMapValues', 'jsMapEntries', 'jsSize', 'jsLength', 'jsForEach', 'jsDateValue', 'jsTagged', 'JsConsole', 'VeskTimers', 'VeskAppContext', 'jsAlert', 'VeskWebStorage', 'VeskFetch', 'VeskSqlite', 'VeskAuth', 'motionFocus', 'motionPress', 'motionHover', 'motionDrag', 'motionScroll', 'motionInView', 'motionStagger', 'motionCore'];

// Function/composable names that come from a differently-named helper unit.
export const BIOMETRIC_CHECK_BODY = `val pm = context.packageManager
        val fp = pm.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
        val face = pm.hasSystemFeature(PackageManager.FEATURE_FACE)
        val types = when {
            fp && face -> "both"
            fp -> "fingerprint"
            face -> "face"
            else -> null
        }
        // BIOMETRIC_STRONG is only supported on API 30+; requesting it below
        // throws IllegalArgumentException, so fall back to BIOMETRIC_WEAK.
        val auth = if (Build.VERSION.SDK_INT >= 30) {
            BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK
        } else {
            @Suppress("DEPRECATION")
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        }
        val bm = BiometricManager.from(context)
        val ok = runCatching { bm.canAuthenticate(auth) == BiometricManager.BIOMETRIC_SUCCESS }.getOrDefault(false)
        biometricAvailable = ok && types != null
        biometricTypes = types
        onDone?.invoke(biometricAvailable, types)`;

export const BIOMETRIC_AUTH_BODY = `val act = findActivity(context)
        if (act == null) { onDone?.invoke(false, "No activity"); return }
        if (act !is FragmentActivity) { onDone?.invoke(false, "Not supported"); return }
        val prompt = BiometricPrompt(
            act,
            ContextCompat.getMainExecutor(context),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onDone?.invoke(true, null)
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onDone?.invoke(false, errString.toString())
                }
            },
        )
        // API 28/29 only support device-credential-alternative authenticators
        // with a negative button; 30+ still requires a negative button when
        // device-credential authentication is not allowed, so every branch
        // sets one (biometric-only authenticators -> "Negative text must be
        // set and non-empty." if omitted).
        val info = if (Build.VERSION.SDK_INT >= 30) {
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("Verify identity")
                .setSubtitle("Use your fingerprint or face")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .setNegativeButtonText("Cancel")
                .build()
        } else {
            @Suppress("DEPRECATION")
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("Verify identity")
                .setSubtitle("Use your fingerprint or face")
                .setNegativeButtonText("Cancel")
                .build()
        }
        runCatching { prompt.authenticate(info) }.getOrElse { onDone?.invoke(false, it.message) }`;

export const QRGEN_BODY = `val matrix = runCatching {
            MultiFormatWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to 1))
        }.getOrNull()
        if (matrix == null) { onDone?.invoke(null); return }
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bmp.setPixel(x, y, if (matrix.get(x, y)) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
        val dir = java.io.File(context.cacheDir, "vesk_media").apply { mkdirs() }
        val f = java.io.File(dir, "qr_\${System.currentTimeMillis()}.png")
        val ok = runCatching { java.io.FileOutputStream(f).use { out -> bmp.compress(Bitmap.CompressFormat.PNG, 100, out) } }.isSuccess
        lastQrCodePath = if (ok && f.exists()) f.absolutePath else null
        onDone?.invoke(lastQrCodePath)`;

export const QR_OVERLAY_BLOCK = `// Camera overlay host: device.scanQr(cb) and <qr-scanner> set
    // pendingScanCb; while set, the CameraX preview + ML Kit analyzer dialog
    // is shown. All camera classes here are pruned when scanQr is unused.
    if (pendingScanCb != null) {
        val lifecycleOwner = LocalLifecycleOwner.current
        val scanner = remember {
            BarcodeScanning.getClient(
                BarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE, Barcode.FORMAT_CODE_128, Barcode.FORMAT_EAN_13, Barcode.FORMAT_UPC_A)
                    .build(),
            )
        }
        Dialog(onDismissRequest = { pendingScanCb = null }) {
            var providerRef by remember { mutableStateOf<ProcessCameraProvider?>(null) }
            DisposableEffect(Unit) {
                onDispose {
                    providerRef?.unbindAll()
                    providerRef = null
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                AndroidView(
                    factory = { c ->
                        val pv = PreviewView(c)
                        val future = ProcessCameraProvider.getInstance(c)
                        future.addListener({
                            runCatching {
                                val provider = future.get()
                                providerRef = provider
                                val preview = Preview.Builder().build().also { it.setSurfaceProvider(pv.surfaceProvider) }
                                val analysis = ImageAnalysis.Builder()
                                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                    .build()
                                analysis.setAnalyzer(ContextCompat.getMainExecutor(c)) { image ->
                                    val mediaImage = image.image
                                    if (mediaImage != null && pendingScanCb != null) {
                                        val input = InputImage.fromMediaImage(mediaImage, image.imageInfo.rotationDegrees)
                                        scanner.process(input).addOnSuccessListener { barcodes ->
                                            val text = barcodes.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue
                                            if (text != null && pendingScanCb != null) {
                                                val cb = pendingScanCb
                                                pendingScanCb = null
                                                cb?.invoke(text)
                                            }
                                        }
                                    }
                                    image.close()
                                }
                                provider.unbindAll()
                                provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                            }
                        }, ContextCompat.getMainExecutor(c))
                        pv
                    },
                    modifier = Modifier.fillMaxWidth().height(420.dp),
                )
                Text("Point at a QR / barcode · tap outside to cancel", modifier = Modifier.padding(8.dp))
            }
        }
    }`;

// Exported generators/usage scans are the programmatic surface (scripts,
// tooling, tests); main() only runs when the CLI is invoked as an entry point.
