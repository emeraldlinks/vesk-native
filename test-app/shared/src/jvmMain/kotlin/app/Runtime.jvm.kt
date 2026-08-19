package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asComposeImageBitmap
import androidx.compose.ui.graphics.painter.ColorPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import java.awt.Desktop
import java.awt.GraphicsEnvironment
import java.awt.datatransfer.DataFlavor
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.nio.file.Files
import java.nio.file.Path
import javax.swing.JFileChooser
import kotlinx.coroutines.Dispatchers
import org.jetbrains.skia.Bitmap
import org.jetbrains.skia.ColorAlphaType
import org.jetbrains.skia.ColorType
import org.jetbrains.skia.Image
import org.jetbrains.skia.ImageInfo


// <video> on the desktop preview: no playback backend is wired into the jvm
// target — the element renders a labeled placeholder box instead of failing
// the whole page, so layout keeps working while the media itself is inert.
@Composable
actual fun veskVideo(url: String?, controls: Boolean, autoplay: Boolean, loop: Boolean, muted: Boolean, scale: String, broadcast: Boolean, modifier: Modifier) {
    Box(modifier = modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
        Text("video: ${url ?: "no source"}")
    }
}


// <audio> on the desktop preview: no playback backend is wired into the jvm
// target — a labeled placeholder box, same rationale as veskVideo.
@Composable
actual fun veskAudio(url: String?, controls: Boolean, autoplay: Boolean, loop: Boolean, muted: Boolean, broadcast: Boolean, modifier: Modifier) {
    Box(modifier = modifier.fillMaxWidth().height(48.dp), contentAlignment = Alignment.Center) {
        Text("audio: ${url ?: "no source"}")
    }
}


// <img src="/storage/..."> (absolute filesystem paths on desktop): runtime
// decode from disk via skiko, the same decode path the compose desktop
// renderer uses. Missing/unreadable files render a transparent placeholder,
// matching the android/ios actuals.
@Composable
actual fun veskFileImage(path: String?): ImageBitmap {
    val bmp = remember(path) {
        if (path == null) null
        else runCatching {
            val img = Image.makeFromEncoded(Files.readAllBytes(Path.of(path)))
            val out = Bitmap().apply { allocPixels(ImageInfo(img.width, img.height, img.colorType, img.alphaType)) }
            img.readPixels(out)
            out
        }.getOrNull()
    }
    if (bmp != null) return bmp.asComposeImageBitmap()
    // Empty (or unreadable) file: a 1x1 opaque raster so callers always get a
    // real ImageBitmap — skia-backed, like the decoded path above.
    return remember(path) {
        val img = Image.makeRaster(ImageInfo(1, 1, ColorType.RGBA_8888, ColorAlphaType.OPAQUE), ByteArray(4), 4)
        val out = Bitmap().apply { allocPixels(ImageInfo(1, 1, ColorType.RGBA_8888, ColorAlphaType.OPAQUE)) }
        img.readPixels(out)
        out.asComposeImageBitmap()
    }
}


// <img src="/media/..."> bundled project asset on desktop: the jvm target
// does not wire the compose-resources plugin, so bundled images render a
// gray placeholder box (the name is still validated at compile time by the
// compiler's resource scan).
@Composable
actual fun veskBundledImage(name: String): Painter = remember(name) { ColorPainter(androidx.compose.ui.graphics.Color.Gray) }


// <video>/<audio> src="/media/..."> bundled project media on desktop: no
// playback backend on the jvm target (see veskVideo), so the URL seam returns
// an empty string — the placeholder renders regardless of the source.
actual fun veskBundledMediaUrl(name: String): String = ""


// ---- Desktop (jvm) actuals ------------------------------------------------
// The vesk dev --desktop preview host. Browser/device capabilities get real
// JVM impls where the mapping is 1:1 (files, clipboard, storage, URLs, share
// via clipboard) and fail closed with no-ops elsewhere — a desktop has no
// camera, sensors, telephony, or QR scanner, so the preview renders the
// surface without crashing. Every method below matches the android actual's
// member-for-member surface (verified against the expect class in
// commonMain RuntimeCore.kt).

@Composable
actual fun rememberDeviceApi(): DeviceApi {
    val api = remember { DeviceApi() }
    return api
}

