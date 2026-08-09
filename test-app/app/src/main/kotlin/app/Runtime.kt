package app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.widget.MediaController
import android.widget.VideoView
import app.navigation.*

// Native counterparts of @vesk/runtime exports referenced by copied .vsk files.

fun truthy(v: Any?): Boolean = when (v) {
    null -> false
    is Boolean -> v
    is String -> v.isNotEmpty()
    is Number -> v != 0
    else -> true
}

fun num(v: Any?): Double = when (v) {
    is Number -> v.toDouble()
    is String -> v.toDoubleOrNull() ?: 0.0
    is Boolean -> if (v) 1.0 else 0.0
    else -> 0.0
}

// <video src controls autoplay loop muted> -> platform VideoView. Bundled
// assets arrive as android.resource:// URIs, device paths get a file:// prefix.
@Composable
fun veskVideo(
    url: String,
    controls: Boolean = false,
    autoplay: Boolean = false,
    loop: Boolean = false,
    muted: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val videoView = remember { VideoView(context) }
    DisposableEffect(Unit) {
        onDispose { videoView.stopPlayback() }
    }
    AndroidView(
        factory = { videoView },
        modifier = modifier,
        update = {
            it.setOnCompletionListener { mp -> if (loop) { mp.seekTo(0); mp.start() } }
            if (controls) {
                val mc = MediaController(context)
                it.setMediaController(mc)
                mc.setAnchorView(it)
            }
            it.setVideoURI(
                if (url.startsWith("/")) Uri.fromFile(java.io.File(url)) else Uri.parse(url)
            )
            it.setOnPreparedListener { mp ->
                if (muted) mp.setVolume(0f, 0f)
                if (autoplay) it.start()
            }
        },
    )
}


// <audio controls autoplay loop muted> -> MediaPlayer backed by a compact
// play/pause bar. Without controls the player is invisible but still plays.
@Composable
fun veskAudio(
    url: String,
    controls: Boolean = true,
    autoplay: Boolean = false,
    loop: Boolean = false,
    muted: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var playing by remember(url) { mutableStateOf(false) }
    var ready by remember(url) { mutableStateOf(false) }
    val player = remember(url) {
        MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            isLooping = loop
            if (muted) setVolume(0f, 0f)
            setDataSource(context, if (url.startsWith("/")) Uri.fromFile(java.io.File(url)) else Uri.parse(url))
            setOnPreparedListener {
                ready = true
                if (autoplay) {
                    it.start()
                    playing = true
                }
            }
            setOnCompletionListener {
                if (!loop) {
                    playing = false
                    it.seekTo(0)
                }
            }
            setOnErrorListener { _, _, _ ->
                playing = false
                true
            }
            prepareAsync()
        }
    }
    DisposableEffect(player) {
        onDispose { player.release() }
    }
    if (!controls) return
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Button(
            onClick = {
                if (playing) {
                    player.pause()
                    playing = false
                } else if (ready) {
                    player.start()
                    playing = true
                }
            },
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
        ) {
            Text(if (playing) "Pause" else "Play", fontSize = 12.sp)
        }
        Spacer(Modifier.width(12.dp))
        Text(
            if (playing) "Playing" else "Paused",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}


// Tailwind color filter base: color-matrix saveLayer; works on all API levels.
private fun Modifier.veskColorFilter(matrix: ColorMatrix): Modifier = drawWithContent {
    val paint = Paint().apply { colorFilter = ColorFilter.colorMatrix(matrix) }
    drawContext.canvas.saveLayer(Rect(0f, 0f, size.width, size.height), paint)
    drawContent()
    drawContext.canvas.restore()
}


fun Modifier.veskGrayscale(factor: Float): Modifier = veskColorFilter(
    ColorMatrix().also { it.setToSaturation(1f - factor) }
)


// Per-side borders (border-t/r/b/l, border-x/y).
fun Modifier.veskSideBorder(top: Dp, end: Dp, bottom: Dp, start: Dp, color: Color): Modifier = drawBehind {
    val w = floatArrayOf(top.toPx(), end.toPx(), bottom.toPx(), start.toPx())
    val s = size
    if (w[0] > 0f) drawLine(color, Offset(0f, w[0] / 2f), Offset(s.width, w[0] / 2f), w[0])
    if (w[1] > 0f) drawLine(color, Offset(s.width - w[1] / 2f, 0f), Offset(s.width - w[1] / 2f, s.height), w[1])
    if (w[2] > 0f) drawLine(color, Offset(0f, s.height - w[2] / 2f), Offset(s.width, s.height - w[2] / 2f), w[2])
    if (w[3] > 0f) drawLine(color, Offset(w[3] / 2f, 0f), Offset(w[3] / 2f, s.height), w[3])
}


// Single dashed/dotted divider line (divide-dashed / divide-dotted).
fun Modifier.veskDivideLine(horizontal: Boolean, width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val w = width.toPx()
    if (horizontal) {
        drawLine(color, Offset(0f, w / 2f), Offset(size.width, w / 2f), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    } else {
        drawLine(color, Offset(w / 2f, 0f), Offset(w / 2f, size.height), strokeWidth = w, pathEffect = PathEffect.dashPathEffect(dashes))
    }
}


// Skew transform (skew-x / skew-y) via canvas transform.
fun Modifier.veskSkew(sx: Float, sy: Float): Modifier = drawWithContent {
    val canvas = drawContext.canvas
    canvas.save()
    canvas.skew(sx, sy)
    drawContent()
    canvas.restore()
}


data class NavLinkProps(
    val href: String = "",
    val `class`: String = "",
)

@Composable
fun NavLink(props: NavLinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = Modifier.clickable(onClick = { nav.navigate(props.href) })) {
        content()
    }
}
