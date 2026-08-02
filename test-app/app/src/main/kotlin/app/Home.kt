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
fun Home(content: @Composable () -> Unit = {}) {
	val count = remember { mutableStateOf(10) }
	Text(
		text = "Welcome to Vesk",
		style = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.Bold),
	)
	Text(
		text = " A compiler-first reactive UI framework for the post-VDOM web. ",
		style = TextStyle(color = Color(0xFF6B7280)),
	)
	Text(
		text = (count.value).toString(),
	)
	if (truthy(num(2) > num(3))) {
		Text(
			text = " 2 is higher",
		)
	} else {
		Text(
			text = " Hurray 3 xwon",
		)
	}
	Button(
		onClick = { count.value = count.value + 1 },
	) {
		Text(" + ")
	}
	Column(
		modifier = Modifier.clip(RoundedCornerShape(12.dp)).shadow(1.dp).background(Color(0xFFFFFFFF)).border(1.dp, Color(0xFFF3F4F6)).padding(24.dp),
	) {
		Text(
			text = "Getting Started",
			style = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold),
		)
		Column {
			Text("Edit " + " to change this page.")
			Text(
				text = "app/page.vsk",
				modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFF3F4F6)).padding(horizontal = 6.dp).padding(vertical = 2.dp),
				style = TextStyle(fontSize = 14.sp),
			)
		}
		Column {
			Text(
				text = ".gg { color: red; } ",
			)
		}
		Appx()
		Appxx(props = AppxxProps(count = count.value))
	}
}

data class ThrowsProps(
	val fail: Any? = null,
	val msg: Any? = null,
)

@Composable
fun Throws(props: ThrowsProps = ThrowsProps(), content: @Composable () -> Unit = {}) {
	if (truthy(props.fail)) throw Exception((props.msg)?.toString());
	Text(
		text = "OK",
	)
}

@Composable
fun Appx(content: @Composable () -> Unit = {}) {
	Throws(props = ThrowsProps(fail = true, msg = "Boom!"))
}

data class ThrowProps(
	val count: Any? = null,
	val msg: Any? = null,
)

@Composable
fun Throw(props: ThrowProps = ThrowProps(), content: @Composable () -> Unit = {}) {
	if (truthy(num(props.count) < num(15))) throw Exception((props.msg)?.toString());
	Text(
		text = "OK " + (props.count).toString(),
	)
}

data class AppxxProps(
	val count: Any? = null,
)

@Composable
fun Appxx(props: AppxxProps = AppxxProps(), content: @Composable () -> Unit = {}) {
	Text(
		text = " Count: " + (props.count).toString(),
	)
	Throw(props = ThrowProps(count = props.count, msg = "Insufficient! ${props.count} "))
}
