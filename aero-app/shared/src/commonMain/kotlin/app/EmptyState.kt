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
import com.composables.icons.lucide.Heart
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.Search


data class EmptyStateProps(
	val icon: String = "",
	val title: String = "",
	val hint: String = "",
)

@Composable
fun EmptyState(props: EmptyStateProps = EmptyStateProps(), content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 40.dp).padding(vertical = 56.dp),
		horizontalAlignment = Alignment.CenterHorizontally,
		verticalArrangement = Arrangement.spacedBy(12.dp),
	) {
		Row(
			modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF141B26)).width(64.dp).height(64.dp),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.Center,
		) {
			if (truthy(props.icon == "search")) {
				Icon(
					imageVector = Lucide.Search,
					contentDescription = "Search",
					modifier = Modifier.width(28.dp).height(28.dp),
					tint = Color(0xFF64748B),
				)
			} else {
				Icon(
					imageVector = Lucide.Heart,
					contentDescription = "Empty",
					modifier = Modifier.width(28.dp).height(28.dp),
					tint = Color(0xFF64748B),
				)
			}
		}
		Text(
			text = (props.title).toString(),
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp, textAlign = TextAlign.Center),
		)
		Text(
			text = (props.hint).toString(),
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(color = Color(0xFF94A3B8), fontSize = 14.sp, lineHeight = 20.sp, textAlign = TextAlign.Center),
		)
	}
}
