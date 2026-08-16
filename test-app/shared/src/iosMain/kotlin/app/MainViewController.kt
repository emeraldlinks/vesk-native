package app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController
import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()
    CompositionLocalProvider(LocalNavController provides nav) {
                Box(modifier = Modifier.fillMaxSize()) {
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

fun MainViewController(): UIViewController = ComposeUIViewController { App() }
