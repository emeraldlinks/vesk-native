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
fun Lab(content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.fillMaxWidth().padding(16.dp),
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFFA855F7), Color(0xFFEC4899)))).padding(24.dp),
		) {
			Text(
				text = "Gradient card",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold),
			)
		}
		Row(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFF3F4F6)).padding(16.dp),
			horizontalArrangement = Arrangement.spacedBy(16.dp),
		) {
			Column(
				modifier = Modifier.weight(1f).padding(8.dp),
			) {
				Text(
					text = "A",
				)
			}
			Column(
				modifier = Modifier.veskSideBorder(top = 0.dp, end = 0.dp, bottom = 0.dp, start = 1.dp, Color(0xFFD1D5DB)).weight(1f).padding(8.dp),
			) {
				Text(
					text = "B",
				)
			}
			Column(
				modifier = Modifier.veskSideBorder(top = 0.dp, end = 0.dp, bottom = 0.dp, start = 1.dp, Color(0xFFD1D5DB)).weight(1f).padding(8.dp),
			) {
				Text(
					text = "C",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color(0xFFFFFFFF)).veskSideBorder(top = 2.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, Color(0xFFE5E7EB)).padding(16.dp),
		) {
			Text(
				text = "Top border only",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
			)
		}
		Row(
			modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFFFFFF)).border(2.dp, Color(0xFF3B82F6)).width(80.dp).height(80.dp).padding(12.dp),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.Center,
		) {
			Text(
				text = "ring",
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB)),
			)
		}
		Row(
			modifier = Modifier.fillMaxWidth(),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.SpaceBetween,
		) {
			Column(
				modifier = Modifier.rotate(45f).clip(RoundedCornerShape(8.dp)).background(Color(0xFF22C55E)).padding(16.dp),
			) {
				Text(
					text = "rot",
				)
			}
			Column(
				modifier = Modifier.scale(1.25f).clip(RoundedCornerShape(8.dp)).background(Color(0xFFF97316)).padding(16.dp),
			) {
				Text(
					text = "big",
				)
			}
			Column(
				modifier = Modifier.offset(x = 16.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFA855F7)).padding(16.dp),
			) {
				Text(
					text = "x4",
				)
			}
			Column(
				modifier = Modifier.veskSkew(kotlin.math.tan(kotlin.math.PI / 180 * 6).toFloat(), 0f).clip(RoundedCornerShape(8.dp)).background(Color(0xFFEF4444)).padding(16.dp),
			) {
				Text(
					text = "skew",
				)
			}
		}
		Column(
			modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFFA5F3FC)).fillMaxWidth().aspectRatio(16f / 9f),
		) {
		}
		Text(
			text = " This is a very long paragraph that should be clamped to two lines with an ellipsis. It keeps going and going and going and going and going and going and going and going and going. ",
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF374151)),
			maxLines = 2,
			overflow = TextOverflow.Ellipsis,
		)
		Column(
			modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).clip(RoundedCornerShape(8.dp)).background(Color(0xFFF9FAFB)).height(96.dp).padding(12.dp),
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
			modifier = Modifier.fillMaxWidth().shadow(20.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFFFFFFF)).padding(16.dp),
		) {
			Text(
				text = "Shadow card",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "Box shadows map to elevation.",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFF4B5563), fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().alpha(0.000f).clip(RoundedCornerShape(8.dp)).background(Color(0x7F000000)).padding(16.dp),
		) {
			Text(
				text = "Hidden with invisible",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFFFFFFFF)),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color(0xFFFFFFFF)).padding(16.dp),
		) {
			Text(
				text = "Wrap + case + neg margin",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			@OptIn(ExperimentalLayoutApi::class)
			FlowRow(
				modifier = Modifier.fillMaxWidth(),
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
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 12.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "four",
					)
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 12.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "five",
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
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF4B5563)),
			)
			Text(
				text = ("capital me").replaceFirstChar { it.uppercase() },
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFF4B5563)),
			)
		}
		Row(
			modifier = Modifier.fillMaxWidth(),
		) {
			Column(
				modifier = Modifier.weight(1f).padding(8.dp),
			) {
				Text(
					text = "D",
				)
			}
			Column(
				modifier = Modifier.veskDivideLine(horizontal = false, width = 1.dp, color = Color(0xFFCBD5E1), dashes = floatArrayOf(12f, 12f)).weight(1f).padding(8.dp),
			) {
				Text(
					text = "E",
				)
			}
			Column(
				modifier = Modifier.veskDivideLine(horizontal = false, width = 1.dp, color = Color(0xFFCBD5E1), dashes = floatArrayOf(12f, 12f)).weight(1f).padding(8.dp),
			) {
				Text(
					text = "F",
				)
			}
		}
	}
}