actual class DeviceApi internal constructor() {
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

    actual fun pickImage(onDone: ((String?) -> Unit)?) = chooseFile(listOf("png", "jpg", "jpeg", "gif", "webp", "bmp"), onDone)
    actual fun pickAudio(onDone: ((String?) -> Unit)?) = chooseFile(listOf("mp3", "wav", "ogg", "m4a", "flac"), onDone)
    actual fun pickFile(onDone: ((String?, String?) -> Unit)?, mime: String) {
        val chooser = JFileChooser()
        if (chooser.showOpenDialog(null) == JFileChooser.APPROVE_OPTION) {
            val f = chooser.selectedFile
            lastFile = f.absolutePath
            lastFileName = f.name
            onDone?.invoke(f.absolutePath, f.name)
        } else {
            onDone?.invoke(null, null)
        }
    }
    actual fun capturePhoto(onDone: ((String?) -> Unit)?): Unit { onDone?.invoke(null) }
    actual fun captureVideo(onDone: ((String?) -> Unit)?): Unit { onDone?.invoke(null) }
    actual fun startRecording(onStarted: ((String?) -> Unit)?): Unit { onStarted?.invoke(null) }
    actual fun stopRecording(): String? = null
    actual fun notify(title: String, text: String, onTap: (() -> Unit)?) {
        println("notify: $title — $text")
        onTap?.invoke()
    }

    actual fun getBattery(onDone: ((Int, Boolean) -> Unit)?): Unit { onDone?.invoke(0, false) }

    actual fun refreshNetwork(onDone: ((String?, Boolean) -> Unit)?) {
        networkType = null
        networkAvailable = true
        onDone?.invoke(null, true)
    }

    actual fun getLocation(onDone: ((String?, String?) -> Unit)?) {
        locationEnabled = false
        onDone?.invoke(null, null)
    }

    actual fun listApps(onDone: ((List<String>) -> Unit)?, limit: Int) {
        installedApps = emptyList()
        onDone?.invoke(emptyList())
    }

    actual fun listContacts(onDone: ((List<String>) -> Unit)?, limit: Int) {
        contacts = emptyList()
        onDone?.invoke(emptyList())
    }

    actual fun listCallLogs(onDone: ((List<String>) -> Unit)?, limit: Int) {
        callLogs = emptyList()
        onDone?.invoke(emptyList())
    }

    actual fun listMessages(onDone: ((List<String>) -> Unit)?, limit: Int) {
        messages = emptyList()
        onDone?.invoke(emptyList())
    }

    actual fun listAccounts(onDone: ((List<String>) -> Unit)?, limit: Int) {
        accounts = emptyList()
        onDone?.invoke(emptyList())
    }

    actual fun readClipboard(onDone: ((String?) -> Unit)?) {
        val text = if (GraphicsEnvironment.isHeadless()) null
        else runCatching { java.awt.Toolkit.getDefaultToolkit().systemClipboard.getData(DataFlavor.stringFlavor)?.toString() }.getOrNull()
        clipboardText = text
        onDone?.invoke(text)
    }

    actual fun copyToClipboard(value: String, onDone: ((Boolean) -> Unit)?) {
        val ok = if (GraphicsEnvironment.isHeadless()) false
        else runCatching {
            java.awt.Toolkit.getDefaultToolkit().systemClipboard.setContents(java.awt.datatransfer.StringSelection(value), null)
            clipboardText = value
            true
        }.getOrDefault(false)
        onDone?.invoke(ok)
    }

    actual fun vibrate(millis: Long, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(true) }
    actual fun toggleTorch(onDone: ((Boolean) -> Unit)?) {
        torchEnabled = false
        torchAvailable = false
        onDone?.invoke(false)
    }

    actual fun captureScreenshot(onDone: ((String?) -> Unit)?): Unit { onDone?.invoke(null) }

    actual fun shareText(text: String, onDone: ((Boolean) -> Unit)?) {
        // No share sheet on the desktop: sharing falls back to the clipboard.
        copyToClipboard(text, onDone)
    }

    actual fun shareFile(path: String, mime: String?, onDone: ((Boolean) -> Unit)?) {
        val file = File(path)
        if (file.isFile) {
            val ok = runCatching {
                val list = java.util.List.of(file)
                java.awt.Toolkit.getDefaultToolkit().systemClipboard.setContents(
                    object : java.awt.datatransfer.Transferable {
                        override fun getTransferDataFlavors(): Array<java.awt.datatransfer.DataFlavor> =
                            arrayOf(java.awt.datatransfer.DataFlavor.javaFileListFlavor)
                        override fun isDataFlavorSupported(flavor: java.awt.datatransfer.DataFlavor): Boolean =
                            flavor == java.awt.datatransfer.DataFlavor.javaFileListFlavor
                        override fun getTransferData(flavor: java.awt.datatransfer.DataFlavor): Any = list
                    }, null,
                )
                true
            }.getOrDefault(false)
            onDone?.invoke(ok)
        } else {
            onDone?.invoke(false)
        }
    }

    actual fun listFiles(dir: String, onDone: ((List<String>) -> Unit)?) {
        val base = if (dir.isBlank()) filesDir() else File(dir)
        val files = base.listFiles()?.map { it.absolutePath } ?: emptyList()
        appFiles = files
        onDone?.invoke(files)
    }

    actual fun writeFile(name: String, content: String, onDone: ((String?) -> Unit)?) {
        val path = filesDir().resolve(name)
        val ok = runCatching {
            Files.createDirectories(path.toPath().parent)
            Files.write(path.toPath(), content.encodeToByteArray())
            true
        }.getOrDefault(false)
        onDone?.invoke(if (ok) path.absolutePath else null)
    }

    actual fun readFile(name: String, onDone: ((String?) -> Unit)?) {
        val path = if (name.contains("/")) File(name) else filesDir().resolve(name)
        val text = if (path.isFile) runCatching { path.readText() }.getOrNull() else null
        onDone?.invoke(text)
    }

    actual fun deleteFile(name: String, onDone: ((Boolean) -> Unit)?) {
        val path = if (name.contains("/")) File(name) else filesDir().resolve(name)
        onDone?.invoke(path.delete())
    }

    actual fun checkBiometrics(onDone: ((Boolean, String?) -> Unit)?) {
        biometricAvailable = false
        onDone?.invoke(false, "Not available on desktop")
    }

    actual fun authenticate(onDone: ((Boolean, String?) -> Unit)?): Unit { onDone?.invoke(false, "Not available on desktop") }

    actual fun refreshBluetooth(onDone: ((Boolean, List<String>) -> Unit)?) {
        bluetoothEnabled = false
        bluetoothDevices = emptyList()
        onDone?.invoke(false, emptyList())
    }

    actual fun toggleBluetooth(enabled: Boolean, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }

    actual fun scanBluetooth(seconds: Int, onDone: ((List<String>) -> Unit)?) {
        bluetoothDevices = emptyList()
        onDone?.invoke(emptyList())
    }

    actual fun generateQrCode(text: String, onDone: ((String?) -> Unit)?, size: Int): Unit { onDone?.invoke(null) }
    actual fun scanQr(onResult: ((String?) -> Unit)?) {
        scanningQr = false
        onResult?.invoke(null)
    }

    actual fun startScreenRecord(onStarted: ((String?) -> Unit)?): Unit { onStarted?.invoke(null) }
    actual fun stopScreenRecord(): String? = null

    actual fun refreshVolume(onDone: ((Int, String?) -> Unit)?) {
        mediaVolume = 0
        onDone?.invoke(0, null)
    }

    actual fun setVolume(level: Int, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }
    actual fun setRingerMode(mode: String, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }

    actual fun setScreenBrightness(level: Int, onDone: ((Boolean) -> Unit)?) {
        screenBrightness = -1f
        onDone?.invoke(false)
    }

    actual fun resetScreenBrightness(onDone: ((Boolean) -> Unit)?) {
        screenBrightness = -1f
        onDone?.invoke(false)
    }

    actual fun setKeepAwake(on: Boolean, onDone: ((Boolean) -> Unit)?) {
        keepAwake = on
        onDone?.invoke(true)
    }

    actual fun refreshStorage(onDone: ((String, String) -> Unit)?) {
        val root = File.listRoots().firstOrNull()
        val free = root?.usableSpace ?: 0L
        val total = root?.totalSpace ?: 0L
        storageFree = free
        storageTotal = total
        onDone?.invoke(formatBytes(free), formatBytes(total))
    }

    actual fun lockOrientation(mode: String, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }
    actual fun readSensor(type: String, onDone: ((String?) -> Unit)?): Unit { onDone?.invoke(null) }

    actual fun dial(number: String, onDone: ((Boolean) -> Unit)?) {
        val ok = browse(URI("tel:" + percentEncode(number)))
        onDone?.invoke(ok)
    }

    actual fun sendSms(number: String, text: String, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }

    actual fun sendEmail(to: String, subject: String, body: String, onDone: ((Boolean) -> Unit)?) {
        val uri = URI("mailto:" + percentEncode(to) + "?subject=" + percentEncode(subject) + "&body=" + percentEncode(body))
        onDone?.invoke(browse(uri))
    }

    actual fun openUrl(url: String, onDone: ((Boolean) -> Unit)?) {
        onDone?.invoke(runCatching { browse(URI(url)) }.getOrDefault(false))
    }

    actual fun openMaps(query: String, onDone: ((Boolean) -> Unit)?) {
        onDone?.invoke(browse(URI("https://www.google.com/maps/search/?api=1&query=" + percentEncode(query))))
    }

    actual fun openSettings(section: String?, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }
    actual fun setAlarm(hour: Int, minute: Int, title: String, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }
    actual fun openApp(packageName: String, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }

    actual fun toast(text: String, long: Boolean, onDone: ((Boolean) -> Unit)?) {
        println("toast: $text")
        onDone?.invoke(true)
    }

    actual fun playSound(kind: String?, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }
    actual fun setWallpaper(path: String, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }

    actual fun listCalendarEvents(onDone: ((List<String>) -> Unit)?, limit: Int) {
        calendarEvents = emptyList()
        onDone?.invoke(emptyList())
    }

    actual fun refreshNfc(onDone: ((Boolean, Boolean) -> Unit)?) {
        nfcAvailable = false
        nfcEnabled = false
        onDone?.invoke(false, false)
    }

    actual fun refreshTelephony(onDone: ((String?, String?) -> Unit)?) {
        carrier = null
        simState = "none"
        onDone?.invoke(null, "none")
    }

    actual fun refreshDeviceInfo(onDone: ((String) -> Unit)?) {
        val osName = System.getProperty("os.name") ?: "unknown"
        val osVersion = System.getProperty("os.version") ?: ""
        deviceManufacturer = "Desktop"
        deviceModel = osName
        androidVersion = osVersion
        val info = "$osName $osVersion (Java ${System.getProperty("java.version") ?: ""})"
        screenSize = info
        onDone?.invoke(info)
    }

    actual fun speak(text: String, onDone: ((Boolean) -> Unit)?): Unit { onDone?.invoke(false) }
}

