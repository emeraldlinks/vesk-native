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

import app.media_page_pageProps as pageProps


val media_page_pageProps = mutableMapOf<String, Any?>("heading" to "Native media lab", "blurb" to "camera, recorder, pickers & media broadcast");

data class MediaProps(
	val heading: Any? = null,
	val blurb: Any? = null,
)

@Composable
fun Media(props: MediaProps = MediaProps(), content: @Composable () -> Unit = {}) {
	val device = rememberDeviceApi();
	val cbPhoto = remember { mutableStateOf<String?>(null) }
		val cbPhotoCell = cbPhoto
	val cbRecording = remember { mutableStateOf<String?>(null) }
	val cbVideo = remember { mutableStateOf<String?>(null) }
	val cbFile = remember { mutableStateOf<String?>(null) }
	val batteryInfo = remember { mutableStateOf("tap for battery") }
	val networkInfo = remember { mutableStateOf("tap for network") }
	val locInfo = remember { mutableStateOf("tap for location") }
	val firstApp = remember { mutableStateOf("no app fetched") }
	val recentContact = remember { mutableStateOf("no contact fetched") }
	val callRow = remember { mutableStateOf("no call fetched") }
	val msgRow = remember { mutableStateOf("no message fetched") }
	val acctRow = remember { mutableStateOf("no account fetched") }
	val clipTxt = remember { mutableStateOf("tap to read clipboard") }
	val bioInfo = remember { mutableStateOf("not checked") }
	val btInfo = remember { mutableStateOf("not scanned") }
	val qrText = remember { mutableStateOf("") }
	val screenRecPath = remember { mutableStateOf("none yet") }
	val sysInfo = remember { mutableStateOf("tap for device info") }
	val storageTxt = remember { mutableStateOf("tap for storage") }
	val sensorVal = remember { mutableStateOf("tap to read sensor") }
	val calTxt = remember { mutableStateOf("tap for calendar") }
	val fileTxt = remember { mutableStateOf("tap to scan app files") }
	val dropText = remember { mutableStateOf<String?>(null) }
	val ttsDone = remember { mutableStateOf(false) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = (props.heading).toString(),
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = (props.blurb).toString(),
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth(),
				verticalArrangement = Arrangement.spacedBy(16.dp),
			) {
				veskVideo(
					url = veskBundledMediaUrl("demo_1"),
					controls = true,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).fillMaxWidth().aspectRatio(16f / 9f),
				)
				veskVideo(
					url = veskBundledMediaUrl("demo_1"),
					loop = true,
					muted = true,
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).fillMaxWidth().height(160.dp),
				)
				veskAudio(
					url = veskBundledMediaUrl("last_train"),
					controls = true,
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 8.dp),
				)
				veskAudio(
					url = "/storage/emulated/0/vesk_media/Last Train Home.mp3",
					controls = true,
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 8.dp),
				)
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
					text = "Photo picker",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "system photo picker",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Button(
				onClick = jsSafe({ run __veskret0@ { device.pickImage() } }),
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = " Pick a photo ",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
			)
			}
			Image(
				bitmap = veskFileImage(device.lastImage),
				contentDescription = null,
				modifier = Modifier.padding(top = 12.dp).clip(RoundedCornerShape(16.dp)).fillMaxWidth().height(160.dp),
				contentScale = ContentScale.Crop,
			)
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
					text = "Callback style",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "results land in vesk cells",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret1@ { device.pickImage( { uri -> run __veskret2@ { cbPhotoCell.value = uri } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Pick into cell ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF2563EB)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
				}
				Button(
					onClick = jsSafe({ run __veskret3@ { device.notify("Vesk Demo", "Tapped via onTap",  { run __veskret4@ { device.pickAudio( { uri -> run __veskret5@ { cbPhotoCell.value = uri } }) } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Notify, then pick ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
			}
			Text(
				text = "picked: " + ((cbPhotoCell.value ?: "none")).toString() + " (raw cell: " + ((cbPhotoCell.value ?: "none")).toString() + ")",
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
			Image(
				bitmap = veskFileImage(cbPhotoCell.value),
				contentDescription = null,
				modifier = Modifier.padding(top = 12.dp).clip(RoundedCornerShape(16.dp)).fillMaxWidth().height(160.dp),
				contentScale = ContentScale.Crop,
			)
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
					text = "Declarative style",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "photo-picker, camera, recorder, file-input, notification",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskPhotoPicker(
					label = "Pick a photo",
					onPick = { uri -> run __veskret6@ { cbPhotoCell.value = uri } },
				)
				VeskCamera(
					label = "Take photo",
					onDone = { uri -> run __veskret7@ { cbPhotoCell.value = uri } },
				)
				VeskCamera(
					label = "Record video",
					onDone = { uri -> run __veskret8@ { cbVideo.value = uri } },
					video = true,
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskRecorder(
					label = "Record audio",
					onDone = { path -> run __veskret9@ { cbRecording.value = path } },
				)
				VeskFileInput(
					label = "Attach a file",
					onDone = { uri, name -> run __veskret10@ { cbFile.value = name } },
					mime = "*/*",
				)
				VeskNotification(
					title = "Vesk Demo",
					text = "Declarative notification",
					onTap = { run __veskret11@ { cbPhotoCell.value = "notification tapped" } },
				)
			}
			Text(
				text = "recording: " + ((cbRecording.value ?: "none")).toString() + " · file: " + (run { val __vsk_v12 = cbFile.value; if (truthy(__vsk_v12)) __vsk_v12 else "none" }).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
			veskAudio(
				url = cbRecording.value,
				controls = true,
				modifier = Modifier.padding(top = 8.dp).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 8.dp),
			)
			veskVideo(
				url = cbVideo.value,
				controls = true,
				modifier = Modifier.padding(top = 8.dp).clip(RoundedCornerShape(16.dp)).fillMaxWidth().aspectRatio(16f / 9f),
			)
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
					text = "Camera capture",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "system camera, FileProvider output",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret13@ { device.capturePhoto() } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Take photo ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
				}
				Button(
					onClick = jsSafe({ run __veskret14@ { device.captureVideo() } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Record video ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
				}
			}
			Image(
				bitmap = veskFileImage(device.lastPhoto),
				contentDescription = null,
				modifier = Modifier.padding(top = 12.dp).clip(RoundedCornerShape(16.dp)).fillMaxWidth().height(160.dp),
				contentScale = ContentScale.Crop,
			)
			veskVideo(
				url = device.lastVideo,
				controls = true,
				modifier = Modifier.padding(top = 12.dp).clip(RoundedCornerShape(16.dp)).fillMaxWidth().aspectRatio(16f / 9f),
			)
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
					text = "Audio",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "recorder + picker",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret15@ { if (truthy(device.recording)) device.stopRecording(); else device.startRecording() } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFE11D48)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				if (truthy(device.recording)) {
					Text(
						text = ("Stop recording").toString(),
					)
				} else {
					Text(
						text = ("Record audio").toString(),
					)
				}
				}
				Button(
					onClick = jsSafe({ run __veskret16@ { device.pickAudio() } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Pick audio ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
			}
			Text(
				text = "Last recording: " + ((device.lastRecording ?: "none")).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
			veskAudio(
				url = device.lastRecording,
				controls = true,
				modifier = Modifier.padding(top = 8.dp).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 8.dp),
			)
			veskAudio(
				url = device.lastAudio,
				controls = true,
				modifier = Modifier.padding(top = 8.dp).clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 12.dp).padding(vertical = 8.dp),
			)
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
					text = "Files",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "any type, persistable access",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Button(
				onClick = jsSafe({ run __veskret17@ { device.pickFile() } }),
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = " Open a file ",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
			)
			}
			Text(
				text = "Picked: " + ((device.lastFileName ?: "none")).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
			Text(
				text = ((device.lastFile ?: "")).toString(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				maxLines = 1,
				overflow = TextOverflow.Ellipsis,
			)
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
					text = "Notifications",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "app channel",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Button(
				onClick = jsSafe({ run __veskret18@ { device.notify("Vesk Demo", "Notification from the media page") } }),
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)),
				shape = RoundedCornerShape(9999.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = " Send notification ",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
			)
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
					text = "Battery · network · location",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "state & callbacks, no permissions needed for battery",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskBatteryStatus(
					onDone = { level, charging -> run __veskret19@ { batteryInfo.value = (("" + level) + "%") + (if (truthy(charging)) " · charging" else "") } },
				)
				VeskNetworkStatus(
					onDone = { type, available -> run __veskret20@ { networkInfo.value = ((type ?: "offline")) + (if (truthy(available)) " · online" else "") } },
				)
				VeskLocation(
					onDone = { lat, lng -> run __veskret21@ { locInfo.value = if (truthy(lat)) (lat + ", ") + lng else "no fix (location off?)" } },
				)
			}
			Text(
				text = "portrait: " + (batteryInfo.value).toString() + " · " + (networkInfo.value).toString() + " · " + (locInfo.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Apps",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "launchable apps via queries declaration — no permission",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskApps(
					onDone = { list -> run __veskret22@ { firstApp.value = (list[0] ?: "none") } },
				)
				Button(
					onClick = jsSafe({ run __veskret23@ { device.listApps( { list -> run __veskret24@ { firstApp.value = (list[0] ?: "none") } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Via script ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
			}
			Text(
				text = "first app: " + (firstApp.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Private data",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "contacts · call log · messages · accounts (runtime grants)",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskContacts(
					onDone = { list -> run __veskret25@ { recentContact.value = (list[0] ?: "none") } },
				)
				VeskCallLog(
					onDone = { list -> run __veskret26@ { callRow.value = (list[0] ?: "none") } },
				)
				VeskMessages(
					onDone = { list -> run __veskret27@ { msgRow.value = (list[0] ?: "none") } },
				)
				VeskAccounts(
					onDone = { list -> run __veskret28@ { acctRow.value = (list[0] ?: "none") } },
				)
			}
			Text(
				text = "contact: " + (recentContact.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
			Text(
				text = "call: " + (callRow.value).toString(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
			Text(
				text = "message: " + (msgRow.value).toString(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
			Text(
				text = "account: " + (acctRow.value).toString(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Clipboard & device",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "clipboard, vibrate, torch, screenshot, share",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskClipboard(
					onDone = { text -> run __veskret29@ { clipTxt.value = (text ?: "clipboard is empty") } },
				)
				VeskCopyToClipboard(
					value = "copied by vesk",
					onDone = { run __veskret30@ { clipTxt.value = "copied \"copied by vesk\" — now read it back" } },
				)
				VeskVibrate(
					duration = 200,
				)
				VeskTorch(
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskScreenshot(
					onDone = { path -> run __veskret31@ { clipTxt.value = "screenshot: " + ((path ?: "failed")) } },
				)
				VeskShareText(
					text = "Hello from vesk-native!",
				)
				VeskShareFile(
					label = "Share last image",
					path = run { val __vsk_v32 = device.lastPhoto; if (truthy(__vsk_v32)) __vsk_v32 else device.lastImage },
				)
			}
			Text(
				text = (clipTxt.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Biometrics",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "fingerprint / face via BiometricPrompt",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskBiometricAuth(
					onDone = { ok, reason -> run __veskret33@ { bioInfo.value = if (truthy(ok)) "authenticated ✓" else "failed: " + ((reason ?: "?")) } },
				)
			}
			Text(
				text = (bioInfo.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Bluetooth",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "adapter, bonded devices, discovery",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskBluetooth(
					onDone = { enabled, list -> run __veskret34@ { btInfo.value = ((if (truthy(enabled)) "on" else "off") + " · ") + ((list[0] ?: "no paired devices")) } },
				)
				VeskBluetoothToggle(
				)
				VeskBluetoothScan(
					onDone = { list -> run __veskret35@ { btInfo.value = "scan: " + ((list[0] ?: "nothing found")) } },
				)
			}
			Text(
				text = (btInfo.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "QR codes",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "generate (ZXing) + scan (CameraX + ML Kit)",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret36@ { device.generateQrCode("vesk-native:" + ((cbPhotoCell.value ?: "qr")),  { path -> run __veskret37@ { qrText.value = (path ?: "") } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Generate QR from last image ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
				)
				}
				VeskQrScanner(
					onResult = { text -> run __veskret38@ { qrText.value = "scanned: " + ((text ?: "no code")) } },
				)
			}
			VeskQrCode(
				value = run { val __vsk_v39 = qrText.value; if (truthy(__vsk_v39)) __vsk_v39 else "https://vesk.dev" },
				modifier = Modifier.padding(top = 12.dp).width(160.dp).height(160.dp),
			)
			Text(
				text = (run { val __vsk_v40 = qrText.value; if (truthy(__vsk_v40)) __vsk_v40 else "qr-code element renders whatever value is set" }).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Screen recording",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "MediaProjection, system consent first",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			VeskScreenRecord(
				onDone = { path -> run __veskret41@ { screenRecPath.value = (path ?: "cancelled") } },
			)
			Text(
				text = "path: " + (screenRecPath.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "System controls",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "volume · brightness · keep-awake · orientation",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskVolume(
					onDone = { level, ringer -> run __veskret42@ { sysInfo.value = (("volume " + level) + " · ") + ((ringer ?: "?")) } },
				)
				VeskSetVolume(
					label = "Volume 60%",
					value = 60,
				)
				VeskBrightness(
					label = "Brightness 80%",
					value = 80,
				)
				VeskBrightness(
					label = "Brightness 100%",
					value = 100,
				)
				VeskKeepAwake(
					value = true,
				)
				VeskOrientation(
					mode = "landscape",
				)
				VeskOrientation(
					label = "Unlock rotation",
					mode = "auto",
				)
			}
			Text(
				text = (sysInfo.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Device · storage · sensors",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "identity, memory, hardware sensors",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskDeviceInfo(
					onDone = { info -> run __veskret43@ { sysInfo.value = info } },
				)
				VeskStorage(
					onDone = { free, total -> run __veskret44@ { storageTxt.value = (free + " free of ") + total } },
				)
				VeskSensor(
					label = "Light sensor",
					type = "light",
					onDone = { v -> run __veskret45@ { sensorVal.value = (v ?: "no sensor") } },
				)
				VeskSensor(
					label = "Accelerometer",
					type = "accelerometer",
					onDone = { v -> run __veskret46@ { sensorVal.value = (v ?: "no sensor") } },
				)
			}
			Text(
				text = (sysInfo.value).toString() + " · " + (storageTxt.value).toString() + " · " + (sensorVal.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Calendar · NFC · SIM",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "events need READ_CALENDAR; nfc/sim are reads",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskCalendar(
					onDone = { list -> run __veskret47@ { calTxt.value = (list[0] ?: "no upcoming events") } },
				)
				VeskNfc(
					onDone = { available, enabled -> run __veskret48@ { calTxt.value = "nfc " + (if (truthy(available)) if (truthy(enabled)) "on" else "off" else "absent") } },
				)
				VeskSim(
					onDone = { carrier, state -> run __veskret49@ { calTxt.value = (((carrier ?: "no sim")) + " · ") + ((state ?: "?")) } },
				)
			}
			Text(
				text = (calTxt.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Intents & extras",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "dial, sms, email, link, maps, settings, alarm, apps, tts, toast, sounds, wallpaper",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskDial(
					number = "+15551234567",
				)
				VeskSms(
					label = "SMS",
					text = "Hi from vesk!",
					number = "+15551234567",
				)
				VeskEmail(
					label = "Email",
					to = "demo@vesk.dev",
					subject = "From vesk",
					body = "Built without Android Studio.",
				)
				VeskLink(
					url = "https://vesk.dev",
				)
				VeskMap(
					query = "Berlin",
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskOpenSettings(
					section = "wifi",
				)
				VeskOpenApp(
					label = "Open Settings app",
					app = "com.android.settings",
				)
				VeskAlarm(
					hour = 8,
					minute = 30,
					title = "Vesk demo alarm",
				)
				VeskToast(
					text = "Hello from vesk!",
				)
				VeskSound(
					kind = "notification",
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				VeskSpeak(
					text = "Everything in vesk is built from vsk files.",
					onDone = { ok -> run __veskret50@ { ttsDone.value = ok } },
				)
				VeskWallpaper(
					label = "Set wallpaper from last photo",
					path = run { val __vsk_v51 = device.lastPhoto; if (truthy(__vsk_v51)) __vsk_v51 else cbPhotoCell.value },
				)
			}
			Column(modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
				Text("tts: ")
				if (truthy(ttsDone.value)) {
					Text(
						text = ("spoke").toString(),
					)
				} else {
					Text(
						text = ("idle").toString(),
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
					text = "App files",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "app-private storage: write, read, list, delete",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ run __veskret52@ { device.writeFile("notes.txt", "hello vesk",  { path -> run __veskret53@ { fileTxt.value = "wrote: " + ((path ?: "failed")) } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Write notes.txt ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
				Button(
					onClick = jsSafe({ run __veskret54@ { device.readFile("notes.txt",  { text -> run __veskret55@ { fileTxt.value = "read: " + ((text ?: "missing")) } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Read it back ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
				Button(
					onClick = jsSafe({ run __veskret56@ { device.listFiles("",  { list -> run __veskret57@ { fileTxt.value = "files: " + ((list[0] ?: "none")) } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " List files ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
				Button(
					onClick = jsSafe({ run __veskret58@ { device.deleteFile("notes.txt",  { ok -> run __veskret59@ { fileTxt.value = "deleted: " + ok } }) } }),
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
					shape = RoundedCornerShape(9999.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = " Delete it ",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
				)
				}
			}
			Text(
				text = (fileTxt.value).toString(),
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
			)
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
					text = "Drag & drop",
					style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = -0.2.sp),
				)
				Text(
					text = "draggable attribute + ondrop binding",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Text(
					text = "drag me",
					modifier = Modifier.veskDraggable(VeskDragData("dragged from vesk")).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)).padding(horizontal = 12.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
				)
				Text(
					text = ((cbPhotoCell.value ?: "drag payload default")).toString(),
					modifier = Modifier.veskDraggable(VeskDragData(((cbPhotoCell.value ?: "drag payload default")).toString())).clip(RoundedCornerShape(9999.dp)).background(Color(0xFF059669)).padding(horizontal = 12.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
				)
			}
			Column(
				modifier = Modifier.veskDropTarget({ t -> run __veskret60@ { dropText.value = t } }).fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(12.dp)).veskDashedBorder(2.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.22f), floatArrayOf(12f, 12f)).padding(16.dp),
			) {
				Text(
					text = "drop here → " + (run { val __vsk_v61 = dropText.value; if (truthy(__vsk_v61)) __vsk_v61 else "nothing dropped yet" }).toString(),
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF6B7280)),
				)
			}
		}
	}
}
