package app

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.SpringSpec
import androidx.compose.animation.core.TweenSpec
import androidx.compose.animation.core.animateTo
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.unit.Dp
import app.navigation.LocalNavController
import kotlin.time.TimeSource
import kotlin.math.pow
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch


// Native counterparts of @vesk/runtime exports referenced by copied .vsk files.

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


// Tailwind color filter base: color-matrix saveLayer; works on all API levels.
private fun Modifier.veskColorFilter(matrix: ColorMatrix): Modifier = drawWithContent {
    val paint = Paint().apply { colorFilter = ColorFilter.colorMatrix(matrix) }
    drawContext.canvas.saveLayer(Rect(0f, 0f, size.width, size.height), paint)
    drawContent()
    drawContext.canvas.restore()
}


fun Modifier.veskGrayscale(factor: Float): Modifier = veskColorFilter(
    ColorMatrix().also { it.setToSaturation(1f - factor) }
)


// Dashed/dotted borders (border-dashed / border-dotted) drawn as strokes
// behind the element content.
fun Modifier.veskDashedBorder(width: Dp, color: Color, dashes: FloatArray): Modifier = drawBehind {
    val stroke = Stroke(width = width.toPx(), pathEffect = PathEffect.dashPathEffect(dashes))
    drawRoundRect(color = color, style = stroke)
}


// Per-side borders (border-t/r/b/l, border-x/y).
fun Modifier.veskSideBorder(top: Dp, end: Dp, bottom: Dp, start: Dp, color: Color): Modifier = drawBehind {
    val w = floatArrayOf(top.toPx(), end.toPx(), bottom.toPx(), start.toPx())
    val s = size
    if (w[0] > 0f) drawLine(color, Offset(0f, w[0] / 2f), Offset(s.width, w[0] / 2f), w[0])
    if (w[1] > 0f) drawLine(color, Offset(s.width - w[1] / 2f, 0f), Offset(s.width - w[1] / 2f, s.height), w[1])
    if (w[2] > 0f) drawLine(color, Offset(0f, s.height - w[2] / 2f), Offset(s.width, s.height - w[2] / 2f), w[2])
    if (w[3] > 0f) drawLine(color, Offset(w[3] / 2f, 0f), Offset(w[3] / 2f, s.height), w[3])
}


// Scroll state for overflow-y-auto / overflow-x-auto containers. The scroll
// wrapper (typically a layout shell) stays in composition across navigations,
// so plain rememberScrollState would resume the previous page's offset. The
// NavController keeps one ScrollState per route on the stack: a page that was
// never visited (or was popped) starts at the top; going back restores the
// exact offset the page had when it was left — NavHost-style behaviour.
@Composable
fun rememberRouteScrollState(initial: Int = 0): ScrollState {
    val nav = LocalNavController.current
    val route = nav.currentRoute.value
    return remember(route) { nav.scrollStateFor(route, initial) }
}


data class NavLinkProps(
    val href: String = "",
    val `class`: String = "",
)

@Composable
fun NavLink(props: NavLinkProps, content: @Composable () -> Unit = {}) {
    val nav = LocalNavController.current
    Box(modifier = Modifier.clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }, onClick = { nav.navigate(props.href) })) {
        content()
    }
}


fun jsString(v: Any?): String = when (v) {
    null -> "null"
    is String -> v
    else -> v.toString()
}


// Platform seam: uncaught exceptions in event handlers, timers, and callbacks
// are reported and the app keeps running — an error in one interaction never
// takes the app down (browser window.onerror semantics). Android logs to
// Logcat; the iOS actual arrives with the CMP milestone.
expect fun jsHandleError(e: Throwable)

// Wrap an event-handler lambda so a throw reports instead of crashing: the
// browser fires window.onerror and the page keeps running, and so do we.
fun jsSafe(fn: () -> Unit): () -> Unit = { try { fn() } catch (e: Throwable) { jsHandleError(e) } }


fun jsStringify(v: Any?): String = when (v) {
    null -> "null"
    is String -> "\"$v\""
    is Boolean -> v.toString()
    is Number -> v.toString()
    is List<*> -> v.joinToString(",", "[", "]") { jsStringify(it) }
    is Map<*, *> -> v.entries.joinToString(",", "{", "}") { "\"${it.key}\": ${jsStringify(it.value)}" }
    else -> "\"${v.toString()}\""
}


