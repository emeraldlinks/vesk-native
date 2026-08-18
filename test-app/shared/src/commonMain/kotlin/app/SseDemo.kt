package app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowColumn
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex


@Composable
fun SseDemo(content: @Composable () -> Unit = {}) {
	val state = remember { mutableStateOf("connecting") }
	val events = remember { mutableStateOf("") }
	val lastId = remember { mutableStateOf("") }
	val es = remember { mutableStateOf(VeskEventSource("http://127.0.0.1:8700/events")) }
	es.value.onopen=  { run __veskret0@ { state.value = jsString("open") } };
	es.value.onmessage=  { e -> run __veskret1@ { events.value = jsString((events.value + e.`data`) + "\n"); lastId.value = jsString(e.lastEventId) } };
	es.value.onerror=  { run __veskret2@ { state.value = jsString("error") } };
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF111827)).padding(20.dp),
		) {
			Text(
				text = ("Server-sent events · OkHttp stream").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xB3FFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
			)
			Text(
				text = "SSE ticker on this device",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
			)
			Text(
				text = "http://127.0.0.1:8700/events — a local node stream pushing a tick every 2s with event ids; auto-reconnects on drop.",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xB3FFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
			)
			@OptIn(ExperimentalLayoutApi::class)
			FlowRow(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret3@ { es.value.close(); state.value = jsString("closed") } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = "Close",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
			) {
				Text("state: " + " · lastEventId: ")
				Text(
					text = (state.value).toString(),
					style = TextStyle(color = Color(0xFF34D399)),
				)
				Text(
					text = (lastId.value).toString(),
					style = TextStyle(color = Color(0xFF38BDF8)),
				)
			}
			Text(
				text = (events.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				style = TextStyle(color = Color(0xFF6EE7B7), fontFamily = FontFamily.Monospace, fontSize = 11.sp, lineHeight = 16.sp),
			)
		}
	}
}
