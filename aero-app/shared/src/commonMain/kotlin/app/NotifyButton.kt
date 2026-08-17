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
import com.composables.icons.lucide.Bell
import com.composables.icons.lucide.Check
import com.composables.icons.lucide.Lucide


data class NotifyButtonProps(
	val flight: Any? = null,
)

@Composable
fun NotifyButton(props: NotifyButtonProps = NotifyButtonProps(), content: @Composable () -> Unit = {}) {
	val device = rememberDeviceApi();
	val enabled = remember { mutableStateOf(false) }
	val btn = remember { mutableStateOf<Any?>(null) }
	val __veskRef1 = rememberMotionRef()
	btn.value = __veskRef1
	Row(
		modifier = Modifier.motionGraphics(__veskRef1).clickable { jsSafe({ run __veskret0@ { enabled.value = true; device.notify("Flight ${jsIndex(props.flight, "flightNumber")} · ${jsIndex(props.flight, "status")}", "${jsIndex(jsIndex(props.flight, "from"), "city")} (${jsIndex(jsIndex(props.flight, "from"), "code")}) → ${jsIndex(jsIndex(props.flight, "to"), "city")} (${jsIndex(jsIndex(props.flight, "to"), "code")}) — we'll update you on departures and status changes."); motionAnimate(btn.value, mutableMapOf<String, Any?>("scale" to listOf(1, 0.96, 1.03, 1)), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 340, "damping" to 15)))) } }) }.fillMaxWidth().shadow(10.dp).clip(RoundedCornerShape(16.dp)).background(Brush.horizontalGradient(listOf(Color(0xFF06B6D4), Color(0xFF2DD4BF), Color(0xFF34D399)))).padding(vertical = 16.dp),
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy(8.dp),
	) {
		if (truthy(enabled.value)) {
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Icon(
					imageVector = Lucide.Check,
					contentDescription = "Notifications enabled",
					modifier = Modifier.width(20.dp).height(20.dp),
					tint = Color(0xFF07131A),
				)
				Text(
					text = "Notifications enabled",
					style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 24.sp),
				)
			}
		} else {
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Icon(
					imageVector = Lucide.Bell,
					contentDescription = "Notifications",
					modifier = Modifier.width(20.dp).height(20.dp),
					tint = Color(0xFF07131A),
				)
				Text(
					text = "Receive notifications",
					style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 24.sp),
				)
			}
		}
	}
}
