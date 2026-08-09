package app

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import app.navigation.findActivity

private val VeskLightColors = lightColorScheme(
        primary = Color(0xFF3B82F6),
        background = Color(0xFFFFFFFF),
        surface = Color(0xFFFFFFFF),
        onPrimary = Color(0xFFFFFFFF),
        onBackground = Color(0xFF1F2937),
    )

private val VeskDarkColors = darkColorScheme(
        primary = Color(0xFF60A5FA),
        background = Color(0xFF0F172A),
        surface = Color(0xFF1E293B),
        onPrimary = Color(0xFF0F172A),
        onBackground = Color(0xFFE2E8F0),
    )

private val VeskTypography = Typography(
        bodyLarge = TextStyle(
            fontFamily = FontFamily.SansSerif,
            fontSize = 16.sp,
        ),
    )
@Composable
fun VeskTheme(content: @Composable () -> Unit) {
    val dark = false
    val colors = if (dark) VeskDarkColors else VeskLightColors
    // Keep system bars in sync with the app theme (status bar color + icon
    // luminance, navigation bar color + icon luminance).
    val activity = LocalContext.current.findActivity()
    if (activity != null) {
        SideEffect {
            val window = activity.window
            window.statusBarColor = colors.background.toArgb()
            window.navigationBarColor = colors.background.toArgb()
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            controller.isAppearanceLightStatusBars = !dark
            controller.isAppearanceLightNavigationBars = !dark
        }
    }
    MaterialTheme(
        colorScheme = if (dark) VeskDarkColors else VeskLightColors,
        typography = VeskTypography,
        content = content,
    )
}
