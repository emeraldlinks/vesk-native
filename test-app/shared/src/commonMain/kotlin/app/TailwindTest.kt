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


@Composable
fun TailwindTest(content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
		verticalArrangement = Arrangement.spacedBy(8.dp),
	) {
		Text(
			text = "Tailwind Utility Test",
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold),
		)
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Flex Basis").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFC4B5FD)).padding(8.dp),
				) {
					Text(
						text = "basis 33%",
					)
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFA7F3D0)).padding(8.dp),
				) {
					Text(
						text = "basis 66%",
					)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Flex 0 / None / Shrink-0").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFDBEAFE)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "default",
					)
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFBFDBFE)).weight(1f).padding(horizontal = 8.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "flex-1 grows",
					)
				}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFFEF08A)).padding(4.dp),
				) {
					Text(
						text = "shrink-0",
					)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Viewport Units").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFD1FAE5)).fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 8.dp),
			) {
				Text(
					text = "w-svw = full width",
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)).background(Color(0xFFA7F3D0)).height(32.dp).padding(horizontal = 12.dp).padding(vertical = 8.dp),
			) {
				Text(
					text = "h-8 fixed",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Size Viewport Keyword").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFFEF3C7)).fillMaxWidth().fillMaxHeight().padding(horizontal = 12.dp).padding(vertical = 8.dp),
			) {
				Text(
					text = "size-svw",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Min/Max Width and Height").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Row(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color(0xFFDBEAFE)).background(Color(0xFFBFDBFE)).widthIn(max = 200.dp).heightIn(max = 60.dp).widthIn(min = 80.dp).heightIn(min = 30.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.Center,
			) {
				Text(
					text = " min-w:80 max-w:200 min-h:30 max-h:60 ",
				)
			}
		}
		Box(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Z-Index").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Box(
				modifier = Modifier.fillMaxWidth(),
			) {
				Column(
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)).background(Color(0xFFEF4444)).padding(4.dp).zIndex(50f),
				) {
					Text(
						text = "z-50 on top",
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth().padding(top = 4.dp).clip(RoundedCornerShape(4.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.11f)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
				) {
					Text(
						text = "behind",
					)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Overflow / Text-Overflow / White-Space").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(0.dp)).fillMaxWidth(),
			) {
				Text(
					text = "This is a very long text that should be truncated with ellipsis because it exceeds the available width and white-space is nowrap",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Letter Spacing").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Text(
				text = "spaced out letters",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
			)
			Text(
				text = "tight letters",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Text Transform from CSS").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Text(
				text = "uppercase via css",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
			)
			Text(
				text = "LOWCASE VIA CSS",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
			)
			Text(
				text = "capitalize via css",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Visibility Hidden").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Text(
				text = "visible above",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
			)
			Text(
				text = "this is hidden",
				modifier = Modifier.fillMaxWidth().alpha(0.000f),
				style = TextStyle(fontSize = 12.sp),
			)
			Text(
				text = "visible below",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Border Per-Side from CSS").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth().border(2.dp, Color(0x1F000000)).padding(top = 8.dp),
			) {
				Text(
					text = "border-top: 2px indigo",
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp).border(3.dp, Color(0x1F000000)).padding(start = 8.dp),
			) {
				Text(
					text = "border-left: 3px pink",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Grid grid-cols-3").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth(),
				verticalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Row(
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDDD6FE)).padding(8.dp),
					) {
						Text(
							text = "A",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDDD6FE)).padding(8.dp),
					) {
						Text(
							text = "B",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFDDD6FE)).padding(8.dp),
					) {
						Text(
							text = "C",
						)
					}
				}
				Row(
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFC4B5FD)).padding(8.dp),
					) {
						Text(
							text = "D",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFC4B5FD)).padding(8.dp),
					) {
						Text(
							text = "E",
						)
					}
					Column(
						modifier = Modifier.weight(1f).clip(RoundedCornerShape(4.dp)).background(Color(0xFFC4B5FD)).padding(8.dp),
					) {
						Text(
							text = "F",
						)
					}
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Not-Italic").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Text(
				text = "italic text",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontStyle = FontStyle.Italic),
			)
			Text(
				text = "italic + not-italic = normal",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontStyle = FontStyle.Normal),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Border Radius from CSS").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "border-radius: 20px",
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "border-radius: 4px",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Box Shadow from CSS").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "shadow from CSS",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Opacity from CSS").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "opacity: 0.3",
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "opacity: 1",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Margin from CSS").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "margin: 16px",
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFFAFAFA)).padding(12.dp),
		) {
			Text(
				text = ("Width/Height from CSS").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF6366F1)),
			)
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "150x40",
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth(),
			) {
				Text(
					text = "100% width x 30px",
				)
			}
		}
		Text(
			text = "all utilities compiled at build time",
			modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
			style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
		)
	}
}
