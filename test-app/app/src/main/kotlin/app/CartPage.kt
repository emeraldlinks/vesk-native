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
fun CartPage(content: @Composable () -> Unit = {}) {
	val qty1 = remember { mutableStateOf(1) }
	val qty2 = remember { mutableStateOf(2) }
	val qty3 = remember { mutableStateOf(1) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 8.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Text(
			text = "Your bag",
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp),
		)
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFE5E7EB)),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(16.dp),
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
						maxLines = 1,
						overflow = TextOverflow.Ellipsis,
					)
					Text(
						text = "Pine green · M",
						modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF9CA3AF)),
					)
					Row(
						modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).padding(horizontal = 4.dp),
							verticalAlignment = Alignment.CenterVertically,
						) {
							Button(
								onClick = { if (truthy(num(qty1.value) > num(1))) qty1.value = qty1.value + -1; },
								modifier = Modifier.width(28.dp).height(28.dp),
							) {
								Text("−")
							}
							Text(
								text = (qty1.value).toString(),
								modifier = Modifier.width(20.dp),
								style = TextStyle(textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
							)
							Button(
								onClick = { qty1.value = qty1.value + 1 },
								modifier = Modifier.width(28.dp).height(28.dp),
							) {
								Text("+")
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
				modifier = Modifier.veskDivideLine(horizontal = true, width = 1.dp, color = Color(0xFFE5E7EB), dashes = floatArrayOf(12f, 12f)).fillMaxWidth().padding(16.dp),
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
						maxLines = 1,
						overflow = TextOverflow.Ellipsis,
					)
					Text(
						text = "Storm gray · L",
						modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF9CA3AF)),
					)
					Row(
						modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).padding(horizontal = 4.dp),
							verticalAlignment = Alignment.CenterVertically,
						) {
							Button(
								onClick = { if (truthy(num(qty2.value) > num(1))) qty2.value = qty2.value + -1; },
								modifier = Modifier.width(28.dp).height(28.dp),
							) {
								Text("−")
							}
							Text(
								text = (qty2.value).toString(),
								modifier = Modifier.width(20.dp),
								style = TextStyle(textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
							)
							Button(
								onClick = { qty2.value = qty2.value + 1 },
								modifier = Modifier.width(28.dp).height(28.dp),
							) {
								Text("+")
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
				modifier = Modifier.veskDivideLine(horizontal = true, width = 1.dp, color = Color(0xFFE5E7EB), dashes = floatArrayOf(12f, 12f)).fillMaxWidth().padding(16.dp),
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
						maxLines = 1,
						overflow = TextOverflow.Ellipsis,
					)
					Text(
						text = "Oat · S",
						modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF9CA3AF)),
					)
					Row(
						modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFF3F4F6)).padding(horizontal = 4.dp),
							verticalAlignment = Alignment.CenterVertically,
						) {
							Button(
								onClick = { if (truthy(num(qty3.value) > num(1))) qty3.value = qty3.value + -1; },
								modifier = Modifier.width(28.dp).height(28.dp),
							) {
								Text("−")
							}
							Text(
								text = (qty3.value).toString(),
								modifier = Modifier.width(20.dp),
								style = TextStyle(textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
							)
							Button(
								onClick = { qty3.value = qty3.value + 1 },
								modifier = Modifier.width(28.dp).height(28.dp),
							) {
								Text("+")
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
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFF9FAFB)).padding(16.dp),
			verticalArrangement = Arrangement.spacedBy(12.dp),
		) {
			@OptIn(ExperimentalLayoutApi::class)
			FlowRow(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
				verticalArrangement = Arrangement.Center,
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFE5E7EB)).weight(1f).padding(horizontal = 16.dp).padding(vertical = 10.dp),
				) {
					Text(
						text = "Have a promo code?",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF6B7280)),
					)
				}
				Button(
					onClick = {},
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 10.dp).align(Alignment.Top),
				) {
					Text("Apply")
				}
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "Subtotal",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF4B5563)),
				)
				Text(
					text = (89 * qty1.value + 219 * qty2.value + 75 * qty3.value).toString(),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "Shipping",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF4B5563)),
				)
				Text(
					text = "Free",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF16A34A), fontWeight = FontWeight.SemiBold),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, Color(0xFFE5E7EB)).padding(top = 8.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "Total",
					style = TextStyle(fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Bold),
				)
				Text(
					text = "${'$'} " + (89 * qty1.value + 219 * qty2.value + 75 * qty3.value).toString(),
					style = TextStyle(fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
				)
			}
		}
		NavLink(props = NavLinkProps(href = "/checkout"))
			{
				Column(
					modifier = Modifier.fillMaxWidth().shadow(10.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(vertical = 14.dp),
				) {
					Text(
						text = "Checkout · ${'$'} ",
					)
					Text(
						text = (89 * qty1.value + 219 * qty2.value + 75 * qty3.value).toString(),
					)
				}
			}
		Text(
			text = "Free returns within 30 days · Secure checkout",
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF9CA3AF), textAlign = TextAlign.Center),
		)
	}
}