fun jsMapGet(map: Any?, key: Any?): Any? = (map as? Map<*, *>)?.get(key)


fun jsHas(coll: Any?, key: Any?): Boolean = when (coll) {
    is Map<*, *> -> coll.containsKey(key)
    is Set<*> -> coll.contains(key)
    else -> false
}


fun jsMapKeys(map: Any?): Set<Any?> = (map as Map<*, *>).keys


fun jsSize(coll: Any?): Int = when (coll) {
    is List<*> -> coll.size
    is Set<*> -> coll.size
    is Map<*, *> -> coll.size
    is String -> coll.length
    else -> 0
}


fun jsLength(coll: Any?): Int = when (coll) {
    is String -> coll.length
    is CharSequence -> coll.length
    is List<*> -> coll.size
    is Set<*> -> coll.size
    is Map<*, *> -> coll.size
    is Array<*> -> coll.size
    else -> 0
}


object VeskTimers {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val jobs = mutableMapOf<Int, Job>()
    private var nextId = 1
    fun setTimeout(fn: () -> Unit, ms: Any? = 0): Int {
        val id = nextId++
        jobs[id] = scope.launch { delay(ms?.let { num(it) }?.toLong() ?: 0L); jobs.remove(id); try { fn() } catch (e: Throwable) { jsHandleError(e) } }
        return id
    }
    fun setInterval(fn: () -> Unit, ms: Any? = 0): Int {
        val id = nextId++
        jobs[id] = scope.launch { while (isActive) { delay(ms?.let { num(it) }?.toLong() ?: 0L); try { fn() } catch (e: Throwable) { jsHandleError(e) } } }
        return id
    }
    fun clearTimeout(id: Any?) { jobs.remove(num(id).toInt())?.cancel() }
    fun clearInterval(id: Any?) { jobs.remove(num(id).toInt())?.cancel() }
}


// Platform seam: JSON.parse. Android actual = org.json (bundled with the
// platform), unchanged; the iOS actual arrives with the CMP milestone.
expect fun jsParseJson(s: Any?): Any?

// scroll(onScroll, { axis }): reports scroll progress (0..1) of the current
// route's scroll container — the same ScrollState the layout shell uses, so
// progress follows the page content.
@Composable
fun motionScroll(onScroll: Any?, options: Any? = null) {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val axis = opts["axis"] as? String ?: "y"
    val nav = LocalNavController.current
    val route = nav.currentRoute.value
    val state = remember(route) { nav.scrollStateFor(route, 0) }
    val cb = onScroll as? (Any?) -> Unit ?: return
    LaunchedEffect(state, axis, cb) {
        snapshotFlow { state.value }.collect { v ->
            val max = state.maxValue.toFloat().coerceAtLeast(1f)
            cb(num(v) / max)
        }
    }
}


// Platform seam: the coroutine dispatcher that carries a MonotonicFrameClock
// so Animatable/animateTo can animate (plain Dispatchers.Main crashes without
// one). Android's compose main dispatcher provides it; the iOS actual arrives
// with the CMP milestone.
internal expect fun motionDispatcher(): kotlin.coroutines.CoroutineContext

// Platform seam: the viewport size motionInView uses to test element
// intersection against the bounds captured by the motionGraphics
// onGloballyPositioned hook. Android reports the display size; the iOS actual
// arrives with the CMP milestone.
@Composable
expect fun motionViewportSize(): androidx.compose.ui.unit.IntSize

// motion (motion.dev) native mappings. The easing constants are the real
// motion-utils values verified against the installed motion@13 source: easeIn
// = cubicBezier(0.42,0,1,1), easeOut = cubicBezier(0,0,0.58,1), easeInOut =
// cubicBezier(0.42,0,0.58,1), backOut = cubicBezier(0.33,1.53,0.69,0.99),
// and backIn/circIn* come from motion-utils' reverseEasing/mirrorEasing
// modifiers. motion's spring stiffness/damping/mass map onto Compose
// SpringSpec through the critical damping ratio (damping / 2*sqrt(mass*
// stiffness)); tuning scales differ between the engines, so springs are
// approximate by design.
class MotionRef {
    var alpha: Float by mutableStateOf(1f)
    var scaleX: Float by mutableStateOf(1f)
    var scaleY: Float by mutableStateOf(1f)
    var translateX: Float by mutableStateOf(0f)
    var translateY: Float by mutableStateOf(0f)
    var rotate: Float by mutableStateOf(0f)
    var bounds: Rect? = null
    var visible: Boolean by mutableStateOf(false)
    var entered: Boolean by mutableStateOf(false)
    internal var viewportW: Int = 0
    internal var viewportH: Int = 0
    fun onPositioned(b: Rect) {
        bounds = b
        updateVisibility()
    }
    fun updateViewport(w: Int, h: Int) {
        viewportW = w
        viewportH = h
        updateVisibility()
    }
    private fun updateVisibility() {
        val b = bounds ?: return
        val overlaps = b.left < viewportW && b.top < viewportH && b.right > 0f && b.bottom > 0f
        visible = overlaps
        if (overlaps) entered = true
    }
}

