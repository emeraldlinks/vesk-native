package app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
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
import androidx.media.app.NotificationCompat.MediaStyle
import androidx.media.session.MediaButtonReceiver
import android.support.v4.media.session.MediaSessionCompat
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
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.draganddrop.dragAndDropSource
import androidx.compose.foundation.draganddrop.dragAndDropTarget
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.window.Dialog
import androidx.fragment.app.FragmentActivity
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.MultiFormatWriter
import app.navigation.*

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


// <video src controls autoplay loop muted object-cover> -> TextureView +
// MediaPlayer. Bundled assets arrive as android.resource:// URIs, device paths
// get file:// encoding, picker/camera output arrives as content:// URIs.
// object-cover / object-contain / object-fill map to crop / fit / fill via
// surface transform. Starting playback requests audio focus, pauses any other
// vesk media, and by default broadcasts a media session + notification
// (broadcast=false via media.broadcast in config turns that off).
@Composable
fun veskVideo(
    url: String?,
    controls: Boolean = false,
    autoplay: Boolean = false,
    loop: Boolean = false,
    muted: Boolean = false,
    scale: String = "fit",
    broadcast: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    if (url == null) return
    val title = remember(url) { url.substringAfterLast('/') }
    val textureView = remember { TextureView(context) }
    val player = remember(url) { mutableStateOf<MediaPlayer?>(null) }
    var playing by remember(url) { mutableStateOf(false) }
    var ready by remember(url) { mutableStateOf(false) }

    fun applyTransform(mp: MediaPlayer?, viewW: Int, viewH: Int) {
        val vw = mp?.videoWidth ?: return
        val vh = mp?.videoHeight ?: return
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
            setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS)
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


// <audio controls autoplay loop muted> -> MediaPlayer backed by a compact
// play/pause bar. Without controls the player is invisible but still plays.
// Starting playback pauses other vesk media, requests audio focus, and by
// default broadcasts a media session + notification (lock screen / quick
// settings / headset buttons). broadcast=false (media.broadcast in config)
// turns the session off per app.
@Composable
fun veskAudio(
    url: String?,
    controls: Boolean = true,
    autoplay: Boolean = false,
    loop: Boolean = false,
    muted: Boolean = false,
    broadcast: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    if (url == null) return
    val title = remember(url) { url.substringAfterLast('/') }
    var playing by remember(url) { mutableStateOf(false) }
    var ready by remember(url) { mutableStateOf(false) }

    var startPlay: () -> Unit = {}
    var pausePlay: () -> Unit = {}

    val player = remember(url) {
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
                if (!player.isPlaying) return
                pausePlay()
            }
        }
    }
    val createdSession = remember(url) {
        if (!broadcast) null
        else MediaSessionCompat(context, "vesk_audio").apply {
            setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS)
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { startPlay() }
                override fun onPause() { pausePlay() }
            })
            isActive = true
        }
    }

    startPlay = {
        if (ready) {
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
        if (player.isPlaying) player.pause()
        playing = false
        VeskFocus.abandon(context)
        VeskMediaHub.mediaSession = null
        VeskMediaHub.deactivate(hub)
        createdSession?.let { notify(it, false) }
    }

    DisposableEffect(Unit) {
        onDispose {
            if (player.isPlaying) player.pause()
            player.release()
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


// <img src="/storage/..."> (or content:// and file://): runtime decode from
// device storage. Missing/unreadable files render a transparent placeholder.
@Composable
fun veskFileImage(path: String?): ImageBitmap {
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
fun rememberDeviceApi(): DeviceApi {
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
    val takeVideoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakeVideo()) { ok ->
        val cb = pendingVideoCallback
        pendingVideoCallback = null
        if (ok != null) api?.lastVideo = pendingVideo?.toString()
        cb?.invoke(if (ok != null) pendingVideo?.toString() else null)
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
        val file = java.io.File(dir, "screen_${System.currentTimeMillis()}.mp4")
        val recorder = MediaRecorder()
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
    // (style B) and <qr-scanner> (style C) set pendingScanCb.
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
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                AndroidView(
                    factory = { c ->
                        val pv = PreviewView(c)
                        val future = ProcessCameraProvider.getInstance(c)
                        future.addListener({
                            runCatching {
                                val provider = future.get()
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
    }

    return device
}

class DeviceApi internal constructor(
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
    var lastImage: String? by mutableStateOf(null)
    var lastAudio: String? by mutableStateOf(null)
    var lastFile: String? by mutableStateOf(null)
    var lastFileName: String? by mutableStateOf(null)
    var lastPhoto: String? by mutableStateOf(null)
    var lastVideo: String? by mutableStateOf(null)
    var lastRecording: String? by mutableStateOf(null)
    var recording: Boolean by mutableStateOf(false)
    var batteryLevel: Int by mutableStateOf(0)
    var charging: Boolean by mutableStateOf(false)
    var networkType: String? by mutableStateOf(null)
    var networkAvailable: Boolean by mutableStateOf(false)
    var wifiEnabled: Boolean by mutableStateOf(false)
    var locationEnabled: Boolean by mutableStateOf(false)
    var lastLocation: String? by mutableStateOf(null)
    var installedApps: List<String> by mutableStateOf(emptyList())
    var contacts: List<String> by mutableStateOf(emptyList())
    var callLogs: List<String> by mutableStateOf(emptyList())
    var messages: List<String> by mutableStateOf(emptyList())
    var accounts: List<String> by mutableStateOf(emptyList())
    var clipboardText: String? by mutableStateOf(null)
    var lastScreenshot: String? by mutableStateOf(null)
    var torchEnabled: Boolean by mutableStateOf(false)
    var torchAvailable: Boolean by mutableStateOf(false)
    var appFiles: List<String> by mutableStateOf(emptyList())
    var biometricAvailable: Boolean by mutableStateOf(false)
    var biometricTypes: String? by mutableStateOf(null)
    var bluetoothEnabled: Boolean by mutableStateOf(false)
    var bluetoothDevices: List<String> by mutableStateOf(emptyList())
    var scanningQr: Boolean by mutableStateOf(false)
    var lastQrCodePath: String? by mutableStateOf(null)
    var screenRecording: Boolean by mutableStateOf(false)
    var lastScreenRecord: String? by mutableStateOf(null)
    var mediaVolume: Int by mutableStateOf(0)
    var ringerMode: String? by mutableStateOf(null)
    var screenBrightness: Float by mutableStateOf(-1f)
    var keepAwake: Boolean by mutableStateOf(false)
    var storageFree: Long by mutableStateOf(0)
    var storageTotal: Long by mutableStateOf(0)
    var ramFree: Long by mutableStateOf(0)
    var ramTotal: Long by mutableStateOf(0)
    var calendarEvents: List<String> by mutableStateOf(emptyList())
    var nfcAvailable: Boolean by mutableStateOf(false)
    var nfcEnabled: Boolean by mutableStateOf(false)
    var carrier: String? by mutableStateOf(null)
    var simState: String? by mutableStateOf(null)
    var deviceModel: String? by mutableStateOf(null)
    var deviceManufacturer: String? by mutableStateOf(null)
    var androidVersion: String? by mutableStateOf(null)
    var screenSize: String? by mutableStateOf(null)

    private var recorder: MediaRecorder? = null
    private var recordingFile: java.io.File? = null

    // Style B: pass an optional callback to receive the result directly,
    //     device.pickImage { uri -> photo = uri }
    // or rely on the observable fields above (style A):
    //     device.pickImage()
    fun pickImage(onDone: ((String?) -> Unit)? = null) = imagePicker(onDone)
    fun pickAudio(onDone: ((String?) -> Unit)? = null) = audioPicker(onDone)
    fun pickFile(onDone: ((String?, String?) -> Unit)? = null, mime: String = "*/*") = filePicker(mime, onDone)
    fun capturePhoto(onDone: ((String?) -> Unit)? = null) = photoCapture(onDone)
    fun captureVideo(onDone: ((String?) -> Unit)? = null) = videoCapture(onDone)

    // Starts recording after the RECORD_AUDIO runtime permission is granted;
    // the system prompt shows on first use. onStarted receives the output
    // path (null if recording could not start).
    fun startRecording(onStarted: ((String?) -> Unit)? = null) {
        permissionRunner(android.Manifest.permission.RECORD_AUDIO) { onStarted?.invoke(beginRecording()) }
    }

    // Stops the recorder and returns the path of the saved file.
    fun stopRecording(): String? {
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
    fun notify(title: String, text: String, onTap: (() -> Unit)? = null) = notifyAction(title, text, onTap)

    // Battery level (0-100) and charge state; cached in batteryLevel/charging.
    fun getBattery(onDone: ((Int, Boolean) -> Unit)? = null) {
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
    fun refreshNetwork(onDone: ((String?, Boolean) -> Unit)? = null) {
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
    fun getLocation(onDone: ((String?, String?) -> Unit)? = null) {
        fun read(): Unit {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            locationEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            @Suppress("DEPRECATION")
            val loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            val lat = loc?.latitude?.toString()
            val lng = loc?.longitude?.toString()
            lastLocation = if (lat != null && lng != null) "${lat}, ${lng}" else null
            onDone?.invoke(lat, lng)
        }
        permissionRunner(android.Manifest.permission.ACCESS_FINE_LOCATION, ::read)
    }

    // Launchable apps (labels, sorted, capped); cached in installedApps.
    // Listing needs only a <queries> MAIN/LAUNCHER declaration, no permission.
    fun listApps(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100) {
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
    fun listContacts(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100) {
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
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_CONTACTS, ::read)
    }

    // Call log as "type · age · number" rows; requires READ_CALL_LOG.
    fun listCallLogs(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100) {
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
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_CALL_LOG, ::read)
    }

    // SMS inbox as "sender: body" rows (body trimmed); requires READ_SMS.
    fun listMessages(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100) {
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
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_SMS, ::read)
    }

    // Device accounts as "type · name" rows; requires GET_ACCOUNTS.
    fun listAccounts(onDone: ((List<String>) -> Unit)? = null, limit: Int = 100) {
        fun read(): Unit {
            val rows = AccountManager.get(context).accounts
                .take(limit)
                .map { "${it.type} · ${it.name}" }
            accounts = rows
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.GET_ACCOUNTS, ::read)
    }

    // Current clipboard text; cached in clipboardText.
    fun readClipboard(onDone: ((String?) -> Unit)? = null) {
        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val text = cm.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString()
        clipboardText = text
        onDone?.invoke(text)
    }

    // Writes text to the clipboard.
    fun copyToClipboard(value: String, onDone: ((Boolean) -> Unit)? = null) {
        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("vesk", value))
        clipboardText = value
        onDone?.invoke(true)
    }

    // Pulses the vibrator (VIBRATE is a normal permission, granted at install).
    fun vibrate(millis: Long = 200, onDone: ((Boolean) -> Unit)? = null) {
        val v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= 31) {
            v.vibrate(VibrationEffect.createOneShot(millis, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(millis)
        }
        onDone?.invoke(true)
    }

    // Toggles the camera flash (torch mode needs no camera permission); state
    // lands in torchEnabled/torchAvailable.
    fun toggleTorch(onDone: ((Boolean) -> Unit)? = null) {
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
    fun captureScreenshot(onDone: ((String?) -> Unit)? = null) = screenshotCapture(onDone)

    // Opens the system share sheet with plain text.
    fun shareText(text: String, onDone: ((Boolean) -> Unit)? = null) {
        val i = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        context.startActivity(Intent.createChooser(i, "Share"))
        onDone?.invoke(true)
    }

    // Shares a file (device path or content:// URI) through the FileProvider.
    fun shareFile(path: String, mime: String? = null, onDone: ((Boolean) -> Unit)? = null) {
        val f = java.io.File(path)
        if (!f.exists()) { onDone?.invoke(false); return }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", f)
        val i = Intent(Intent.ACTION_SEND).apply {
            type = mime ?: guessMime(path)
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(i, "Share file"))
        runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        onDone?.invoke(true)
    }

    // Files in the app-private directory (subdirectory via dir); cached in
    // appFiles. Directory entries carry a trailing "/".
    fun listFiles(dir: String = "", onDone: ((List<String>) -> Unit)? = null) {
        val base = java.io.File(context.filesDir, dir)
        val items = if (base.exists()) {
            base.listFiles()?.sortedBy { it.name }?.map { if (it.isDirectory) "${it.name}/" else it.name } ?: emptyList()
        } else emptyList()
        appFiles = items
        onDone?.invoke(items)
    }

    // Writes text into the app-private directory; returns the path.
    fun writeFile(name: String, content: String, onDone: ((String?) -> Unit)? = null) {
        val f = java.io.File(context.filesDir, name)
        val path = runCatching { f.parentFile?.mkdirs(); f.writeText(content); f.absolutePath }.getOrNull()
        onDone?.invoke(path)
    }

    // Reads a file from the app-private directory.
    fun readFile(name: String, onDone: ((String?) -> Unit)? = null) {
        val f = java.io.File(context.filesDir, name)
        val text = if (f.exists()) runCatching { f.readText() }.getOrNull() else null
        onDone?.invoke(text)
    }

// Deletes a file from the app-private directory.
    fun deleteFile(name: String, onDone: ((Boolean) -> Unit)? = null) {
        val f = java.io.File(context.filesDir, name)
        val ok = f.exists() && f.delete()
        onDone?.invoke(ok)
    }

    // ---- Biometrics --------------------------------------------------------
    // Checks whether strong/weak biometric hardware (fingerprint/face) is
    // present. Types: "fingerprint" / "face" / "both" / null.
    fun checkBiometrics(onDone: ((Boolean, String?) -> Unit)? = null) {
        val pm = context.packageManager
        val fp = pm.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
        val face = pm.hasSystemFeature(PackageManager.FEATURE_FACE)
        val types = when {
            fp && face -> "both"
            fp -> "fingerprint"
            face -> "face"
            else -> null
        }
        val bm = BiometricManager.from(context)
        val ok = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS
        biometricAvailable = ok && types != null
        biometricTypes = types
        onDone?.invoke(biometricAvailable, types)
    }

    // Prompts the system biometric dialog (fingerprint/face). onDone receives
    // (ok, reason) — ok=false with a message on cancel or missing hardware.
    fun authenticate(onDone: ((Boolean, String?) -> Unit)? = null) {
        val act = findActivity(context)
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
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("Verify identity")
                .setSubtitle("Use your fingerprint or face")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .build(),
        )
    }

    // ---- Bluetooth ---------------------------------------------------------
    // Adapter state + bonded devices; BLUETOOTH_CONNECT runtime permission on
    // 12+ (granted on first use; legacy BLUETOOTH/BLUETOOTH_ADMIN are
    // maxSdkVersion-30 only).
    fun refreshBluetooth(onDone: ((Boolean, List<String>) -> Unit)? = null) {
        val ba = BluetoothAdapter.getDefaultAdapter()
        bluetoothEnabled = ba != null && ba.isEnabled
        if (ba == null || !ba.isEnabled) {
            bluetoothDevices = emptyList()
            onDone?.invoke(false, emptyList())
            return
        }
        permissionRunner(android.Manifest.permission.BLUETOOTH_CONNECT) {
            @Suppress("DEPRECATION")
            val bonded = ba.bondedDevices
            val list = bonded.map { "${it.name} · ${it.address}" }.sorted()
            bluetoothDevices = list
            onDone?.invoke(true, list)
        }
    }

    // Turns the Bluetooth adapter on/off (system prompt on newer Android).
    fun toggleBluetooth(enabled: Boolean, onDone: ((Boolean) -> Unit)? = null) {
        val ba = BluetoothAdapter.getDefaultAdapter()
        if (ba == null) { onDone?.invoke(false); return }
        permissionRunner(android.Manifest.permission.BLUETOOTH_CONNECT) {
            @Suppress("DEPRECATION")
            val ok = if (enabled) ba.enable() else ba.disable()
            bluetoothEnabled = ba.isEnabled
            onDone?.invoke(ok)
        }
    }

    // Discovers nearby devices for a few seconds; BLUETOOTH_SCAN on 12+.
    // Results ("name · address") land in bluetoothDevices too.
    fun scanBluetooth(seconds: Int = 5, onDone: ((List<String>) -> Unit)? = null) {
        val ba = BluetoothAdapter.getDefaultAdapter()
        if (ba == null || !ba.isEnabled) { onDone?.invoke(emptyList()); return }
        permissionRunner(android.Manifest.permission.BLUETOOTH_SCAN) {
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
                onDone?.invoke(list)
            }, seconds * 1000L)
        }
    }

    // ---- QR codes ----------------------------------------------------------
    // Encodes text as a QR bitmap saved to the cache; returns the path (also
    // lastQrCodePath). Inline rendering via <qr-code value="...">.
    fun generateQrCode(text: String, onDone: ((String?) -> Unit)? = null, size: Int = 512) {
        val matrix = runCatching {
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
        val f = java.io.File(dir, "qr_${System.currentTimeMillis()}.png")
        val ok = runCatching { java.io.FileOutputStream(f).use { out -> bmp.compress(Bitmap.CompressFormat.PNG, 100, out) } }.isSuccess
        lastQrCodePath = if (ok && f.exists()) f.absolutePath else null
        onDone?.invoke(lastQrCodePath)
    }

    // Opens the camera scanner overlay (CameraX + ML Kit). While active the
    // device.scanningQr flag is set; onResult receives the decoded text.
    fun scanQr(onResult: ((String?) -> Unit)? = null) {
        scanningQr = true
        scanStarter { text ->
            scanningQr = false
            onResult?.invoke(text)
        }
    }

    // ---- Screen recording --------------------------------------------------
    // System consent dialog, then a service-backed capture into the cache.
    // stopScreenRecord() finalizes and returns the output path.
    fun startScreenRecord(onStarted: ((String?) -> Unit)? = null) = screenRecStarter(onStarted)

    fun stopScreenRecord(): String? = screenRecStopper()

    // ---- Volume & ringer ---------------------------------------------------
    fun refreshVolume(onDone: ((Int, String?) -> Unit)? = null) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        mediaVolume = am.getStreamVolume(AudioManager.STREAM_MUSIC)
        ringerMode = when (am.ringerMode) {
            AudioManager.RINGER_MODE_NORMAL -> "normal"
            AudioManager.RINGER_MODE_VIBRATE -> "vibrate"
            AudioManager.RINGER_MODE_SILENT -> "silent"
            else -> null
        }
        onDone?.invoke(mediaVolume, ringerMode)
    }

    // Sets the media stream volume 0-100 (clamped to the stream max).
    fun setVolume(level: Int, onDone: ((Boolean) -> Unit)? = null) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val clamped = level.coerceIn(0, am.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
        am.setStreamVolume(AudioManager.STREAM_MUSIC, clamped, 0)
        mediaVolume = clamped
        onDone?.invoke(true)
    }

    // Ringer mode: "normal" / "vibrate" / "silent" (MODIFY_AUDIO_SETTINGS).
    fun setRingerMode(mode: String, onDone: ((Boolean) -> Unit)? = null) {
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
    fun setScreenBrightness(level: Int, onDone: ((Boolean) -> Unit)? = null) {
        val act = findActivity(context)
        val lp = act?.window?.attributes
        if (act == null || lp == null) { onDone?.invoke(false); return }
        lp.screenBrightness = level.coerceIn(0, 100) / 100f
        act.window.attributes = lp
        screenBrightness = lp.screenBrightness
        onDone?.invoke(true)
    }

    fun resetScreenBrightness(onDone: ((Boolean) -> Unit)? = null) {
        val act = findActivity(context)
        val lp = act?.window?.attributes
        if (act == null || lp == null) { onDone?.invoke(false); return }
        lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
        act.window.attributes = lp
        screenBrightness = -1f
        onDone?.invoke(true)
    }

    // Keeps the screen on while this app's window is visible.
    fun setKeepAwake(on: Boolean, onDone: ((Boolean) -> Unit)? = null) {
        val act = findActivity(context)
        if (act == null || act.window == null) { onDone?.invoke(false); return }
        if (on) act.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else act.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        keepAwake = on
        onDone?.invoke(true)
    }

    // ---- Storage & memory --------------------------------------------------
    fun refreshStorage(onDone: ((String, String) -> Unit)? = null) {
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
    fun lockOrientation(mode: String, onDone: ((Boolean) -> Unit)? = null) {
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
    fun readSensor(type: String, onDone: ((String?) -> Unit)? = null) {
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
    private fun launchSafe(intent: Intent): Boolean =
        runCatching { context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess

    // Dialer pre-filled with the number.
    fun dial(number: String, onDone: ((Boolean) -> Unit)? = null) {
        onDone?.invoke(launchSafe(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${number}"))))
    }

    // Messenger pre-filled with the recipient + body.
    fun sendSms(number: String, text: String, onDone: ((Boolean) -> Unit)? = null) {
        val i = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${number}")).putExtra("sms_body", text)
        onDone?.invoke(launchSafe(i))
    }

    // Mail client with to/subject/body pre-filled.
    fun sendEmail(to: String, subject: String, body: String, onDone: ((Boolean) -> Unit)? = null) {
        val i = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${to}"))
            .putExtra(Intent.EXTRA_SUBJECT, subject)
            .putExtra(Intent.EXTRA_TEXT, body)
        onDone?.invoke(launchSafe(i))
    }

    // Opens any URL in the browser.
    fun openUrl(url: String, onDone: ((Boolean) -> Unit)? = null) {
        onDone?.invoke(launchSafe(Intent(Intent.ACTION_VIEW, Uri.parse(url))))
    }

    // Opens Google Maps with a place query.
    fun openMaps(query: String, onDone: ((Boolean) -> Unit)? = null) {
        val uri = "geo:0,0?q=" + Uri.encode(query)
        onDone?.invoke(launchSafe(Intent(Intent.ACTION_VIEW, Uri.parse(uri))))
    }

    // System settings screens: "wifi" / "bluetooth" / "location" / "sound" /
    // "display" / "security" / "apps" / "nfc" / "main".
    fun openSettings(section: String? = null, onDone: ((Boolean) -> Unit)? = null) {
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
    fun setAlarm(hour: Int, minute: Int, title: String, onDone: ((Boolean) -> Unit)? = null) {
        val i = Intent(AlarmClock.ACTION_SET_ALARM)
            .putExtra(AlarmClock.EXTRA_HOUR, hour)
            .putExtra(AlarmClock.EXTRA_MINUTES, minute)
            .putExtra(AlarmClock.EXTRA_MESSAGE, title)
        onDone?.invoke(launchSafe(i))
    }

    // Launches an installed app by package name (e.g. "com.android.settings").
    fun openApp(packageName: String, onDone: ((Boolean) -> Unit)? = null) {
        val launch = context.packageManager.getLaunchIntentForPackage(packageName)
        if (launch == null) { onDone?.invoke(false); return }
        onDone?.invoke(launchSafe(launch))
    }

    // ---- Misc system -------------------------------------------------------
    // Android toast (short/long).
    fun toast(text: String, long: Boolean = false, onDone: ((Boolean) -> Unit)? = null) {
        Toast.makeText(context, text, if (long) Toast.LENGTH_LONG else Toast.LENGTH_SHORT).show()
        onDone?.invoke(true)
    }

    // Plays a system sound: "notification" / "alarm" / "ringtone" / null.
    fun playSound(kind: String? = null, onDone: ((Boolean) -> Unit)? = null) {
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
    fun setWallpaper(path: String, onDone: ((Boolean) -> Unit)? = null) {
        val f = java.io.File(path)
        if (!f.exists()) { onDone?.invoke(false); return }
        val wm = WallpaperManager.getInstance(context)
        val ok = runCatching { java.io.FileInputStream(f).use { wm.setStream(it) } }.isSuccess
        onDone?.invoke(ok)
    }

    // Upcoming calendar events as "title · MMM d, HH:mm" rows; READ_CALENDAR
    // runtime permission granted on first use.
    fun listCalendarEvents(onDone: ((List<String>) -> Unit)? = null, limit: Int = 50) {
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
            onDone?.invoke(rows)
        }
        permissionRunner(android.Manifest.permission.READ_CALENDAR, ::read)
    }

    // NFC presence + adapter state.
    fun refreshNfc(onDone: ((Boolean, Boolean) -> Unit)? = null) {
        val na = runCatching { context.getSystemService(Context.NFC_SERVICE) as NfcAdapter }.getOrNull()
        nfcAvailable = na != null
        nfcEnabled = na?.isEnabled == true
        onDone?.invoke(nfcAvailable, nfcEnabled)
    }

    // SIM/carrier info (no permission needed for operator name + state).
    fun refreshTelephony(onDone: ((String?, String?) -> Unit)? = null) {
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
    fun refreshDeviceInfo(onDone: ((String) -> Unit)? = null) {
        deviceModel = Build.MODEL
        deviceManufacturer = Build.MANUFACTURER
        androidVersion = Build.VERSION.RELEASE
        val dm = context.resources.displayMetrics
        screenSize = "${dm.widthPixels}x${dm.heightPixels}"
        val summary = "${deviceManufacturer} ${deviceModel} · Android ${androidVersion} · ${screenSize}"
        onDone?.invoke(summary)
    }

    // Speaks text with the system TTS engine (callback fires when ready/used).
    fun speak(text: String, onDone: ((Boolean) -> Unit)? = null) {
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
        val f = java.io.File(dir, "recording_${System.currentTimeMillis()}.m4a")
        return runCatching {
            @Suppress("DEPRECATION")
            val r = MediaRecorder().apply {
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
    if (bytes < 1024) return "${bytes} B"
    val kb = bytes / 1024.0
    if (kb < 1024) return "${String.format("%.1f", kb)} KB"
    val mb = kb / 1024.0
    if (mb < 1024) return "${String.format("%.1f", mb)} MB"
    val gb = mb / 1024.0
    return "${String.format("%.1f", gb)} GB"
}

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
fun VeskPhotoPicker(
    label: String = "Pick a photo",
    onPick: ((String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.pickImage(onPick) }, modifier = modifier) { Text(label) }
}

// <camera> captures through the system camera app (FileProvider output URI);
// the video attribute switches to video capture.
@Composable
fun VeskCamera(
    label: String = "Take a photo",
    onDone: ((String?) -> Unit)? = null,
    video: Boolean = false,
    modifier: Modifier = Modifier,
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
fun VeskRecorder(
    label: String = "Record",
    onDone: ((String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
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
fun VeskFileInput(
    label: String = "Pick a file",
    mime: String = "*/*",
    onDone: ((String?, String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.pickFile(onDone, mime) }, modifier = modifier) { Text(label) }
}

// <notification title="..." text="..."> posts on the app channel; onTap runs
// when it is tapped (the tap also opens the app).
@Composable
fun VeskNotification(
    title: String,
    text: String,
    label: String = "Notify",
    onTap: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.notify(title, text, onTap) }, modifier = modifier) { Text(label) }
}

// <battery-status onDone={(level, charging) => ...}> reports battery level
// (0-100) and charge state, also cached in device.batteryLevel/charging.
@Composable
fun VeskBatteryStatus(
    label: String = "Battery",
    onDone: ((Int, Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.getBattery(onDone) }, modifier = modifier) { Text(label) }
}

// <network-status onDone={(type, available) => ...}> reports the active
// transport ("wifi" / "cellular" / "ethernet" / null) and internet access.
@Composable
fun VeskNetworkStatus(
    label: String = "Network",
    onDone: ((String?, Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshNetwork(onDone) }, modifier = modifier) { Text(label) }
}

// <location onDone={(lat, lng) => ...}> reads the last known fix (GPS first,
// network fallback); requires location services and runtime permission.
@Composable
fun VeskLocation(
    label: String = "Location",
    onDone: ((String?, String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.getLocation(onDone) }, modifier = modifier) { Text(label) }
}

// <apps onDone={(list) => ...}> lists launchable apps (label, sorted, capped),
// also cached in device.installedApps.
@Composable
fun VeskApps(
    label: String = "Apps",
    onDone: ((List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listApps(onDone) }, modifier = modifier) { Text(label) }
}

// <contacts onDone={(list) => ...}> lists "name · number" rows; requires the
// READ_CONTACTS runtime permission (granted on first use).
@Composable
fun VeskContacts(
    label: String = "Contacts",
    onDone: ((List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listContacts(onDone) }, modifier = modifier) { Text(label) }
}

// <call-log onDone={(list) => ...}> lists "type · age · number" rows; requires
// the READ_CALL_LOG runtime permission.
@Composable
fun VeskCallLog(
    label: String = "Call log",
    onDone: ((List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listCallLogs(onDone) }, modifier = modifier) { Text(label) }
}

// <messages onDone={(list) => ...}> lists "sender: body" rows; requires the
// READ_SMS runtime permission.
@Composable
fun VeskMessages(
    label: String = "Messages",
    onDone: ((List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listMessages(onDone) }, modifier = modifier) { Text(label) }
}

// <accounts onDone={(list) => ...}> lists "type · name" rows; requires the
// GET_ACCOUNTS runtime permission.
@Composable
fun VeskAccounts(
    label: String = "Accounts",
    onDone: ((List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listAccounts(onDone) }, modifier = modifier) { Text(label) }
}

// <clipboard onDone={(text) => ...}> reads the current clipboard text.
@Composable
fun VeskClipboard(
    label: String = "Clipboard",
    onDone: ((String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.readClipboard(onDone) }, modifier = modifier) { Text(label) }
}

// <copy-to-clipboard value="..."> writes text to the clipboard.
@Composable
fun VeskCopyToClipboard(
    value: String,
    label: String = "Copy",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.copyToClipboard(value, onDone) }, modifier = modifier) { Text(label) }
}

// <vibrate duration="200"> pulses the vibrator for the given milliseconds.
@Composable
fun VeskVibrate(
    label: String = "Vibrate",
    duration: Long = 200,
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.vibrate(duration, onDone) }, modifier = modifier) { Text(label) }
}

// <torch> toggles the camera flash (no permission needed for torch mode).
@Composable
fun VeskTorch(
    label: String = "Torch",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toggleTorch(onDone) }, modifier = modifier) { Text(label) }
}

// <screenshot onDone={(path) => ...}> captures the current window to a PNG in
// the app cache (also device.lastScreenshot).
@Composable
fun VeskScreenshot(
    label: String = "Screenshot",
    onDone: ((String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.captureScreenshot(onDone) }, modifier = modifier) { Text(label) }
}

// <share-text text="..."> opens the system share sheet with plain text.
@Composable
fun VeskShareText(
    text: String,
    label: String = "Share",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.shareText(text, onDone) }, modifier = modifier) { Text(label) }
}

// <share-file path="..." mime="..."> shares a file through its FileProvider
// URI (the path can be a device path or a content:// URI).
@Composable
fun VeskShareFile(
    path: String? = null,
    mime: String = "application/octet-stream",
    label: String = "Share file",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { if (path != null) device.shareFile(path, mime, onDone) }, modifier = modifier) { Text(label) }
}

// <biometric-auth> checks hardware then prompts (fingerprint/face);
// onDone = (ok, reason).
@Composable
fun VeskBiometricAuth(
    label: String = "Unlock with biometrics",
    onDone: ((Boolean, String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.checkBiometrics(); device.authenticate(onDone) }, modifier = modifier) { Text(label) }
}

// <bluetooth> refreshes adapter state + bonded devices.
@Composable
fun VeskBluetooth(
    label: String = "Bluetooth",
    onDone: ((Boolean, List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshBluetooth(onDone) }, modifier = modifier) { Text(label) }
}

// <bluetooth-toggle> flips the adapter.
@Composable
fun VeskBluetoothToggle(
    label: String = "Toggle Bluetooth",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toggleBluetooth(!device.bluetoothEnabled, onDone) }, modifier = modifier) { Text(label) }
}

// <bluetooth-scan> discovers nearby devices for a few seconds.
@Composable
fun VeskBluetoothScan(
    label: String = "Scan devices",
    onDone: ((List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.scanBluetooth(6, onDone) }, modifier = modifier) { Text(label) }
}

// <screen-record> toggles MediaProjection capture (system consent first).
@Composable
fun VeskScreenRecord(
    label: String = "Record screen",
    onDone: ((String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
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

// <qr-code value="..."> renders the encoded QR bitmap inline (no button).
@Composable
fun VeskQrCode(
    value: String = "",
    modifier: Modifier = Modifier,
) {
    val bmp = remember(value) { veskQrBitmap(value) }
    if (bmp != null) Image(bitmap = bmp, contentDescription = null, modifier = modifier)
}

// <qr-scanner> opens the camera overlay and reports the decoded text.
@Composable
fun VeskQrScanner(
    label: String = "Scan QR",
    onResult: ((String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.scanQr(onResult) }, modifier = modifier) { Text(label) }
}

// <volume> reports media volume + ringer mode.
@Composable
fun VeskVolume(
    label: String = "Volume",
    onDone: ((Int, String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshVolume(onDone) }, modifier = modifier) { Text(label) }
}

// <set-volume value="60"> sets the media stream volume 0-100.
@Composable
fun VeskSetVolume(
    value: Int,
    label: String = "Set volume",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setVolume(value, onDone) }, modifier = modifier) { Text(label) }
}

// <brightness value="80"> sets this window's brightness 0-100.
@Composable
fun VeskBrightness(
    value: Int,
    label: String = "Set brightness",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setScreenBrightness(value, onDone) }, modifier = modifier) { Text(label) }
}

// <keep-awake value="true"> pins the screen on/off while the app is visible.
@Composable
fun VeskKeepAwake(
    value: Boolean,
    label: String = "Keep awake",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setKeepAwake(value, onDone) }, modifier = modifier) { Text(label) }
}

// <orientation mode="portrait|landscape|auto"> locks the app orientation.
@Composable
fun VeskOrientation(
    mode: String = "auto",
    label: String = "Set orientation",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.lockOrientation(mode, onDone) }, modifier = modifier) { Text(label) }
}

// <device-info> reports "manufacturer model · Android X · WxH".
@Composable
fun VeskDeviceInfo(
    label: String = "Device info",
    onDone: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshDeviceInfo(onDone) }, modifier = modifier) { Text(label) }
}

// <storage-status> reports free/total app storage.
@Composable
fun VeskStorage(
    label: String = "Storage",
    onDone: ((String, String) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshStorage(onDone) }, modifier = modifier) { Text(label) }
}

// <sensor type="light|proximity|accelerometer|gyroscope|temperature">
@Composable
fun VeskSensor(
    type: String = "light",
    label: String = "Read sensor",
    onDone: ((String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.readSensor(type, onDone) }, modifier = modifier) { Text(label) }
}

// <toast text="..."> shows an Android toast.
@Composable
fun VeskToast(
    text: String,
    label: String = "Toast",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toast(text, onDone = onDone) }, modifier = modifier) { Text(label) }
}

