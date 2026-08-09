package app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowColumn
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
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
				text = "Since 2019 · best seller",
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
					text = "4.7 (212 reviews)",
					style = TextStyle(color = Color(0xFF6B7280)),
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
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF9CA3AF), textDecoration = TextDecoration.LineThrough),
				)
				Text(
					text = "save 26%",
					modifier = Modifier.padding(bottom = 6.dp),
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF16A34A), fontWeight = FontWeight.SemiBold),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Text(
				text = "Color — pine green",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF047857)).border(2.dp, Color(0xFF047857)).width(32.dp).height(32.dp),
				) {
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF1E293B)).width(32.dp).height(32.dp),
				) {
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFE11D48)).width(32.dp).height(32.dp),
				) {
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF59E0B)).width(32.dp).height(32.dp),
				) {
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Text(
				text = "Size",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Row(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF2563EB)).width(40.dp).height(40.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "S",
					)
				}
				Row(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF3F4F6)).width(40.dp).height(40.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "M",
					)
				}
				Row(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF3F4F6)).width(40.dp).height(40.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "L",
					)
				}
				Row(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF3F4F6)).width(40.dp).height(40.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "XL",
					)
				}
				Row(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF3F4F6)).width(40.dp).height(40.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "2XL",
					)
					Text(
						text = "(low)",
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
					)
				}
			}
		}
		Row(
			modifier = Modifier.fillMaxWidth(),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.spacedBy(12.dp),
		) {
			Row(
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).padding(horizontal = 8.dp),
				verticalAlignment = Alignment.CenterVertically,
			) {
				Button(
					onClick = { if (truthy(num(qty.value) > num(1))) qty.value = qty.value + -1; },
					modifier = Modifier.width(36.dp).height(36.dp),
				) {
					Text("−")
				}
				Text(
					text = (qty.value).toString(),
					modifier = Modifier.width(24.dp),
					style = TextStyle(textAlign = TextAlign.Center, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
				)
				Button(
					onClick = { qty.value = qty.value + 1 },
					modifier = Modifier.width(36.dp).height(36.dp),
				) {
					Text("+")
				}
			}
			Button(
				onClick = { added.value = true },
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).weight(1f).padding(vertical = 12.dp),
			) {
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, Color(0xFFE5E7EB)).padding(16.dp),
			verticalArrangement = Arrangement.spacedBy(12.dp),
		) {
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Row(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFDCFCE7)).width(36.dp).height(36.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "✓",
						style = TextStyle(color = Color(0xFF15803D), fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 20.sp),
					)
				}
				Column {
					Text(
						text = "Free shipping",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					Text(
						text = "Delivered free on orders over ${'$'}150",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
					)
				}
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Row(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFDCFCE7)).width(36.dp).height(36.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "✓",
						style = TextStyle(color = Color(0xFF15803D), fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 20.sp),
					)
				}
				Column {
					Text(
						text = "30-day returns",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					Text(
						text = "Free returns within 30 days of delivery",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
					)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).veskDashedBorder(2.dp, Color(0xFFA5B4FC), floatArrayOf(12f, 12f)).padding(16.dp),
		) {
			Text(
				text = "Nordi+ member price",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF4338CA)),
			)
			Text(
				text = "Members save an extra 10% on this item at checkout.",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Text(
				text = "You may also like",
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
			)
			Row(
				modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(bottom = 8.dp),
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFFF3F4F6)).width(144.dp),
				) {
					Column(
						modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF4ADE80), Color(0xFF059669)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
					) {
					}
					Column(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 8.dp),
					) {
						Text(
							text = "Storm Shell",
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = "${'$'}189",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFFF3F4F6)).width(144.dp),
				) {
					Column(
						modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFC084FC), Color(0xFF7C3AED)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
					) {
					}
					Column(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 8.dp),
					) {
						Text(
							text = "Down Puffer",
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = "${'$'}240",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFFF3F4F6)).width(144.dp),
				) {
					Column(
						modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFB923C), Color(0xFFD97706)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
					) {
					}
					Column(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 8.dp),
					) {
						Text(
							text = "Base Layer Set",
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = "${'$'}62",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
			}
		}
	}
}
