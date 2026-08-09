package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()
    LaunchedEffect(Unit) { nav.navigate("/") }
    CompositionLocalProvider(LocalNavController provides nav) {
                // System bars are drawn edge-to-edge; push the app content below the
                // status bar and above the navigation bar.
        Box(modifier = Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
            Layout {
                AppRouter(start = "/", routes = listOf(
                    Route("/about") { About() },
        Route("/blog/hello-world") { BlogPost() },
        Route("/blog") { Blog() },
        Route("/blog/vesk-native") { VeskNativePost() },
        Route("/cart") { Cart() },
        Route("/checkout") { CheckoutPage() },
        Route("/lab") { Lab() },
        Route("/") { Home() },
        Route("/shop/arctic-hoodie") { ArcticHoodie() },
        Route("/shop/merino-crew") { MerinoCrew() },
        Route("/shop") { Shop() },
        Route("/shop/snow-parka") { SnowParka() },
        Route("/shop/splitshirt-tee") { SplitTee() },
        Route("/shop/yellowstone-beanie") { Beanie() }
                ),
            back = BackBehavior(mode = "stack", doubleBackToExit = true, exitDelayMs = 2000, exitRoutes = listOf("/")),)
            }
        }
    }
}
