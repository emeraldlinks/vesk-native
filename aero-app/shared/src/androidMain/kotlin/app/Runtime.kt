package app

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
import android.os.VibratorManager
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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

// The hosting Activity for window-level work (screenshot capture).
private fun findActivity(context: Context): Activity? = when (context) {
    is Activity -> context
    is ContextWrapper -> findActivity(context.baseContext)
    else -> null
}


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
    val f = java.io.File(dir, "${stem}_${System.currentTimeMillis()}$ext")
    if (f.exists()) f.delete()
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", f)
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
    var pendingPerms by remember { mutableStateOf<Array<String>?>(null) }
    var pendingPermAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    var pendingPermDenied by remember { mutableStateOf<(() -> Unit)?>(null) }

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
    // (mic, location, contacts, call log, sms, accounts, bluetooth, camera).
    // The pending action runs only when every requested permission is granted;
    // on denial the denied callback runs (each API reports an empty/error
    // result instead of hanging silently) and the denial is logged.
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
        val action = pendingPermAction
        val perms = pendingPerms
        val denied = pendingPermDenied
        pendingPerms = null
        pendingPermAction = null
        pendingPermDenied = null
        if (perms != null && action != null) {
            val missing = perms.filter { results[it] != true }
            if (missing.isEmpty()) {
                veskDebugLine("PERM granted: ${perms.joinToString()}")
                action()
            } else {
                veskDebugLine("PERM denied: ${missing.joinToString()}")
                denied?.invoke()
            }
        }
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
        val file = java.io.File(dir, "screen_${System.currentTimeMillis()}.mp4")
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
            permissionRunner = { perms, action, denied ->
                if (perms.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }) action()
                else {
                    pendingPerms = perms
                    pendingPermAction = action
                    pendingPermDenied = denied
                    permLauncher.launch(perms)
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
                            val f = java.io.File(dir, "screenshot_${System.currentTimeMillis()}.png")
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
    

    return device
}

