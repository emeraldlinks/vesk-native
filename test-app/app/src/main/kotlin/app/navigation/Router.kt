package app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider

data class Route(val path: String, val params: Map<String, String> = emptyMap(), val composable: @Composable () -> Unit)

class NavController {
    private val _currentRoute = mutableStateOf("/")
    val currentRoute: androidx.compose.runtime.State<String> = _currentRoute

    fun navigate(path: String) {
        _currentRoute.value = path
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
fun AppRouter(start: String, routes: List<Route>) {
    val nav = LocalNavController.current
    LaunchedEffect(start) { nav.navigate(start) }
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
