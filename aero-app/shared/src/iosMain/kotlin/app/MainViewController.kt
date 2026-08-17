package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController
import androidx.compose.runtime.LaunchedEffect
import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()

    CompositionLocalProvider(LocalNavController provides nav) {
                Box(modifier = Modifier.fillMaxSize()) {
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

fun MainViewController(): UIViewController = ComposeUIViewController { App() }
