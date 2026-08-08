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

@Composable
fun Page(content: @Composable () -> Unit = {}) {
	val count = remember { mutableStateOf(0) }
	val name = remember { mutableStateOf("Vesk") }
	Text(
		text = "Hello " + (name.value).toString(),
		style = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.Bold),
	)
	Text(
		text = "Counter: " + (count.value).toString(),
		style = TextStyle(color = Color(0xFF6B7280)),
	)
	Column(
		verticalArrangement = Arrangement.spacedBy(8.dp),
	) {
		Button(
			onClick = { count.value = count.value + -1 },
			modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFE5E7EB)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
		) {
			Text("-")
		}
		Button(
			onClick = { count.value = count.value + 1 },
			modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFF2563EB)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
		) {
			Text("+")
		}
	}
	if (truthy(num(count.value) > num(5))) {
		Text(
			text = "Count is high!",
			style = TextStyle(color = Color(0xFF16A34A), fontWeight = FontWeight.Bold),
		)
	} else {
		Text(
			text = "Keep counting...",
			style = TextStyle(color = Color(0xFFEA580C)),
		)
	}
	Column(
		modifier = Modifier.clip(RoundedCornerShape(8.dp)).border(1.dp, Color(0x1F000000)).padding(16.dp),
	) {
		Text(
			text = "Features",
			style = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold),
		)
		Column(
			modifier = Modifier.padding(start = 24.dp),
		) {
			Column {
				Text(
					text = "Reactive state with track()",
				)
			}
			Column {
				Text(
					text = "Conditional rendering",
				)
			}
			Column {
				Text(
					text = "Event handlers",
				)
			}
		}
	}
}
