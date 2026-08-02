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

data class BlogPostParams(
	val slug: String,
)
data class BlogPostProps(
	val params: BlogPostParams,
)

@Composable
fun BlogPost(props: BlogPostProps, content: @Composable () -> Unit = {}) {
	Link(props = LinkProps(href = "/blog", `class` = "inline-block mb-6 text-blue-600 no-underline hover:underline"))
		{
			Text(
				text = " ← Back to blog ",
			)
		}
	Text(
		text = "Post: " + (props.params.slug).toString(),
		style = TextStyle(fontSize = 30.sp, fontWeight = FontWeight.Bold),
	)
	Column {
		Column {
			Text("This is a dynamic blog post rendered at " + ".")
			Text(
				text = "/" + (props.params.slug).toString(),
				modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFF3F4F6)).padding(horizontal = 6.dp).padding(vertical = 2.dp),
				style = TextStyle(fontSize = 14.sp),
			)
		}
	}
}
