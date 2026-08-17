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

import androidx.compose.material3.Icon
import app.FlightRoute
import app.data_flights_flightById as flightById
import com.composables.icons.lucide.Compass
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.Minus
import com.composables.icons.lucide.Plane
import com.composables.icons.lucide.Plus
import com.composables.icons.lucide.Search
import com.composables.icons.lucide.SlidersHorizontal


@Composable
fun MapView(content: @Composable () -> Unit = {}) {
	val zoom = remember { mutableStateOf(1.0) }
	val mapBody = remember { mutableStateOf<Any?>(null) }
	val compass = remember { mutableStateOf<Any?>(null) }
	val planeA = remember { mutableStateOf<Any?>(null) }
	val planeB = remember { mutableStateOf<Any?>(null) }
	val planeC = remember { mutableStateOf<Any?>(null) }
	val planeD = remember { mutableStateOf<Any?>(null) }
	val planeE = remember { mutableStateOf<Any?>(null) }
	val filterBtn = remember { mutableStateOf<Any?>(null) }
	val tvf = flightById("tvf6474");
	val ryr = flightById("ryr642n");
	Box(
		modifier = Modifier.clip(RoundedCornerShape(24.dp)).clip(RoundedCornerShape(0.dp)).background(Color(0xFF0B1017)).fillMaxWidth().height(280.dp),
	) {
		val __veskRef1 = rememberMotionRef()
		mapBody.value = __veskRef1
		Column(
			modifier = Modifier.motionGraphics(__veskRef1).fillMaxHeight().fillMaxWidth(),
		) {
			Column(
				modifier = Modifier.fillMaxWidth().fillMaxHeight(),
			) {
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.14f),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth().height(24.dp),
					verticalAlignment = Alignment.CenterVertically,
				) {
					Column(
						modifier = Modifier.fillMaxWidth(0.24f),
					) {
					}
					val __veskRef2 = rememberMotionRef()
					planeA.value = __veskRef2
					Column(
						modifier = Modifier.motionGraphics(__veskRef2).rotate(-30f),
					) {
						Icon(
							imageVector = Lucide.Plane,
							contentDescription = "Aircraft",
							modifier = Modifier.width(16.dp).height(16.dp),
							tint = Color(0xFF67E8F9),
						)
					}
				}
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.08f),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth().height(24.dp),
					verticalAlignment = Alignment.CenterVertically,
				) {
					Column(
						modifier = Modifier.fillMaxWidth(0.46f),
					) {
					}
					val __veskRef3 = rememberMotionRef()
					planeB.value = __veskRef3
					Column(
						modifier = Modifier.motionGraphics(__veskRef3).rotate(20f),
					) {
						Icon(
							imageVector = Lucide.Plane,
							contentDescription = "Aircraft",
							modifier = Modifier.width(16.dp).height(16.dp),
							tint = Color(0xFFE2E8F0),
						)
					}
				}
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.1f),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Text(
						text = "ORY",
						modifier = Modifier.width(32.dp),
						style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B)),
					)
					FlightRoute(props = FlightRouteProps(progress = jsIndex(tvf, "progress")))
					Text(
						text = "DJE",
						modifier = Modifier.width(32.dp),
						style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B), textAlign = TextAlign.End),
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.09f),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth().height(24.dp),
					verticalAlignment = Alignment.CenterVertically,
				) {
					Column(
						modifier = Modifier.fillMaxWidth(0.58f),
					) {
					}
					val __veskRef4 = rememberMotionRef()
					planeC.value = __veskRef4
					Column(
						modifier = Modifier.motionGraphics(__veskRef4).rotate(-20f),
					) {
						Icon(
							imageVector = Lucide.Plane,
							contentDescription = "Aircraft",
							modifier = Modifier.width(16.dp).height(16.dp),
							tint = Color(0xFF67E8F9),
						)
					}
				}
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.08f),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth().height(24.dp),
					verticalAlignment = Alignment.CenterVertically,
				) {
					Column(
						modifier = Modifier.fillMaxWidth(0.18f),
					) {
					}
					val __veskRef5 = rememberMotionRef()
					planeD.value = __veskRef5
					Column(
						modifier = Modifier.motionGraphics(__veskRef5).rotate(35f),
					) {
						Icon(
							imageVector = Lucide.Plane,
							contentDescription = "Aircraft",
							modifier = Modifier.width(16.dp).height(16.dp),
							tint = Color(0xFFE2E8F0),
						)
					}
				}
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.06f),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Text(
						text = "BVA",
						modifier = Modifier.width(32.dp),
						style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B)),
					)
					FlightRoute(props = FlightRouteProps(progress = jsIndex(ryr, "progress")))
					Text(
						text = "BCN",
						modifier = Modifier.width(32.dp),
						style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B), textAlign = TextAlign.End),
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.07f),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth().height(24.dp),
					verticalAlignment = Alignment.CenterVertically,
				) {
					Column(
						modifier = Modifier.fillMaxWidth(0.74f),
					) {
					}
					val __veskRef6 = rememberMotionRef()
					planeE.value = __veskRef6
					Column(
						modifier = Modifier.motionGraphics(__veskRef6).rotate(-15f),
					) {
						Icon(
							imageVector = Lucide.Plane,
							contentDescription = "Aircraft",
							modifier = Modifier.width(16.dp).height(16.dp),
							tint = Color(0xFF67E8F9),
						)
					}
				}
				Column(
					modifier = Modifier.fillMaxWidth().fillMaxHeight(0.1f),
				) {
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp).align(Alignment.TopStart).offset(y = 16.dp),
		) {
			NavLink(props = NavLinkProps(href = "/search", modifier = Modifier.fillMaxWidth()))
				{
					Column(
					) {
						Row(
							modifier = Modifier.fillMaxWidth().shadow(10.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF1B2432)).height(48.dp).padding(horizontal = 16.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(10.dp),
						) {
							Icon(
								imageVector = Lucide.Search,
								contentDescription = "Search",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF94A3B8),
							)
							Text(
								text = "Search flight or aircraft",
								modifier = Modifier.weight(1f),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF94A3B8)),
							)
							val __veskRef7 = rememberMotionRef()
							filterBtn.value = __veskRef7
							Row(
								modifier = Modifier.motionGraphics(__veskRef7).clickable { jsSafe({ motionAnimate(filterBtn.value, mutableMapOf<String, Any?>("scale" to listOf(1, 0.85, 1)), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 400, "damping" to 15)))) }) }.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF243044)).width(32.dp).height(32.dp),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Icon(
									imageVector = Lucide.SlidersHorizontal,
									contentDescription = "Filter",
									modifier = Modifier.width(16.dp).height(16.dp),
									tint = Color(0xFFCBD5E1),
								)
							}
						}
					}
				}
		}
		Column(
			modifier = Modifier.align(Alignment.BottomEnd).offset(x = -16.dp, y = -16.dp),
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy(10.dp),
		) {
			val __veskRef8 = rememberMotionRef()
			compass.value = __veskRef8
			Row(
				modifier = Modifier.motionGraphics(__veskRef8).shadow(10.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF1B2432)).width(44.dp).height(44.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.Center,
			) {
				Icon(
					imageVector = Lucide.Compass,
					contentDescription = "Compass",
					modifier = Modifier.width(20.dp).height(20.dp),
					tint = Color(0xFF67E8F9),
				)
			}
			Column(
				modifier = Modifier.shadow(10.dp).clip(RoundedCornerShape(9999.dp)).clip(RoundedCornerShape(0.dp)).background(Color(0xFF1B2432)).width(44.dp),
				horizontalAlignment = Alignment.CenterHorizontally,
			) {
				Button(
					onClick = jsSafe({ run __veskret0@ { zoom.value = num(kotlin.math.min(1.6, zoom.value + 0.25)); motionAnimate(mapBody.value, mutableMapOf<String, Any?>("scale" to zoom.value), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 260, "damping" to 20)))) } }),
					modifier = Modifier.width(44.dp).height(44.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				Icon(
					imageVector = Lucide.Plus,
					contentDescription = "Zoom in",
					modifier = Modifier.width(20.dp).height(20.dp),
					tint = Color(0xFFFFFFFF),
				)
				}
				Column(
					modifier = Modifier.background(Color(0xFF0B1017)).width(32.dp).height(1.dp),
				) {
				}
				Button(
					onClick = jsSafe({ run __veskret1@ { zoom.value = num(kotlin.math.max(0.6, zoom.value - 0.25)); motionAnimate(mapBody.value, mutableMapOf<String, Any?>("scale" to zoom.value), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 260, "damping" to 20)))) } }),
					modifier = Modifier.width(44.dp).height(44.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				Icon(
					imageVector = Lucide.Minus,
					contentDescription = "Zoom out",
					modifier = Modifier.width(20.dp).height(20.dp),
					tint = Color(0xFFFFFFFF),
				)
				}
			}
		}
		motionInView(compass.value,  { motionAnimate(compass.value, mutableMapOf<String, Any?>("rotate" to listOf(0, 360)), mutableMapOf<String, Any?>("duration" to 20, "repeat" to Double.POSITIVE_INFINITY, "ease" to "linear")) }, mutableMapOf<String, Any?>("once" to true))
		motionInView(planeA.value,  { motionAnimate(planeA.value, mutableMapOf<String, Any?>("x" to listOf(0, 4, 0), "y" to listOf(0, -5, 0)), mutableMapOf<String, Any?>("duration" to 5, "repeat" to Double.POSITIVE_INFINITY, "repeatType" to "reverse", "ease" to motionEase("easeInOut"))) }, mutableMapOf<String, Any?>("once" to true))
		motionInView(planeB.value,  { motionAnimate(planeB.value, mutableMapOf<String, Any?>("x" to listOf(0, -6, 0), "y" to listOf(0, 4, 0)), mutableMapOf<String, Any?>("duration" to 6, "repeat" to Double.POSITIVE_INFINITY, "repeatType" to "reverse", "ease" to motionEase("easeInOut"))) }, mutableMapOf<String, Any?>("once" to true))
		motionInView(planeC.value,  { motionAnimate(planeC.value, mutableMapOf<String, Any?>("x" to listOf(0, 5, 0), "y" to listOf(0, -4, 0)), mutableMapOf<String, Any?>("duration" to 4.5, "repeat" to Double.POSITIVE_INFINITY, "repeatType" to "reverse", "ease" to motionEase("easeInOut"))) }, mutableMapOf<String, Any?>("once" to true))
		motionInView(planeD.value,  { motionAnimate(planeD.value, mutableMapOf<String, Any?>("x" to listOf(0, -4, 0), "y" to listOf(0, 5, 0)), mutableMapOf<String, Any?>("duration" to 7, "repeat" to Double.POSITIVE_INFINITY, "repeatType" to "reverse", "ease" to motionEase("easeInOut"))) }, mutableMapOf<String, Any?>("once" to true))
		motionInView(planeE.value,  { motionAnimate(planeE.value, mutableMapOf<String, Any?>("x" to listOf(0, 3, 0), "y" to listOf(0, -6, 0)), mutableMapOf<String, Any?>("duration" to 5.5, "repeat" to Double.POSITIVE_INFINITY, "repeatType" to "reverse", "ease" to motionEase("easeInOut"))) }, mutableMapOf<String, Any?>("once" to true))
	}
}
