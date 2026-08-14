package app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.res.painterResource
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
fun ArcticHoodie(content: @Composable () -> Unit = {}) {
	val qty = remember { mutableStateOf(1) }
	val size = remember { mutableStateOf("M") }
	val color = remember { mutableStateOf("Pine") }
	val added = remember { mutableStateOf(false) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 8.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Row(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF4F46E5)), start = Offset(0f, 0f), end = Offset(1f, 1f))).height(288.dp),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.Center,
		) {
			Text(
				text = "Fleece · 330 gsm",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33FFFFFF)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
			verticalArrangement = Arrangement.spacedBy(8.dp),
		) {
			Text(
				text = ("Outerwear / Hoodies").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1D4ED8), letterSpacing = 0.2.sp),
			)
			Text(
				text = "Arctic Fleece Hoodie",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Text(
					text = "★★★★★",
					style = TextStyle(color = Color(0xFFF59E0B), letterSpacing = 0.4.sp, fontWeight = FontWeight.Medium),
				)
				Text(
					text = "4.5 (212 reviews)",
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				verticalAlignment = Alignment.Bottom,
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Text(
					text = "${'$'}89",
					style = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
				)
				Text(
					text = "${'$'}120",
					modifier = Modifier.padding(bottom = 4.dp),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
				)
				Text(
					text = "save 26%",
					modifier = Modifier.padding(bottom = 6.dp),
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF16A34A), fontWeight = FontWeight.SemiBold),
				)
			}
			Text(
				text = " Brushed-back polar fleece with a storm hood and zippered chest pocket. The classic layer for everything from trail to town. ",
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 24.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
			verticalArrangement = Arrangement.spacedBy(8.dp),
		) {
			Text(
				text = ("Color — " + (color.value).toString()).uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 0.2.sp),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ color.value = "Pine" }),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(color.value == "Pine")) {
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF047857)).border(2.dp, Color(0xFF2563EB)).width(36.dp).height(36.dp),
					) {
					}
				} else {
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF047857)).width(36.dp).height(36.dp),
					) {
					}
				}
				}
				Button(
					onClick = jsSafe({ color.value = "Storm" }),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(color.value == "Storm")) {
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4B5563)).border(2.dp, Color(0xFF2563EB)).width(36.dp).height(36.dp),
					) {
					}
				} else {
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4B5563)).width(36.dp).height(36.dp),
					) {
					}
				}
				}
				Button(
					onClick = jsSafe({ color.value = "Oat" }),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(color.value == "Oat")) {
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFEF3C7)).border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)).border(2.dp, Color(0xFF2563EB)).width(36.dp).height(36.dp),
					) {
					}
				} else {
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFEF3C7)).border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)).width(36.dp).height(36.dp),
					) {
					}
				}
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
			verticalArrangement = Arrangement.spacedBy(8.dp),
		) {
			Text(
				text = ("Size — " + (size.value).toString()).uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 0.2.sp),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ size.value = "S" }),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(size.value == "S")) {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF2563EB)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "S",
						)
					}
				} else {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "S",
						)
					}
				}
				}
				Button(
					onClick = jsSafe({ size.value = "M" }),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(size.value == "M")) {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF2563EB)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "M",
						)
					}
				} else {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "M",
						)
					}
				}
				}
				Button(
					onClick = jsSafe({ size.value = "L" }),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(size.value == "L")) {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF2563EB)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "L",
						)
					}
				} else {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "L",
						)
					}
				}
				}
				Button(
					onClick = jsSafe({ size.value = "XL" }),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(size.value == "XL")) {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF2563EB)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "XL",
						)
					}
				} else {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(44.dp).height(44.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "XL",
						)
					}
				}
				}
			}
		}
		Row(
			modifier = Modifier.fillMaxWidth(),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.spacedBy(12.dp),
		) {
			Row(
				modifier = Modifier.shadow(1.dp).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)).padding(4.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(4.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret0@ { if (truthy(num(qty.value) > num(1))) qty.value = qty.value + -1 } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(36.dp).height(36.dp),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				Text(
					text = "−",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(36.dp).height(36.dp),
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
				}
				Text(
					text = (qty.value).toString(),
					modifier = Modifier.width(32.dp),
					style = TextStyle(textAlign = TextAlign.Center, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
				)
				Button(
					onClick = jsSafe({ qty.value = qty.value + 1 }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(36.dp).height(36.dp),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				Text(
					text = "+",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(36.dp).height(36.dp),
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFFFFF)),
				)
				}
			}
			Button(
				onClick = jsSafe({ added.value = !truthy(added.value) }),
				modifier = Modifier.shadow(1.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).weight(1f).padding(vertical = 14.dp),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
			) {
			if (truthy(added.value)) {
				Text(
					text = ("Added to bag ✓").toString(),
				)
			} else {
				Text(
					text = ("Add to cart · ${'$'}" + (89 * qty.value)).toString(),
				)
			}
			}
		}
		NavLink(props = NavLinkProps(href = "/cart"))
			{
				Column(
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(vertical = 14.dp),
				) {
					Text(
						text = "Go to bag",
					)
				}
			}
	}
}
