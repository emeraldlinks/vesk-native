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
fun SplitTee(content: @Composable () -> Unit = {}) {
	val qty = remember { mutableStateOf(1) }
	val added = remember { mutableStateOf(false) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 8.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Row(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFB7185), Color(0xFFDB2777)), start = Offset(0f, 0f), end = Offset(1f, 1f))).height(288.dp),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.Center,
		) {
			Text(
				text = "Heavyweight 220gsm",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33FFFFFF)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
			)
		}
		Text(
			text = "Split Shoulder Tee",
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
				text = "4.6 (88 reviews)",
				style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
		}
		Row(
			modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
			verticalAlignment = Alignment.Bottom,
			horizontalArrangement = Arrangement.spacedBy(8.dp),
		) {
			Text(
				text = "${'$'}42",
				style = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
			)
			Text(
				text = "${'$'}55",
				modifier = Modifier.padding(bottom = 4.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
			)
		}
		Text(
			text = " Heavyweight organic cotton with a split shoulder seam and dropped hem. Pre-shrunk, garment-dyed and built to last. ",
			modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
			style = TextStyle(fontSize = 14.sp, lineHeight = 24.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
		)
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
					onClick = { run __veskret0@ { if (truthy(num(qty.value) > num(1))) qty.value = qty.value + -1 } },
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
					onClick = { qty.value = qty.value + 1 },
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
				onClick = { added.value = !truthy(added.value) },
				modifier = Modifier.shadow(1.dp).clip(RoundedCornerShape(9999.dp)).background(Color(0xFFE11D48)).weight(1f).padding(vertical = 14.dp),
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
					text = ("Add to cart · ${'$'}" + (42 * qty.value)).toString(),
				)
			}
			}
		}
	}
}
