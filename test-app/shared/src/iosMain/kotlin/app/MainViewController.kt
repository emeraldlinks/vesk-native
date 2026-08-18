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
                AppRouter(start = "/", routes = appRoutes,
            back = BackBehavior(mode = "stack", doubleBackToExit = true, exitDelayMs = 2000, exitRoutes = listOf("/")),)
            }
        }
    }
}

fun MainViewController(): UIViewController = ComposeUIViewController { App() }
