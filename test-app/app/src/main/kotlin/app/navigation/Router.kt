package app.navigation

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.os.SystemClock
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext

data class Route(val path: String, val params: Map<String, String> = emptyMap(), val composable: @Composable () -> Unit)

// Back button behaviour, configure via veskconfig.json:
//   "back": { "mode": "stack", "doubleBackToExit": true, "exitDelayMs": 2000 }
//   mode "stack": back pops the navigation history; at the root, a second
//                 press (within exitDelayMs) exits the app.
//   mode "system": back does nothing in-app and falls through to the system
//                  (which finishes the activity).
data class BackBehavior(
    val mode: String = "stack",
    val doubleBackToExit: Boolean = true,
    val exitDelayMs: Long = 2000,
)

class NavController {
    private val _history = mutableStateOf(listOf<String>("/"))
    private val _currentRoute = mutableStateOf("/")
    val history: List<String> get() = _history.value
    val currentRoute: androidx.compose.runtime.State<String> = _currentRoute

    // Reset the navigation stack to a single route (startup, deep links).
    fun start(path: String) {
        _history.value = listOf(path)
        _currentRoute.value = path
    }

    // Push a new route onto the history stack.
    fun navigate(path: String) {
        if (path == _currentRoute.value && _history.value.size > 1) return
        _history.value = _history.value + path
        _currentRoute.value = path
    }

    fun canPop(): Boolean = _history.value.size > 1

    // Pop back to the previous route; returns false when already at the root.
    fun pop(): Boolean {
        if (!canPop()) return false
        val stack = _history.value.toMutableList()
        stack.removeAt(stack.size - 1)
        _history.value = stack
        _currentRoute.value = stack.last()
        return true
    }
}

@Composable
fun rememberNavController(): NavController {
    return remember { NavController() }
}

val LocalNavController = staticCompositionLocalOf<NavController> {
    error("No NavController provided")
}

@Composable
fun AppRouter(start: String, routes: List<Route>, back: BackBehavior = BackBehavior()) {
    val nav = LocalNavController.current
    val context = LocalContext.current
    var lastBackPress = remember { mutableLongStateOf(0L) }

    LaunchedEffect(start) { nav.start(start) }

    BackHandler {
        if (nav.pop()) return@BackHandler
        if (back.mode != "stack" || !back.doubleBackToExit) return@BackHandler
        val now = SystemClock.uptimeMillis()
        if (now - lastBackPress.longValue <= back.exitDelayMs) {
            context.findActivity()?.finish()
        } else {
            lastBackPress.longValue = now
            Toast.makeText(context, "Press back again to exit", Toast.LENGTH_SHORT).show()
        }
    }

    val current = nav.currentRoute.value
    val matched = matchRoute(current, routes)
    if (matched != null) {
        matched.composable()
    }
}

fun matchRoute(current: String, routes: List<Route>): Route? {
    for (route in routes) {
        val pattern = route.path.split('/').filter { it.isNotEmpty() }
        val actual = current.split('/').filter { it.isNotEmpty() }
        if (pattern.size != actual.size) continue
        val params = mutableMapOf<String, String>()
        var match = true
        for (i in pattern.indices) {
            if (pattern[i].startsWith("{") && pattern[i].endsWith("}")) {
                params[pattern[i].removeSurrounding("{", "}")] = actual[i]
            } else if (pattern[i] != actual[i]) {
                match = false
                break
            }
        }
        if (match) return route.copy(params = params)
    }
    return routes.firstOrNull()
}

fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}