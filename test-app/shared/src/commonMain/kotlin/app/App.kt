package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import app.navigation.*

@Composable
fun App(start: String? = null, routes: List<Route>) {
    val nav = rememberNavController()
    LaunchedEffect(Unit) { nav.navigate("/") }
    // Platform seams: barsPadding() insets the system bars where the platform
    // draws edge-to-edge (android); veskAppSetup() registers the browser-API
    // anchor (android activity; no-op elsewhere).
    veskAppSetup()
    val barsPadding = veskBarsPadding(pad = true)

    CompositionLocalProvider(LocalNavController provides nav) {
                // System bars are drawn edge-to-edge (or, on Android 15+, the OS
                // forces them to be); push the app content below the status bar and
        // above the navigation bar.
        Box(modifier = Modifier.fillMaxSize().then(barsPadding)) {
            Layout {
                AppRouter(start = start ?: "/", routes = routes,
            back = BackBehavior(mode = "stack", doubleBackToExit = true, exitDelayMs = 2000, exitRoutes = listOf("/")),)
            }
        }
    }
}
