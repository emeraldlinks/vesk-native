export function routerKt(_routes: { path: string; name: string }[]): string {
  return `package app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider

data class Route(val path: String, val composable: @Composable () -> Unit)

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
    val nav = rememberNavController()
    LaunchedEffect(start) { nav.navigate(start) }
    CompositionLocalProvider(LocalNavController provides nav) {
        val current = nav.currentRoute.value
        val matched = routes.find { it.path == current } ?: routes.firstOrNull()
        if (matched != null) {
            matched.composable()
        }
    }
}
`;
}

export function appKtWithRouter(root: string, page: string): string {
  return `package app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

@Composable
fun App() {
    ${root}(props = ${root}Props()) {
        AppRouter(start = "/${page}", routes = listOf(
            Route("/") { Home() },
            Route("/about") { About() },
            Route("/blog") { Blog() },
            Route("/blog/{slug}") { BlogPost() },
            Route("/error") { ErrorPage() },
            Route("/not-found") { NotFound404() }
        ))
    }
}
`;
}
