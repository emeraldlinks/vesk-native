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

@Composable
fun Blog(content: @Composable () -> Unit = {}) {
	Text(
		text = "Blog",
		style = TextStyle(fontSize = 30.sp, fontWeight = FontWeight.Bold),
	)
	Column(
		modifier = Modifier.clip(RoundedCornerShape(8.dp)).shadow(1.dp).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFF3F4F6)).padding(20.dp),
	) {
		Column {
			Link(props = LinkProps(href = "/blog/hello-world", `class` = "text-gray-900 no-underline hover:text-blue-600"))
				{
					Text(
						text = "Hello World",
					)
				}
		}
		Text(
			text = "First post powered by Vesk",
			style = TextStyle(color = Color(0xFF9CA3AF), fontSize = 14.sp),
		)
	}
	Column(
		modifier = Modifier.clip(RoundedCornerShape(8.dp)).shadow(1.dp).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFF3F4F6)).padding(20.dp),
	) {
		Column {
			Link(props = LinkProps(href = "/blog/ssr-in-vesk", `class` = "text-gray-900 no-underline hover:text-blue-600"))
				{
					Text(
						text = "SSR in Vesk",
					)
				}
		}
		Text(
			text = "How server-side rendering works",
			style = TextStyle(color = Color(0xFF9CA3AF), fontSize = 14.sp),
		)
	}
}