@Composable
fun rememberMotionRef(): MotionRef = remember { MotionRef() }

// Markup hook: the compiler appends this modifier when an element has
// ref={cell}. graphicsLayer drives alpha/scale/translation/rotation from the
// ref's state (Compose re-layers on state reads), and onGloballyPositioned
// feeds the ref the viewport-relative bounds for inView checks.
fun Modifier.motionGraphics(ref: MotionRef): Modifier = composed {
    val vs = motionViewportSize()
    ref.updateViewport(vs.width, vs.height)
    graphicsLayer {
        alpha = ref.alpha
        scaleX = ref.scaleX
        scaleY = ref.scaleY
        translationX = ref.translateX
        translationY = ref.translateY
        rotationZ = ref.rotate
    }.onGloballyPositioned { ref.onPositioned(it.boundsInRoot()) }
}

val easeIn: Easing = CubicBezierEasing(0.42f, 0f, 1f, 1f)
val easeOut: Easing = CubicBezierEasing(0f, 0f, 0.58f, 1f)
val easeInOut: Easing = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)
val backOut: Easing = CubicBezierEasing(0.33f, 1.53f, 0.69f, 0.99f)
val backIn: Easing = Easing { p -> 1f - backOut.transform(1f - p) }
val backInOut: Easing = Easing { p -> if (p <= 0.5f) backIn.transform(p * 2f) / 2f else (2f - backIn.transform(2f * (1f - p))) / 2f }
val circIn: Easing = Easing { p -> (1.0 - kotlin.math.sin(kotlin.math.acos(p.toDouble()))).toFloat() }
val circOut: Easing = Easing { p -> (1.0 - kotlin.math.sin(kotlin.math.acos((1f - p).toDouble()))).toFloat() }
val circInOut: Easing = Easing { p -> if (p <= 0.5f) circIn.transform(p * 2f) / 2f else (2f - circIn.transform(2f * (1f - p))) / 2f }
val anticipate: Easing = Easing { p ->
    if (p >= 1f) 1f
    else {
        val q = p * 2f
        if (q < 1f) 0.5f * backIn.transform(q)
        else 0.5f * (2f - (2.0).pow((-10f * (q - 1f)).toDouble()).toFloat())
    }
}

fun motionEase(v: Any?): Easing = when {
    v is Easing -> v
    v is String -> when (v) {
        "linear" -> LinearEasing
        "easeIn" -> easeIn
        "easeOut" -> easeOut
        "easeInOut" -> easeInOut
        "circIn" -> circIn
        "circOut" -> circOut
        "circInOut" -> circInOut
        "backIn" -> backIn
        "backOut" -> backOut
        "backInOut" -> backInOut
        "anticipate" -> anticipate
        else -> easeOut
    }
    v is List<*> && v.size == 4 -> CubicBezierEasing(num(v[0]).toFloat(), num(v[1]).toFloat(), num(v[2]).toFloat(), num(v[3]).toFloat())
    else -> easeOut
}

fun motionCubicBezier(x1: Any?, y1: Any?, x2: Any?, y2: Any?): Easing =
    CubicBezierEasing(num(x1).toFloat(), num(y1).toFloat(), num(x2).toFloat(), num(y2).toFloat())

fun motionReverseEasing(easing: Any?): Easing {
    val e = easing as? Easing ?: easeInOut
    return Easing { p -> 1f - e.transform(1f - p) }
}

fun motionMirrorEasing(easing: Any?): Easing {
    val e = easing as? Easing ?: easeInOut
    return Easing { p -> if (p <= 0.5f) e.transform(p * 2f) / 2f else (2f - e.transform(2f * (1f - p))) / 2f }
}

