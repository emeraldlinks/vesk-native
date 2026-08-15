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
                    Route("/about") { About() },
        Route("/anim") { Anim() },
        Route("/blog/hello-world") { BlogPost() },
        Route("/blog") { Blog() },
        Route("/blog/vesk-native") { VeskNativePost() },
        Route("/cart") { Cart() },
        Route("/checkout") { CheckoutPage() },
        Route("/lab/badge") { Badge() },
        Route("/lab") { Lab() },
        Route("/labs") { Labs() },
        Route("/lib") { Lib() },
        Route("/media") { Media(props = MediaProps(heading = "Native media lab", blurb = "camera, recorder, pickers & media broadcast")) },
        Route("/") { Home(props = HomeProps(promo = "Members save 20% today", cta = "Shop the drop")) },
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