// <sound kind="notification|alarm|ringtone"> plays a system sound.
@Composable
fun VeskSound(
    kind: String = "notification",
    label: String = "Play sound",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.playSound(kind, onDone) }, modifier = modifier) { Text(label) }
}

// <wallpaper path="..."> sets the home/lock wallpaper from an image file.
@Composable
fun VeskWallpaper(
    path: String? = null,
    label: String = "Set wallpaper",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { if (path != null) device.setWallpaper(path, onDone) }, modifier = modifier) { Text(label) }
}

// <calendar> lists upcoming events (READ_CALENDAR prompt on first use).
@Composable
fun VeskCalendar(
    label: String = "Calendar",
    onDone: ((List<String>) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listCalendarEvents(onDone) }, modifier = modifier) { Text(label) }
}

// <nfc> refreshes NFC presence + state.
@Composable
fun VeskNfc(
    label: String = "NFC",
    onDone: ((Boolean, Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshNfc(onDone) }, modifier = modifier) { Text(label) }
}

// <sim> refreshes carrier + SIM state.
@Composable
fun VeskSim(
    label: String = "SIM",
    onDone: ((String?, String?) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshTelephony(onDone) }, modifier = modifier) { Text(label) }
}

// <dial number="+1555..."> opens the dialer pre-filled.
@Composable
fun VeskDial(
    number: String,
    label: String = "Dial",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.dial(number, onDone) }, modifier = modifier) { Text(label) }
}

