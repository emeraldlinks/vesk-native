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


@Composable
fun Labs(content: @Composable () -> Unit = {}) {
	val lsKey = remember { mutableStateOf("note") }
	val lsValue = remember { mutableStateOf("hello native") }
	val lsOut = remember { mutableStateOf("Nothing stored yet") }
	val ssKey = remember { mutableStateOf("page") }
	val ssValue = remember { mutableStateOf("open") }
	val ssOut = remember { mutableStateOf("Nothing stored yet") }
	val authUser = remember { mutableStateOf("alice") }
	val authPass = remember { mutableStateOf("secret") }
	val authOut = remember { mutableStateOf("No session") }
	val session = remember { mutableStateOf("") }
	val fetchUrl = remember { mutableStateOf("https://jsonplaceholder.typicode.com/todos/1") }
	val fetchOut = remember { mutableStateOf("Press Fetch to load") }
	val fetchBody = remember { mutableStateOf("") }
	val sqlItem = remember { mutableStateOf("alpha") }
	val sqlOut = remember { mutableStateOf("No rows yet") }
	val c = VeskAuth.currentUser();
	session.value = jsString(if (truthy(c)) jsString(jsMapGet(c, "username")) else "");
	Column(
		modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(vertical = 16.dp),
		verticalArrangement = Arrangement.spacedBy(16.dp),
	) {
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFAFAFA)).padding(16.dp),
		) {
			Text(
				text = ("Web storage").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF4F46E5)),
			)
			Text(
				text = "localStorage · sessionStorage",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				verticalArrangement = Arrangement.spacedBy(6.dp),
			) {
				OutlinedTextField(
					value = lsKey.value,
					onValueChange = { lsKey.value = it },
					placeholder = { Text("key") },
				)
				OutlinedTextField(
					value = lsValue.value,
					onValueChange = { lsValue.value = it },
					placeholder = { Text("value") },
				)
				@OptIn(ExperimentalLayoutApi::class)
				FlowRow(
					modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Button(
						onClick = jsSafe({ run __veskret0@ { VeskWebStorage.localSetItem(lsKey.value, lsValue.value); lsOut.value = jsString(((("Saved \"" + lsValue.value) + "\" under \"") + lsKey.value) + "\"") } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Save",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret1@ { val v = VeskWebStorage.localGetItem(lsKey.value); lsOut.value = jsString(if (truthy(v == null)) ("No value for \"" + lsKey.value) + "\"" else "Got: " + v) } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Get",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret2@ { VeskWebStorage.localRemoveItem(lsKey.value); lsOut.value = jsString(("Removed \"" + lsKey.value) + "\"") } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Remove",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret3@ { VeskWebStorage.localClear(); lsOut.value = jsString("Cleared · length " + VeskWebStorage.localLength()) } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Clear",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
					)
					}
				}
				Text(
					text = "localStorage — " + (lsOut.value).toString(),
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
				)
			}
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
				verticalArrangement = Arrangement.spacedBy(6.dp),
			) {
				OutlinedTextField(
					value = ssKey.value,
					onValueChange = { ssKey.value = it },
					placeholder = { Text("key") },
				)
				OutlinedTextField(
					value = ssValue.value,
					onValueChange = { ssValue.value = it },
					placeholder = { Text("value") },
				)
				@OptIn(ExperimentalLayoutApi::class)
				FlowRow(
					modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Button(
						onClick = jsSafe({ run __veskret4@ { VeskWebStorage.sessionSetItem(ssKey.value, ssValue.value); ssOut.value = jsString(((("Saved \"" + ssValue.value) + "\" under \"") + ssKey.value) + "\"") } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Save",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF4F46E5)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret5@ { val v = VeskWebStorage.sessionGetItem(ssKey.value); ssOut.value = jsString(if (truthy(v == null)) ("No value for \"" + ssKey.value) + "\"" else "Got: " + v) } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Get",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret6@ { VeskWebStorage.sessionClear(); ssOut.value = jsString("Cleared · length " + VeskWebStorage.sessionLength()) } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Clear",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
					)
					}
				}
				Text(
					text = "sessionStorage — " + (ssOut.value).toString(),
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFAFAFA)).padding(16.dp),
		) {
			Text(
				text = ("Auth & sessions").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF059669)),
			)
			Text(
				text = "signUp · signIn · signOut",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
			)
			Text(
				text = "Users live in native sqlite; the session persists in localStorage.",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				verticalArrangement = Arrangement.spacedBy(6.dp),
			) {
				OutlinedTextField(
					value = authUser.value,
					onValueChange = { authUser.value = it },
					placeholder = { Text("username") },
				)
				OutlinedTextField(
					value = authPass.value,
					onValueChange = { authPass.value = it },
					placeholder = { Text("password") },
				)
				@OptIn(ExperimentalLayoutApi::class)
				FlowRow(
					modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Button(
						onClick = jsSafe({ run __veskret7@ { try {
	val u = VeskAuth.signUp(authUser.value, authPass.value); 	session.value = jsString(if (truthy(u)) jsString(jsMapGet(u, "username")) else ""); 	authOut.value = jsString(if (truthy(u)) ("Created \"" + jsMapGet(u, "username")) + "\" and signed in" else "Sign up failed (taken or invalid)"); }
catch (e: Exception) {
	authOut.value = jsString("Sign up error: " + e.message); } } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF059669)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Sign up",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF059669)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret8@ { try {
	val u = VeskAuth.signIn(authUser.value, authPass.value); 	session.value = jsString(if (truthy(u)) jsString(jsMapGet(u, "username")) else ""); 	authOut.value = jsString(if (truthy(u)) "Signed in as " + jsMapGet(u, "username") else "Invalid credentials"); }
catch (e: Exception) {
	authOut.value = jsString("Sign in error: " + e.message); } } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Sign in",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret9@ { VeskAuth.signOut(); session.value = jsString(""); authOut.value = jsString("Signed out") } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Sign out",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret10@ { val u = VeskAuth.currentUser(); session.value = jsString(if (truthy(u)) jsString(jsMapGet(u, "username")) else ""); authOut.value = jsString(if (truthy(u)) "Session user: " + jsMapGet(u, "username") else "No active session") } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Who am I?",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
					)
					}
				}
				Column(modifier = Modifier.fillMaxWidth()) {
					Text(" · ")
					if (truthy(session.value)) {
						Text(
							text = ("Active session: " + session.value).toString(),
						)
					} else {
						Text(
							text = ("No session").toString(),
						)
					}
					if (truthy(VeskAuth.isSignedIn())) {
						Text(
							text = ("signed in").toString(),
						)
					} else {
						Text(
							text = ("signed out").toString(),
						)
					}
				}
				Text(
					text = (authOut.value).toString(),
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFAFAFA)).padding(16.dp),
		) {
			Text(
				text = ("Fetch").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF0284C7)),
			)
			Text(
				text = "native HTTP · fetch",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
			)
			Text(
				text = "Blocking native request on the IO dispatcher — the response is a browser-shaped VeskResponse.",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				verticalArrangement = Arrangement.spacedBy(6.dp),
			) {
				OutlinedTextField(
					value = fetchUrl.value,
					onValueChange = { fetchUrl.value = it },
					placeholder = { Text("https://...") },
				)
				@OptIn(ExperimentalLayoutApi::class)
				FlowRow(
					modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Button(
						onClick = jsSafe({ run __veskret11@ { try {
	val res = VeskFetch.fetch(fetchUrl.value); 	if (truthy(res.status == 0)) {
		fetchOut.value = jsString("Network error: " + res.statusText); 		fetchBody.value = jsString("(no response)"); 	} else {
		fetchOut.value = jsString(("HTTP " + res.status) + (if (truthy(res.ok)) " OK" else " failed")); 		val `data` = if (truthy(res.ok)) res.json() else null; 		fetchBody.value = jsString(if (truthy(`data`)) jsString(jsMapGet(`data`, "title")) else "(no title)"); 	}
}
catch (e: Exception) {
	fetchOut.value = jsString("Fetch error: " + e.message); 	fetchBody.value = jsString(""); } } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF0284C7)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Fetch",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF0284C7)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
				}
				Text(
					text = (fetchOut.value).toString(),
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
				)
				Text(
					text = "title: " + (fetchBody.value).toString(),
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFAFAFA)).padding(16.dp),
		) {
			Text(
				text = ("SQLite").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFFD97706)),
			)
			Text(
				text = "openSqlite · native tables",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
			)
			Text(
				text = "better-sqlite3-style surface: exec / run / all. Rows are maps with computed-key reads.",
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				verticalArrangement = Arrangement.spacedBy(6.dp),
			) {
				OutlinedTextField(
					value = sqlItem.value,
					onValueChange = { sqlItem.value = it },
					placeholder = { Text("item name") },
				)
				@OptIn(ExperimentalLayoutApi::class)
				FlowRow(
					modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
					horizontalArrangement = Arrangement.spacedBy(8.dp),
				) {
					Button(
						onClick = jsSafe({ run __veskret12@ { try {
	val db = VeskSqlite.openDatabase("labs"); 	db.exec("CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, qty INTEGER NOT NULL)"); 	db.run("INSERT INTO items (name, qty) VALUES (?, ?)", listOf(sqlItem.value, 1)); 	val rows = db.all("SELECT id, name, qty FROM items ORDER BY id"); 	sqlOut.value = jsString((("rows: " + jsLength(rows)) + " → ") + rows.map { row -> (((("#" + jsIndex(row, "id")) + " ") + jsIndex(row, "name")) + " x") + jsIndex(row, "qty") }.toString()); }
catch (e: Exception) {
	sqlOut.value = jsString("Error: " + e.message); } } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFD97706)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Insert & list",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFFD97706)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret13@ { try {
	val db = VeskSqlite.openDatabase("labs"); 	val rows = db.all("SELECT id, name, qty FROM items ORDER BY id"); 	sqlOut.value = jsString((("rows: " + jsLength(rows)) + " → ") + rows.map { row -> (((("#" + jsIndex(row, "id")) + " ") + jsIndex(row, "name")) + " x") + jsIndex(row, "qty") }.toString()); }
catch (e: Exception) {
	sqlOut.value = jsString("Error: " + e.message); } } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "List rows",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(Color(0xFF111827)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = Color(0xFFFFFFFF), fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
					)
					}
					Button(
						onClick = jsSafe({ run __veskret14@ { try {
	val db = VeskSqlite.openDatabase("labs"); 	db.exec("DROP TABLE IF EXISTS items"); 	sqlOut.value = jsString("Table dropped"); }
catch (e: Exception) {
	sqlOut.value = jsString("Error: " + e.message); } } }),
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)),
						shape = RoundedCornerShape(9999.dp),
						colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = MaterialTheme.colorScheme.onSurface),
						elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
						contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
					) {
					Text(
						text = "Drop table",
						modifier = Modifier.clip(RoundedCornerShape(9999.dp)).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)).padding(horizontal = 16.dp).padding(vertical = 8.dp),
						style = TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
					)
					}
				}
				Text(
					text = (sqlOut.value).toString(),
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
				)
			}
		}
		Column(
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFAFAFA)).padding(16.dp),
		) {
			Text(
				text = ("Navigation").uppercase(),
				modifier = Modifier.fillMaxWidth(),
				style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, color = Color(0xFF4F46E5)),
			)
			Text(
				text = "Routes · script navigation",
				modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
				style = TextStyle(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
			)
			Column(
				modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
				verticalArrangement = Arrangement.spacedBy(8.dp),
			) {
				NavLink(props = NavLinkProps(href = "/flights/AA-123?seat=12A", `class` = "bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-full self-start"))
					{
						Text(
							text = " Open /flights/AA-123?seat=12A (dynamic route + query) ",
						)
					}
				Text(
					text = "The [id] route segment arrives as a typed prop; useParams()/useQuery() destructure in scripts and the router handle pushes/backs/refreshes.",
					modifier = Modifier.fillMaxWidth(),
					style = TextStyle(fontSize = 12.sp, color = Color(0xFF6B7280), lineHeight = 18.sp),
				)
			}
		}
		Text(
			text = "storage · auth · fetch · sqlite — all native Kotlin, no JS",
			modifier = Modifier.fillMaxWidth(),
			style = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)),
		)
	}
}
