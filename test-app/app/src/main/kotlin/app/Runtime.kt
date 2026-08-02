package app

import androidx.compose.runtime.Composable

// Native counterparts of @vesk/runtime exports referenced by copied .vsk files.
// Content is rendered via the trailing lambda; real navigation arrives in Phase 3.

fun truthy(v: Any?): Boolean = when (v) {
    null -> false
    is Boolean -> v
    is String -> v.isNotEmpty()
    is Number -> v != 0
    else -> true
}

fun num(v: Any?): Double = when (v) {
    is Number -> v.toDouble()
    is String -> v.toDoubleOrNull() ?: 0.0
    is Boolean -> if (v) 1.0 else 0.0
    else -> 0.0
}

data class LinkProps(
    val href: String = "",
    val `class`: String = "",
)

@Composable
fun Link(props: LinkProps, content: @Composable () -> Unit = {}) {
    content()
}

data class NavLinkProps(
    val href: String = "",
    val `class`: String = "",
)

@Composable
fun NavLink(props: NavLinkProps, content: @Composable () -> Unit = {}) {
    content()
}