// <sms number="..." text="..."> opens the messenger pre-filled.
@Composable
fun VeskSms(
    number: String,
    text: String,
    label: String = "Send SMS",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.sendSms(number, text, onDone) }, modifier = modifier) { Text(label) }
}

// <email to="..." subject="..." body="..."> opens the mail client.
@Composable
fun VeskEmail(
    to: String,
    subject: String = "",
    body: String = "",
    label: String = "Email",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.sendEmail(to, subject, body, onDone) }, modifier = modifier) { Text(label) }
}

// <open-link url="https://..."> opens a URL in the browser.
@Composable
fun VeskLink(
    url: String,
    label: String = "Open link",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openUrl(url, onDone) }, modifier = modifier) { Text(label) }
}

// <map query="..."> opens Google Maps with a place query.
@Composable
fun VeskMap(
    query: String,
    label: String = "Open map",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openMaps(query, onDone) }, modifier = modifier) { Text(label) }
}

// <alarm hour="8" minute="30" title="..."> sets an alarm clock.
@Composable
fun VeskAlarm(
    hour: Int,
    minute: Int,
    title: String = "Alarm",
    label: String = "Set alarm",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setAlarm(hour, minute, title, onDone) }, modifier = modifier) { Text(label) }
}

// <open-settings section="wifi|bluetooth|location|sound|display|security|apps|nfc|main">
@Composable
fun VeskOpenSettings(
    section: String = "main",
    label: String = "Open settings",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openSettings(section, onDone) }, modifier = modifier) { Text(label) }
}

