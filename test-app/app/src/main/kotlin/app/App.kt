package app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider
import app.navigation.*

@Composable
fun App() {
    val nav = rememberNavController()
    LaunchedEffect(Unit) { nav.navigate("/") }
    CompositionLocalProvider(LocalNavController provides nav) {
        Layout {
            AppRouter(start = "/", routes = listOf(
                Route("/about") { About() },
        Route("/blog/hello-world") { BlogPost() },
        Route("/blog") { Blog() },
        Route("/blog/vesk-native") { VeskNativePost() },
        Route("/cart") { CartPage() },
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
            back = BackBehavior(mode = "stack", doubleBackToExit = true, exitDelayMs = 2000),)
        }
    }
}
