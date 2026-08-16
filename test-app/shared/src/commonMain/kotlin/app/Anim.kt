package app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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


@Composable
fun Anim(content: @Composable () -> Unit = {}) {
	val box = remember { mutableStateOf<Any?>(null) }
		val boxCell = box
	val boxA = remember { mutableStateOf<Any?>(null) }
		val boxACell = boxA
	val boxB = remember { mutableStateOf<Any?>(null) }
		val boxBCell = boxB
	val boxC = remember { mutableStateOf<Any?>(null) }
		val boxCCell = boxC
	val count = remember { mutableStateOf(0) }
	val shown = remember { mutableStateOf(false) }
	val scrollP = remember { mutableStateOf(0.0) }
	Column(
		modifier = Modifier.fillMaxWidth().padding(16.dp),
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFF97316), Color(0xFFF43F5E)))).padding(24.dp),
		) {
			Text(
				text = "Motion — vesk-native animation lab",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold),
			)
			Text(
				text = "motion.dev primitives (animate/spring/stagger/inView/scroll) mapped to native Compose animations.",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFFEF3C7)).padding(16.dp),
		) {
			Text(
				text = "animate() on a ref'd element",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "The ref attribute binds a MotionRef; animate(box, scale [1, 1.2, 1], opacity [1, 0.6, 1] keyframes) pulses the graphicsLayer through a Compose spring, and a new animate() on the same ref stops the previous one.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			val __veskRef1 = rememberMotionRef()
			boxCell.value = __veskRef1
			Row(
				modifier = Modifier.motionGraphics(__veskRef1).clip(RoundedCornerShape(12.dp)).background(Color(0xFFF43F5E)).width(224.dp).height(224.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.Center,
			) {
				Text(
					text = "box",
					style = TextStyle(color = Color(0xFFFFFFFF), fontWeight = FontWeight.SemiBold),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				horizontalArrangement = Arrangement.spacedBy(8.dp),
			) {
				Button(
					onClick = jsSafe({ motionAnimate(boxCell.value, mutableMapOf<String, Any?>("scale" to listOf(1, 1.2, 1), "opacity" to listOf(1, 0.6, 1)), mutableMapOf<String, Any?>("spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 220, "damping" to 18)))) }),
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF43F5E)),
					shape = RoundedCornerShape(8.dp),
					colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
					elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
					contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
				) {
				Text(
					text = "Pulse",
					modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF43F5E)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
					style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
				)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFFFEDD5)).padding(16.dp),
		) {
			Text(
				text = "animate() numeric tween + onUpdate",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "animate(0, 100, options) with duration 0.8, ease easeInOut and an onUpdate callback counts up; the ease string maps to the real motion-utils cubic-bezier constants.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Text(
				text = "count = " + (kotlin.math.round((count.value).toDouble()).toInt()).toString(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			Button(
				onClick = jsSafe({ motionAnimate(0, 100, mutableMapOf<String, Any?>("duration" to 0.8, "ease" to "easeInOut", "onUpdate" to  { v: Any? -> run __veskret0@ { count.value = num(v).toInt() } })) }),
				modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF97316)),
				shape = RoundedCornerShape(8.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = "Animate count",
				modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF97316)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
			)
			}
			Column(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
				Text("ease: ")
				if (truthy(motionEase("easeInOut") == motionEase("backOut"))) {
					Text(
						text = ("same").toString(),
					)
				} else {
					Text(
						text = ("diff").toString(),
					)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFFEF9C3)).padding(16.dp),
		) {
			Text(
				text = "stagger()",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "motion-utils stagger(duration)(index) — the curried call maps to motionStagger(index, duration) and becomes each element's delay, so the three boxes pop in one after the other.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Text(
				text = "stagger(0.15)(0) = " + (motionStagger(0, 0.15)).toString() + "s · (1) = " + (motionStagger(1, 0.15)).toString() + "s · (2) = " + (motionStagger(2, 0.15)).toString() + "s",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
			Row(
				modifier = Modifier.fillMaxWidth(),
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				val __veskRef2 = rememberMotionRef()
				boxACell.value = __veskRef2
				Row(
					modifier = Modifier.motionGraphics(__veskRef2).clip(RoundedCornerShape(4.dp)).background(Color(0xFF10B981)).width(64.dp).height(64.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "a",
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
					)
				}
				val __veskRef3 = rememberMotionRef()
				boxBCell.value = __veskRef3
				Row(
					modifier = Modifier.motionGraphics(__veskRef3).clip(RoundedCornerShape(4.dp)).background(Color(0xFF10B981)).width(64.dp).height(64.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "b",
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
					)
				}
				val __veskRef4 = rememberMotionRef()
				boxCCell.value = __veskRef4
				Row(
					modifier = Modifier.motionGraphics(__veskRef4).clip(RoundedCornerShape(4.dp)).background(Color(0xFF10B981)).width(64.dp).height(64.dp),
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.Center,
				) {
					Text(
						text = "c",
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
					)
				}
			}
			Button(
				onClick = jsSafe({ run __veskret1@ { motionAnimate(boxACell.value, mutableMapOf<String, Any?>("scale" to listOf(0.4, 1), "opacity" to listOf(0, 1)), mutableMapOf<String, Any?>("delay" to motionStagger(0, 0.15), "spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 220, "damping" to 18)))); motionAnimate(boxBCell.value, mutableMapOf<String, Any?>("scale" to listOf(0.4, 1), "opacity" to listOf(0, 1)), mutableMapOf<String, Any?>("delay" to motionStagger(1, 0.15), "spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 220, "damping" to 18)))); motionAnimate(boxCCell.value, mutableMapOf<String, Any?>("scale" to listOf(0.4, 1), "opacity" to listOf(0, 1)), mutableMapOf<String, Any?>("delay" to motionStagger(2, 0.15), "spring" to motionSpring(mutableMapOf<String, Any?>("stiffness" to 220, "damping" to 18)))) } }),
				modifier = Modifier.padding(top = 12.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFF10B981)),
				shape = RoundedCornerShape(8.dp),
				colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
				elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
				contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
			) {
			Text(
				text = "Stagger in",
				modifier = Modifier.padding(top = 12.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFF10B981)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
				style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp),
			)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFECFCCB)).padding(16.dp),
		) {
			Text(
				text = "inView()",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "inView(box, callback, once: true) fires once the ref'd element intersects the viewport — bounds from motionGraphics, viewport from the display.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Column(modifier = Modifier.fillMaxWidth()) {
				Text("box in view: ")
				if (truthy(shown.value)) {
					Text(
						text = ("yes").toString(),
					)
				} else {
					Text(
						text = ("not yet").toString(),
					)
				}
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).border(2.dp, Color(0xFFDCFCE7)).padding(16.dp),
		) {
			Text(
				text = "scroll()",
				modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
				style = TextStyle(fontWeight = FontWeight.SemiBold),
			)
			Text(
				text = "scroll(onScroll) reports the route scroll container's progress (0..1), like motion's scrollY progress.",
				modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Text(
				text = "scroll progress = " + (kotlin.math.round((scrollP.value * 100).toDouble()).toInt()).toString() + "%",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Text(
			text = (motionInView(boxCell.value,  { run __veskret2@ { shown.value = true } }, mutableMapOf<String, Any?>("once" to true))).toString(),
		)
		Text(
			text = (motionScroll( { p: Any? -> run __veskret3@ { scrollP.value = num(p) } })).toString(),
		)
	}
}
