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

data class ErrorPageProps(
	val statusCode: Any? = null,
	val error: Any? = null,
	val stack: Any? = null,
	val url: Any? = null,
)

@Composable
fun ErrorPage(props: ErrorPageProps = ErrorPageProps(), content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.background(Color(0xFFF9FAFB)),
		horizontalAlignment = Alignment.CenterHorizontally,
		verticalArrangement = Arrangement.Center,
	) {
		Column(
			modifier = Modifier.clip(RoundedCornerShape(12.dp)).shadow(1.dp).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFE5E7EB)).padding(32.dp),
		) {
			Text(
				text = "Error " + (props.statusCode).toString(),
				style = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626)),
			)
			Text(
				text = (props.error).toString(),
				style = TextStyle(fontSize = 18.sp, color = Color(0xFF374151)),
			)
			Text(
				text = (props.stack).toString(),
				modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF3F4F6)).padding(16.dp),
				style = TextStyle(fontSize = 14.sp),
			)
			Text(
				text = (props.url).toString(),
				style = TextStyle(color = Color(0xFF6B7280), fontSize = 14.sp),
			)
		}
	}
}
