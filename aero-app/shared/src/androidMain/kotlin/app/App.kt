package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()
    LaunchedEffect(Unit) { nav.navigate("/") }
    // Register the current activity for browser-API dialogs (alert).
    val veskContext = LocalContext.current
    SideEffect { veskAppSetup(veskContext) }
    val barsPadding = Modifier.statusBarsPadding().navigationBarsPadding()
    CompositionLocalProvider(LocalNavController provides nav) {
                // System bars are drawn edge-to-edge (or, on Android 15+, the OS
                // forces them to be); push the app content below the status bar and
        // above the navigation bar.
        Box(modifier = Modifier.fillMaxSize().then(barsPadding)) {
            Layout {
                AppRouter(start = "/", routes = listOf(
                    Route("/components/bottom-nav") { BottomNav() },
        Route("/components/empty-state") { EmptyState() },
        Route("/components/flight-card") { FlightCard() },
        Route("/components/flight-details") { FlightDetails() },
        Route("/components/flight-route") { FlightRoute() },
        Route("/components/map-view") { MapView() },
        Route("/components/notify-button") { NotifyButton() },
        Route("/components/save-button") { SaveButton() },
        Route("/components/status-badge") { StatusBadge() },
        Route("/flight/{id}") { params -> FlightDetail(props = FlightDetailProps(id = params["id"] ?: "")) },
        Route("/") { Home() },
        Route("/profile") { Profile() },
        Route("/saved") { Saved() },
        Route("/search") { Search() }
                ),
            back = BackBehavior(mode = "stack", doubleBackToExit = true, exitDelayMs = 2000, exitRoutes = listOf("/")),)
            }
        }
    }
}
