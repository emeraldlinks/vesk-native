package app.navigation

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

// Android actuals for the common Router.kt seams. Behavior matches the
// pre-CMP router exactly: BackHandler intercepts the activity back press and
// the exit prompt is a Toast with the compose host context.

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) {
    BackHandler(enabled = enabled, onBack = onBack)
}

@Composable
actual fun veskToast(): (String) -> Unit {
    val context = LocalContext.current
    return { message -> Toast.makeText(context, message, Toast.LENGTH_SHORT).show() }
}

@Composable
actual fun veskExitApp(): () -> Unit {
    val context = LocalContext.current
    return { context.findActivity()?.finish() }
}

fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
