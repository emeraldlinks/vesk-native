import org.jetbrains.kotlin.gradle.ExperimentalKotlinGradlePluginApi

plugins {
    id("com.android.kotlin.multiplatform.library")
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.kotlin.plugin.compose")
}

// The :shared KMP module is the framework's home: generated pages live in
// src/androidMain today (R class + LocalContext), and the runtime splits
// between commonMain (pure-Kotlin core + expect seams) and androidMain
// (android actuals). iOS targets are added macOS-gated with the CMP
// milestone — never configured on Linux; when they land, the commonMain
// androidx compose coordinates below switch to their org.jetbrains.compose
// equivalents.
@OptIn(ExperimentalKotlinGradlePluginApi::class)
kotlin {
    android {
        namespace = "com.vesk.aero.shared"
        compileSdk = 37
        minSdk = 24
        androidResources { enable = true }
        compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 }
    }

    sourceSets {
        // The portable core (RuntimeCore.kt) + navigation Router.kt are plain
        // Kotlin + compose ui/foundation/runtime/animation-core + coroutines
        // only — no LocalContext, no platform APIs. The versions match what
        // the android source set resolves (ui/foundation 1.11.4, material3
        // 1.4.0 from the app BOM, kotlinx-coroutines-core 1.9.0 transitively).
        // material3 carries a common variant, so portable pages compile here.
        commonMain.dependencies {
            implementation("androidx.compose.runtime:runtime:1.11.4")
            implementation("androidx.compose.ui:ui:1.11.4")
            implementation("androidx.compose.foundation:foundation:1.11.4")
            implementation("androidx.compose.foundation:foundation-layout:1.11.4")
            implementation("androidx.compose.animation:animation-core:1.11.4")
            implementation("androidx.compose.material3:material3:1.4.0")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
        }
        androidMain.dependencies {
implementation("androidx.compose.ui:ui:1.11.4")
implementation("androidx.compose.ui:ui-tooling-preview:1.11.4")
implementation("androidx.compose.material3:material3:1.4.0")
implementation("androidx.activity:activity-compose:1.13.0")
implementation("androidx.core:core-ktx:1.19.0")
implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")
implementation("androidx.compose.material3:material3:1.2.1")
implementation("com.composables:icons-lucide-cmp:2.2.1")
        }
    }
}
