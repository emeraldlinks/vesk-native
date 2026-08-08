package app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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

data class LayoutProps(
	val children: Any? = null,
)

@Composable
fun Layout(props: LayoutProps = LayoutProps(), content: @Composable () -> Unit = {}) {
	Column(
		modifier = Modifier.padding(16.dp),
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		NavLink(props = NavLinkProps(href = "/", `class` = "text-blue-600"))
			{
				Text(
					text = "Home",
				)
			}
		NavLink(props = NavLinkProps(href = "/about", `class` = "text-blue-600"))
			{
				Text(
					text = "About",
				)
			}
		NavLink(props = NavLinkProps(href = "/blog", `class` = "text-blue-600"))
			{
				Text(
					text = "Blog",
				)
			}
	}
	Column(
		modifier = Modifier.padding(16.dp),
	) {
		content()
	}
}
