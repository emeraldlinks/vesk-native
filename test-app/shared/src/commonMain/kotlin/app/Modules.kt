package app

import app.lab_js_helper_jsTagline as jsTagline
import app.lab_js_helper_jsMotto as jsMotto
import app.lab_js_helper_jsYear as jsYear
import app.lab_utils_titleCase as titleCase
import app.lab_utils_clamp as clamp
import app.lab_utils_shippedFrom as shippedFrom

val lab_js_helper_jsTagline = "imported from a plain .js file";
val lab_js_helper_jsMotto = "no TypeScript needed";
fun lab_js_helper_jsYear(): Any? = run<Any?> __veskfn0@ {
return@__veskfn0 2026;
}

fun lab_utils_titleCase(s: String): String = run<String> __veskfn0@ {
return@__veskfn0 s.split(" ").toMutableList().map { w -> w.uppercase().get(0) + w.lowercase().substring(1) }.joinToString(" ");
}
fun lab_utils_clamp(x: Double, lo: Double, hi: Double): Double = run<Double> __veskfn1@ {
return@__veskfn1 kotlin.math.min(hi, kotlin.math.max(lo, x));
}
val lab_utils_shippedFrom = "lab/utils.ts";
