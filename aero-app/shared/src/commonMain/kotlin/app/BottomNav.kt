package app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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

import androidx.compose.material3.Icon
import com.composables.icons.lucide.Heart
import com.composables.icons.lucide.House
import com.composables.icons.lucide.Lucide
import com.composables.icons.lucide.Search
import com.composables.icons.lucide.User


data class BottomNavProps(
	val active: String = "",
)

@Composable
fun BottomNav(props: BottomNavProps = BottomNavProps(), content: @Composable () -> Unit = {}) {
	Row(
		modifier = Modifier.background(Color(0xFF0A0F16)).veskSideBorder(top = 1.dp, end = 0.dp, bottom = 0.dp, start = 0.dp, Color(0xFF1B2432)).fillMaxWidth().padding(horizontal = 32.dp).padding(vertical = 10.dp),
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.SpaceBetween,
	) {
		NavLink(props = NavLinkProps(href = "/", modifier = Modifier.weight(1f)))
			{
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy(2.dp),
				) {
					if (truthy(props.active == "home")) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.House,
								contentDescription = "Home",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF0A0F16),
							)
						}
					} else {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.House,
								contentDescription = "Home",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF64748B),
							)
						}
					}
					Text(
						text = "Home",
						style = TextStyle(fontSize = 10.sp, color = Color(0xFF64748B)),
					)
				}
			}
		NavLink(props = NavLinkProps(href = "/search", modifier = Modifier.weight(1f)))
			{
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy(2.dp),
				) {
					if (truthy(props.active == "search")) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.Search,
								contentDescription = "Search",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF0A0F16),
							)
						}
					} else {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.Search,
								contentDescription = "Search",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF64748B),
							)
						}
					}
					Text(
						text = "Search",
						style = TextStyle(fontSize = 10.sp, color = Color(0xFF64748B)),
					)
				}
			}
		NavLink(props = NavLinkProps(href = "/saved", modifier = Modifier.weight(1f)))
			{
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy(2.dp),
				) {
					if (truthy(props.active == "saved")) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.Heart,
								contentDescription = "Saved",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF0A0F16),
							)
						}
					} else {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.Heart,
								contentDescription = "Saved",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF64748B),
							)
						}
					}
					Text(
						text = "Saved",
						style = TextStyle(fontSize = 10.sp, color = Color(0xFF64748B)),
					)
				}
			}
		NavLink(props = NavLinkProps(href = "/profile", modifier = Modifier.weight(1f)))
			{
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy(2.dp),
				) {
					if (truthy(props.active == "profile")) {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.surface).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.User,
								contentDescription = "Profile",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF0A0F16),
							)
						}
					} else {
						Row(
							modifier = Modifier.clip(RoundedCornerShape(9999.dp)).width(44.dp).height(44.dp),
							verticalAlignment = Alignment.CenterVertically,
							horizontalArrangement = Arrangement.Center,
						) {
							Icon(
								imageVector = Lucide.User,
								contentDescription = "Profile",
								modifier = Modifier.width(20.dp).height(20.dp),
								tint = Color(0xFF64748B),
							)
						}
					}
					Text(
						text = "Profile",
						style = TextStyle(fontSize = 10.sp, color = Color(0xFF64748B)),
					)
				}
			}
	}
}
