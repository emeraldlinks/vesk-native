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
import app.FlightCard
import app.MapView
import app.data_flights_nearFlights as nearFlights
import app.data_flights_trendingFlights as trendingFlights


@Composable
fun Home(content: @Composable () -> Unit = {}) {
	val segment = remember { mutableStateOf("trending") }
	val pill = remember { mutableStateOf<Any?>(null) }
	val list = if (truthy(segment.value == "trending")) trendingFlights else nearFlights;
	Column(
		modifier = Modifier.background(Color(0xFF0A0F16)).fillMaxWidth().fillMaxHeight(),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState()),
		) {
			Column(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 16.dp).padding(bottom = 8.dp),
			) {
				MapView()
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 8.dp),
			) {
				Row(
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(9999.dp)).background(Color(0xFF10161F)).padding(4.dp),
				) {
					if (truthy(segment.value == "trending")) {
						Button(
							onClick = jsSafe({ run __veskret0@ { segment.value = jsString("trending") } }),
							modifier = Modifier.weight(1f).padding(vertical = 10.dp),
							colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
							elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						) {
						Box(
							modifier = Modifier.fillMaxSize(),
							contentAlignment = Alignment.Center,
						) {
						val __veskRef1 = rememberMotionRef()
						pill.value = __veskRef1
						Column(
							modifier = Modifier.motionGraphics(__veskRef1).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).fillMaxHeight().fillMaxWidth(),
						) {
						}
						Text(
							text = "Trending flights",
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF0A0F16)),
						)
						}
						}
					} else {
						Button(
							onClick = jsSafe({ run __veskret1@ { segment.value = jsString("trending") } }),
							modifier = Modifier.weight(1f).padding(vertical = 10.dp),
							colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
							elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						) {
						Text(
							text = "Trending flights",
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium, color = Color(0xFF94A3B8)),
						)
						}
					}
					if (truthy(segment.value == "near")) {
						Button(
							onClick = jsSafe({ run __veskret2@ { segment.value = jsString("near") } }),
							modifier = Modifier.weight(1f).padding(vertical = 10.dp),
							colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
							elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						) {
						Box(
							modifier = Modifier.fillMaxSize(),
							contentAlignment = Alignment.Center,
						) {
						val __veskRef2 = rememberMotionRef()
						pill.value = __veskRef2
						Column(
							modifier = Modifier.motionGraphics(__veskRef2).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).fillMaxHeight().fillMaxWidth(),
						) {
						}
						Text(
							text = "Flights near you",
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF0A0F16)),
						)
						}
						}
					} else {
						Button(
							onClick = jsSafe({ run __veskret3@ { segment.value = jsString("near") } }),
							modifier = Modifier.weight(1f).padding(vertical = 10.dp),
							colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
							elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						) {
						Text(
							text = "Flights near you",
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium, color = Color(0xFF94A3B8)),
						)
						}
					}
				}
				motionInView(pill.value,  { motionAnimate(pill.value, mutableMapOf<String, Any?>("scale" to listOf(0.85, 1.04, 1), "opacity" to listOf(0, 1)), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 340, "damping" to 16)))) }, mutableMapOf<String, Any?>("once" to true))
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
				verticalArrangement = Arrangement.spacedBy(12.dp),
			) {
				for (f in list) {
					FlightCard(props = FlightCardProps(flight = f))
				}
			}
		}
		BottomNav(props = BottomNavProps(active = "home"))
	}
}
