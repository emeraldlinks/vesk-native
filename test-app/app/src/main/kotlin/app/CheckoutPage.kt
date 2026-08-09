package app

import androidx.compose.foundation.Image
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
fun CheckoutPage(content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 8.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().padding(top = 16.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFF0FDF4)).padding(24.dp),
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy(12.dp),
		) {
			Row(
				modifier = Modifier.shadow(10.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF22C55E)).width(64.dp).height(64.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.Center,
			) {
				Text(
					text = "✓",
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold),
				)
			}
			Text(
				text = "Order confirmed!",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 20.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp, textAlign = TextAlign.Center),
			)
			Text(
				text = " Thanks for shopping with Nordi. We sent a receipt to you by email and your items will ship within 24 hours. ",
				modifier = Modifier.widthIn(max = 384.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 24.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)).padding(16.dp),
			verticalArrangement = Arrangement.spacedBy(8.dp),
		) {
			Row(
				modifier = Modifier.fillMaxWidth(),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = ("Order number").uppercase(),
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), letterSpacing = 0.4.sp, fontWeight = FontWeight.SemiBold),
				)
				Text(
					text = "#ND-2841-9302",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = ("Estimated delivery").uppercase(),
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), letterSpacing = 0.4.sp, fontWeight = FontWeight.SemiBold),
				)
				Text(
					text = "Thu, Aug 20",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = ("Payment").uppercase(),
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), letterSpacing = 0.4.sp, fontWeight = FontWeight.SemiBold),
				)
				Text(
					text = "Visa •••• 4021",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f)).padding(16.dp),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF4F46E5)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(56.dp).height(56.dp),
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
						text = "M · Pine green · 1 × ${'$'}89",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
					)
				}
				Text(
					text = "${'$'}89",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
				)
			}
			Row(
				modifier = Modifier.veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)).fillMaxWidth().padding(vertical = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Brush.linearGradient(listOf(Color(0xFF34D399), Color(0xFF0D9488)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(56.dp).height(56.dp),
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
						text = "L · Storm gray · 2 × ${'$'}219",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
					)
				}
				Text(
					text = "${'$'}438",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
				)
			}
			Row(
				modifier = Modifier.veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)).fillMaxWidth().padding(vertical = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Brush.linearGradient(listOf(Color(0xFFFBBF24), Color(0xFFEA580C)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(56.dp).height(56.dp),
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
						text = "S · Oat · 1 × ${'$'}75",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
					)
				}
				Text(
					text = "${'$'}75",
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
				)
			}
		}
		@OptIn(ExperimentalLayoutApi::class)
		FlowRow(
			modifier = Modifier.fillMaxWidth(),
			horizontalArrangement = Arrangement.spacedBy(8.dp),
		) {
			NavLink(props = NavLinkProps(href = "/"))
				{
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 20.dp).padding(vertical = 12.dp),
					) {
						Text(
							text = "Continue shopping",
						)
					}
				}
			NavLink(props = NavLinkProps(href = "/shop"))
				{
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 20.dp).padding(vertical = 12.dp),
					) {
						Text(
							text = "Track order",
						)
					}
				}
		}
	}
}
