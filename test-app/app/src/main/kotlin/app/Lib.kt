@file:OptIn(com.bumptech.glide.integration.compose.ExperimentalGlideComposeApi::class)

package app

import co.yml.charts.ui.linechart.LineChart
import coil.compose.AsyncImage
import com.bumptech.glide.integration.compose.GlideImage

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.res.painterResource
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

import co.yml.charts.ui.linechart.model.LineChartData
import co.yml.charts.ui.linechart.model.LinePlotData
import co.yml.charts.ui.linechart.model.Line
import co.yml.charts.common.model.Point
import co.yml.charts.common.model.PlotType

@Composable
fun Lib(content: @Composable () -> Unit = {}) {
	val chart = LineChartData(linePlotData = LinePlotData(plotType = PlotType.Line, lines = listOf(Line(dataPoints = listOf(Point(x = (num(0)).toFloat(), y = (num(22)).toFloat()), Point(x = (num(1)).toFloat(), y = (num(34)).toFloat()), Point(x = (num(2)).toFloat(), y = (num(15)).toFloat()), Point(x = (num(3)).toFloat(), y = (num(28)).toFloat()), Point(x = (num(4)).toFloat(), y = (num(19)).toFloat()), Point(x = (num(5)).toFloat(), y = (num(41)).toFloat()))))));
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
		verticalArrangement = Arrangement.spacedBy(24.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Text(
				text = "Installed libraries",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = -0.2.sp),
			)
			Text(
				text = " coil + ycharts + compose (glide) — wired from libraries.json at build time ",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp),
			)
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = ("Coil · network images").uppercase(),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.2.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
				Text(
					text = "io.coil-kt:coil-compose",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				AsyncImage(
					model = "https://picsum.photos/seed/vesk1/200/260",
					contentDescription = "random photo one",
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(160.dp).height(208.dp),
				)
				AsyncImage(
					model = "https://picsum.photos/seed/vesk2/200/260",
					contentDescription = "random photo two",
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(160.dp).height(208.dp),
				)
				AsyncImage(
					model = "https://picsum.photos/seed/vesk3/200/260",
					contentDescription = "random photo three",
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(160.dp).height(208.dp),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = ("Glide · network images").uppercase(),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.2.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
				Text(
					text = "com.github.bumptech.glide:compose",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
				)
			}
			Row(
				modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
				horizontalArrangement = Arrangement.spacedBy(12.dp),
			) {
				GlideImage(
					model = "https://picsum.photos/seed/veskg1/200/260",
					contentDescription = "random photo one",
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(160.dp).height(208.dp),
				)
				GlideImage(
					model = "https://picsum.photos/seed/veskg2/200/260",
					contentDescription = "random photo two",
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(160.dp).height(208.dp),
				)
				GlideImage(
					model = "https://picsum.photos/seed/veskg3/200/260",
					contentDescription = "random photo three",
					modifier = Modifier.clip(RoundedCornerShape(16.dp)).width(160.dp).height(208.dp),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Row(
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.SpaceBetween,
			) {
				Text(
					text = ("YCharts · line chart").uppercase(),
					style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.2.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
				)
				Text(
					text = "co.yml:ycharts",
					style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(16.dp),
			) {
				LineChart(
					lineChartData = chart,
					modifier = Modifier.fillMaxWidth().height(224.dp).fillMaxWidth(),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth(),
		) {
			Text(
				text = ("Install more").uppercase(),
				modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
				style = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.2.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
			)
			Text(
				text = "vesk add com.github.bumptech.glide:compose@1.0.0-beta01 vesk add co.yml:ycharts@2.1.0 vesk update",
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF111827)).padding(16.dp),
				style = TextStyle(color = Color(0xFF4ADE80), fontSize = 12.sp, lineHeight = 16.sp),
			)
		}
	}
}
