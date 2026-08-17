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


actual fun jsHandleError(e: Throwable) {
    println("vesk: uncaught exception (app continues): " + e.message)
    e.printStackTrace()
}


// iOS has no Activity/Context anchor: browser-API actuals resolve the host
// view controller directly, so the object stays empty (matching the expect).
actual object VeskAppContext


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

