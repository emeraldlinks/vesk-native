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
import com.composables.icons.lucide.Bookmark
import com.composables.icons.lucide.BookmarkCheck
import com.composables.icons.lucide.Lucide


data class SaveButtonProps(
	val flightId: String = "",
)

@Composable
fun SaveButton(props: SaveButtonProps = SaveButtonProps(), content: @Composable () -> Unit = {}) {
	val saved = remember { mutableStateOf("${(VeskWebStorage.localGetItem("aero.saved") ?: "")}".split(",").toMutableList().contains(props.flightId)) }
	val heart = remember { mutableStateOf<Any?>(null) }
	Button(
		onClick = jsSafe({ run __veskret0@ { saved.value = !truthy(saved.value); motionAnimate(heart.value, mutableMapOf<String, Any?>("scale" to listOf(1, 1.35, 1)), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 380, "damping" to 14)))); val ids = "${(VeskWebStorage.localGetItem("aero.saved") ?: "")}".split(",").toMutableList(); if (truthy(saved.value)) {
	ids.add(props.flightId); 	VeskWebStorage.localSetItem("aero.saved", ids.joinToString(",")); } else {
	val next = ids.filter { x -> x != props.flightId }
	VeskWebStorage.localSetItem("aero.saved", next.joinToString(",")); } } }),
		modifier = Modifier.clip(RoundedCornerShape(9999.dp)).width(36.dp).height(36.dp),
		shape = RoundedCornerShape(9999.dp),
		colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
		elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
	) {
	val __veskRef1 = rememberMotionRef()
	heart.value = __veskRef1
	Row(
		modifier = Modifier.motionGraphics(__veskRef1).clip(RoundedCornerShape(9999.dp)).width(36.dp).height(36.dp),
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.Center,
	) {
		if (truthy(saved.value)) {
			Icon(
				imageVector = Lucide.BookmarkCheck,
				contentDescription = "Saved",
				modifier = Modifier.width(20.dp).height(20.dp),
				tint = Color(0xFFFB7185),
			)
		} else {
			Icon(
				imageVector = Lucide.Bookmark,
				contentDescription = "Save flight",
				modifier = Modifier.width(20.dp).height(20.dp),
				tint = Color(0xFF94A3B8),
			)
		}
	}
	}
}
