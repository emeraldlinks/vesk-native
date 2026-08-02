package app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class NotFound404Props(
	val url: Any? = null,
)

@Composable
fun NotFound404(props: NotFound404Props = NotFound404Props(), content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.padding(horizontal = 16.dp),
	) {
		Text(
			text = "404",
			style = TextStyle(fontSize = 60.sp, fontWeight = FontWeight.Bold, color = Color(0xFFE5E7EB)),
		)
		Text(
			text = "Page Not Found",
			style = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.SemiBold),
		)
		Column {
			Text("Sorry, we couldn't find ")
			Text(
				text = (props.url).toString(),
				modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFF3F4F6)).padding(horizontal = 6.dp).padding(vertical = 2.dp),
				style = TextStyle(fontSize = 14.sp),
			)
		}
		Link(props = LinkProps(href = "/", `class` = "text-blue-600 no-underline hover:underline font-medium"))
			{
				Text(
					text = "← Go home",
				)
			}
	}
}
