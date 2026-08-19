package app.navigation

import androidx.compose.runtime.Composable
import kotlin.system.exitProcess

// JVM (desktop preview) actuals for the common Router.kt seams. The desktop
// preview has no system back press to intercept, so PlatformBackHandler is a
// no-op (the preview host's own window chrome handles close). veskToast is a
// console line — the preview host has no OS toast — and veskExitApp closes the
// compose desktop application, which is the desktop equivalent of "leave".

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) {
    // no-op: the desktop preview has no system back press to intercept
}

@Composable
actual fun veskToast(): (String) -> Unit {
    return { message -> println("vesk: toast: $message") }
}

@Composable
actual fun veskExitApp(): () -> Unit {
    return { exitProcess(0) }
}