fun motionSteps(numSteps: Any?, direction: Any? = "end"): Easing {
    val steps = kotlin.math.max(1, num(numSteps).toInt())
    val dir = direction as? String ?: "end"
    return Easing { p ->
        val progress = if (dir == "end") kotlin.math.min(p, 0.999f) else kotlin.math.max(p, 0.001f)
        val expanded = progress * steps
        val rounded = if (dir == "end") kotlin.math.floor(expanded.toDouble()) else kotlin.math.ceil(expanded.toDouble())
        (kotlin.math.max(0.0, kotlin.math.min(1.0, rounded / steps))).toFloat()
    }
}

fun motionSpring(options: Any? = null): SpringSpec<Float> {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val stiffness = num(jsMapGet(opts, "stiffness")).let { if (it > 0.0) it.toFloat() else 100f }
    val damping = num(jsMapGet(opts, "damping")).let { if (it > 0.0) it.toFloat() else 10f }
    val mass = num(jsMapGet(opts, "mass")).let { if (it > 0.0) it.toFloat() else 1f }
    val restDelta = num(jsMapGet(opts, "restDelta")).let { if (it > 0.0) it.toFloat() else 0.01f }
    val dampingRatio = damping / (2f * kotlin.math.sqrt((mass * stiffness).toDouble()).toFloat())
    return SpringSpec(dampingRatio = dampingRatio, stiffness = stiffness, visibilityThreshold = restDelta)
}

fun motionTween(options: Any? = null): TweenSpec<Float> {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val duration = (num(jsMapGet(opts, "duration")) * 1000.0).toInt().let { if (it > 0) it else 300 }
    val delayMs = (num(jsMapGet(opts, "delay")) * 1000.0).toInt().coerceAtLeast(0)
    val ease = motionEase(jsMapGet(opts, "ease"))
    return TweenSpec(durationMillis = duration, delay = delayMs, easing = ease)
}

private fun motionSpecFor(opts: Map<*, *>): AnimationSpec<Float> {
    val spring = jsMapGet(opts, "spring")
    if (spring is SpringSpec<*>) return spring as SpringSpec<Float>
    val tween = jsMapGet(opts, "tween")
    if (tween is TweenSpec<*>) return tween as TweenSpec<Float>
    return if (jsString(jsMapGet(opts, "type")) == "spring") motionSpring(opts) else motionTween(opts)
}

private fun optFn(opts: Map<*, *>, key: String): ((Any?) -> Unit)? {
    val v = jsMapGet(opts, key) ?: return null
    if (v is Function1<*, *>) {
        @Suppress("UNCHECKED_CAST")
        return v as (Any?) -> Unit
    }
    if (v is Function0<*>) {
        @Suppress("UNCHECKED_CAST")
        val f = v as () -> Unit
        return { f() }
    }
    return null
}

class MotionControls {
    internal var job: Job? = null
    var time: Double = 0.0
    var speed: Double = 1.0
    var finished: kotlinx.coroutines.Deferred<Boolean>? = null
    fun bind(j: Job, f: kotlinx.coroutines.Deferred<Boolean>) { job = j; finished = f }
    fun stop() { job?.cancel() }
    fun pause() { job?.cancel() }
    fun play() { }
    fun complete() { job?.cancel() }
    fun cancel() { job?.cancel() }
}

fun motionAnimate(from: Any?, to: Any?, options: Any? = null): MotionControls {
    if (from is MotionRef) return motionAnimateElement(from, to, options)
    return motionAnimateNumber(from, to, options)
}