actual class DeviceApi internal constructor(
    private val context: Context,
    private val imagePicker: (cb: ((String?) -> Unit)?) -> Unit,
    private val audioPicker: (cb: ((String?) -> Unit)?) -> Unit,
    private val filePicker: (mime: String, cb: ((String?, String?) -> Unit)?) -> Unit,
    private val photoCapture: (cb: ((String?) -> Unit)?) -> Unit,
    private val videoCapture: (cb: ((String?) -> Unit)?) -> Unit,
    private val permissionRunner: (perms: Array<String>, action: () -> Unit, denied: (() -> Unit)?) -> Unit,
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

    // Diagnostics: appends a line to vesk-debug.txt in Downloads so on-device
    // testing can confirm which device calls actually fire (launchSafe failure
    // lines use the same file). Writes are best-effort and never throw.
    private fun debugLog(line: String) {
        runCatching {
            java.io.File(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS), "vesk-debug.txt")
                .appendText("${java.util.Date()}\n$line\n")
        }
    }

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
        debugLog("RECORD start requested")
        permissionRunner(arrayOf(android.Manifest.permission.RECORD_AUDIO), {
            debugLog("RECORD permission granted")
            val path = beginRecording()
            debugLog("RECORD beginRecording path=$path")
            onStarted?.invoke(path)
        }, {
            debugLog("RECORD permission denied")
            onStarted?.invoke(null)
        })
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
        debugLog("BATTERY level=$level charging=$chargingState")
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
        debugLog("NETWORK type=$type internet=$available wifi=$wifi")
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
            lastLocation = if (lat != null && lng != null) "${lat}, ${lng}" else null
            debugLog("LOCATION enabled=$locationEnabled fix=$lat,$lng")
            onDone?.invoke(lat, lng)
        }
        permissionRunner(arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION), ::read, {
            debugLog("LOCATION permission denied")
            onDone?.invoke(null, null)
        })
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
                        rows += if (name.isBlank()) num else "${name} · ${num}"
                    }
                }
            } catch (_: SecurityException) { }
            contacts = rows
            debugLog("CONTACTS rows=${rows.size}")
            onDone?.invoke(rows)
        }
        permissionRunner(arrayOf(android.Manifest.permission.READ_CONTACTS), ::read, {
            debugLog("CONTACTS permission denied")
            onDone?.invoke(emptyList())
        })
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
                        rows += "${type} · ${ageMin}m ago · ${num} (${dur}s)"
                    }
                }
            } catch (_: SecurityException) { }
            callLogs = rows
            debugLog("CALLS rows=${rows.size}")
            onDone?.invoke(rows)
        }
        permissionRunner(arrayOf(android.Manifest.permission.READ_CALL_LOG), ::read, {
            debugLog("CALLS permission denied")
            onDone?.invoke(emptyList())
        })
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
                        rows += "${addr}: ${body}"
                    }
                }
            } catch (_: SecurityException) { }
            messages = rows
            debugLog("SMS rows=${rows.size}")
            onDone?.invoke(rows)
        }
        permissionRunner(arrayOf(android.Manifest.permission.READ_SMS), ::read, {
            debugLog("SMS permission denied")
            onDone?.invoke(emptyList())
        })
    }

    // Device accounts as "type · name" rows; requires GET_ACCOUNTS.
    actual fun listAccounts(onDone: ((List<String>) -> Unit)?, limit: Int) {
        fun read(): Unit {
            val rows = AccountManager.get(context).accounts
                .take(limit)
                .map { "${it.type} · ${it.name}" }
            accounts = rows
            debugLog("ACCOUNTS rows=${rows.size}")
            onDone?.invoke(rows)
        }
        permissionRunner(arrayOf(android.Manifest.permission.GET_ACCOUNTS), ::read, {
            debugLog("ACCOUNTS permission denied")
            onDone?.invoke(emptyList())
        })
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
    // On API 31+ the default vibrator comes from VibratorManager; the legacy
    // Vibrator service path is the fallback. onDone reports whether the
    // device actually has a vibrator and accepted the pulse — never a silent
    // success when the hardware is absent.
    actual fun vibrate(millis: Long, onDone: ((Boolean) -> Unit)?) {
        debugLog("VIBRATE start millis=$millis")
        val v = if (Build.VERSION.SDK_INT >= 31) {
            runCatching {
                (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            }.getOrNull() ?: ContextCompat.getSystemService(context, Vibrator::class.java)
        } else {
            ContextCompat.getSystemService(context, Vibrator::class.java)
        }
        if (v == null) {
            debugLog("VIBRATE: no Vibrator service")
            onDone?.invoke(false)
            return
        }
        val has = runCatching { v.hasVibrator() }.getOrDefault(false)
        if (!has) {
            debugLog("VIBRATE: hasVibrator=false")
            onDone?.invoke(false)
            return
        }
        var ok = false
        runCatching {
            if (Build.VERSION.SDK_INT >= 31) {
                v.vibrate(VibrationEffect.createOneShot(millis, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(millis)
            }
            ok = true
        }.onFailure {
            debugLog("VIBRATE FAIL: $it")
        }
        debugLog("VIBRATE done ok=$ok")
        onDone?.invoke(ok)
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
        debugLog("TORCH available=$torchAvailable on=$torchEnabled")
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
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", f)
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
            base.listFiles()?.sortedBy { it.name }?.map { if (it.isDirectory) "${it.name}/" else it.name } ?: emptyList()
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
        onDone?.invoke(false, null)
    }

    // Prompts the system biometric dialog (fingerprint/face). onDone receives
    // (ok, reason) — ok=false with a message on cancel or missing hardware.
    actual fun authenticate(onDone: ((Boolean, String?) -> Unit)?) {
        onDone?.invoke(false, "Not available")
    }

    // ---- Bluetooth ---------------------------------------------------------
    // Adapter state + bonded devices; BLUETOOTH_CONNECT runtime permission on
    // 12+ (granted on first use; legacy BLUETOOTH/BLUETOOTH_ADMIN are
    // maxSdkVersion-30 only). Adapter state is never read before the runtime
    // permission is granted — on API 31+ that throws SecurityException.
    actual fun refreshBluetooth(onDone: ((Boolean, List<String>) -> Unit)?) {
        permissionRunner(arrayOf(android.Manifest.permission.BLUETOOTH_CONNECT), {
            val ba = context.getSystemService(BluetoothManager::class.java)?.adapter
            val enabled = runCatching { ba?.isEnabled == true }.getOrDefault(false)
            bluetoothEnabled = enabled
            if (ba == null || !enabled) {
                bluetoothDevices = emptyList()
                onDone?.invoke(false, emptyList())
                return@permissionRunner
            }
            val list = runCatching {
                ba.bondedDevices.map { "${it.name} · ${it.address}" }.sorted()
            }.getOrDefault(emptyList())
            bluetoothDevices = list
            debugLog("BLUETOOTH state enabled=$enabled bonded=${list.size}")
            onDone?.invoke(true, list)
        }, {
            debugLog("BLUETOOTH_CONNECT permission denied")
            onDone?.invoke(false, emptyList())
        })
    }

    // Turns the Bluetooth adapter on/off. On modern Android the raw
    // enable()/disable() calls are no-ops (and deprecated), so we ask the
    // user through the system enable dialog (on) or the Bluetooth settings
    // screen (off) — the only supported paths since API 30.
    actual fun toggleBluetooth(enabled: Boolean, onDone: ((Boolean) -> Unit)?) {
        permissionRunner(arrayOf(android.Manifest.permission.BLUETOOTH_CONNECT), {
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
        }, {
            debugLog("BLUETOOTH_CONNECT permission denied")
            onDone?.invoke(false)
        })
    }

    // Discovers nearby devices for a few seconds; BLUETOOTH_SCAN on 12+.
    // Results ("name · address") land in bluetoothDevices too.
    actual fun scanBluetooth(seconds: Int, onDone: ((List<String>) -> Unit)?) {
        debugLog("BLUETOOTH scan start seconds=$seconds")
        permissionRunner(arrayOf(android.Manifest.permission.BLUETOOTH_SCAN, android.Manifest.permission.BLUETOOTH_CONNECT), {
                val ba = context.getSystemService(BluetoothManager::class.java)?.adapter
                if (ba == null || runCatching { !ba.isEnabled }.getOrDefault(true)) {
                    debugLog("BLUETOOTH scan adapter=${ba != null} enabled=${runCatching { ba?.isEnabled }}")
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
                        results += "${d?.name ?: "?"} · ${d?.address ?: "?"}"
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
                debugLog("BLUETOOTH scan done found=${list.size}")
                onDone?.invoke(list)
            }, seconds * 1000L)
        }, {
            debugLog("BLUETOOTH scan permission denied")
            onDone?.invoke(emptyList())
        })
    }

    // ---- QR codes ----------------------------------------------------------
    // Encodes text as a QR bitmap saved to the cache; returns the path (also
    // lastQrCodePath). Inline rendering via <qr-code value="...">. The real
    // body is inlined only when device.generateQrCode is used — otherwise a
    // stub keeps the method and drops the zxing dependency.
    actual fun generateQrCode(text: String, onDone: ((String?) -> Unit)?, size: Int) {
        onDone?.invoke(null)
    }

    // Opens the camera scanner overlay (CameraX + ML Kit; needs the CAMERA
    // runtime permission, granted on first use). While active the
    // device.scanningQr flag is set; onResult receives the decoded text.
    actual fun scanQr(onResult: ((String?) -> Unit)?) {
        permissionRunner(arrayOf(android.Manifest.permission.CAMERA), {
            scanningQr = true
            scanStarter { text ->
                scanningQr = false
                onResult?.invoke(text)
            }
        }, {
            debugLog("CAMERA permission denied")
            onResult?.invoke(null)
        })
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
        debugLog("LAUNCH intent action=${intent.action} data=${intent.data} failure=$failure")
        if (failure != null) {
            debugLog("LAUNCH FAIL: ${intent.action} ${intent.data}\n$failure")
        }
        return failure == null
    }

    // Dialer pre-filled with the number.
    actual fun dial(number: String, onDone: ((Boolean) -> Unit)?) {
        onDone?.invoke(launchSafe(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${number}"))))
    }

    // Messenger pre-filled with the recipient + body.
    actual fun sendSms(number: String, text: String, onDone: ((Boolean) -> Unit)?) {
        val i = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${number}")).putExtra("sms_body", text)
        onDone?.invoke(launchSafe(i))
    }

    // Mail client with to/subject/body pre-filled.
    actual fun sendEmail(to: String, subject: String, body: String, onDone: ((Boolean) -> Unit)?) {
        val i = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${to}"))
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
        debugLog("TOAST text=$text")
        Toast.makeText(context, text, if (long) Toast.LENGTH_LONG else Toast.LENGTH_SHORT).show()
        onDone?.invoke(true)
    }

    // Plays a system sound: "notification" / "alarm" / "ringtone" / null.
    actual fun playSound(kind: String?, onDone: ((Boolean) -> Unit)?) {
        debugLog("PLAYSOUND kind=$kind")
        val uri = when (kind) {
            "notification" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            "alarm" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            "ringtone" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            else -> null
        }
        val tone = RingtoneManager.getRingtone(context, uri)
        if (tone == null) { debugLog("PLAYSOUND no ringtone for uri=$uri"); onDone?.invoke(false); return }
        tone.play()
        debugLog("PLAYSOUND played")
        onDone?.invoke(true)
    }

    // Sets the home/lock wallpaper from an image file path.
    actual fun setWallpaper(path: String, onDone: ((Boolean) -> Unit)?) {
        debugLog("WALLPAPER path=$path")
        val f = java.io.File(path)
        if (!f.exists()) { debugLog("WALLPAPER file missing"); onDone?.invoke(false); return }
        val wm = WallpaperManager.getInstance(context)
        val ok = runCatching { java.io.FileInputStream(f).use { wm.setStream(it) } }.isSuccess
        debugLog("WALLPAPER ok=$ok")
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
                        rows += "${title} · ${start}"
                    }
                }
            } catch (_: SecurityException) { }
            calendarEvents = rows
            debugLog("CALENDAR rows=${rows.size}")
            onDone?.invoke(rows)
        }
        permissionRunner(arrayOf(android.Manifest.permission.READ_CALENDAR), ::read, {
            debugLog("CALENDAR permission denied")
            onDone?.invoke(emptyList())
        })
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
        screenSize = "${dm.widthPixels}x${dm.heightPixels}"
        val summary = "${deviceManufacturer} ${deviceModel} · Android ${androidVersion} · ${screenSize}"
        onDone?.invoke(summary)
    }

    // Speaks text with the system TTS engine (callback fires when ready/used).
    actual fun speak(text: String, onDone: ((Boolean) -> Unit)?) {
        debugLog("SPEAK text=$text")
        var tts: TextToSpeech? = null
        tts = TextToSpeech(context) { status ->
            val engine = tts
            if (status == TextToSpeech.SUCCESS && engine != null) {
                val langOk = engine.setLanguage(java.util.Locale.getDefault()) != TextToSpeech.LANG_MISSING_DATA &&
                    engine.setLanguage(java.util.Locale.getDefault()) != TextToSpeech.LANG_NOT_SUPPORTED
                if (langOk) engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vesk")
                debugLog("SPEAK init status=$status langOk=$langOk")
                onDone?.invoke(langOk)
            } else {
                debugLog("SPEAK init failed status=$status")
                onDone?.invoke(false)
            }
        }
    }

    // Starts the in-app audio recorder (mic permission is granted by the
    // caller via permissionRunner).
    internal fun beginRecording(): String? {
        if (recorder != null) return null
        val dir = java.io.File(context.cacheDir, "vesk_media").apply { mkdirs() }
        val f = java.io.File(dir, "recording_${System.currentTimeMillis()}.m4a")
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

// Best-effort MIME type from a file path (share sheet).
private fun veskDebugLine(line: String) {
    runCatching {
        java.io.File(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS), "vesk-debug.txt")
            .appendText("${java.util.Date()}\n$line\n")
    }
}

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
    if (bytes < 1024) return "${bytes} B"
    val kb = bytes / 1024.0
    if (kb < 1024) return "${String.format("%.1f", kb)} KB"
    val mb = kb / 1024.0
    if (mb < 1024) return "${String.format("%.1f", mb)} MB"
    val gb = mb / 1024.0
    return "${String.format("%.1f", gb)} GB"
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


actual fun jsDecodeURIComponent(v: Any?): String = java.net.URLDecoder.decode(jsString(v).replace("+", "%2B"), "UTF-8")


actual fun jsHandleError(e: Throwable) {
    android.util.Log.e("vesk", "uncaught exception (app continues): " + e.message, e)
}


// Activity anchor for browser-API dialogs. The generated App() composable
// registers the current activity (main thread, once per composition).
actual object VeskAppContext {
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


internal actual fun motionDispatcher(): kotlin.coroutines.CoroutineContext = androidx.compose.ui.platform.AndroidUiDispatcher.Main


@Composable
actual fun motionViewportSize(): androidx.compose.ui.unit.IntSize =
    LocalContext.current.resources.displayMetrics.run { androidx.compose.ui.unit.IntSize(widthPixels, heightPixels) }

