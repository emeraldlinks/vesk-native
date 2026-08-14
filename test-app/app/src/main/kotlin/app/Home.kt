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


data class HomeProps(
	val promo: String = "",
	val cta: String = "",
)

@Composable
fun Home(props: HomeProps = HomeProps(), content: @Composable () -> Unit = {}) {
	val joined = remember { mutableStateOf(false) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Brush.linearGradient(listOf(Color(0xFF4F46E5), Color(0xFF9333EA), Color(0xFFEC4899)), start = Offset(0f, 0f), end = Offset(1f, 1f))).heightIn(min = 160.dp).padding(28.dp),
		) {
			Text(
				text = ("Winter collection 2026 · " + (props.promo).toString()).uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xE5FFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
			)
			Text(
				text = "Layers for the long cold night",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold),
			)
			Text(
				text = " Heattech knits, insulated shells and merino base layers. Engineered for warmth, tuned for style. ",
				modifier = Modifier.padding(top = 8.dp).widthIn(max = 320.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 24.sp, color = Color(0xFF4B5563)),
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
			) {
				NavLink(props = NavLinkProps(href = "/shop"))
					{
						Column(
							modifier = Modifier.fillMaxWidth().shadow(6.dp).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).padding(horizontal = 20.dp).padding(vertical = 10.dp).align(Alignment.Start),
						) {
							Text(
								text = (props.cta).toString(),
							)
						}
					}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = ("Categories").uppercase(),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.2.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				NavLink(props = NavLinkProps(href = "/shop"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						) {
							Text(
								text = "All outerwear",
							)
						}
					}
				NavLink(props = NavLinkProps(href = "/shop"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						) {
							Text(
								text = "Knitwear",
							)
						}
					}
				NavLink(props = NavLinkProps(href = "/shop"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						) {
							Text(
								text = "Base layers",
							)
						}
					}
				NavLink(props = NavLinkProps(href = "/shop"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						) {
							Text(
								text = "Bags",
							)
						}
					}
				NavLink(props = NavLinkProps(href = "/shop"))
					{
						Column(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						) {
							Text(
								text = "Accessories",
							)
						}
					}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "On home screens",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "bundled images",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.lookbook),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.crew),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.coast),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.hills),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.beach_1),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.beach_2),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.water),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.sunset),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
				Image(
					painter = painterResource(com.vesk.demo3.R.drawable.beach_party),
					contentDescription = null,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(176.dp).height(224.dp),
					contentScale = ContentScale.Crop,
				)
			}
		}
		NavLink(props = NavLinkProps(href = "/media"))
			{
				Row(
					modifier = Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFF111827)).padding(20.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Column {
						Text(
							text = ("Native media lab").uppercase(),
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(color = Color(0xB3FFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
						)
						Text(
							text = "Camera, recorder, pickers & media broadcast",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
						)
					}
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					) {
						Text(
							text = "Open",
						)
					}
				}
			}
		NavLink(props = NavLinkProps(href = "/lab"))
			{
				Row(
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFEEF2FF)).padding(20.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Column {
						Text(
							text = ("Tailwind lab").uppercase(),
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(color = Color(0xFF4F46E5), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
						)
						Text(
							text = "Grid, positioning & utility tests",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(color = Color(0xFF312E81), fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
						)
					}
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					) {
						Text(
							text = "Open",
						)
					}
				}
			}
		NavLink(props = NavLinkProps(href = "/lib"))
			{
				Row(
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFECFDF5)).padding(20.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Column {
						Text(
							text = ("Installed libraries").uppercase(),
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(color = Color(0xFF059669), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
						)
						Text(
							text = "Coil images & charts from .vsklib",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(color = Color(0xFF064E3B), fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
						)
					}
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF059669)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					) {
						Text(
							text = "Open",
						)
					}
				}
			}
		NavLink(props = NavLinkProps(href = "/labs"))
			{
				Row(
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFF0F9FF)).padding(20.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.SpaceBetween,
				) {
					Column {
						Text(
							text = ("Browser APIs lab").uppercase(),
							modifier = Modifier.fillMaxWidth(),
							style = TextStyle(color = Color(0xFF0284C7), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
						)
						Text(
							text = "Storage, auth, fetch & sqlite",
							modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
							style = TextStyle(color = Color(0xFF0C4A6E), fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
						)
					}
					Column(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF0284C7)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					) {
						Text(
							text = "Open",
						)
					}
				}
			}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = "New arrivals",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				NavLink(props = NavLinkProps(href = "/shop", `class` = "text-sm font-semibold text-blue-600"))
					{
						Text(
							text = "See all",
						)
					}
			}
			@OptIn(ExperimentalLayoutApi::class)
			FlowRow(
				modifier = Modifier.fillMaxWidth().offset(x = -8.dp, y = -8.dp),
			) {
				NavLink(props = NavLinkProps(href = "/shop/arctic-hoodie"))
					{
						Column(
							modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(160.dp),
						) {
							Column(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF4F46E5)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
							) {
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = ("New").uppercase(),
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1D4ED8), letterSpacing = 0.2.sp),
								)
								Text(
									text = "Arctic Fleece Hoodie",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
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
							modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(160.dp),
						) {
							Column(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFF34D399), Color(0xFF0D9488)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
							) {
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = ("Best seller").uppercase(),
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF047857), letterSpacing = 0.2.sp),
								)
								Text(
									text = "Snowdrift Parka",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
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
							modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(160.dp),
						) {
							Column(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFBBF24), Color(0xFFEA580C)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
							) {
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = ("Limited").uppercase(),
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFB45309), letterSpacing = 0.2.sp),
								)
								Text(
									text = "Merino Crew",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
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
							modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).width(160.dp),
						) {
							Column(
								modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Color(0xFFFB7185), Color(0xFFDB2777)), start = Offset(0f, 0f), end = Offset(1f, 1f))).aspectRatio(1f),
							) {
							}
							Column(
								modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(vertical = 10.dp),
							) {
								Text(
									text = ("New").uppercase(),
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFBE123C), letterSpacing = 0.2.sp),
								)
								Text(
									text = "Split Shoulder Tee",
									modifier = Modifier.fillMaxWidth(),
									style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
									maxLines = 1,
									overflow = TextOverflow.Ellipsis,
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
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().offset(y = -8.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFF111827)).padding(24.dp),
		) {
			Text(
				text = ("Members only").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xB3FFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
			)
			Text(
				text = "Free express shipping over ${'$'}150",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 20.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
			)
			Text(
				text = "Plus early access to limited drops, repairs and priority support.",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xB3FFFFFF), fontSize = 14.sp, lineHeight = 24.sp),
			)
			Button(
				onClick = jsSafe({ run __veskret0@ { println("Nordi+ membership toggled"); joined.value = !truthy(joined.value) } }),
				modifier = Modifier.padding(top = 16.dp).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).padding(vertical = 10.dp),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 20.dp, vertical = 0.dp),
			) {
			if (truthy(joined.value)) {
				Text(
					text = ("You’re a member ✓").toString(),
				)
			} else {
				Text(
					text = ("Join Nordi+").toString(),
				)
			}
			}
		}
	}
}