// Declarative device elements (style C) — the desktop preview mirrors the
// android/ios buttons; every capability routed through DeviceApi above, so
// unsupported capabilities fail closed (no-op callback) instead of crashing.
@Composable
actual fun VeskPhotoPicker(label: String, onPick: ((String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.pickImage(onPick) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskCamera(label: String, onDone: ((String?) -> Unit)?, video: Boolean, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { if (video) device.captureVideo(onDone) else device.capturePhoto(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskRecorder(label: String, onDone: ((String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.startRecording(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskFileInput(label: String, mime: String, onDone: ((String?, String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.pickFile(onDone, mime) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskNotification(title: String, text: String, label: String, onTap: (() -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.notify(title, text, onTap) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskBatteryStatus(label: String, onDone: ((Int, Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.getBattery(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskNetworkStatus(label: String, onDone: ((String?, Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshNetwork(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskLocation(label: String, onDone: ((String?, String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.getLocation(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskApps(label: String, onDone: ((List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listApps(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskContacts(label: String, onDone: ((List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listContacts(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskCallLog(label: String, onDone: ((List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listCallLogs(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskMessages(label: String, onDone: ((List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listMessages(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskAccounts(label: String, onDone: ((List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listAccounts(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskClipboard(label: String, onDone: ((String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.readClipboard(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskCopyToClipboard(value: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.copyToClipboard(value, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskVibrate(label: String, duration: Long, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.vibrate(duration, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskTorch(label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toggleTorch(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskScreenshot(label: String, onDone: ((String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.captureScreenshot(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskShareText(text: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.shareText(text, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskShareFile(path: String?, mime: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { if (path != null) device.shareFile(path, mime, onDone) else onDone?.invoke(false) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskBiometricAuth(label: String, onDone: ((Boolean, String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.authenticate(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskBluetooth(label: String, onDone: ((Boolean, List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshBluetooth(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskBluetoothToggle(label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toggleBluetooth(device.bluetoothEnabled, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskBluetoothScan(label: String, onDone: ((List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.scanBluetooth(onDone = onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskScreenRecord(label: String, onDone: ((String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.startScreenRecord(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskVolume(label: String, onDone: ((Int, String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshVolume(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskSetVolume(value: Int, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setVolume(value, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskBrightness(value: Int, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setScreenBrightness(value, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskKeepAwake(value: Boolean, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setKeepAwake(value, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskOrientation(mode: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.lockOrientation(mode, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskDeviceInfo(label: String, onDone: ((String) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshDeviceInfo(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskStorage(label: String, onDone: ((String, String) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshStorage(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskSensor(type: String, label: String, onDone: ((String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.readSensor(type, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskToast(text: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.toast(text, onDone = onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskSound(kind: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.playSound(kind, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskWallpaper(path: String?, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { if (path != null) device.setWallpaper(path, onDone) else onDone?.invoke(false) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskCalendar(label: String, onDone: ((List<String>) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.listCalendarEvents(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskNfc(label: String, onDone: ((Boolean, Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshNfc(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskSim(label: String, onDone: ((String?, String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.refreshTelephony(onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskDial(number: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.dial(number, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskSms(number: String, text: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.sendSms(number, text, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskEmail(to: String, subject: String, body: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.sendEmail(to, subject, body, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskLink(url: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openUrl(url, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskMap(query: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openMaps(query, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskAlarm(hour: Int, minute: Int, title: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.setAlarm(hour, minute, title, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskOpenSettings(section: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openSettings(section, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskOpenApp(app: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.openApp(app, onDone) }, modifier = modifier) { Text(label) }
}

@Composable
actual fun VeskSpeak(text: String, label: String, onDone: ((Boolean) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.speak(text, onDone) }, modifier = modifier) { Text(label) }
}

// The file chooser runs on the calling (compose UI) thread — modal and
// blocking is fine for the preview host, matching the browser's synchronous
// picker semantics.
private fun chooseFile(extensions: List<String>, onDone: ((String?) -> Unit)?) {
    val chooser = JFileChooser()
    chooser.fileFilter = object : javax.swing.filechooser.FileFilter() {
        override fun accept(f: File): Boolean =
            f.isDirectory || extensions.isEmpty() || extensions.any { f.name.endsWith(it, ignoreCase = true) }
        override fun getDescription(): String =
            if (extensions.isEmpty()) "All files" else extensions.joinToString(", ") { "*.$it" }
    }
    if (chooser.showOpenDialog(null) == JFileChooser.APPROVE_OPTION) {
        onDone?.invoke(chooser.selectedFile.absolutePath)
    } else {
        onDone?.invoke(null)
    }
}

private fun browse(uri: URI): Boolean =
    if (GraphicsEnvironment.isHeadless() || !Desktop.isDesktopSupported()) false
    else runCatching { Desktop.getDesktop().browse(uri); true }.getOrDefault(false)

private fun filesDir(): File = File(System.getProperty("user.home"), "vesk-files").apply { mkdirs() }

private fun percentEncode(s: String): String = buildString {
    for (c in s) {
        if (c.isLetterOrDigit() || c == '-' || c == '_' || c == '.' || c == '~') {
            append(c)
        } else {
            for (b in c.toString().encodeToByteArray()) {
                append('%').append((b.toInt() and 0xff).toString(16).uppercase().padStart(2, '0'))
            }
        }
    }
}

private fun formatBytes(b: Long): String = when {
    b >= 1L shl 30 -> "%.1f GB".format(b.toDouble() / (1L shl 30))
    b >= 1L shl 20 -> "%.1f MB".format(b.toDouble() / (1L shl 20))
    b >= 1L shl 10 -> "%.1f KB".format(b.toDouble() / (1L shl 10))
    else -> "$b B"
}


// <qr-code>/<qr-scanner> on desktop: no QR renderer/scanner is wired into the
// jvm target — both fail closed (render a button that reports failure) so the
// preview never crashes on a page that uses them.
@Composable
actual fun VeskQrCode(value: String, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.generateQrCode(value, null, 256) }, modifier = modifier) { Text("QR") }
}

@Composable
actual fun VeskQrScanner(label: String, onResult: ((String?) -> Unit)?, modifier: Modifier) {
    val device = rememberDeviceApi()
    Button(onClick = { device.scanQr(onResult) }, modifier = modifier) { Text(label) }
}


// Drag and drop on desktop: the jvm target renders the preview only, and the
// desktop drag&drop API surface is not yet verified — the seams stay typed
// and fail closed (no-op modifiers) so preview pages compile and render.
actual class VeskDragData actual constructor(actual val text: String)

actual object VeskDragSession { actual var pendingText: String? = null }

actual fun Modifier.veskDraggable(data: VeskDragData): Modifier = this

@Composable
actual fun Modifier.veskDropTarget(onDrop: (String?) -> Unit): Modifier = this


actual fun jsDecodeURIComponent(v: Any?): String = java.net.URLDecoder.decode(jsString(v).replace("+", "%2B"), "UTF-8")


actual fun jsHandleError(e: Throwable) {
    println("vesk: uncaught exception (app continues): " + e.message)
    e.printStackTrace()
}

// JSON.parse on the desktop preview (jvm target): hand-rolled pure-Kotlin parser (RFC 8259 grammar) so the
// result shape matches the android actual exactly — null / String / Boolean /
// Long for integral numbers / Double otherwise / List / LinkedHashMap. No
// NSJSONSerialization signature guesswork.
actual fun jsParseJson(s: Any?): Any? {
    val text = jsString(s) ?: return null
    return VeskJsonParser(text).parseValue() ?: null
}

private class VeskJsonParser(private val text: String) {
    private var i = 0

    fun parseValue(): Any? {
        skipWs()
        if (i >= text.length) return null
        return when {
            text.startsWith("null", i) -> { i += 4; null }
            text.startsWith("true", i) -> { i += 4; true }
            text.startsWith("false", i) -> { i += 5; false }
            text[i] == '"' -> parseString()
            text[i] == '{' -> parseObject()
            text[i] == '[' -> parseArray()
            text[i] == '-' || text[i].isDigit() -> parseNumber()
            else -> null
        }
    }

    private fun skipWs() { while (i < text.length && text[i].isWhitespace()) i++ }

    private fun parseString(): String {
        i++ // opening quote
        val sb = StringBuilder()
        while (i < text.length) {
            val c = text[i]
            if (c == '"') { i++; return sb.toString() }
            if (c == '\\') {
                i++
                when (val esc = text.getOrNull(i)) {
                    '"' -> { sb.append('"'); i++ }
                    '\\' -> { sb.append('\\'); i++ }
                    '/' -> { sb.append('/'); i++ }
                    'b' -> { sb.append('\b'); i++ }
                    'f' -> { sb.append('\u000C'); i++ }
                    'n' -> { sb.append('\n'); i++ }
                    'r' -> { sb.append('\r'); i++ }
                    't' -> { sb.append('\t'); i++ }
                    'u' -> {
                        if (i + 4 < text.length) {
                            val hex = text.substring(i + 1, i + 5)
                            val code = hex.toIntOrNull(16)
                            if (code != null) sb.append(code.toChar())
                            i += 5
                        } else i++
                    }
                    else -> i++
                }
            } else {
                sb.append(c)
                i++
            }
        }
        return sb.toString()
    }

    private fun parseObject(): LinkedHashMap<String, Any?> {
        i++ // '{'
        val map = LinkedHashMap<String, Any?>()
        skipWs()
        if (i < text.length && text[i] == '}') { i++; return map }
        while (i < text.length) {
            skipWs()
            val key = if (text[i] == '"') parseString() else { i++; "" }
            skipWs()
            if (i < text.length && text[i] == ':') i++
            val value = parseValue()
            map[key] = value
            skipWs()
            if (i < text.length && text[i] == ',') { i++; continue }
            if (i < text.length && text[i] == '}') { i++; break }
        }
        return map
    }

    private fun parseArray(): List<Any?> {
        i++ // '['
        val list = mutableListOf<Any?>()
        skipWs()
        if (i < text.length && text[i] == ']') { i++; return list }
        while (i < text.length) {
            list.add(parseValue())
            skipWs()
            if (i < text.length && text[i] == ',') { i++; continue }
            if (i < text.length && text[i] == ']') { i++; break }
        }
        return list
    }

    private fun parseNumber(): Any? {
        val start = i
        if (i < text.length && text[i] == '-') i++
        while (i < text.length && text[i].isDigit()) i++
        var isDouble = false
        if (i < text.length && text[i] == '.') { isDouble = true; i++; while (i < text.length && text[i].isDigit()) i++ }
        if (i < text.length && (text[i] == 'e' || text[i] == 'E')) {
            isDouble = true
            i++
            if (i < text.length && (text[i] == '+' || text[i] == '-')) i++
            while (i < text.length && text[i].isDigit()) i++
        }
        val token = text.substring(start, i)
        return if (isDouble) token.toDoubleOrNull() else token.toLongOrNull() ?: token.toDoubleOrNull()
    }
}


// Desktop has no Activity/Context anchor (matching the iOS actual): the
// browser-API actuals either work context-free (jsAlert prints) or carry
// their own storage (VeskWebStorage is file-backed).
actual object VeskAppContext


// Desktop windows have no system bars and no activity anchor — both seams
// are no-ops (matching iOS).
@Composable
actual fun veskBarsPadding(pad: Boolean): Modifier = Modifier

@Composable
actual fun veskAppSetup() { }


// window.alert on desktop: printed to stdout (a headless-safe analog of the
// browser modal; the preview host shows it in the dev log). Returns
// immediately with Unit, matching the android/ios actuals.
actual fun jsAlert(message: Any?) {
    println("alert: " + jsString(message))
}


// localStorage / sessionStorage (Web Storage) on desktop: localStorage
// persists across restarts in a JSON file under the user's home
// (~/vesk-files/local-storage.json — the same directory DeviceApi uses),
// sessionStorage lives in memory for the process lifetime — the same split as
// the android actual. Values are stored as strings and getItem returns null
// for missing keys, per JS semantics.
actual object VeskWebStorage {
    private val storeFile = File(System.getProperty("user.home"), "vesk-files/local-storage.json")
    private val store: MutableMap<String, String> = runCatching {
        val text = storeFile.takeIf { it.isFile }?.readText() ?: "{}"
        (jsParseJson(text) as? Map<*, *>)?.mapKeys { it.key.toString() }?.mapValues { (_, v) -> v.toString() }?.toMutableMap() ?: mutableMapOf()
    }.getOrElse { mutableMapOf() }
    private val session = LinkedHashMap<String, String>()

    actual fun localGetItem(key: Any?): Any? = store[key?.toString() ?: return null]
    actual fun localSetItem(key: Any?, value: Any?) {
        store[key?.toString() ?: return] = storeString(value)
        runCatching { storeFile.parentFile.mkdirs(); storeFile.writeText(jsStringify(store)) }
    }
    actual fun localRemoveItem(key: Any?) {
        store.remove(key?.toString() ?: return)
        runCatching { storeFile.writeText(jsStringify(store)) }
    }
    actual fun localClear() {
        store.clear()
        runCatching { storeFile.writeText("{}") }
    }
    actual fun localKey(i: Any?): Any? = store.keys.sorted().getOrNull(num(i).toInt())
    actual fun localLength(): Int = store.size

    actual fun sessionGetItem(key: Any?): Any? = session[key?.toString()]
    actual fun sessionSetItem(key: Any?, value: Any?) { session[key?.toString() ?: return] = storeString(value) }
    actual fun sessionRemoveItem(key: Any?) { session.remove(key?.toString() ?: return) }
    actual fun sessionClear() { session.clear() }
    actual fun sessionKey(i: Any?): Any? = session.keys.toList().getOrNull(num(i).toInt())
    actual fun sessionLength(): Int = session.size

    private fun storeString(v: Any?): String = if (v == null) "null" else v.toString()
}


// window.fetch on desktop: the android actual is already a plain
// java.net.HttpURLConnection implementation with zero android references —
// it is reused verbatim as the jvm actual (same browser-shaped VeskResponse,
// same synchronous semantics).
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


// openSqlite(name) on desktop: no sqlite driver is wired into the jvm target
// classpath (the android actual needs the androidx sqlite artifacts, and the
// jvm target intentionally ships no db dependency), so it fails closed loudly
// — same rationale as the iOS actual.
actual class VeskSqliteDb internal constructor() {
    actual fun exec(sql: String): Unit = error("openSqlite is not available in the desktop preview (no sqlite driver on the jvm classpath)")
    actual fun run(sql: String, params: Any?): Map<String, Any?> = error("openSqlite is not available in the desktop preview (no sqlite driver on the jvm classpath)")
    actual fun get(sql: String, params: Any?): Map<String, Any?>? = error("openSqlite is not available in the desktop preview (no sqlite driver on the jvm classpath)")
    actual fun all(sql: String, params: Any?): List<Map<String, Any?>> = error("openSqlite is not available in the desktop preview (no sqlite driver on the jvm classpath)")
    actual fun close() { }
}

actual object VeskSqlite {
    actual fun openDatabase(name: String, version: Int): VeskSqliteDb = error("openSqlite is not available in the desktop preview (no sqlite driver on the jvm classpath)")
}


// vesk.auth on desktop: the user store is SQLite-backed (openSqlite), and
// the jvm target ships no sqlite driver (see VeskSqlite), so auth fails
// closed loudly rather than persisting accounts in a way the app cannot read
// back — the same rationale as the iOS actual. signOut stays functional.
actual object VeskAuth {
    actual fun signUp(username: Any?, password: Any?): Map<String, Any?>? = error("auth.signUp is not available in the desktop preview (SQLite-backed user store has no driver)")
    actual fun signIn(username: Any?, password: Any?): Map<String, Any?>? = error("auth.signIn is not available in the desktop preview (SQLite-backed user store has no driver)")
    actual fun signOut() {
        VeskWebStorage.localRemoveItem("vesk.session.user")
        VeskWebStorage.localRemoveItem("vesk.session.signedIn")
    }
    actual fun currentUser(): Map<String, Any?>? = null
    actual fun isSignedIn(): Boolean = false
}


// vesk.websocket on desktop: java.net.http.WebSocket — the JDK's built-in
// client, no extra dependency. Callbacks fire on the JDK's internal threads
// (snapshot-state writes are thread-safe; the compose UI picks them up on
// the next frame). readyState/protocol/close codes match the browser.
actual class VeskWebSocket actual constructor(url: String) {
    actual val url: String = url
    actual var readyState: Int = VeskWebSocket.CONNECTING
    actual val protocol: String = ""
    actual var onopen: ((VeskMessageEvent) -> Unit)? = null
    actual var onmessage: ((VeskMessageEvent) -> Unit)? = null
    actual var onclose: ((VeskMessageEvent) -> Unit)? = null
    actual var onerror: ((VeskMessageEvent) -> Unit)? = null
    private var ws: java.net.http.WebSocket? = null

    init {
        try {
            val client = java.net.http.HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(8))
                .build()
            ws = client.newWebSocketBuilder()
                .buildAsync(URI(url), object : java.net.http.WebSocket.Listener {
                    override fun onOpen(webSocket: java.net.http.WebSocket) {
                        readyState = VeskWebSocket.OPEN
                        onopen?.invoke(VeskMessageEvent(data = null, type = "open"))
                    }
                    override fun onText(webSocket: java.net.http.WebSocket, data: CharSequence, last: Boolean): java.util.concurrent.CompletionStage<*> {
                        onmessage?.invoke(VeskMessageEvent(data = data.toString(), type = "message"))
                        webSocket.request(1)
                        return java.util.concurrent.CompletableFuture.completedFuture(null)
                    }
                    override fun onClose(webSocket: java.net.http.WebSocket, statusCode: Int, reason: String): java.util.concurrent.CompletionStage<*> {
                        readyState = VeskWebSocket.CLOSED
                        onclose?.invoke(VeskMessageEvent(data = null, type = "close", code = statusCode, reason = reason))
                        return java.util.concurrent.CompletableFuture.completedFuture(null)
                    }
                    override fun onError(webSocket: java.net.http.WebSocket, error: Throwable) {
                        readyState = VeskWebSocket.CLOSED
                        onerror?.invoke(VeskMessageEvent(data = error.message, type = "error"))
                        onclose?.invoke(VeskMessageEvent(data = null, type = "close", code = 1006, reason = error.message ?: "connection failed"))
                    }
                }).get()
        } catch (e: Exception) {
            readyState = VeskWebSocket.CLOSED
            onerror?.invoke(VeskMessageEvent(data = e.message, type = "error"))
            onclose?.invoke(VeskMessageEvent(data = null, type = "close", code = 1006, reason = e.message ?: "connection failed"))
        }
    }

    actual fun send(data: String): Unit {
        ws?.sendText(data, true)
    }

    actual fun close(code: Int, reason: String) {
        readyState = VeskWebSocket.CLOSING
        ws?.sendClose(code, reason)
    }

    companion object {
        const val CONNECTING = 0
        const val OPEN = 1
        const val CLOSING = 2
        const val CLOSED = 3
    }
}


// vesk.eventsource on desktop: java.net.HttpURLConnection streaming GET with
// manual text/event-stream parsing on a daemon thread — the same SSE grammar
// (data/event/id/retry lines, blank-line dispatch) as the android actual,
// minus the OkHttp dependency. Auto-reconnect follows the browser:
// CONNECTING -> retry ms -> reopen, resuming from Last-Event-ID.
actual class VeskEventSource actual constructor(url: String) {
    actual val url: String = url
    actual var readyState: Int = VeskEventSource.CONNECTING
    actual var onopen: ((VeskMessageEvent) -> Unit)? = null
    actual var onmessage: ((VeskMessageEvent) -> Unit)? = null
    actual var onerror: ((VeskMessageEvent) -> Unit)? = null
    actual var lastEventId: String = ""
    actual var retry: Long = 3000
    private var closed = false
    private val worker = Thread {
        var opened = false
        while (!closed) {
            try {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000
                    readTimeout = 0
                    if (lastEventId.isNotEmpty()) setRequestProperty("Last-Event-ID", lastEventId)
                }
                if (conn.responseCode in 200..299) {
                    if (!opened) {
                        opened = true
                        readyState = VeskEventSource.OPEN
                        onopen?.invoke(VeskMessageEvent(data = null, type = "open"))
                    }
                    val dataLines = mutableListOf<String>()
                    var eventType = "message"
                    var id: String? = null
                    var retryMs: Long? = null
                    conn.inputStream.bufferedReader().forEachLine { line ->
                        if (closed) return@forEachLine
                        if (line.isEmpty()) {
                            if (dataLines.isNotEmpty()) {
                                val text = dataLines.joinToString("\n")
                                dataLines.clear()
                                if (id != null) { lastEventId = id ?: "" }
                                id = null
                                if (retryMs != null) { retry = retryMs ?: retry }
                                retryMs = null
                                if (eventType == "message") {
                                    onmessage?.invoke(VeskMessageEvent(data = text, type = "message", lastEventId = lastEventId))
                                }
                                eventType = "message"
                            }
                            return@forEachLine
                        }
                        if (line.startsWith(":")) return@forEachLine
                        val colon = line.indexOf(':')
                        val field = if (colon < 0) line else line.substring(0, colon)
                        var value = if (colon < 0) "" else line.substring(colon + 1)
                        if (value.startsWith(" ")) value = value.substring(1)
                        when (field) {
                            "data" -> dataLines.add(value)
                            "event" -> if (value.isNotEmpty()) eventType = value
                            "id" -> id = value
                            "retry" -> retryMs = value.toLongOrNull()
                        }
                    }
                    conn.disconnect()
                } else {
                    onerror?.invoke(VeskMessageEvent(data = "HTTP ${conn.responseCode}", type = "error"))
                    conn.disconnect()
                }
            } catch (e: Exception) {
                if (closed) break
                onerror?.invoke(VeskMessageEvent(data = e.message, type = "error"))
            }
            if (closed) break
            readyState = VeskEventSource.CONNECTING
            try {
                Thread.sleep(retry)
            } catch (_: InterruptedException) {
                break
            }
        }
    }

    init {
        worker.isDaemon = true
        worker.start()
    }

    actual fun close() {
        closed = true
        readyState = VeskEventSource.CLOSED
        worker.interrupt()
    }

    companion object {
        const val CONNECTING = 0
        const val OPEN = 1
        const val CLOSED = 2
    }
}


// Desktop compose runs on the Swing EDT; kotlinx-coroutines-swing supplies
// Dispatchers.Main for it (declared in the jvmMain dependencies). Animations
// launched inside composition carry the recomposer's MonotonicFrameClock, so
// the dispatcher only needs to be the UI thread — same contract as iOS.
internal actual fun motionDispatcher(): kotlin.coroutines.CoroutineContext = Dispatchers.Main


// The desktop actual reports the compose window's content size in pixels —
// the "viewport" the desktop preview has, matching the physical-display
// intent of the android/ios actuals.
@Composable
actual fun motionViewportSize(): androidx.compose.ui.unit.IntSize {
    val info = LocalWindowInfo.current
    return IntSize(info.containerSize.width, info.containerSize.height)
}

