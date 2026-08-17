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

import app.Badge
import app.lab_js_helper_jsMotto as jsMotto
import app.lab_js_helper_jsTagline as jsTagline
import app.lab_js_helper_jsYear as jsYear
import app.lab_utils_clamp as clamp
import app.lab_utils_shippedFrom as shippedFrom
import app.lab_utils_titleCase as titleCase


@Composable
fun Lab(content: @Composable () -> Unit = {}) {
	val count = remember { mutableStateOf(0) }
	val tick = remember { mutableStateOf(0) }
	val timerId = remember { mutableStateOf(0) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(16.dp),
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFFA855F7), Color(0xFFEC4899)))).padding(24.dp),
		) {
			Text(
				text = "Lab — vesk-native feature demo",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold),
			)
			Text(
				text = "Every card below is a fixed compiler/runtime feature, labeled with what it proves.",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFF3E8FF)).padding(16.dp),
		) {
			Text(
				text = "Module imports",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "Header imports resolve .vsk components, .ts modules and .js modules to Kotlin declarations (import app.<slug>_<name>).",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			@OptIn(ExperimentalLayoutApi::class)
			FlowRow(
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
				verticalArrangement = Arrangement.Center,
			) {
				Badge()
				Text(
					text = "← component imported from ./badge.vsk",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
			}
			Text(
				text = "TS: " + (titleCase("imported from utils.ts")).toString(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			Text(
				text = "TS: clamp(5.0, 1.0, 3.0) = " + (clamp(5.0, 1.0, 3.0)).toString(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			Text(
				text = "TS: shippedFrom = " + (shippedFrom).toString(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			Text(
				text = "JS: " + (jsTagline).toString() + " — " + (jsMotto).toString(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			Text(
				text = "JS: jsYear() = " + (jsYear()).toString(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFDBEAFE)).padding(16.dp),
		) {
			Text(
				text = "Tracked state",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "track(0) + &[count] sugar: reads/writes rewrite to get()/set() → Compose MutableState.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Text(
				text = "count = " + (count.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ count.value = num(count.value + 1).toInt() }),
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF3B82F6)),
					shape = RoundedCornerShape(8.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = "count + 1",
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF3B82F6)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
				)
				}
				Button(
					onClick = jsSafe({ count.value = num(0).toInt() }),
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)),
					shape = RoundedCornerShape(8.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = "Reset",
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp),
				)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFCFFAFE)).padding(16.dp),
		) {
			Text(
				text = "Timers",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "setTimeout / setInterval / clearTimeout / clearInterval map to VeskTimers (coroutine jobs, Int handles).",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Text(
				text = "tick = " + (tick.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			@OptIn(ExperimentalLayoutApi::class)
			FlowRow(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret0@ { if (truthy(timerId.value == 0)) {
	timerId.value = num(VeskTimers.setInterval( { tick.value = num(tick.value + 1).toInt() }, 1000)).toInt(); } } }),
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF06B6D4)),
					shape = RoundedCornerShape(8.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = "Start interval",
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF06B6D4)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
				)
				}
				Button(
					onClick = jsSafe({ VeskTimers.clearTimeout(timerId.value) }),
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)),
					shape = RoundedCornerShape(8.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = "Stop interval",
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp),
				)
				}
				Button(
					onClick = jsSafe({ VeskTimers.setTimeout( { tick.value = num(tick.value + 1).toInt() }, 500) }),
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)),
					shape = RoundedCornerShape(8.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = "Timeout +1",
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp),
				)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFFEE2E2)).padding(16.dp),
		) {
			Text(
				text = "Native alert()",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "window.alert maps to a non-blocking Android AlertDialog via the VeskAppContext activity anchor.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Button(
				onClick = jsSafe({ jsAlert("Hello from vesk-native — count is " + count.value) }),
				modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFEF4444)),
				shape = RoundedCornerShape(8.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = "Show alert",
				modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFEF4444)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
			)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFFEF3C7)).padding(16.dp),
		) {
			Text(
				text = "Layout & style features",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "Gradient, ring, aspect ratio, line-clamp, transforms, scroll, divide, grid, absolute/inset positioning, wrap + text case.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Row(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f)).padding(8.dp),
			) {
				Column(
					modifier = Modifier.weight(1f).padding(8.dp),
				) {
					Text(
						text = "A",
					)
				}
				Column(
					modifier = Modifier.veskSideBorder(top = 0.dp, end = 0.dp, bottom = 0.dp, start = 1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.22f)).weight(1f).padding(8.dp),
				) {
					Text(
						text = "B",
					)
				}
				Column(
					modifier = Modifier.veskSideBorder(top = 0.dp, end = 0.dp, bottom = 0.dp, start = 1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.22f)).weight(1f).padding(8.dp),
				) {
					Text(
						text = "C",
					)
				}
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surface).veskSideBorder(top = 2.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)).padding(12.dp),
			) {
				Text(
					text = "Top border only",
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Row(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF3B82F6)).border(2.dp, Color(0xFF93C5FD)).width(56.dp).height(56.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "ring",
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
					)
				}
				Column(
					modifier = Modifier.rotate(45f).clip(RoundedCornerShape(8.dp)).background(Color(0xFF22C55E)).padding(12.dp),
				) {
					Text(
						text = "rot",
					)
				}
				Column(
					modifier = Modifier.scale(1.25f).clip(RoundedCornerShape(8.dp)).background(Color(0xFFF97316)).padding(12.dp),
				) {
					Text(
						text = "big",
					)
				}
				Column(
					modifier = Modifier.offset(x = 8.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFA855F7)).padding(12.dp),
				) {
					Text(
						text = "x2",
					)
				}
			}
			Column(
				modifier = Modifier.padding(top = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFA5F3FC)).fillMaxWidth().aspectRatio(16f / 9f),
			) {
			}
			Text(
				text = " This paragraph is clamped to two lines with an ellipsis even though it keeps going and going and going and going and going and going and going and going. ",
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
				maxLines = 2,
				overflow = TextOverflow.Ellipsis,
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f)).height(96.dp).verticalScroll(rememberScrollState()).padding(12.dp),
			) {
				Column(
					modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				) {
					Text(
						text = "Item one",
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				) {
					Text(
						text = "Item two",
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				) {
					Text(
						text = "Item three",
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				) {
					Text(
						text = "Item four",
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				) {
					Text(
						text = "Item five",
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				) {
					Text(
						text = "Item six",
					)
				}
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				verticalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Row(
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(8.dp),
					) {
						Text(
							text = "g1",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(8.dp),
					) {
						Text(
							text = "g2",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(8.dp),
					) {
						Text(
							text = "g3",
						)
					}
				}
				Row(
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(8.dp),
					) {
						Text(
							text = "g4",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(8.dp),
					) {
						Text(
							text = "g5",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(8.dp),
					) {
						Text(
							text = "g6",
						)
					}
				}
			}
			@OptIn(ExperimentalLayoutApi::class)
			FlowRow(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 12.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "one",
					)
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 12.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "two",
					)
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 12.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "three",
					)
				}
				Column(
					modifier = Modifier.offset(y = -16.dp).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 12.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "lifted",
					)
				}
			}
			Text(
				text = ("shout this").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Text(
				text = ("capital me").replaceFirstChar { it.uppercase() },
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Box(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFEF3C7)).padding(32.dp),
			) {
				Text(
					text = "Positioned container",
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium, color = Color(0xFF78350F)),
				)
				Column(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF59E0B)).padding(horizontal = 8.dp).padding(vertical = 2.dp).align(Alignment.TopEnd).offset(x = -8.dp, y = 8.dp),
				) {
					Text(
						text = "badge",
					)
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFFCD34D)).padding(horizontal = 8.dp).align(Alignment.BottomStart).offset(x = 8.dp, y = -4.dp),
				) {
					Text(
						text = "bottom-left",
					)
				}
			}
			Box(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(12.dp)).clip(RoundedCornerShape(0.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)).height(128.dp),
			) {
				Row(
					modifier = Modifier.background(Color(0x66000000)).fillMaxHeight().fillMaxWidth(),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "inset-0 overlay",
						style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold),
					)
				}
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp).shadow(20.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
			) {
				Text(
					text = "Shadow card",
					modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
					style = TextStyle(fontWeight = FontWeight.SemiBold),
				)
				Text(
					text = "Box shadows map to elevation.",
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFE0E7FF)).padding(16.dp),
		) {
			Text(
				text = "Statements in markup",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "if/else, ternary, switch, loops, for-of (bounded list), for-in, labeled block and try/catch — each demo component keeps its statements at component top level.",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
		}
		StatementsIf()
		StatementsSwitch()
		StatementsLoops()
		StatementsMisc()
		ErrorBoundaryCard()
	}
}

