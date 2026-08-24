# Tailwind v3 utility inventory (vesk-native)

Complete default-theme utility inventory for Tailwind CSS v3.4, mapped to the
vesk-native Compose codegen. This file is the source of truth for coverage:
**every** namespace below has a row in the data-driven `UTILITIES` table in
`packages/compiler-native/src/tailwind.ts`. No utility is ever integrated by a
hand-written `if (cls.startsWith(...))` chain — matching, value resolution,
arbitrary values, color opacity, variants and bucket ordering are all handled
by the generic tokenizer.

## Status legend

| Mark | Meaning |
|------|---------|
| ✅ | native Compose output (real effect) |
| 🟡 | approximated (semantics close, not pixel-identical) |
| 🔶 | partial (some values implemented, rest dropped) |
| ❌ | not expressible in Compose layout — recognized, dropped with a note |

---

## 1. Layout

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Aspect Ratio | `aspect-auto`, `aspect-square`, `aspect-video`, `aspect-[4/3]` | `Modifier.aspectRatio(...)` | ✅ |
| Container | `container` | `widthIn(max = 1280.dp)` (no centering) | 🟡 |
| Columns | `columns-1..12`, `columns-3xs..7xl`, `columns-auto` | — | ❌ (CSS multi-column) |
| Box Decoration Break | `box-decoration-clone`, `box-decoration-slice` | — | ❌ |
| Box Sizing | `box-border`, `box-content` | — | ❌ (Compose has no content-box) |
| Display | `block`, `inline-block`, `inline`, `flex`, `inline-flex`, `grid`, `inline-grid`, `table`, `table-*`, `flow-root`, `contents`, `list-item`, `hidden` | `hidden` → element skipped; `flex` → row; rest → ❌ | 🔶 |
| Floats | `float-right`, `float-left`, `float-none` | — | ❌ |
| Clear | `clear-left`, `clear-right`, `clear-both`, `clear-none` | — | ❌ |
| Isolation | `isolate`, `isolation-auto` | — | ❌ |
| Object Fit | `object-contain`, `object-cover`, `object-fill`, `object-none`, `object-scale-down` | `Modifier.*` via `ContentScale.*` | ✅ |
| Object Position | `object-bottom`, `object-center`, `object-left`, ... | — | ❌ |
| Overflow | `overflow-auto/visible/hidden/scroll/clip`, `overflow-x-*`, `overflow-y-*` | `overflow-hidden` → `clip(...)`; `overflow-y-auto/scroll` → `verticalScroll(rememberScrollState())`; `overflow-x-*` → `horizontalScroll(...)`; `x-hidden/y-hidden` → `clip(...)` | ✅ |
| Overscroll | `overscroll-auto/contain/none`, `overscroll-x-*`, `overscroll-y-*` | — | ❌ |
| Position | `static`, `fixed`, `absolute`, `relative`, `sticky` | — | ❌ (Compose is flow layout) |
| Inset | `inset-*`, `top-*`, `right-*`, `bottom-*`, `left-*` | — | ❌ |
| Visibility | `visible`, `invisible`, `collapse` | `invisible` → `alpha(0f)`; rest → ❌ | 🟡 |
| Z-Index | `z-0`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`, `z-auto` | `Modifier.zIndex(f)` | ✅ |

## 2. Flexbox & Grid

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Flex Basis | `basis-*`, `basis-auto/full`, `basis-[N%]`, `basis-[Ndp]` | `fillMaxWidth(f)`/`fillMaxHeight(f)` for fractions; `width(dp)`/`height(dp)` for dp values; `basis-auto` → no-op | 🟡 |
| Flex Direction | `flex-row`, `flex-row-reverse`, `flex-col`, `flex-col-reverse` | container axis | ✅ |
| Flex Wrap | `flex-wrap`, `flex-wrap-reverse`, `flex-nowrap` | container switches to `FlowRow`/`FlowColumn` (`@OptIn(ExperimentalLayoutApi)`) | ✅ |
| Flex | `flex-1`, `flex-auto`, `flex-initial`, `flex-none` | `flex-1`/`flex-auto` → `Modifier.weight(1f)`; `flex-0`/`flex-initial`/`flex-none` → dropped (default behavior) | 🟡 |
| Flex Grow | `grow`, `grow-0` | `grow` → `weight(1f)`; `grow-0` → dropped (default weight=0) | 🟡 |
| Flex Shrink | `shrink`, `shrink-0` | no-op (default behavior in Compose) | 🟡 |
| Order | `order-1..12`, `order-first/last/none` | — | ❌ (Compose order = source order) |
| Grid Template Columns | `grid-cols-1..12`, `grid-cols-none/subgrid` | — | ❌ |
| Grid Template Rows | `grid-rows-1..12`, `grid-rows-none/subgrid` | — | ❌ |
| Grid Auto Flow | `grid-flow-row/col/dense/row-dense/col-dense` | — | ❌ |
| Grid Column | `col-auto`, `col-span-1..12`, `col-span-full`, `col-start-*`, `col-end-*` | — | ❌ |
| Grid Row | `row-auto`, `row-span-1..12`, `row-span-full`, `row-start-*`, `row-end-*` | — | ❌ |
| Grid Auto Columns/Rows | `auto-cols-*`, `auto-rows-*` | — | ❌ |
| Gap | `gap-*`, `gap-x-*`, `gap-y-*` | `Arrangement.spacedBy(dp)` on container axis | ✅ |
| Justify Content | `justify-center/start/end/between/around/evenly` | `Arrangement.*` on container axis | ✅ |
| Justify Items | `justify-items-*` | — | ❌ |
| Justify Self | `justify-self-*` | — | ❌ |
| Align Content | `content-center/start/end/between/around/evenly` | — | ❌ |
| Align Items | `items-start/center/end` (+`stretch/baseline`) | `Alignment.*` on container axis | 🔶 |
| Align Self | `self-auto/start/center/end/stretch` | `Modifier.align(...)` inside Row/Column; `self-stretch` → `fillMax*()`; top-level stripped | 🟡 |
| Place Content | `place-content-*` | — | ❌ |
| Place Items | `place-items-*` | — | ❌ |
| Place Self | `place-self-*` | — | ❌ |

## 3. Spacing

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Padding | `p-*`, `px-*`, `py-*`, `pt-*`, `pr-*`, `pb-*`, `pl-*` | `Modifier.padding(...)` | ✅ |
| Margin | `m-*`, `mx-*`, `my-*`, `mt-*`, `mr-*`, `mb-*`, `ml-*`, `-m-*`, ... | positive → `Modifier.padding(...)`; negative → `Modifier.offset(x/y = -dp)` (approximation); `m-auto` → silently dropped (Compose centering via Arrangement) | 🟡 |
| Space Between | `space-x-*`, `space-y-*`, `space-x-reverse`, `space-y-reverse` | `spacedBy(dp)` on container axis; `*-reverse` → dropped (no Compose equivalent) | 🔶 |

## 4. Sizing

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Width | `w-0..w-96`, `w-px`, `w-1/2`, `w-full`, `w-screen`, `w-min/max/fit`, `w-[3.5rem]`, `w-svw/dvw/lvw` | `width(dp)`, `fillMaxWidth(f)`; `w-svw/dvw/lvw` → `fillMaxWidth()` (approximated as 100%) | 🟡 |
| Min-Width | `min-w-0`, `min-w-full`, `min-w-min/max/fit` | `widthIn(min = 0.dp)`; `min-w-full` → `fillMaxWidth()` | 🟡 |
| Max-Width | `max-w-0`, `max-w-xs..7xl`, `max-w-full`, `max-w-screen-*`, `max-w-prose`, `max-w-min/max/fit` | `widthIn(max = dp)` for named sizes; `max-w-screen-*` supported | ✅ |
| Height | `h-*`, `h-1/2`, `h-full`, `h-screen`, `h-svh/dvh/lvh` | `height(dp)`, `fillMaxHeight(f)`; `h-svh/dvh/lvh` → `fillMaxHeight()` (approximated as 100%) | 🟡 |
| Min-Height | `min-h-0`, `min-h-full`, `min-h-screen` | `heightIn(min = 0.dp)`; `min-h-screen` → `fillMaxHeight()` | 🟡 |
| Max-Height | `max-h-*` | `heightIn(max = dp)` for numeric values | 🟡 |
| Size | `size-*`, `size-full`, `size-1/2`, `size-svw/dvh/lvh` | `Modifier.size(dp)` for dp values; `size-*` for fractions → `fillMaxWidth(f)` + `fillMaxHeight(f)`; `size-svw/dvh/lvh` → `fillMaxWidth()` + `fillMaxHeight()` | ✅ |

## 5. Typography

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Font Family | `font-sans`, `font-serif`, `font-mono` | `fontFamily = FontFamily.*` | ✅ |
| Font Size | `text-xs..9xl` | `fontSize = N.sp` (+ paired `lineHeight`) | ✅ |
| Font Smoothing | `antialiased`, `subpixel-antialiased` | — | ❌ (no-op on Android) |
| Font Style | `italic`, `not-italic` | `fontStyle = FontStyle.Italic` / `FontStyle.Normal` | ✅ |
| Font Weight | `font-thin..font-black` | `fontWeight = FontWeight.*` | ✅ |
| Font Variant Numeric | `normal-nums`, `ordinal`, `slashed-zero`, `lining-nums`, `oldstyle-nums`, `proportional-nums`, `tabular-nums`, `diagonal-fractions`, `stacked-fractions` | — | ❌ |
| Letter Spacing | `tracking-tighter..widest` | `letterSpacing = N.sp` | ✅ |
| Line Clamp | `line-clamp-1..6`, `line-clamp-none` | `Text(maxLines = N)` | ✅ |
| Line Height | `leading-3..10`, `leading-none`, `leading-tight..loose` | `lineHeight = N.sp` (named multipliers approximated against 16sp) | ✅ |
| List Style | `list-none`, `list-disc`, `list-decimal`, `list-inside`, `list-outside`, `list-image-*` | — | ❌ (no bullets in Compose Text) |
| Text Align | `text-left`, `text-center`, `text-right`, `text-justify`, `text-start`, `text-end` | `textAlign = TextAlign.*` | ✅ |
| Text Color | `text-{color}`, `text-{color}/50`, `text-[#f00]` | `color = Color(...)` | ✅ |
| Text Decoration | `underline`, `overline`, `line-through`, `no-underline` | `textDecoration = TextDecoration.*` | ✅ |
| Decoration Color | `decoration-{color}` | `textDecorationColor = Color(...)` | ✅ |
| Decoration Style | `decoration-solid/double/dotted/dashed/wavy` | — | ❌ |
| Decoration Thickness | `decoration-0..8`, `decoration-auto`, `decoration-from-font` | — | ❌ |
| Underline Offset | `underline-offset-*` | — | ❌ |
| Text Transform | `uppercase`, `lowercase`, `capitalize`, `normal-case` | string `.uppercase()`/`.lowercase()`/`.replaceFirstChar` at the Text call | ✅ |
| Text Overflow | `truncate`, `text-ellipsis`, `text-clip` | `maxLines = 1` + `overflow = TextOverflow.*` | ✅ |
| Text Wrap | `text-wrap`, `text-nowrap`, `text-balance`, `text-pretty` | `softWrap = true/false` (balance/pretty approximated as wrap) | ✅ |
| Text Indent | `indent-*` | — | ❌ |
| Vertical Align | `align-baseline/top/middle/bottom/text-top/text-bottom/sub/super` | — | ❌ |
| Whitespace | `whitespace-normal`, `whitespace-nowrap`, `whitespace-pre`, `whitespace-pre-line`, `whitespace-pre-wrap`, `whitespace-break-spaces` | `softWrap = false` for `nowrap`/`pre`; rest → true | 🟡 |
| Word Break | `break-normal`, `break-words`, `break-all`, `break-keep` | — | ❌ |
| Hyphens | `hyphens-none/manual/auto` | — | ❌ |
| Content | `content-none` | — | ❌ |

## 6. Backgrounds

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Background Attachment | `bg-fixed`, `bg-local`, `bg-scroll` | — | ❌ |
| Background Clip | `bg-clip-border/padding/content/text` | — | ❌ |
| Background Color | `bg-{color}`, `bg-{color}/50`, `bg-[#ff0000]` | `Modifier.background(Color(...))` | ✅ |
| Background Origin | `bg-origin-border/padding/content` | — | ❌ |
| Background Position | `bg-bottom/center/left/left-bottom/left-top/right/right-bottom/right-top/top` | — | ❌ |
| Background Repeat | `bg-repeat`, `bg-no-repeat`, `bg-repeat-x/y/round/space` | — | ❌ |
| Background Size | `bg-auto`, `bg-cover`, `bg-contain` | — | ❌ |
| Background Image | `bg-none`, `bg-gradient-to-t/tr/r/br/b/bl/l/tl` | `Modifier.background(Brush.*Gradient(...))` | ✅ |

### Gradient stops

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Gradient From | `from-{color}`, `from-{color}/50` | first gradient color | ✅ |
| Gradient Via | `via-{color}` | middle gradient color | ✅ |
| Gradient To | `to-{color}` | last gradient color | ✅ |

## 7. Borders

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Border Radius | `rounded-none/sm/(default)/md/lg/xl/2xl/3xl/full`, `rounded-t/r/b/l`, `rounded-tl/tr/br/bl`, `rounded-[4px]` | `clip(RoundedCornerShape(...))` | ✅ |
| Border Width | `border`, `border-0/2/4/8`, `border-px`, `border-x/y/t/r/b/l`, `border-x-2` ... | `Modifier.border(...)` (single call, sides supported) | ✅ |
| Border Color | `border-{color}`, `border-t-{color}`, `border-x-{color}` ... | `Color(...)` merged with width | ✅ |
| Border Style | `border-solid/dashed/dotted/double/hidden/none` | `dashed`/`dotted` → `veskDashedBorder(...)`; solid/none → ❌ | 🟡 |
| Divide Width | `divide-x`, `divide-y`, `divide-0/2/4/8`, `divide-px` | child borders (all but first) | ✅ |
| Divide Color | `divide-{color}` | child border color | ✅ |
| Divide Style | `divide-solid/dashed/dotted/double/none` | dashed → `veskDivideLine(...)` per child; dotted → same; solid/double → `veskSideBorder`; `none` → no divider | 🟡 |
| Outline Style | `outline-none/solid/dashed/dotted/double` | dashed/dotted → `veskDashedBorder(...)`; solid/double → border; none → no border | 🟡 |
| Outline Width | `outline-0/1/2/4/8` | `Modifier.border(n.dp, color)` | 🟡 |
| Outline Offset | `outline-offset-*` | — | ❌ |
| Outline Color | `outline-{color}` | border color | 🟡 |
| Ring Width | `ring`, `ring-0/1/2/4/8`, `ring-inset` | `Modifier.border(n.dp, color)` (approximation) | 🟡 |
| Ring Color | `ring-{color}`, `ring-{color}/50` | border color | 🟡 |
| Ring Offset Width | `ring-offset-0/1/2/4/8` | — | ❌ |
| Ring Offset Color | `ring-offset-{color}` | — | ❌ |

## 8. Effects

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Box Shadow | `shadow`, `shadow-sm/md/lg/xl/2xl`, `shadow-none`, `shadow-inner` | `Modifier.shadow(dp)` (flat elevation); `inner`/`none` → ❌ | 🟡 |
| Box Shadow Color | `shadow-{color}` | `Modifier.shadow(dp, ambientColor, spotColor)` | ✅ |
| Opacity | `opacity-0..100`, `opacity-[0.4]` | `Modifier.alpha(f)` | ✅ |
| Mix Blend Mode | `mix-blend-*` | — | ❌ |
| Background Blend Mode | `bg-blend-*` | — | ❌ |

## 9. Filters

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Filter | `filter`, `filter-none` | — | ❌ |
| Blur | `blur-none/sm/(default)/md/lg/xl/2xl/3xl` | `Modifier.blur(dp)` | ✅ |
| Brightness | `brightness-0..200` | `Modifier.veskBrightness(mult)` (color-matrix) | ✅ |
| Contrast | `contrast-0..200` | `Modifier.veskContrast(c)` (color-matrix) | ✅ |
| Drop Shadow | `drop-shadow-sm/(default)/md/lg/xl/2xl`, `drop-shadow-none`, `drop-shadow-{color}` | `Modifier.shadow(dp, ambientColor, spotColor)`; `none` → ❌ | ✅ |
| Grayscale | `grayscale`, `grayscale-0` | `Modifier.veskGrayscale(factor)` (color-matrix) | ✅ |
| Hue Rotate | `hue-rotate-0/15/30/60/90/180` | `Modifier.veskHueRotate(deg)` (color-matrix) | ✅ |
| Invert | `invert`, `invert-0` | `Modifier.veskInvert(factor)` (color-matrix) | ✅ |
| Saturate | `saturate-0/50/100/150/200` | `Modifier.veskSaturate(s)` (color-matrix) | ✅ |
| Sepia | `sepia`, `sepia-0` | `Modifier.veskSepia(factor)` (color-matrix) | ✅ |
| Backdrop Filter | `backdrop-filter`, `backdrop-filter-none` | — | ❌ |
| Backdrop Blur/Brightness/Contrast/Grayscale/Hue/Invert/Opacity/Saturate/Sepia | `backdrop-*` | — | ❌ |

## 10. Tables

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Border Collapse | `border-collapse`, `border-separate` | — | ❌ |
| Border Spacing | `border-spacing-*`, `border-spacing-x-*`, `border-spacing-y-*` | — | ❌ |
| Table Layout | `table-auto`, `table-fixed` | — | ❌ |
| Caption Side | `caption-top`, `caption-bottom` | — | ❌ |

## 11. Transitions & Animation

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Transition Property | `transition`, `transition-none/all/colors/opacity/shadow/transform` | — | 🔶 (warn: use `motion.animate()` instead) |
| Transition Duration | `duration-75..1000` | — | 🔶 |
| Transition Timing | `ease-linear/in/out/in-out` | — | 🔶 |
| Transition Delay | `delay-75..1000` | — | 🔶 |
| Animation | `animate-none/spin/ping/pulse/bounce`, `animate-[...]` | — | 🔶 |

## 12. Transforms

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Transform | `transform`, `transform-none/gpu/cpu` | — | ❌ |
| Transform Origin | `origin-center/top/right/bottom/left`, corners | — | ❌ |
| Scale | `scale-0..150`, `scale-x-*`, `scale-y-*`, `scale-[1.7]` | `Modifier.scale(f)` / `graphicsLayer { scaleX/scaleY }` | ✅ |
| Rotate | `rotate-0/1/2/3/6/12/45/90/180`, `rotate-[17deg]` | `Modifier.rotate(deg)` | ✅ |
| Translate | `translate-x-*`, `translate-y-*`, `translate-x-full`, `translate-y-px`, `translate-[...]` | `Modifier.offset(x/y = dp)`; `full` → ❌ | 🟡 |
| Skew | `skew-x-0..12`, `skew-y-*` | `graphicsLayer { skewX/skewY }` | ✅ |

## 13. Interactivity

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Accent Color | `accent-{color}` | — | ❌ |
| Appearance | `appearance-none`, `appearance-auto` | — | ❌ |
| Cursor | `cursor-auto/default/pointer/...` | — | ❌ (no mouse) |
| Caret Color | `caret-{color}` | — | ❌ |
| Pointer Events | `pointer-events-none/auto` | — | ❌ |
| Resize | `resize-none/y/x/(both)` | — | ❌ |
| Scroll Behavior | `scroll-auto`, `scroll-smooth` | — | ❌ |
| Scroll Margin | `scroll-m-*`, `scroll-mx-*`, ... | — | ❌ |
| Scroll Padding | `scroll-p-*`, `scroll-px-*`, ... | — | ❌ |
| Scroll Snap Align | `snap-start/end/center/align-none` | — | ❌ |
| Scroll Snap Stop | `snap-normal/always` | — | ❌ |
| Scroll Snap Type | `snap-none/x/y/both`, `snap-mandatory/proximity` | — | ❌ |
| Touch Action | `touch-auto/none/pan-*/pinch-zoom/manipulation` | — | ❌ |
| User Select | `select-none/text/all/auto` | — | ❌ |
| Will Change | `will-change-auto/scroll/contents/transform` | — | ❌ |

## 14. SVG

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Fill | `fill-{color}`, `fill-none` | — | ❌ (no SVG) |
| Stroke | `stroke-{color}`, `stroke-none` | — | ❌ |
| Stroke Width | `stroke-0/1/2` | — | ❌ |
| Stroke Dash | `stroke-dash-1/2/4/8`, `stroke-dashoffset-*` | — | ❌ |

## 15. Accessibility

| Namespace | Classes | Output | Status |
|-----------|---------|--------|--------|
| Screen Readers | `sr-only`, `not-sr-only` | — | ❌ |

## 16. Variants

| Variant family | Example | Behavior in vesk-native |
|----------------|---------|--------------------------|
| Responsive | `sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `portrait:`, `landscape:` | applied at compile time (static output) |
| State | `hover:`, `focus:`, `active:`, `visited:`, `disabled:`, `checked:`, `focus-within:`, `focus-visible:`, `group-*`, `peer-*`, `dark:` | dropped at compile time (note) |
| Others | `first:`, `last:`, `odd:`, `even:`, `only:`, `empty:` | dropped at compile time |

---

## Count

- **Namespaces (categories with at least one class): 88**
- **Individual utilities in the tokenizer table: 300+** (`UTILITIES` spec rows
  + value-table lookups; value tables cover the full v3 default theme:
  spacing 0–96, 22-color palette × 11 shades, 13 font sizes, 9 weights,
  9 radii, 7 shadow sizes, 6 trackings, 8 leadings (named + numeric), 9 blur
  steps, 11 scale steps, 9 rotate steps, 7 skew steps, 13 max-widths (+5
  screen-*), 6 line-clamps, opacity 0–200 for filters, z-index 0–50, aspect
  ratios, hue-rotate steps, 15 named border styles).