// <open-app app="com.android.settings"> launches an installed app.
@Composable
fun VeskOpenApp(
    app: String,
    label: String = "Open app",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openApp(app, onDone) }, modifier = modifier) { Text(label) }
}

// <speak text="..."> speaks the text with the system TTS engine.
@Composable
fun VeskSpeak(
    text: String,
    label: String = "Speak",
    onDone: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val device = rememberDeviceApi()
    Button(onClick = { device.speak(text, onDone) }, modifier = modifier) { Text(label) }
}


// Drag and drop (markup-level): drag sources via the draggable attribute,
// drop targets via the ondrop binding. Backed by the platform drag & drop,
// so dragged text also lands in other apps.
class VeskDragData(val text: String)

fun Modifier.veskDraggable(data: VeskDragData): Modifier = this.dragAndDropSource(transferData = {
    DragAndDropTransferData(ClipData.newPlainText("vesk", data.text), flags = View.DRAG_FLAG_GLOBAL)
})

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun Modifier.veskDropTarget(onDrop: (String?) -> Unit): Modifier {
    val ctx = LocalContext.current
    return this.dragAndDropTarget(
        shouldStartDragAndDrop = { true },
        target = object : DragAndDropTarget {
            override fun onDrop(event: DragAndDropEvent): Boolean {
                val text = runCatching { event.toAndroidDragEvent().clipData.getItemAt(0).text?.toString() }.getOrNull()
                onDrop(text)
                return true
            }
        },
    )
}


