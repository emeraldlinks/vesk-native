package app

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val VeskColors = lightColorScheme(
        primary = Color(0xFF3B82F6),
        background = Color(0xFFFFFFFF),
        surface = Color(0xFFFFFFFF),
        onPrimary = Color(0xFFFFFFFF),
        onBackground = Color(0xFF1F2937),
    )

@Composable
fun VeskTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = VeskColors, content = content)
}
