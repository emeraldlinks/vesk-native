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


data class LayoutProps(
	val children: Any? = null,
)

@Composable
fun Layout(props: LayoutProps = LayoutProps(), content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.fillMaxSize(),
	) {
		Column {
			Column {}
		}
		Column(
			modifier = Modifier.fillMaxWidth().fillMaxHeight(),
		) {
			Column(
				modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).veskSideBorder(top = 0.dp, end = 0.dp, bottom = 1.dp, start = 0.dp, MaterialTheme.colorScheme.outlineVariant).padding(horizontal = 16.dp).padding(vertical = 8.dp),
			) {
				Row(
					modifier = Modifier.fillMaxWidth(),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy(12.dp),
				) {
					NavLink(props = NavLinkProps(href = "/"))
						{
							Row(
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.spacedBy(8.dp),
							) {
								Row(
									modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xFF2563EB)).width(24.dp).height(24.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.Center,
								) {
									Text(
										text = "N",
										style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 12.sp, lineHeight = 16.sp),
									)
								}
								Text(
									text = "Nordi",
									style = TextStyle(fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp),
								)
							}
						}
					Column(
						modifier = Modifier.weight(1f),
					) {
					}
					NavLink(props = NavLinkProps(href = "/shop", `class` = "text-sm font-semibold text-gray-600"))
						{
							Text(
								text = "Shop",
							)
						}
					NavLink(props = NavLinkProps(href = "/anim", `class` = "text-sm font-semibold text-gray-600"))
						{
							Text(
								text = "Anim",
							)
						}
					NavLink(props = NavLinkProps(href = "/cart", `class` = "text-lg leading-6"))
						{
							Text(
								text = "🛒",
							)
						}
				}
			}
			Column(
				modifier = Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberRouteScrollState()),
			) {
				Column(
					modifier = Modifier.fillMaxWidth(),
				) {
					content()
				}
				Column(
					modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, MaterialTheme.colorScheme.outlineVariant).padding(horizontal = 16.dp).padding(vertical = 16.dp),
				) {
					Text(
						text = "Nordi Clothing Co — built with vesk-native",
						modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
						style = TextStyle(textAlign = TextAlign.Center, color = Color(0xFF6B7280), fontSize = 12.sp),
					)
				}
			}
		}
	}
}
