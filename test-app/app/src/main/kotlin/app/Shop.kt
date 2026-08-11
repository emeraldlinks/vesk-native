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
fun Shop(content: @Composable () -> Unit = {}) {
	val filter = remember { mutableStateOf("All") }
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 8.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Text(
				text = "Outerwear & layers",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp),
			)
			Column(modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
				if (truthy(filter.value == "All")) {
					Text(
						text = ("6 products, sorted by \"recommended\"").toString(),
					)
				} else {
					Text(
						text = (if (truthy(filter.value == "Parkas")) "1 product — Parkas" else if (truthy(filter.value == "Hoodies")) "1 product — Hoodies" else if (truthy(filter.value == "Shells")) "1 product — Shells" else if (truthy(filter.value == "Base layers")) "2 products — Base layers" else "2 products — Accessories").toString(),
					)
				}
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp).horizontalScroll(rememberScrollState()),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = { filter.value = "All" },
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(filter.value == "All")) {
					Text(
						text = "All",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
					)
				} else {
					Text(
						text = "All",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
					)
				}
				}
				Button(
					onClick = { filter.value = "Parkas" },
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(filter.value == "Parkas")) {
					Text(
						text = "Parkas",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
					)
				} else {
					Text(
						text = "Parkas",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
					)
				}
				}
				Button(
					onClick = { filter.value = "Hoodies" },
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(filter.value == "Hoodies")) {
					Text(
						text = "Hoodies",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
					)
				} else {
					Text(
						text = "Hoodies",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
					)
				}
				}
				Button(
					onClick = { filter.value = "Shells" },
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(filter.value == "Shells")) {
					Text(
						text = "Shells",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
					)
				} else {
					Text(
						text = "Shells",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
					)
				}
				}
				Button(
					onClick = { filter.value = "Base layers" },
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(filter.value == "Base layers")) {
					Text(
						text = "Base layers",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
					)
				} else {
					Text(
						text = "Base layers",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
					)
				}
				}
				Button(
					onClick = { filter.value = "Accessories" },
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				) {
				if (truthy(filter.value == "Accessories")) {
					Text(
						text = "Accessories",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
					)
				} else {
					Text(
						text = "Accessories",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 6.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
					)
				}
				}
			}
		}
		@OptIn(ExperimentalLayoutApi::class)
		FlowRow(
			modifier = Modifier.fillMaxWidth(),
			horizontalArrangement = Arrangement.spacedBy(12.dp),
		) {
			if (truthy(filter.value == "Hoodies")) {
				NavLink(props = NavLinkProps(href = "/shop/arctic-hoodie"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF4F46E5)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "-26%",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x66000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Arctic Fleece Hoodie",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.5 ★ (212)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}89",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}120",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
			} else {
			}
			if (truthy(filter.value == "Parkas")) {
				NavLink(props = NavLinkProps(href = "/shop/snow-parka"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF34D399), Color(0xFF0D9488)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "-16%",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Snowdrift Parka",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.8 ★ (96)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}219",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}260",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
			} else {
			}
			if (truthy(filter.value == "Base layers")) {
				NavLink(props = NavLinkProps(href = "/shop/merino-crew"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFBBF24), Color(0xFFEA580C)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "New",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Merino Crew",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.6 · (340)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}75",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}95",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
				NavLink(props = NavLinkProps(href = "/shop/splitshirt-tee"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFB7185), Color(0xFFDB2777)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "-24%",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Split Shoulder Tee",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.6 ★ (88)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}42",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}55",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
			} else {
			}
			if (truthy(filter.value == "Shells")) {
				Column(
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
				) {
					Row(
						modifier = Modifier.fillMaxWidth().veskGrayscale(1f).clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF64748B), Color(0xFF1E293B)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "Sold out",
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
							style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
						)
					}
					Column(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
					) {
						Text(
							text = "Alpine Hardshell",
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = "Ships in 2 weeks",
							modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
						)
						Text(
							text = "${'$'}189",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
			} else {
			}
			if (truthy(filter.value == "Accessories")) {
				NavLink(props = NavLinkProps(href = "/shop/yellowstone-beanie"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFACC15), Color(0xFFD97706)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "New",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Yellowstone Beanie",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.9 ★ (57)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Text(
									text = "${'$'}28",
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
								)
							}
						}
					}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
				) {
					Row(
						modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFA78BFA), Color(0xFF9333EA)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "-20%",
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
							style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
						)
					}
					Column(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
					) {
						Text(
							text = "Weekend Tote",
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = "4.5 ★ (41)",
							modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
						)
						Row(
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.SpaceBetween,
						) {
							Text(
								text = "${'$'}64",
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
							)
							Text(
								text = "${'$'}80",
								style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
							)
						}
					}
				}
			} else {
			}
			if (truthy(filter.value == "All")) {
				NavLink(props = NavLinkProps(href = "/shop/arctic-hoodie"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF4F46E5)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "-26%",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x66000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Arctic Fleece Hoodie",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.5 ★ (212)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}89",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}120",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
				NavLink(props = NavLinkProps(href = "/shop/snow-parka"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF34D399), Color(0xFF0D9488)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "-16%",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Snowdrift Parka",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.8 ★ (96)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}219",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}260",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
				NavLink(props = NavLinkProps(href = "/shop/merino-crew"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFBBF24), Color(0xFFEA580C)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "New",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Merino Crew",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.6 · (340)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}75",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}95",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
				) {
					Row(
						modifier = Modifier.fillMaxWidth().veskGrayscale(1f).clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF64748B), Color(0xFF1E293B)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "Sold out",
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
							style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
						)
					}
					Column(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
					) {
						Text(
							text = "Alpine Hardshell",
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = "Ships in 2 weeks",
							modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
						)
						Text(
							text = "${'$'}189",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
						)
					}
				}
				NavLink(props = NavLinkProps(href = "/shop/splitshirt-tee"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFB7185), Color(0xFFDB2777)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "-24%",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Split Shoulder Tee",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.6 ★ (88)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Row(
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									verticalAlignment = Alignment.CenterVertically,
									horizontalArrangement = Arrangement.SpaceBetween,
								) {
									Text(
										text = "${'$'}42",
										style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
									)
									Text(
										text = "${'$'}55",
										style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
									)
								}
							}
						}
					}
				NavLink(props = NavLinkProps(href = "/shop/yellowstone-beanie"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
						) {
							Row(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFACC15), Color(0xFFD97706)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
								verticalAlignment = Alignment.CenterVertically,
								horizontalArrangement = Arrangement.Center,
							) {
								Text(
									text = "New",
									modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
									style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
								)
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = "Yellowstone Beanie",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
								)
								Text(
									text = "4.9 ★ (57)",
									modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
								)
								Text(
									text = "${'$'}28",
									modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
								)
							}
						}
					}
				Column(
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(176.dp),
				) {
					Row(
						modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFA78BFA), Color(0xFF9333EA)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.Center,
					) {
						Text(
							text = "-20%",
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x33000000)).padding(horizontal = 8.dp).padding(vertical = 4.dp),
							style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
						)
					}
					Column(
						modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
					) {
						Text(
							text = "Weekend Tote",
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
							maxLines = 1,
							overflow = TextOverflow.Ellipsis,
						)
						Text(
							text = "4.5 ★ (41)",
							modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
							style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
						)
						Row(
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.SpaceBetween,
						) {
							Text(
								text = "${'$'}64",
								style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
							)
							Text(
								text = "${'$'}80",
								style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f), textDecoration = TextDecoration.LineThrough),
							)
						}
					}
				}
			} else {
			}
		}
	}
}
