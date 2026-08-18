package app

import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import platform.AudioToolbox.*
import platform.Foundation.*
import platform.UIKit.*
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue


// <video> on iOS: the AVPlayer/AVPlayerLayer + Compose UIKitView mapping is
// not yet verified against the Kotlin/Native bindings, so this is a hard
// fail-closed error rather than a guessed implementation.
@Composable
actual fun veskVideo(url: String?, controls: Boolean, autoplay: Boolean, loop: Boolean, muted: Boolean, scale: String, broadcast: Boolean, modifier: Modifier) {
    error("veskVideo is not yet available on iOS (the AVFoundation player mapping is pending); cannot play $url")
}


// <audio> on iOS: the AVPlayer/AVAudioSession + Compose UIKitView mapping is
// not yet verified against the Kotlin/Native bindings, so this is a hard
// fail-closed error rather than a guessed implementation.
@Composable
actual fun veskAudio(url: String?, controls: Boolean, autoplay: Boolean, loop: Boolean, muted: Boolean, broadcast: Boolean, modifier: Modifier) {
    error("veskAudio is not yet available on iOS (the AVFoundation audio mapping is pending); cannot play $url")
}


// <img src="/storage/..."> (absolute sandbox paths on iOS): runtime decode
// from device storage. Missing/unreadable files render a transparent
// placeholder, matching the android actual.
@Composable
actual fun veskFileImage(path: String?): ImageBitmap {
    val bmp = remember(path) {
        if (path == null) null
        else runCatching {
            val data = NSData.dataWithContentsOfFile(path) ?: return@runCatching null
            org.jetbrains.skia.Image.makeFromEncoded(data.toByteArray())
        }.getOrNull()
    }
    if (bmp != null) return bmp.asImageBitmap()
    return remember(path) { ImageBitmap(1, 1) }
}


// <img src="/media/..."> bundled project asset -> NSBundle lookup. iOS
// bundled resources land in the framework bundle next to the app; a name that
// is missing there is a bundling misconfiguration and fails loudly.
@Composable
actual fun veskBundledImage(name: String): Painter {
    val bitmap = remember(name) {
        val path = NSBundle.mainBundle.pathForResource(name, ofType = null)
            ?: throw IllegalArgumentException("no bundled image on iOS: $name")
        val data = NSData.dataWithContentsOfFile(path)
            ?: throw IllegalArgumentException("no bundled image on iOS: $name")
        runCatching { org.jetbrains.skia.Image.makeFromEncoded(data.toByteArray()) }
            .getOrElse { throw IllegalArgumentException("bundled image is not decodable on iOS: $name") }
    }
    return BitmapPainter(bitmap.asImageBitmap())
}


// <video>/<audio> src="/media/..."> bundled project media -> absolute file
// path in the framework bundle (what AVFoundation plays). A name missing from
// the bundle is a bundling misconfiguration and fails loudly.
actual fun veskBundledMediaUrl(name: String): String {
    return NSBundle.mainBundle.pathForResource(name, ofType = null)
        ?: throw IllegalArgumentException("no bundled media on iOS: $name")
}


// iOS-only helpers shared by the UIKit actuals (jsAlert, veskDeviceApi). They
// must live in their own unit so both seams reference one definition — every
// ios block is concatenated into a single Runtime.ios.kt.
private fun onMain(block: () -> Unit) = dispatch_async(dispatch_get_main_queue(), block)

private fun currentViewController(): UIViewController? {
    UIApplication.sharedApplication.keyWindow?.let { return it.rootViewController }
    for (scene in UIApplication.sharedApplication.connectedScenes) {
        val windowScene = scene as? UIWindowScene ?: continue
        for (w in windowScene.windows) {
            val window = w as? UIWindow ?: continue
            if (window.rootViewController != null) return window.rootViewController
        }
    }
    return null
}

