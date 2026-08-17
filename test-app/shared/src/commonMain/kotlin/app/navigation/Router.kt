package app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import kotlin.time.TimeMark
import kotlin.time.TimeSource

data class Route(val path: String, val params: Map<String, String> = emptyMap(), val composable: @Composable (Map<String, String>) -> Unit)

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
    // Routes where a double back press exits the app. Empty means only the
    // start/root route.
    val exitRoutes: List<String> = emptyList(),
)

class NavController {
    private val _history = mutableStateOf(listOf<String>("/"))
    private val _currentRoute = mutableStateOf("/")
    // Params of the currently matched route ({id} segments), kept in sync by
    // AppRouter. Script-side useParams() (veskUseParams) reads this, so page
    // props injection and script access agree on the same values.
    private val _currentParams = mutableStateOf<Map<String, String>>(emptyMap())
    val currentParams: androidx.compose.runtime.State<Map<String, String>> = _currentParams
    // Scroll state per route currently reachable on the stack. A page's offset
    // lives in its own ScrollState instance, so back-navigation restores it
    // while forward navigation to a never-visited route starts at the top.
    private val _scrollStates = mutableMapOf<String, androidx.compose.foundation.ScrollState>()
    val history: List<String> get() = _history.value
    val currentRoute: androidx.compose.runtime.State<String> = _currentRoute

    // Scroll state for a route: created fresh on first visit, retained (with
    // its offset) while the route stays on the stack, pruned when the route
    // is popped or truncated away.
    fun scrollStateFor(route: String, initial: Int = 0): androidx.compose.foundation.ScrollState =
        _scrollStates.getOrPut(route) { androidx.compose.foundation.ScrollState(initial) }

    private fun pruneRoutes(removed: List<String>) {
        for (r in removed) _scrollStates.remove(r)
    }

    // Reset the navigation stack to a single route (startup, deep links).
    fun start(path: String) {
        _scrollStates.clear()
        _history.value = listOf(path)
        _currentRoute.value = path
    }

    // Navigate like a browser: routes already on the stack pop back to them
    // instead of pushing duplicates, tapping the current route is a no-op.
    // The routes popped away lose their scroll state; the revisited route
    // restores the offset it had when it was left.
    fun navigate(path: String) {
        if (path == _currentRoute.value) return
        val stack = _history.value.toMutableList()
        val idx = stack.indexOf(path)
        if (idx >= 0) {
            while (stack.size > idx + 1) stack.removeAt(stack.size - 1)
            pruneRoutes(stack.drop(idx + 1))
            _history.value = stack
            _currentRoute.value = path
        } else {
            _history.value = stack + path
            _currentRoute.value = path
        }
    }

    fun canPop(): Boolean = _history.value.size > 1

    // AppRouter hands the matched route's {id} params here just before the
    // page composes, so script-side useParams() (veskUseParams) reads the
    // exact params of the route being shown.
    fun updateParams(params: Map<String, String>) {
        _currentParams.value = params
    }

    // Pop back to the previous route; returns false when already at the root.
    // The popped route's scroll state is discarded; the restored route keeps
    // the offset it had when it was navigated away from.
    fun pop(): Boolean {
        if (!canPop()) return false
        val stack = _history.value.toMutableList()
        val popped = stack.removeAt(stack.size - 1)
        pruneRoutes(listOf(popped))
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

// Platform seams for the back flow. Android wraps androidx.activity's
// BackHandler and uses Toast + activity finish() for the double-back exit
// prompt; the iOS actuals arrive with the CMP milestone. Keeping these as
// expect declarations lets AppRouter live in commonMain with identical
// behavior on every platform.
@Composable
expect fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit)

// Platform seams for the back handler. They are composable so the actual can
// capture the host context once; the returned closures run from the
// non-composable onBack lambda.
@Composable
expect fun veskToast(): (String) -> Unit

@Composable
expect fun veskExitApp(): () -> Unit

@Composable
fun AppRouter(start: String, routes: List<Route>, back: BackBehavior = BackBehavior()) {
    val nav = LocalNavController.current
    val toast = veskToast()
    val exitApp = veskExitApp()
    var lastBackPress = remember { mutableStateOf<TimeMark?>(null) }

    LaunchedEffect(start) { nav.start(start) }

    // Exit pages (root by default, or listed in back.exitRoutes / route-level
    // exitOnBack): a double back press exits the app, regardless of what is
    // underneath on the stack. Every other page pops the history first.
    val exitRoutes = if (back.exitRoutes.isEmpty()) listOf(start) else back.exitRoutes
    PlatformBackHandler(enabled = true) {
        val exitHere = back.mode == "stack" && nav.currentRoute.value in exitRoutes
        if (!exitHere) {
            nav.pop()
            return@PlatformBackHandler
        }
        if (!back.doubleBackToExit) return@PlatformBackHandler
        val last = lastBackPress.value
        if (last != null && last.elapsedNow().inWholeMilliseconds <= back.exitDelayMs) {
            exitApp()
        } else {
            lastBackPress.value = TimeSource.Monotonic.markNow()
            toast("Press back again to exit")
        }
    }

    val current = nav.currentRoute.value
    val matched = matchRoute(current, routes)
    if (matched != null) {
        // The matched route's parsed params ({id} segments) are handed to the
        // page's composable; pages that declared zero-arg lambdas ignore them.
        nav.updateParams(matched.params)
        matched.composable(matched.params)
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
    // No route matched: render nothing (fail closed) rather than silently
    // showing an unrelated page for an unknown deep link / navigate target.
    return null
}
