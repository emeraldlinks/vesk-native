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

data class CounterProps(
	val initial: Int,
)

@Composable
fun Counter(props: CounterProps) {
	val count = remember { mutableStateOf(props.initial) }
	val name = remember { mutableStateOf("") }
	val done = remember { mutableStateOf(false) }
	fun increment() {
		count.value = count.value + 1;
	}
	Column(
		modifier = Modifier.padding(32.dp),
		horizontalAlignment = Alignment.CenterHorizontally,
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		Text(
			text = "Count: " + (count.value).toString(),
			style = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1F2937)),
		)
		Button(
			onClick = { increment() },
			modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFF3B82F6)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
		) {
			Text(" Increment ")
		}
		if (count.value > 10) {
			Text(
				text = "Big number!",
				style = TextStyle(color = Color(0xFF16A34A)),
			)
		} else {
			Text(
				text = "Small number",
				style = TextStyle(color = Color(0xFF9CA3AF)),
			)
		}
		OutlinedTextField(
			value = name.value,
			onValueChange = { name.value = it },
			modifier = Modifier.fillMaxWidth(),
			placeholder = { Text("Enter your name") },
		)
		Text(
			text = "Hello, " + (name.value.ifEmpty { "stranger" }).toString() + "!",
		)
		Column {
			Text(" Done ")
			Checkbox(
				checked = done.value,
				onCheckedChange = { done.value = it },
			)
		}
		Column(
			modifier = Modifier.padding(start = 16.dp),
		) {
			listOf(1, 2, 3).forEach { n ->
				key(n) {
				Column {
					Text(
						text = "Item ",
					)
					Text(
						text = (n).toString(),
					)
					Text(
						text = " — count is ",
					)
					Text(
						text = (count.value).toString(),
					)
				}
				}
			}
		}
	}
}
