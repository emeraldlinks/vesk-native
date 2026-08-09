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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
fun Cart(content: @Composable () -> Unit = {}) {
	val qty1 = remember { mutableStateOf(1) }
	val qty2 = remember { mutableStateOf(2) }
	val qty3 = remember { mutableStateOf(1) }
	val promo = remember { mutableStateOf(false) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 8.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Text(
				text = "Your bag",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp),
			)
			Text(
				text = "3 items",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xFF4B5563), fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
			verticalArrangement = Arrangement.spacedBy(16.dp),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFF9FAFB)).padding(16.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF4F46E5)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(64.dp).height(64.dp),
				) {
				}
				Column(
					modifier = Modifier.weight(1f),
				) {
					Text(
						text = "Arctic Fleece Hoodie",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					Text(
						text = "M · Pine green",
						modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF9CA3AF)),
					)
					Row(
						modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							modifier = Modifier.shadow(1.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFE5E7EB)).padding(4.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(4.dp),
						) {
							Button(
								onClick = { if (truthy(num(qty1.value) > num(1))) qty1.value = qty1.value + -1 },
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).width(28.dp).height(28.dp),
								shape = RoundedCornerShape(9999.dp),
								colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
								elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
							) {
							Text(
								text = "−",
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).width(28.dp).height(28.dp),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4B5563)),
							)
							}
							Text(
								text = (qty1.value).toString(),
								modifier = Modifier.width(24.dp),
								style = TextStyle(textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
							)
							Button(
								onClick = { qty1.value = qty1.value + 1 },
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(28.dp).height(28.dp),
								shape = RoundedCornerShape(9999.dp),
								colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
								elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
							) {
							Text(
								text = "+",
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(28.dp).height(28.dp),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFFFFF)),
							)
							}
						}
						Text(
							text = "${'$'}89",
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
			}
			Row(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFF9FAFB)).padding(16.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Brush.linearGradient(listOf(Color(0xFF34D399), Color(0xFF0D9488)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(64.dp).height(64.dp),
				) {
				}
				Column(
					modifier = Modifier.weight(1f),
				) {
					Text(
						text = "Snowdrift Parka",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					Text(
						text = "L · Storm gray",
						modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF9CA3AF)),
					)
					Row(
						modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							modifier = Modifier.shadow(1.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFE5E7EB)).padding(4.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(4.dp),
						) {
							Button(
								onClick = { if (truthy(num(qty2.value) > num(1))) qty2.value = qty2.value + -1 },
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).width(28.dp).height(28.dp),
								shape = RoundedCornerShape(9999.dp),
								colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
								elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
							) {
							Text(
								text = "−",
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).width(28.dp).height(28.dp),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4B5563)),
							)
							}
							Text(
								text = (qty2.value).toString(),
								modifier = Modifier.width(24.dp),
								style = TextStyle(textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
							)
							Button(
								onClick = { qty2.value = qty2.value + 1 },
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(28.dp).height(28.dp),
								shape = RoundedCornerShape(9999.dp),
								colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
								elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
							) {
							Text(
								text = "+",
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(28.dp).height(28.dp),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFFFFF)),
							)
							}
						}
						Text(
							text = "${'$'}219",
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
			}
			Row(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFF9FAFB)).padding(16.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Brush.linearGradient(listOf(Color(0xFFFBBF24), Color(0xFFEA580C)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(64.dp).height(64.dp),
				) {
				}
				Column(
					modifier = Modifier.weight(1f),
				) {
					Text(
						text = "Merino Crew",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					Text(
						text = "S · Oat",
						modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF9CA3AF)),
					)
					Row(
						modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							modifier = Modifier.shadow(1.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFE5E7EB)).padding(4.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(4.dp),
						) {
							Button(
								onClick = { if (truthy(num(qty3.value) > num(1))) qty3.value = qty3.value + -1 },
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).width(28.dp).height(28.dp),
								shape = RoundedCornerShape(9999.dp),
								colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
								elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
							) {
							Text(
								text = "−",
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).width(28.dp).height(28.dp),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4B5563)),
							)
							}
							Text(
								text = (qty3.value).toString(),
								modifier = Modifier.width(24.dp),
								style = TextStyle(textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
							)
							Button(
								onClick = { qty3.value = qty3.value + 1 },
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(28.dp).height(28.dp),
								shape = RoundedCornerShape(9999.dp),
								colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
								elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
							) {
							Text(
								text = "+",
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).width(28.dp).height(28.dp),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFFFFF)),
							)
							}
						}
						Text(
							text = "${'$'}75",
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, Color(0xFFE5E7EB)).padding(16.dp),
			verticalArrangement = Arrangement.spacedBy(4.dp),
		) {
			Row(
				modifier = Modifier.fillMaxWidth(),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "Subtotal",
					style = TextStyle(color = Color(0xFF6B7280)),
				)
				Text(
					text = "${'$'}" + (((89 * qty1.value) + (219 * qty2.value)) + (75 * qty3.value)).toString(),
					style = TextStyle(fontWeight = FontWeight.SemiBold),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "Shipping",
					style = TextStyle(color = Color(0xFF6B7280)),
				)
				Text(
					text = "Free",
					style = TextStyle(fontWeight = FontWeight.SemiBold, color = Color(0xFF16A34A)),
				)
			}
			if (truthy(promo.value)) {
				Row(
					modifier = Modifier.fillMaxWidth(),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Text(
						text = "Promo — CODE10",
						style = TextStyle(color = Color(0xFF6B7280)),
					)
					Text(
						text = ("−${'$'}${kotlin.math.round(((((89 * qty1.value) + (219 * qty2.value)) + (75 * qty3.value)) * 0.1).toDouble()).toInt()}").toString(),
						style = TextStyle(fontWeight = FontWeight.SemiBold, color = Color(0xFF16A34A)),
					)
				}
			} else {
			}
			Button(
				onClick = { promo.value = !promo.value },
				modifier = Modifier.padding(top = 4.dp).align(Alignment.Start),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
			) {
			if (truthy(promo.value)) {
				Text(
					text = ("Remove promo code").toString(),
				)
			} else {
				Text(
					text = ("Apply promo code").toString(),
				)
			}
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp).veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, Color(0xFFF3F4F6)).padding(top = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "Total",
					style = TextStyle(fontWeight = FontWeight.Bold),
				)
				Text(
					text = ("${'$'}${kotlin.math.round(((((89 * qty1.value) + (219 * qty2.value)) + (75 * qty3.value)) * (if (truthy(promo.value)) 0.9 else 1.0)).toDouble()).toInt()}").toString(),
					style = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, lineHeight = 28.sp),
				)
			}
		}
		NavLink(props = NavLinkProps(href = "/checkout"))
			{
				Column(
					modifier = Modifier.fillMaxWidth().shadow(1.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(vertical = 14.dp),
				) {
					Text(
						text = ("Checkout — ${'$'}${kotlin.math.round(((((89 * qty1.value) + (219 * qty2.value)) + (75 * qty3.value)) * (if (truthy(promo.value)) 0.9 else 1.0)).toDouble()).toInt()}").toString(),
					)
				}
			}
	}
}