private fun showAlert(title: String?, message: String) {
    val alert = UIAlertController.alertControllerWithTitle(title, message = message, preferredStyle = UIAlertControllerStyle.UIAlertControllerStyleAlert)
    alert.addAction(UIAlertAction.actionWithTitle("OK", style = UIAlertActionStyle.UIAlertActionStyleDefault, handler = null))
    currentViewController()?.presentViewController(alert, animated = true, completion = null)
}


// iOS DeviceApi: the same portable surface over UIKit/Foundation. Capabilities
// with a verified Kotlin/Native mapping (clipboard, alert/toast, URL schemes,
// share sheet, battery, brightness, keep-awake, vibration, app-sandbox files)
// are implemented; everything else fails closed with a loud error rather than
// guessing an unverified binding.
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

    actual fun pickImage(onDone: ((String?) -> Unit)?) = throw iOSUnimplemented("device.pickImage")
    actual fun pickAudio(onDone: ((String?) -> Unit)?) = throw iOSUnimplemented("device.pickAudio")
    actual fun pickFile(onDone: ((String?, String?) -> Unit)?, mime: String) = throw iOSUnimplemented("device.pickFile")
    actual fun capturePhoto(onDone: ((String?) -> Unit)?) = throw iOSUnimplemented("device.capturePhoto")
    actual fun captureVideo(onDone: ((String?) -> Unit)?) = throw iOSUnimplemented("device.captureVideo")
    actual fun startRecording(onStarted: ((String?) -> Unit)?) = throw iOSUnimplemented("device.startRecording")
    actual fun stopRecording(): String? = throw iOSUnimplemented("device.stopRecording")
    actual fun notify(title: String, text: String, onTap: (() -> Unit)?) = throw iOSUnimplemented("device.notify")

    actual fun getBattery(onDone: ((Int, Boolean) -> Unit)?) {
        val device = UIDevice.currentDevice
        device.batteryMonitoringEnabled = true
        val level = (device.batteryLevel * 100).toInt().coerceIn(0, 100)
        val state = device.batteryState
        val isCharging = state == UIDeviceBatteryState.UIDeviceBatteryStateCharging || state == UIDeviceBatteryState.UIDeviceBatteryStateFull
        batteryLevel = level
        charging = isCharging
        onDone?.invoke(level, isCharging)
    }

    actual fun refreshNetwork(onDone: ((String?, Boolean) -> Unit)?) = throw iOSUnimplemented("device.refreshNetwork")
    actual fun getLocation(onDone: ((String?, String?) -> Unit)?) = throw iOSUnimplemented("device.getLocation")
    actual fun listApps(onDone: ((List<String>) -> Unit)?, limit: Int) = throw iOSUnimplemented("device.listApps")
    actual fun listContacts(onDone: ((List<String>) -> Unit)?, limit: Int) = throw iOSUnimplemented("device.listContacts")
    actual fun listCallLogs(onDone: ((List<String>) -> Unit)?, limit: Int) = throw iOSUnimplemented("device.listCallLogs")
    actual fun listMessages(onDone: ((List<String>) -> Unit)?, limit: Int) = throw iOSUnimplemented("device.listMessages")
    actual fun listAccounts(onDone: ((List<String>) -> Unit)?, limit: Int) = throw iOSUnimplemented("device.listAccounts")

    actual fun readClipboard(onDone: ((String?) -> Unit)?) {
        val text = UIPasteboard.generalPasteboard().string
        clipboardText = text
        onDone?.invoke(text)
    }

    actual fun copyToClipboard(value: String, onDone: ((Boolean) -> Unit)?) {
        UIPasteboard.generalPasteboard().string = value
        clipboardText = value
        onDone?.invoke(true)
    }

    @OptIn(ExperimentalForeignApi::class)
    actual fun vibrate(millis: Long, onDone: ((Boolean) -> Unit)?) {
        AudioServicesPlaySystemSound(4099u)
        onDone?.invoke(true)
    }

    actual fun toggleTorch(onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.toggleTorch")
    actual fun captureScreenshot(onDone: ((String?) -> Unit)?) = throw iOSUnimplemented("device.captureScreenshot")

    actual fun shareText(text: String, onDone: ((Boolean) -> Unit)?) {
        onMain {
            val vc = UIActivityViewController(activityItems = listOf(text), applicationActivities = null)
            val host = currentViewController()
            if (host != null) {
                host.presentViewController(vc, animated = true, completion = null)
                onDone?.invoke(true)
            } else {
                onDone?.invoke(false)
            }
        }
    }

    actual fun shareFile(path: String, mime: String?, onDone: ((Boolean) -> Unit)?) {
        onMain {
            val url = NSURL.fileURLWithPath(path)
            val vc = UIActivityViewController(activityItems = listOf(url), applicationActivities = null)
            val host = currentViewController()
            if (host != null) {
                host.presentViewController(vc, animated = true, completion = null)
                onDone?.invoke(true)
            } else {
                onDone?.invoke(false)
            }
        }
    }

    actual fun listFiles(dir: String, onDone: ((List<String>) -> Unit)?) {
        val base = if (dir.isBlank()) documentsDir() else dir
        val files = NSFileManager.defaultManager.contentsOfDirectoryAtPath(base, null)?.map { it.toString() } ?: emptyList()
        appFiles = files
        onDone?.invoke(files)
    }

    actual fun writeFile(name: String, content: String, onDone: ((String?) -> Unit)?) {
        val path = documentsDir() + "/" + name
        val ok = NSFileManager.defaultManager.createFileAtPath(path, content.encodeToByteArray().toNSData(), null)
        onDone?.invoke(if (ok) path else null)
    }

    actual fun readFile(name: String, onDone: ((String?) -> Unit)?) {
        val path = if (name.contains("/")) name else documentsDir() + "/" + name
        val text = NSFileManager.defaultManager.contentsAtPath(path)?.toByteArray()?.decodeToString()
        onDone?.invoke(text)
    }

    actual fun deleteFile(name: String, onDone: ((Boolean) -> Unit)?) {
        val path = if (name.contains("/")) name else documentsDir() + "/" + name
        onDone?.invoke(NSFileManager.defaultManager.removeItemAtPath(path, null))
    }

    actual fun checkBiometrics(onDone: ((Boolean, String?) -> Unit)?) = throw iOSUnimplemented("device.checkBiometrics")
    actual fun authenticate(onDone: ((Boolean, String?) -> Unit)?) = throw iOSUnimplemented("device.authenticate")
    actual fun refreshBluetooth(onDone: ((Boolean, List<String>) -> Unit)?) = throw iOSUnimplemented("device.refreshBluetooth")
    actual fun toggleBluetooth(enabled: Boolean, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.toggleBluetooth")
    actual fun scanBluetooth(seconds: Int, onDone: ((List<String>) -> Unit)?) = throw iOSUnimplemented("device.scanBluetooth")
    actual fun generateQrCode(text: String, onDone: ((String?) -> Unit)?, size: Int) = throw iOSUnimplemented("device.generateQrCode")
    actual fun scanQr(onResult: ((String?) -> Unit)?) = throw iOSUnimplemented("device.scanQr")
    actual fun startScreenRecord(onStarted: ((String?) -> Unit)?) = throw iOSUnimplemented("device.startScreenRecord")
    actual fun stopScreenRecord(): String? = throw iOSUnimplemented("device.stopScreenRecord")
    actual fun refreshVolume(onDone: ((Int, String?) -> Unit)?) = throw iOSUnimplemented("device.refreshVolume")
    actual fun setVolume(level: Int, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.setVolume")
    actual fun setRingerMode(mode: String, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.setRingerMode")

    actual fun setScreenBrightness(level: Int, onDone: ((Boolean) -> Unit)?) {
        UIScreen.mainScreen.brightness = (level.coerceIn(0, 100) / 100f).toDouble()
        screenBrightness = level.toFloat()
        onDone?.invoke(true)
    }

    actual fun resetScreenBrightness(onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.resetScreenBrightness")

    actual fun setKeepAwake(on: Boolean, onDone: ((Boolean) -> Unit)?) {
        UIApplication.sharedApplication.idleTimerDisabled = on
        keepAwake = on
        onDone?.invoke(true)
    }

    actual fun refreshStorage(onDone: ((String, String) -> Unit)?) {
        val attrs = NSFileManager.defaultManager.attributesOfFileSystemForPath(documentsDir(), null)
        val free = asLong(attrs?.get(NSFileSystemFreeSize))
        val total = asLong(attrs?.get(NSFileSystemSize))
        storageFree = free
        storageTotal = total
        onDone?.invoke(formatBytes(free), formatBytes(total))
    }

    actual fun lockOrientation(mode: String, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.lockOrientation")
    actual fun readSensor(type: String, onDone: ((String?) -> Unit)?) = throw iOSUnimplemented("device.readSensor")

    actual fun dial(number: String, onDone: ((Boolean) -> Unit)?) {
        onMain {
            val ok = NSURL.URLWithString("tel:" + percentEncode(number))?.let { UIApplication.sharedApplication.openURL(it) } ?: false
            onDone?.invoke(ok)
        }
    }

    actual fun sendSms(number: String, text: String, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.sendSms")

    actual fun sendEmail(to: String, subject: String, body: String, onDone: ((Boolean) -> Unit)?) {
        onMain {
            val url = "mailto:" + percentEncode(to) + "?subject=" + percentEncode(subject) + "&body=" + percentEncode(body)
            val ok = NSURL.URLWithString(url)?.let { UIApplication.sharedApplication.openURL(it) } ?: false
            onDone?.invoke(ok)
        }
    }

    actual fun openUrl(url: String, onDone: ((Boolean) -> Unit)?) {
        onMain {
            val ok = NSURL.URLWithString(url)?.let { UIApplication.sharedApplication.openURL(it) } ?: false
            onDone?.invoke(ok)
        }
    }

    actual fun openMaps(query: String, onDone: ((Boolean) -> Unit)?) {
        onMain {
            val ok = NSURL.URLWithString("http://maps.apple.com/?q=" + percentEncode(query))?.let { UIApplication.sharedApplication.openURL(it) } ?: false
            onDone?.invoke(ok)
        }
    }

    actual fun openSettings(section: String?, onDone: ((Boolean) -> Unit)?) {
        onMain {
            val ok = NSURL.URLWithString(UIApplication.openSettingsURLString)?.let { UIApplication.sharedApplication.openURL(it) } ?: false
            onDone?.invoke(ok)
        }
    }

    actual fun setAlarm(hour: Int, minute: Int, title: String, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.setAlarm")
    actual fun openApp(packageName: String, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.openApp")

    actual fun toast(text: String, long: Boolean, onDone: ((Boolean) -> Unit)?) {
        onMain {
            showAlert(title = null, message = text)
            onDone?.invoke(true)
        }
    }

    actual fun playSound(kind: String?, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.playSound")
    actual fun setWallpaper(path: String, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.setWallpaper")
    actual fun listCalendarEvents(onDone: ((List<String>) -> Unit)?, limit: Int) = throw iOSUnimplemented("device.listCalendarEvents")
    actual fun refreshNfc(onDone: ((Boolean, Boolean) -> Unit)?) = throw iOSUnimplemented("device.refreshNfc")
    actual fun refreshTelephony(onDone: ((String?, String?) -> Unit)?) = throw iOSUnimplemented("device.refreshTelephony")

    actual fun refreshDeviceInfo(onDone: ((String) -> Unit)?) {
        val device = UIDevice.currentDevice
        deviceModel = device.model
        deviceManufacturer = "Apple"
        androidVersion = device.systemVersion
        val info = "$deviceManufacturer $deviceModel, iOS $androidVersion"
        screenSize = info
        onDone?.invoke(info)
    }

    actual fun speak(text: String, onDone: ((Boolean) -> Unit)?) = throw iOSUnimplemented("device.speak")
}

private fun iOSUnimplemented(name: String): Nothing =
    error("$name is not yet available on iOS (the Kotlin/Native mapping is pending and has not been verified); the app keeps running but the capability is unavailable")

private fun documentsDir(): String = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, true).firstOrNull() ?: "."

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

private fun asLong(v: Any?): Long = when (v) {
    is Long -> v
    is Int -> v.toLong()
    is Double -> v.toLong()
    is Float -> v.toLong()
    is Number -> v.toLong()
    else -> 0L
}

private fun formatBytes(b: Long): String = when {
    b >= 1L shl 30 -> "%.1f GB".format(b.toDouble() / (1L shl 30))
    b >= 1L shl 20 -> "%.1f MB".format(b.toDouble() / (1L shl 20))
    b >= 1L shl 10 -> "%.1f KB".format(b.toDouble() / (1L shl 10))
    else -> "$b B"
}

// Declarative device elements (style C) — each composes a labeled button that
// drives the corresponding DeviceApi call. Capabilities that fail closed on
// iOS still render their button; the loud error fires only on tap.
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


// <qr-code>/<qr-scanner> on iOS: CoreImage/Vision QR bindings are not yet
// verified against Kotlin/Native, so both fail closed loudly.
@Composable
actual fun VeskQrCode(value: String, modifier: Modifier) {
    error("veskQr is not yet available on iOS (CoreImage QR mapping pending); cannot render QR code")
}

@Composable
actual fun VeskQrScanner(label: String, onResult: ((String?) -> Unit)?, modifier: Modifier) {
    error("veskQr is not yet available on iOS (Vision QR scanning mapping pending); cannot scan QR code")
}


// Drag and drop on iOS: UIPasteboard-based drag/drop support is not yet
// verified against Kotlin/Native, so all four seams fail closed loudly rather
// than silently dropping nothing.
actual class VeskDragData actual constructor(actual val text: String)

actual object VeskDragSession { actual var pendingText: String? = null }

actual fun Modifier.veskDraggable(data: VeskDragData): Modifier {
    throw UnsupportedOperationException("drag and drop is not yet available on iOS (UIPasteboard drag mapping pending)")
}

@Composable
actual fun Modifier.veskDropTarget(onDrop: (String?) -> Unit): Modifier {
    throw UnsupportedOperationException("drag and drop is not yet available on iOS (UIPasteboard drop mapping pending)")
}


actual fun jsHandleError(e: Throwable) {
    println("vesk: uncaught exception (app continues): " + e.message)
    e.printStackTrace()
}


// JSON.parse on iOS: hand-rolled pure-Kotlin parser (RFC 8259 grammar) so the
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


// iOS has no Activity/Context anchor: browser-API actuals resolve the host
// view controller directly, so the object stays empty (matching the expect).
actual object VeskAppContext


// window.alert on iOS: a UIAlertController on the key/top-most window,
// dispatched to the main queue. Like Android it returns immediately (JS
// undefined) and shows asynchronously.
actual fun jsAlert(message: Any?) {
    onMain {
        showAlert(title = null, message = jsString(message))
    }
}


// localStorage / sessionStorage (Web Storage) on iOS: localStorage persists
// across restarts in NSUserDefaults (the standardUserDefaults domain),
// sessionStorage lives in memory for the process lifetime — the same split as
// the android actual (SharedPreferences vs LinkedHashMap). Values are stored
// as strings and getItem returns null for missing keys, per JS semantics.
actual object VeskWebStorage {
    private val prefs = NSUserDefaults.standardUserDefaults
    private val session = LinkedHashMap<String, String>()

    actual fun localGetItem(key: Any?): Any? = prefs.stringForKey(key?.toString() ?: return null)
    actual fun localSetItem(key: Any?, value: Any?) {
        val k = key?.toString() ?: return
        prefs.setObject(storeString(value), forKey = k)
    }
    actual fun localRemoveItem(key: Any?) { prefs.removeObjectForKey(key?.toString() ?: return) }
    actual fun localClear() {
        for (k in localKeys()) prefs.removeObjectForKey(k)
    }
    actual fun localKey(i: Any?): Any? = localKeys().getOrNull(num(i).toInt())
    actual fun localLength(): Int = localKeys().size

    actual fun sessionGetItem(key: Any?): Any? = session[key?.toString()]
    actual fun sessionSetItem(key: Any?, value: Any?) { session[key?.toString() ?: return] = storeString(value) }
    actual fun sessionRemoveItem(key: Any?) { session.remove(key?.toString() ?: return) }
    actual fun sessionClear() { session.clear() }
    actual fun sessionKey(i: Any?): Any? = session.keys.toList().getOrNull(num(i).toInt())
    actual fun sessionLength(): Int = session.size

    private fun localKeys(): List<String> = prefs.dictionaryRepresentation().keys.map { it.toString() }.sorted()
    private fun storeString(v: Any?): String = if (v == null) "null" else v.toString()
}


// window.fetch mapped natively on iOS: NSURLSession on a background session
// queue, suspended via kotlinx.coroutines so fetch() still blocks the caller
// exactly like the android actual (synchronous browser semantics). The
// response shape (status/ok/statusText/headers/text()/json()) matches.
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
    actual fun fetch(url: String, init: Any?): VeskResponse = runBlocking(Dispatchers.Default) {
        val opts = init as? Map<*, *> ?: emptyMap<Any, Any>()
        val method = (jsMapGet(opts, "method") as? String)?.uppercase() ?: "GET"
        val headers = jsMapGet(opts, "headers") as? Map<*, *> ?: emptyMap<Any, Any>()
        val body = jsMapGet(opts, "body")?.toString()
        val request = NSMutableURLRequest().apply {
            URL = NSURL.URLWithString(url) ?: return@runBlocking VeskResponse(url, 0, "Invalid URL: $url", false, emptyMap(), "")
            HTTPMethod = method
            for ((k, v) in headers) setValue(v.toString(), forHTTPHeaderField = k.toString())
            timeoutInterval = 8000.0
            if (body != null && method != "GET" && method != "HEAD") {
                HTTPBody = body.encodeToByteArray().toNSData()
            }
        }
        suspendCancellableCoroutine { cont ->
            val task = NSURLSession.sharedSession.dataTaskWithRequest(request) { data, response, error ->
                val http = response as? NSHTTPURLResponse
                val status = http?.statusCode ?: 0
                val hdrs = http?.allHeaderFields?.mapKeys { it.key.toString() } ?: emptyMap()
                val text = data?.toByteArray()?.decodeToString() ?: ""
                val statusText = if (status == 0) (error?.localizedDescription ?: "Network error") else statusReasonPhrase(status)
                cont.resume(VeskResponse(url, status, statusText, status in 200..299, hdrs, text))
            }
            task.resume()
        }
    }
}

private fun statusReasonPhrase(code: Int): String = when (code) {
    200 -> "OK"
    201 -> "Created"
    202 -> "Accepted"
    204 -> "No Content"
    301 -> "Moved Permanently"
    302 -> "Found"
    304 -> "Not Modified"
    400 -> "Bad Request"
    401 -> "Unauthorized"
    403 -> "Forbidden"
    404 -> "Not Found"
    405 -> "Method Not Allowed"
    409 -> "Conflict"
    429 -> "Too Many Requests"
    500 -> "Internal Server Error"
    502 -> "Bad Gateway"
    503 -> "Service Unavailable"
    else -> ""
}


// openSqlite(name) on iOS: platform.SQLite3 does not exist in Kotlin/Native's
// iOS platform libs (verified against the platformLibs/src/platform/ios
// listing — there is no SQLite3.def) and no sqlite cinterop dependency is
// wired into the shared module, so this fails closed loudly instead of
// guessing a binding.
actual class VeskSqliteDb internal constructor() {
    actual fun exec(sql: String) = throw iOSUnimplemented("openSqlite")
    actual fun run(sql: String, params: Any?): Map<String, Any?> = throw iOSUnimplemented("openSqlite")
    actual fun get(sql: String, params: Any?): Map<String, Any?>? = throw iOSUnimplemented("openSqlite")
    actual fun all(sql: String, params: Any?): List<Map<String, Any?>> = throw iOSUnimplemented("openSqlite")
    actual fun close() { }
}

actual object VeskSqlite {
    actual fun openDatabase(name: String, version: Int): VeskSqliteDb = throw iOSUnimplemented("openSqlite")
}


// vesk.auth on iOS: the user store is SQLite-backed (openSqlite), and
// platform.SQLite3 has no Kotlin/Native binding (see VeskSqlite), so auth
// fails closed loudly rather than persisting accounts in a way the app cannot
// read back. signOut stays functional (it only touches localStorage).
actual object VeskAuth {
    actual fun signUp(username: Any?, password: Any?): Map<String, Any?>? = throw iOSUnimplemented("auth.signUp")
    actual fun signIn(username: Any?, password: Any?): Map<String, Any?>? = throw iOSUnimplemented("auth.signIn")
    actual fun signOut() {
        VeskWebStorage.localRemoveItem("vesk.session.user")
        VeskWebStorage.localRemoveItem("vesk.session.signedIn")
    }
    actual fun currentUser(): Map<String, Any?>? = null
    actual fun isSignedIn(): Boolean = false
}


// vesk.websocket on iOS: unimplemented (fail closed) — the surface stays
// typed and throws loudly instead of silently misbehaving.
actual class VeskWebSocket actual constructor(url: String) {
    actual val url: String = url
    actual var readyState: Int = VeskWebSocket.CONNECTING
    actual val protocol: String = ""
    actual var onopen: ((VeskMessageEvent) -> Unit)? = null
    actual var onmessage: ((VeskMessageEvent) -> Unit)? = null
    actual var onclose: ((VeskMessageEvent) -> Unit)? = null
    actual var onerror: ((VeskMessageEvent) -> Unit)? = null
    actual fun send(data: String): Unit = throw iOSUnimplemented("WebSocket.send")
    actual fun close(code: Int, reason: String) = throw iOSUnimplemented("WebSocket.close")
    companion object {
        const val CONNECTING = 0
        const val OPEN = 1
        const val CLOSING = 2
        const val CLOSED = 3
    }
}


// vesk.eventsource on iOS: unimplemented (fail closed) — the surface stays
// typed and throws loudly instead of silently misbehaving.
actual class VeskEventSource actual constructor(url: String) {
    actual val url: String = url
    actual var readyState: Int = VeskEventSource.CONNECTING
    actual var onopen: ((VeskMessageEvent) -> Unit)? = null
    actual var onmessage: ((VeskMessageEvent) -> Unit)? = null
    actual var onerror: ((VeskMessageEvent) -> Unit)? = null
    actual var lastEventId: String = ""
    actual var retry: Long = 3000
    actual fun close() = throw iOSUnimplemented("EventSource.close")
    companion object {
        const val CONNECTING = 0
        const val OPEN = 1
        const val CLOSED = 2
    }
}


// Compose's Darwin main-dispatcher runs on the main queue with a
// MonotonicFrameClock, exactly the contract the android actual satisfies.
internal actual fun motionDispatcher(): kotlin.coroutines.CoroutineContext = Dispatchers.Main


// The iOS actual reports the main screen size in pixels (bounds * scale), the
// same "physical display size" the android actual returns from displayMetrics.
@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun motionViewportSize(): androidx.compose.ui.unit.IntSize {
    val bounds = UIScreen.mainScreen.bounds
    val scale = UIScreen.mainScreen.scale
    return bounds.useContents { androidx.compose.ui.unit.IntSize((size.width * scale).toInt(), (size.height * scale).toInt()) }
}

