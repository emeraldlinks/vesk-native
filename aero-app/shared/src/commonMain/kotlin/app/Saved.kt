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

import app.BottomNav
import app.EmptyState
import app.FlightCard
import app.data_flights_flights as flights


@Composable
fun Saved(content: @Composable () -> Unit = {}) {
	val raw = VeskWebStorage.localGetItem("aero.saved");
	val ids = if (truthy(raw)) "$raw".split(",").toMutableList() else listOf();
	val saved = flights.filter { f -> ids.contains("${jsIndex(f, "id")}") };
	Column(
		modifier = Modifier.background(Color(0xFF0A0F16)).fillMaxWidth().fillMaxHeight(),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 16.dp).padding(bottom = 4.dp),
		) {
			Text(
				text = "Saved",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 32.sp, letterSpacing = -0.2.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState()),
		) {
			if (truthy(jsLength(saved) == 0)) {
				EmptyState(props = EmptyStateProps(icon = "saved", title = "No saved flights", hint = "Save flights to quickly find them later. Tap the bookmark on any flight card."))
			} else {
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
				verticalArrangement = Arrangement.spacedBy(12.dp),
			) {
				for (f in saved) {
					FlightCard(props = FlightCardProps(flight = f))
				}
			}
		}
		BottomNav(props = BottomNavProps(active = "saved"))
	}
}