@Composable
fun StatementsIf(content: @Composable () -> Unit = {}) {
	Text(
		text = "if / else + ternary",
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
	)
	val score = 7;
	if (truthy(num(score) > num(5))) {
		Text(
			text = "Score " + (score).toString() + " is above the threshold",
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(color = Color(0xFF16A34A)),
		)
	} else {
		Text(
			text = "Score " + (score).toString() + " is low",
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(color = Color(0xFFDC2626)),
		)
	}
	Column(modifier = Modifier.fillMaxWidth()) {
		if (truthy((score % 2) == 0)) {
			Text(
				text = ("even").toString(),
			)
		} else {
			Text(
				text = ("odd").toString(),
			)
		}
	}
}

@Composable
fun StatementsSwitch(content: @Composable () -> Unit = {}) {
	Text(
		text = "switch",
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
	)
	val score = 7;
	when (score) {
		1 -> {
			Text(
				text = "One",
				modifier = Modifier.fillMaxWidth(),
			)
		}
		7 -> {
			Text(
				text = "Seven",
				modifier = Modifier.fillMaxWidth(),
			)
		}
		else -> {
			Text(
				text = "Something else",
				modifier = Modifier.fillMaxWidth(),
			)
		}
	}
}

@Composable
fun StatementsLoops(content: @Composable () -> Unit = {}) {
	Text(
		text = "Loops",
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
	)
	Text(
		text = "for (classic)",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	var i = 0
	while (truthy(num(i) < num(3))) {
		Text(
			text = (i).toString(),
			modifier = Modifier.padding(end = 8.dp),
		)
		i ++
	}
	Text(
		text = "for-of (array, bounded-height list)",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	val itemsList = listOf("alpha", "beta", "gamma");
	Column(
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f)).height(112.dp).padding(12.dp),
	) {
		LazyColumn {
			items(itemsList) { item ->
				Column(
					modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				) {
					Text(
						text = (item).toString(),
					)
				}
			}
		}
	}
	Text(
		text = "for-in (object keys)",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	val obj = mutableMapOf<String, Any?>("a" to 1, "b" to 2, "c" to 3);
	for (key in jsMapKeys(obj)) {
		Text(
			text = (key).toString(),
			modifier = Modifier.padding(end = 8.dp),
		)
	}
	Text(
		text = "while",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	var n = 0;
	while (truthy(num(n) < num(3))) {
		Text(
			text = (n).toString(),
			modifier = Modifier.padding(end = 8.dp),
		)
		n= n + 1;
	}
	Text(
		text = "do-while",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	do {
		Text(
			text = (n).toString(),
			modifier = Modifier.padding(end = 8.dp),
		)
		n= n + 1;
	} while (truthy(num(n) < num(5)));
}

@Composable
fun StatementsMisc(content: @Composable () -> Unit = {}) {
	Text(
		text = "Expressions",
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
	)
	Text(
		text = "labeled block",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	Text(
		text = "This paragraph lives inside a labeled block.",
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant),
	)
	Text(
		text = "template literals",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	val post = mutableMapOf<String, Any?>("name" to "Vesk", "year" to 2026);
	Text(
		text = ("Built in ${jsMapGet(post, "year")} by ${jsMapGet(post, "name")}").toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
	Text(
		text = "optional chaining + nullish",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	val maybe = null;
	Text(
		text = ((jsMapGet(jsMapGet(maybe, "user"), "name") ?: "anon")).toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
	Text(
		text = "regex",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	Column(modifier = Modifier.fillMaxWidth()) {
		if (truthy(Regex("ab+c", setOf(RegexOption.IGNORE_CASE)).containsMatchIn("xxabbbc"))) {
			Text(
				text = ("regex matched").toString(),
			)
		} else {
			Text(
				text = ("regex missed").toString(),
			)
		}
	}
	Text(
		text = "Math",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	Text(
		text = ("max(3, 7) = ${kotlin.math.max(3, 7)}, sqrt(81) = ${kotlin.math.sqrt((81).toDouble())}, floor(3.7) = ${kotlin.math.floor((3.7).toDouble()).toInt()}").toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
	Text(
		text = "JSON",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	Text(
		text = (jsStringify(mutableMapOf<String, Any?>("a" to 1))).toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
	Text(
		text = "Map + Set",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	val lookup = linkedMapOf<Any?, Any?>("a" to 1, "b" to 2);
	val uniq = linkedSetOf<Any?>(1, 2, 2, 3);
	Text(
		text = ("lookup.get('a') = ${jsMapGet(lookup, "a")}, lookup.size = ${jsSize(lookup)}").toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
	Text(
		text = ("uniq.size = ${jsSize(uniq)}, uniq.has(2) = ${jsHas(uniq, 2)}").toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
	Text(
		text = "array operations",
		modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
	)
	val nums = listOf(1, 2, 3, 4, 5);
	Text(
		text = ("doubled = ${nums.map { x -> x * 2 }.joinToString(", ")}").toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
	Text(
		text = ("evens = ${nums.filter { x -> (x % 2) == 0 }.joinToString(", ")}").toString(),
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
	)
}

@Composable
fun ErrorBoundaryCard(content: @Composable () -> Unit = {}) {
	val boomCount = remember { mutableStateOf(0) }
	Text(
		text = "try / catch / throw",
		modifier = Modifier.fillMaxWidth(),
		style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
	)
	Text(
		text = "Markup try body renders when healthy; a throw switches the render to the catch fallback — no crash.",
		modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
		style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
	)
	Row(
		modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
		horizontalArrangement = Arrangement.spacedBy(8.dp),
	) {
		Button(
			onClick = jsSafe({ boomCount.value = num(boomCount.value + 1).toInt() }),
			modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFEF4444)),
			shape = RoundedCornerShape(8.dp),
			colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
			elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
			contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
		) {
		Text(
			text = "Arm the failure",
			modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFEF4444)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
			style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
		)
		}
		Button(
			onClick = jsSafe({ boomCount.value = num(0).toInt() }),
			modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)),
			shape = RoundedCornerShape(8.dp),
			colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
			elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
			contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
		) {
		Text(
			text = "Reset",
			modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
			style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp),
		)
		}
	}
	var __veskErr1: Throwable? = null
	try {
		if (truthy(num(boomCount.value) > num(0))) {
			throw Exception(("Boom #" + boomCount.value)?.toString());
		} else {
		}
	} catch (__veskErr1_caught: Throwable) {
		__veskErr1 = __veskErr1_caught
	}
	if (__veskErr1 == null) {
		Text(
			text = "Healthy — no failures triggered.",
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color(0xFFF0FDF4)).padding(8.dp),
			style = TextStyle(color = Color(0xFF15803D), fontSize = 14.sp, lineHeight = 20.sp),
		)
	} else {
		Text(
			text = "Caught: " + (__veskErr1.message).toString(),
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color(0xFFFEF2F2)).padding(8.dp),
			style = TextStyle(color = Color(0xFFB91C1C), fontSize = 14.sp, lineHeight = 20.sp),
		)
	}
}
