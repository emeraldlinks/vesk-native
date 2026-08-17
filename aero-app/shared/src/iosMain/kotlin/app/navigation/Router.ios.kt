package app.navigation

import androidx.compose.runtime.Composable
import platform.UIKit.UIAlertAction
import platform.UIKit.UIAlertActionStyle
import platform.UIKit.UIAlertController
import platform.UIKit.UIAlertControllerStyle
import platform.UIKit.UIApplication
import platform.UIKit.UIViewController
import platform.UIKit.UIWindow
import platform.UIKit.UIWindowScene

// iOS actuals for the common Router.kt seams. There is no system back button
// or back-press gesture on iOS — in-app navigation provides its own back UI —
// so PlatformBackHandler is a no-op. veskToast raises a UIAlertController on
// the top-most view controller (the same presentation the runtime's jsAlert
// uses); veskExitApp terminates the process, since iOS has no sanctioned
// "close the app" API and exit routes mean "leave".

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) {
    // no-op: iOS has no system back press to intercept
}

@Composable
actual fun veskToast(): (String) -> Unit {
    return { message -> showAlert(message) }
}

@Composable
actual fun veskExitApp(): () -> Unit {
    return { platform.posix.exit(0) }
}

private fun showAlert(message: String) {
    val alert = UIAlertController.alertControllerWithTitle(
        null,
        message = message,
        preferredStyle = UIAlertControllerStyle.UIAlertControllerStyleAlert,
    )
    alert.addAction(UIAlertAction.actionWithTitle("OK", style = UIAlertActionStyle.UIAlertActionStyleDefault, handler = null))
    currentViewController()?.presentViewController(alert, animated = true, completion = null)
}

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