// Tailwind color filter base: color-matrix saveLayer; works on all API levels.
private fun Modifier.veskColorFilter(matrix: ColorMatrix): Modifier = drawWithContent {
    val paint = Paint().apply { colorFilter = ColorFilter.colorMatrix(matrix) }
    drawContext.canvas.saveLayer(Rect(0f, 0f, size.width, size.height), paint)
    drawContent()
    drawContext.canvas.restore()
}


fun Modifier.veskGrayscale(factor: Float): Modifier = veskColorFilter(
    ColorMatrix().also { it.setToSaturation(1f - factor) }
)


// Dashed/dotted borders (border-dashed / border-dotted) drawn as strokes
// behind the element content.
fun Modifier.veskDashedBorder(width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val stroke = Stroke(width = width.toPx(), pathEffect = PathEffect.dashPathEffect(dashes))
    drawRoundRect(color = color, style = stroke)
}


// Per-side borders (border-t/r/b/l, border-x/y).
fun Modifier.veskSideBorder(top: Dp, end: Dp, bottom: Dp, start: Dp, color: Color): Modifier = drawBehind {
    val w = floatArrayOf(top.toPx(), end.toPx(), bottom.toPx(), start.toPx())
    val s = size
    if (w[0] > 0f) drawLine(color, Offset(0f, w[0] / 2f), Offset(s.width, w[0] / 2f), w[0])
    if (w[1] > 0f) drawLine(color, Offset(s.width - w[1] / 2f, 0f), Offset(s.width - w[1] / 2f, s.height), w[1])
    if (w[2] > 0f) drawLine(color, Offset(0f, s.height - w[2] / 2f), Offset(s.width, s.height - w[2] / 2f), w[2])
    if (w[3] > 0f) drawLine(color, Offset(w[3] / 2f, 0f), Offset(w[3] / 2f, s.height), w[3])
}


// Single dashed/dotted divider line (divide-dashed / divide-dotted).
fun Modifier.veskDivideLine(horizontal: Boolean, width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val w = width.toPx()
    if (horizontal) {
        drawLine(color, Offset(0f, w / 2f), Offset(size.width, w / 2f), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    } else {
        drawLine(color, Offset(w / 2f, 0f), Offset(w / 2f, size.height), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    }
}


// Skew transform (skew-x / skew-y) via canvas transform.
fun Modifier.veskSkew(sx: Float, sy: Float): Modifier = drawWithContent {
    val canvas = drawContext.canvas
    canvas.save()
    canvas.skew(sx, sy)
    drawContent()
    canvas.restore()
}


data class NavLinkProps(
    val href: String = "",
    val `class`: String = "",
)

@Composable
fun NavLink(props: NavLinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = Modifier.clickable(onClick = { nav.navigate(props.href) })) {
        content()
    }
}
