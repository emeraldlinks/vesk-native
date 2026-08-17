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


data class StatusBadgeProps(
	val status: String = "",
)

@Composable
fun StatusBadge(props: StatusBadgeProps = StatusBadgeProps(), content: @Composable () -> Unit = {}) {
	if (truthy(props.status == "En route")) {
		Row(
			modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x2606B6D4)).padding(horizontal = 10.dp).padding(vertical = 4.dp),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.spacedBy(6.dp),
		) {
			Text(
				text = "",
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF22D3EE)).width(6.dp).height(6.dp),
			)
			Text(
				text = (props.status).toString(),
				style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF67E8F9)),
			)
		}
	} else {
		if (truthy(props.status == "Boarding")) {
			Row(
				modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x26F59E0B)).padding(horizontal = 10.dp).padding(vertical = 4.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy(6.dp),
			) {
				Text(
					text = "",
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFBBF24)).width(6.dp).height(6.dp),
				)
				Text(
					text = (props.status).toString(),
					style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFFFCD34D)),
				)
			}
		} else {
			if (truthy(props.status == "Landed")) {
				Row(
					modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x2610B981)).padding(horizontal = 10.dp).padding(vertical = 4.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy(6.dp),
				) {
					Text(
						text = "",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF34D399)).width(6.dp).height(6.dp),
					)
					Text(
						text = (props.status).toString(),
						style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF6EE7B7)),
					)
				}
			} else {
				if (truthy(props.status == "Delayed")) {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0x26F43F5E)).padding(horizontal = 10.dp).padding(vertical = 4.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.spacedBy(6.dp),
					) {
						Text(
							text = "",
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFFB7185)).width(6.dp).height(6.dp),
						)
						Text(
							text = (props.status).toString(),
							style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFFFDA4AF)),
						)
					}
				} else {
					Row(
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF1B2432)).padding(horizontal = 10.dp).padding(vertical = 4.dp),
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.spacedBy(6.dp),
					) {
						Text(
							text = "",
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF94A3B8)).width(6.dp).height(6.dp),
						)
						Text(
							text = (props.status).toString(),
							style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFFCBD5E1)),
						)
					}
				}
			}
		}
	}
}
