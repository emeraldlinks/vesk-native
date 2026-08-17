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

import androidx.compose.material3.Icon
import app.FlightRoute
import app.NotifyButton
import app.SaveButton
import app.StatusBadge
import app.data_flights_flightById as flightById
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.MapPin


data class FlightDetailsProps(
	val flightId: String = "",
)

@Composable
fun FlightDetails(props: FlightDetailsProps = FlightDetailsProps(), content: @Composable () -> Unit = {}) {
	val flight = flightById(props.flightId);
	Column(
		modifier = Modifier.background(Color(0xFF0A0F16)).fillMaxWidth().fillMaxHeight(),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState()),
			verticalArrangement = Arrangement.spacedBy(16.dp),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 16.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				NavLink(props = NavLinkProps(href = "/", modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF141B26)).width(40.dp).height(40.dp)))
					{
						Row(
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.ArrowLeft,
								contentDescription = "Back",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFFFFFFFF),
							)
						}
					}
				Column(
					modifier = Modifier.weight(1f),
					verticalArrangement = Arrangement.spacedBy(2.dp),
				) {
					Text(
						text = (jsIndex(flight, "flightNumber")).toString(),
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 20.sp, letterSpacing = -0.2.sp),
					)
					Text(
						text = (jsIndex(jsIndex(flight, "from"), "city")).toString() + (jsIndex(jsIndex(flight, "from"), "code")).toString() + " → " + (jsIndex(jsIndex(flight, "to"), "city")).toString() + (jsIndex(jsIndex(flight, "to"), "code")).toString(),
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF94A3B8)),
					)
				}
				StatusBadge(props = StatusBadgeProps(status = "${jsIndex(flight, "status")}"))
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).clip(RoundedCornerShape(24.dp)).clip(RoundedCornerShape(0.dp)).background(Color(0xFF0B1017)).height(208.dp),
			) {
				Column(
					modifier = Modifier.fillMaxWidth().weight(1f).padding(horizontal = 28.dp),
					verticalArrangement = Arrangement.spacedBy(12.dp),
				) {
					Row(
						modifier = Modifier.fillMaxWidth(),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.spacedBy(8.dp),
					) {
						Text(
							text = (jsIndex(jsIndex(flight, "from"), "code")).toString(),
							modifier = Modifier.width(40.dp),
							style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 28.sp, letterSpacing = -0.2.sp),
						)
						Row(
							modifier = Modifier.weight(1f).height(20.dp),
							verticalAlignment = Alignment.CenterVertically,
						) {
							FlightRoute(props = FlightRouteProps(progress = jsIndex(flight, "progress")))
						}
						Text(
							text = (jsIndex(jsIndex(flight, "to"), "code")).toString(),
							modifier = Modifier.width(40.dp),
							style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 28.sp, letterSpacing = -0.2.sp, textAlign = TextAlign.End),
						)
					}
					Row(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.SpaceBetween,
					) {
						Row(
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(6.dp),
						) {
							Icon(
								imageVector = Lucide.MapPin,
								contentDescription = "Departure airport",
								modifier = Modifier.width(14.dp).height(14.dp),
								tint = Color(0xFF64748B),
							)
							Text(
								text = (jsIndex(jsIndex(flight, "from"), "city")).toString() + " · " + (jsIndex(jsIndex(flight, "from"), "timezone")).toString(),
								style = TextStyle(fontSize = 11.sp, color = Color(0xFF64748B)),
							)
						}
						Row(
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(6.dp),
						) {
							Icon(
								imageVector = Lucide.MapPin,
								contentDescription = "Arrival airport",
								modifier = Modifier.width(14.dp).height(14.dp),
								tint = Color(0xFF64748B),
							)
							Text(
								text = (jsIndex(jsIndex(flight, "to"), "city")).toString() + " · " + (jsIndex(jsIndex(flight, "to"), "timezone")).toString(),
								style = TextStyle(fontSize = 11.sp, color = Color(0xFF64748B)),
							)
						}
					}
				}
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFF141B26)).padding(horizontal = 16.dp).padding(vertical = 16.dp),
				verticalArrangement = Arrangement.spacedBy(16.dp),
			) {
				Row(
					modifier = Modifier.fillMaxWidth(),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Column(
						verticalArrangement = Arrangement.spacedBy(2.dp),
					) {
						Text(
							text = ("Departure").uppercase(),
							style = TextStyle(fontSize = 11.sp, letterSpacing = 0.4.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium),
						)
						Text(
							text = (jsIndex(jsIndex(flight, "from"), "code")).toString(),
							style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 24.sp),
						)
						Text(
							text = (jsIndex(jsIndex(flight, "from"), "city")).toString() + ", " + (jsIndex(jsIndex(flight, "from"), "country")).toString(),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF94A3B8)),
						)
						Text(
							text = (jsIndex(jsIndex(flight, "from"), "timezone")).toString(),
							style = TextStyle(fontSize = 11.sp, color = Color(0xFF64748B)),
						)
					}
					Column(
						modifier = Modifier.background(Color(0xFF1B2432)).width(1.dp).height(80.dp),
					) {
					}
					Column(
						horizontalAlignment = Alignment.End,
						verticalArrangement = Arrangement.spacedBy(2.dp),
					) {
						Text(
							text = ("Arrival").uppercase(),
							style = TextStyle(fontSize = 11.sp, letterSpacing = 0.4.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium),
						)
						Text(
							text = (jsIndex(jsIndex(flight, "to"), "code")).toString(),
							style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 24.sp),
						)
						Text(
							text = (jsIndex(jsIndex(flight, "to"), "city")).toString() + ", " + (jsIndex(jsIndex(flight, "to"), "country")).toString(),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF94A3B8), textAlign = TextAlign.End),
						)
						Text(
							text = (jsIndex(jsIndex(flight, "to"), "timezone")).toString(),
							style = TextStyle(fontSize = 11.sp, color = Color(0xFF64748B)),
						)
					}
				}
				Column(
					modifier = Modifier.fillMaxWidth().background(Color(0xFF1B2432)).height(1.dp),
				) {
				}
				Row(
					modifier = Modifier.fillMaxWidth(),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Column(
						verticalArrangement = Arrangement.spacedBy(2.dp),
					) {
						Text(
							text = ("Scheduled").uppercase(),
							style = TextStyle(fontSize = 11.sp, letterSpacing = 0.4.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium),
						)
						Text(
							text = (jsIndex(flight, "scheduledDeparture")).toString(),
							style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp),
						)
					}
					Column(
						horizontalAlignment = Alignment.End,
						verticalArrangement = Arrangement.spacedBy(2.dp),
					) {
						Text(
							text = ("Scheduled").uppercase(),
							style = TextStyle(fontSize = 11.sp, letterSpacing = 0.4.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium),
						)
						Text(
							text = (jsIndex(flight, "scheduledArrival")).toString(),
							style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp),
						)
					}
				}
				Row(
					modifier = Modifier.fillMaxWidth(),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Column(
						verticalArrangement = Arrangement.spacedBy(2.dp),
					) {
						Text(
							text = ("Actual").uppercase(),
							style = TextStyle(fontSize = 11.sp, letterSpacing = 0.4.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium),
						)
						Text(
							text = (jsIndex(flight, "actualDeparture")).toString(),
							style = TextStyle(color = Color(0xFFCBD5E1), fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp),
						)
					}
					Column(
						horizontalAlignment = Alignment.End,
						verticalArrangement = Arrangement.spacedBy(2.dp),
					) {
						Row(
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.spacedBy(6.dp),
						) {
							Text(
								text = "",
								modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF22D3EE)).width(6.dp).height(6.dp),
							)
							Text(
								text = ("Estimated").uppercase(),
								style = TextStyle(fontSize = 11.sp, letterSpacing = 0.4.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium),
							)
						}
						Text(
							text = (jsIndex(flight, "estimatedArrival")).toString(),
							style = TextStyle(color = Color(0xFF67E8F9), fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp),
						)
					}
				}
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFF141B26)).padding(horizontal = 16.dp).padding(vertical = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Column(
					verticalArrangement = Arrangement.spacedBy(2.dp),
				) {
					Text(
						text = ("Aircraft").uppercase(),
						style = TextStyle(fontSize = 11.sp, letterSpacing = 0.4.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium),
					)
					Text(
						text = (jsIndex(flight, "airline")).toString() + " · " + (jsIndex(flight, "aircraft")).toString(),
						style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
					)
				}
				SaveButton(props = SaveButtonProps(flightId = props.flightId))
			}
			NotifyButton(props = NotifyButtonProps(flight = flight))
		}
	}
}
