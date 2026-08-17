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
fun Refresh(content: @Composable () -> Unit = {}) {
	val refreshing = remember { mutableStateOf(false) }
	val stamp = remember { mutableStateOf("never") }
	val count = remember { mutableStateOf(0) }
	PullToRefresh(props = PullToRefreshProps(refreshing = refreshing.value, onRefresh = jsSafe({ run __veskret0@ { refreshing.value = true; VeskTimers.setTimeout( { run __veskret1@ { refreshing.value = false; count.value = num(count.value + 1).toInt(); stamp.value = jsString(((java.util.Date() as java.util.Date).toInstant().toString())) } }, 1500) } }), modifier = Modifier.fillMaxWidth()))
		{
			Column(
				modifier = Modifier.fillMaxWidth().height(384.dp).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				verticalArrangement = Arrangement.spacedBy(16.dp),
			) {
				Column(
					modifier = Modifier.fillMaxWidth(),
					verticalArrangement = Arrangement.spacedBy(4.dp),
				) {
					Text(
						text = "Pull to refresh",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp),
					)
					Text(
						text = "Pull down to sync the feed — refreshes: " + (count.value).toString() + " · last sync " + (stamp.value).toString(),
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp),
					)
				}
				Column(
					modifier = Modifier.fillMaxWidth(),
					verticalArrangement = Arrangement.spacedBy(12.dp),
				) {
					Row(
						modifier = Modifier.fillMaxWidth().shadow(1.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
						verticalAlignment = Alignment.Top,
						horizontalArrangement = Arrangement.spacedBy(12.dp),
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF4F46E5)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(40.dp).height(40.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Text(
								text = "AK",
								style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
							)
						}
						Column(
							modifier = Modifier.weight(1f),
							verticalArrangement = Arrangement.spacedBy(2.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth(),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.spacedBy(8.dp),
							) {
								Text(
									text = "Ava Kim",
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
								)
								Text(
									text = "2m",
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
							}
							Text(
								text = "First light over the ridge this morning — worth the 4am alarm.",
								modifier = Modifier.fillMaxWidth(),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
							)
						}
					}
					Row(
						modifier = Modifier.fillMaxWidth().shadow(1.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
						verticalAlignment = Alignment.Top,
						horizontalArrangement = Arrangement.spacedBy(12.dp),
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Brush.linearGradient(listOf(Color(0xFF34D399), Color(0xFF0D9488)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(40.dp).height(40.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Text(
								text = "NM",
								style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
							)
						}
						Column(
							modifier = Modifier.weight(1f),
							verticalArrangement = Arrangement.spacedBy(2.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth(),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.spacedBy(8.dp),
							) {
								Text(
									text = "Noah Mercer",
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
								)
								Text(
									text = "14m",
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
							}
							Text(
								text = "Release notes for the trail app are out — swipeable cards land in this build.",
								modifier = Modifier.fillMaxWidth(),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
							)
						}
					}
					Row(
						modifier = Modifier.fillMaxWidth().shadow(1.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
						verticalAlignment = Alignment.Top,
						horizontalArrangement = Arrangement.spacedBy(12.dp),
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Brush.linearGradient(listOf(Color(0xFFFBBF24), Color(0xFFEA580C)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(40.dp).height(40.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Text(
								text = "IR",
								style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
							)
						}
						Column(
							modifier = Modifier.weight(1f),
							verticalArrangement = Arrangement.spacedBy(2.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth(),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.spacedBy(8.dp),
							) {
								Text(
									text = "Ines Ríos",
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
								)
								Text(
									text = "1h",
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
							}
							Text(
								text = "Coffee weather finally. Pull this page down when you want a fresh timestamp.",
								modifier = Modifier.fillMaxWidth(),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
							)
						}
					}
					Row(
						modifier = Modifier.fillMaxWidth().shadow(1.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
						verticalAlignment = Alignment.Top,
						horizontalArrangement = Arrangement.spacedBy(12.dp),
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Brush.linearGradient(listOf(Color(0xFFF472B6), Color(0xFFE11D48)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(40.dp).height(40.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Text(
								text = "JW",
								style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
							)
						}
						Column(
							modifier = Modifier.weight(1f),
							verticalArrangement = Arrangement.spacedBy(2.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth(),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.spacedBy(8.dp),
							) {
								Text(
									text = "Jordan Wells",
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
								)
								Text(
									text = "3h",
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
							}
							Text(
								text = "Native pull-to-refresh: Material3 PullToRefreshBox under the hood — the spinner is the indicator.",
								modifier = Modifier.fillMaxWidth(),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
							)
						}
					}
					Row(
						modifier = Modifier.fillMaxWidth().shadow(1.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
						verticalAlignment = Alignment.Top,
						horizontalArrangement = Arrangement.spacedBy(12.dp),
					) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Brush.linearGradient(listOf(Color(0xFFA78BFA), Color(0xFF9333EA)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(40.dp).height(40.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Text(
								text = "SC",
								style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
							)
						}
						Column(
							modifier = Modifier.weight(1f),
							verticalArrangement = Arrangement.spacedBy(2.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth(),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.spacedBy(8.dp),
							) {
								Text(
									text = "Sage Chen",
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
								)
								Text(
									text = "5h",
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
							}
							Text(
								text = "Every refresh increments the counter and stamps the sync time — watch it tick.",
								modifier = Modifier.fillMaxWidth(),
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
							)
						}
					}
				}
			}
		}
}
