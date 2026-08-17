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
import app.BottomNav
import com.composables.icons.lucide.Bell
import com.composables.icons.lucide.ChevronRight
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.RefreshCw
import com.composables.icons.lucide.TriangleAlert
import com.composables.icons.lucide.User


@Composable
fun Profile(content: @Composable () -> Unit = {}) {
	val clearBtn = remember { mutableStateOf<Any?>(null) }
	val cleared = remember { mutableStateOf(false) }
	Column(
		modifier = Modifier.background(Color(0xFF0A0F16)).fillMaxWidth().fillMaxHeight(),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 16.dp).padding(bottom = 4.dp),
		) {
			Text(
				text = "Profile",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 32.sp, letterSpacing = -0.2.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(vertical = 16.dp),
			verticalArrangement = Arrangement.spacedBy(16.dp),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF141B26)).padding(horizontal = 16.dp).padding(vertical = 20.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(16.dp),
			) {
				Row(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Brush.linearGradient(listOf(Color(0xFF06B6D4), Color(0xFF34D399)), start = Offset(0f, 0f), end = Offset(1f, 1f))).width(56.dp).height(56.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Icon(
						imageVector = Lucide.User,
						contentDescription = "Avatar",
						modifier = Modifier.width(28.dp).height(28.dp),
						tint = Color(0xFF07131A),
					)
				}
				Column(
					modifier = Modifier.weight(1f),
					verticalArrangement = Arrangement.spacedBy(2.dp),
				) {
					Text(
						text = "Aero Pilot",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 24.sp),
					)
					Text(
						text = "Tracking 8 flights · Paris CDG",
						modifier = Modifier.fillMaxWidth(),
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF94A3B8)),
					)
				}
			}
			Column(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF141B26)),
			) {
				Row(
					modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 14.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy(12.dp),
				) {
					Icon(
						imageVector = Lucide.Bell,
						contentDescription = "Notifications",
						modifier = Modifier.width(20.dp).height(20.dp),
						tint = Color(0xFF67E8F9),
					)
					Text(
						text = "Flight notifications",
						modifier = Modifier.weight(1f),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFFFFFFFF), fontWeight = FontWeight.Medium),
					)
					Text(
						text = "On",
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF64748B)),
					)
				}
				Row(
					modifier = Modifier.veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, Color(0xFF1B2432)).fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 14.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy(12.dp),
				) {
					Icon(
						imageVector = Lucide.RefreshCw,
						contentDescription = "Live updates",
						modifier = Modifier.width(20.dp).height(20.dp),
						tint = Color(0xFF67E8F9),
					)
					Text(
						text = "Live updates",
						modifier = Modifier.weight(1f),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFFFFFFFF), fontWeight = FontWeight.Medium),
					)
					Text(
						text = "1 min",
						style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF64748B)),
					)
				}
				Row(
					modifier = Modifier.veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, Color(0xFF1B2432)).fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 14.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy(12.dp),
				) {
					Icon(
						imageVector = Lucide.User,
						contentDescription = "Account",
						modifier = Modifier.width(20.dp).height(20.dp),
						tint = Color(0xFF67E8F9),
					)
					Text(
						text = "Account",
						modifier = Modifier.weight(1f),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFFFFFFFF), fontWeight = FontWeight.Medium),
					)
					Icon(
						imageVector = Lucide.ChevronRight,
						contentDescription = "Open account",
						modifier = Modifier.width(20.dp).height(20.dp),
						tint = Color(0xFF64748B),
					)
				}
			}
			val __veskRef1 = rememberMotionRef()
			clearBtn.value = __veskRef1
			Row(
				modifier = Modifier.motionGraphics(__veskRef1).clickable { jsSafe({ run __veskret0@ { VeskWebStorage.localSetItem("aero.saved", ""); cleared.value = true; motionAnimate(clearBtn.value, mutableMapOf<String, Any?>("scale" to listOf(1, 0.97, 1)), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 360, "damping" to 15)))) } }) }.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF141B26)).padding(horizontal = 16.dp).padding(vertical = 14.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				Icon(
					imageVector = Lucide.TriangleAlert,
					contentDescription = "Clear saved flights",
					modifier = Modifier.width(20.dp).height(20.dp),
					tint = Color(0xFFFB7185),
				)
				if (truthy(cleared.value)) {
					Text(
						text = "Saved flights cleared",
						modifier = Modifier.weight(1f),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFFFDA4AF), fontWeight = FontWeight.Medium),
					)
				} else {
					Text(
						text = "Clear saved flights",
						modifier = Modifier.weight(1f),
						style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Color(0xFFFDA4AF), fontWeight = FontWeight.Medium),
					)
				}
			}
			Text(
				text = "Aero — a Vesk Native flight tracker sample · v1.0",
				modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
				style = TextStyle(textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 16.sp, color = Color(0xFF475569)),
			)
		}
		BottomNav(props = BottomNavProps(active = "profile"))
	}
}
