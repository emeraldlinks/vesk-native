package app

import androidx.compose.runtime.Composable

@Composable
fun App() {
    Counter(props = CounterProps(initial = 0))
}
