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

import app.FlightRoute
import app.SaveButton
import app.StatusBadge


data class FlightCardProps(
	val flight: Any? = null,
)

@Composable
fun FlightCard(props: FlightCardProps = FlightCardProps(), content: @Composable () -> Unit = {}) {
	val f = props.flight;
	NavLink(props = NavLinkProps(href = "/flight/${jsIndex(f, "id")}", modifier = Modifier.fillMaxWidth()))
		{
			Column(
			) {
				Column(
					modifier = Modifier.fillMaxWidth().shadow(10.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFF141B26)).padding(horizontal = 16.dp).padding(vertical = 14.dp),
					verticalArrangement = Arrangement.spacedBy(10.dp),
				) {
					Row(
						modifier = Modifier.fillMaxWidth(),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(8.dp),
						) {
							Text(
								text = (jsIndex(f, "flightNumber")).toString(),
								style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 24.sp, letterSpacing = -0.2.sp),
							)
							Text(
								text = (jsIndex(f, "secondary")).toString() + " · " + (jsIndex(f, "aircraft")).toString(),
								style = TextStyle(fontSize = 11.sp, color = Color(0xFF94A3B8)),
							)
						}
						SaveButton(props = SaveButtonProps(flightId = "${jsIndex(f, "id")}"))
					}
					Row(
						modifier = Modifier.fillMaxWidth(),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.spacedBy(12.dp),
					) {
						Row(
							modifier = Modifier.weight(1f),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(8.dp),
						) {
							Text(
								text = (jsIndex(jsIndex(f, "from"), "code")).toString(),
								modifier = Modifier.width(36.dp),
								style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 28.sp, letterSpacing = -0.2.sp),
							)
							FlightRoute(props = FlightRouteProps(progress = jsIndex(f, "progress")))
							Text(
								text = (jsIndex(jsIndex(f, "to"), "code")).toString(),
								modifier = Modifier.width(36.dp),
								style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 28.sp, letterSpacing = -0.2.sp, textAlign = TextAlign.End),
							)
						}
						StatusBadge(props = StatusBadgeProps(status = "${jsIndex(f, "status")}"))
					}
					Row(
						modifier = Modifier.fillMaxWidth(),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Text(
							text = (jsIndex(jsIndex(f, "from"), "city")).toString() + " → " + (jsIndex(jsIndex(f, "to"), "city")).toString(),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF94A3B8)),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = (jsIndex(f, "scheduledDeparture")).toString(),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF94A3B8)),
						)
					}
				}
			}
		}
}
