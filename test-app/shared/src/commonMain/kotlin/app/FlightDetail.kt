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


data class FlightDetailProps(
	val id: String = "",
	val title: String = "",
)

@Composable
fun FlightDetail(props: FlightDetailProps = FlightDetailProps(), content: @Composable () -> Unit = {}) {
	veskNavSync()
	val router = veskUseRouter();
	val __vsk_d0 = veskUseParams()
	val paramId = (__vsk_d0 as Map<String, Any?>)["id"]
	val __vsk_d1 = veskUseQuery()
	val id = (__vsk_d1 as Map<String, Any?>)["id"]
	val seat = (__vsk_d1 as Map<String, Any?>)["seat"]
	Column(
		modifier = Modifier.fillMaxWidth().padding(16.dp),
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Brush.horizontalGradient(listOf(Color(0xFF6366F1), Color(0xFF3B82F6)))).padding(24.dp),
		) {
			Text(
				text = "Flight " + (props.id).toString(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold),
			)
			Text(
				text = "Dynamic route params — the [id] segment of the URL arrives as a typed prop.",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFE0E7FF)).padding(16.dp),
		) {
			Text(
				text = "Route param → props",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
			) {
				Text("props.id = " + " · props.title = ")
				Text(
					text = (props.id).toString(),
					style = TextStyle(fontFamily = FontFamily.Monospace),
				)
				Text(
					text = (props.title).toString(),
					style = TextStyle(fontFamily = FontFamily.Monospace),
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
			) {
				Text("const " + ("{ id }").toString() + " = useParams() → id = ")
				Text(
					text = (paramId).toString(),
					style = TextStyle(fontFamily = FontFamily.Monospace),
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text("const " + ("{ id, seat }").toString() + " = useQuery() → id = " + ", seat = ")
				Text(
					text = (id).toString(),
					style = TextStyle(fontFamily = FontFamily.Monospace),
				)
				Text(
					text = (seat).toString(),
					style = TextStyle(fontFamily = FontFamily.Monospace),
				)
			}
		}
		@OptIn(ExperimentalLayoutApi::class)
		FlowRow(
			modifier = Modifier.fillMaxWidth(),
			horizontalArrangement = Arrangement.spacedBy(8.dp),
		) {
			Button(
				onClick = jsSafe({ router.push("/labs") }),
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = " router.push('/labs') ",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
			)
			}
			Button(
				onClick = jsSafe({ router.back() }),
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = " router.back() ",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
			)
			}
			Button(
				onClick = jsSafe({ router.refresh() }),
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF9333EA)),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = " router.refresh() ",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF9333EA)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
			)
			}
		}
	}
}