private fun motionAnimateNumber(from: Any?, to: Any?, options: Any?): MotionControls {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val onUpdate = optFn(opts, "onUpdate")
    val onComplete = optFn(opts, "onComplete")
    val onStop = optFn(opts, "onStop")
    val delaySec = num(jsMapGet(opts, "delay"))
    val repeat = (jsMapGet(opts, "repeat") as? Number)?.toDouble() ?: 0.0
    val repeatType = jsString(jsMapGet(opts, "repeatType")).let { if (it == "reverse" || it == "mirror") it else "loop" }
    val repeatDelay = num(jsMapGet(opts, "repeatDelay"))
    val spec = motionSpecFor(opts)
    val scope = CoroutineScope(SupervisorJob() + motionDispatcher())
    val controls = MotionControls()
    val job = scope.launch {
        if (delaySec > 0) delay((delaySec * 1000.0).toLong())
        val start = num(from).toFloat()
        val target = num(to).toFloat()
        val t0 = TimeSource.Monotonic.markNow()
        var iteration = 0
        while (isActive && (repeat == Double.POSITIVE_INFINITY || iteration <= repeat)) {
            val isReversed = repeatType != "loop" && iteration % 2 == 1
            val cur = if (isReversed) target else start
            val dst = if (isReversed) start else target
            val anim = Animatable(cur)
            anim.animateTo(dst, spec) {
                controls.time = t0.elapsedNow().inWholeNanoseconds / 1_000_000_000.0
                onUpdate?.invoke(this.value)
            }
            if (repeat > 0.0 && iteration < repeat) {
                if (repeatDelay > 0) delay((repeatDelay * 1000.0).toLong())
                iteration++
            } else {
                break
            }
        }
        onComplete?.invoke(null)
    }
    val finished = scope.async { job.join(); true }
    controls.bind(job, finished)
    controls.job = job
    return controls
}

private fun motionAnimateElement(ref: MotionRef, props: Any?, options: Any?): MotionControls {
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val target = props as? Map<*, *> ?: emptyMap<Any, Any>()
    val onComplete = optFn(opts, "onComplete")
    val spec = motionSpecFor(opts)
    val scope = CoroutineScope(SupervisorJob() + motionDispatcher())
    val controls = MotionControls()
    val job = scope.launch {
        val running = target.mapNotNull { (k, v) ->
            val value = (v as? List<*>)?.lastOrNull() ?: v
            val dst = num(value).toFloat()
            var get: (() -> Float)? = null
            var set: ((Float) -> Unit)? = null
            when (k.toString()) {
                "opacity" -> { get = { ref.alpha }; set = { ref.alpha = it } }
                "scale", "scaleX" -> { get = { ref.scaleX }; set = { ref.scaleX = it } }
                "scaleY" -> { get = { ref.scaleY }; set = { ref.scaleY = it } }
                "translateX", "x" -> { get = { ref.translateX }; set = { ref.translateX = it } }
                "translateY", "y" -> { get = { ref.translateY }; set = { ref.translateY = it } }
                "rotate" -> { get = { ref.rotate }; set = { ref.rotate = it } }
            }
            if (get != null && set != null) Triple(get, set, dst) else null
        }
        running.map { (get, set, dst) ->
            launch {
                val anim = Animatable(get())
                anim.animateTo(dst, spec) { set(this.value) }
            }
        }.forEach { it.join() }
        onComplete?.invoke(null)
    }
    val finished = scope.async { job.join(); true }
    controls.bind(job, finished)
    return controls
}

// motion-utils delay(callback, ms) -> setTimeout with a cancel cleanup.
fun motionDelay(callback: Any?, timeout: Any?): () -> Unit {
    val id = VeskTimers.setTimeout(callback as? () -> Unit ?: {}, timeout)
    return { VeskTimers.clearTimeout(id) }
}


// inView(ref, onStart, { once }): fires when the ref'd element intersects the
// viewport (the element's bounds come from the motionGraphics
// onGloballyPositioned hook; the viewport is the display size).
@Composable
fun motionInView(ref: Any?, onEnter: Any?, options: Any? = null) {
    val target = ref as? MotionRef ?: return
    val cb = onEnter as? () -> Unit ?: return
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val once = jsMapGet(opts, "once")?.let { truthy(it) } ?: true
    LaunchedEffect(target, once) {
        val flow = snapshotFlow { target.entered }
        if (once) {
            flow.filter { it }.take(1).collect { cb() }
        } else {
            flow.filter { it }.collect { cb() }
        }
    }
}


// motion-utils stagger(duration, { startDelay, from }): per-index delay.
// The callback form carries a total that vesk scripts rarely know, so the
// from-index default of 0 is assumed (distance = index). The ease option is
// not applied for the same reason (it needs the total).
fun motionStagger(i: Any?, duration: Any?, options: Any? = null): Double {
    val d = num(duration).let { if (it > 0.0) it else 0.1 }
    val opts = options as? Map<*, *> ?: emptyMap<Any, Any>()
    val startDelay = num(jsMapGet(opts, "startDelay"))
    val from = num(jsMapGet(opts, "from"))
    return startDelay + d * kotlin.math.abs(from - num(i))
}

