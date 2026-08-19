package app

import androidx.compose.runtime.Composable
import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController

@Composable
fun MainViewController(): UIViewController = ComposeUIViewController { App(routes = appRoutes) }
