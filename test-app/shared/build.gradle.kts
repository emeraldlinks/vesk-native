import org.jetbrains.kotlin.gradle.ExperimentalKotlinGradlePluginApi

plugins {
    id("com.android.kotlin.multiplatform.library")
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.kotlin.plugin.compose")
}

// The :shared KMP module is the framework's home: generated pages live in
// src/androidMain today (R class + LocalContext), and the runtime splits
// between commonMain (pure-Kotlin core + expect seams) and androidMain
// (android actuals). The jvm() target hosts the vesk dev --desktop preview.
// iOS targets are added macOS-gated with the CMP milestone — never configured
// on Linux.
@OptIn(ExperimentalKotlinGradlePluginApi::class)
kotlin {
    android {
        namespace = "com.vesk.demo3.shared"
        compileSdk = 37
        minSdk = 26
        androidResources { enable = true }
        compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 }
    }

    // Desktop JVM target: the vesk dev --desktop preview host. Runs the same
    // commonMain pages + the jvmMain actuals (Runtime.jvm.kt). jvmTarget
    // matches the Android target (17) so the preinstalled JDK compiles it
    // without a toolchain download.
    jvm {
        compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 }
    }

    sourceSets {
        // The portable core (RuntimeCore.kt) + navigation Router.kt are plain
        // Kotlin + compose ui/foundation/runtime/animation + coroutines only —
        // no LocalContext, no platform APIs. The CMP 1.11 org.jetbrains.compose.*
        // artifacts are the multiplatform variants: they resolve the androidx
        // variants on the Android target and the desktop variants on jvm()
        // (foundation and animation pull foundation-layout / animation-core
        // transitively).
        commonMain.dependencies {
            implementation("org.jetbrains.compose.runtime:runtime:1.11.0")
            implementation("org.jetbrains.compose.ui:ui:1.11.0")
            implementation("org.jetbrains.compose.foundation:foundation:1.11.0")
            implementation("org.jetbrains.compose.animation:animation:1.11.0")
            implementation("org.jetbrains.compose.material3:material3:1.9.0")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
        }
        jvmMain.dependencies {
            // The desktop aggregator brings the window toolkit (ui-window,
            // SingleWindowApplication) plus the awt integration;
            // kotlinx-coroutines-swing supplies Dispatchers.Main (the Swing
            // EDT) for the motionDispatcher seam. skiko's module metadata does
            // not select the awt runtime on the plain JVM variant, so the
            // host platform native is declared explicitly.
            implementation("org.jetbrains.compose.desktop:desktop:1.11.0")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.9.0")
            implementation("org.jetbrains.skiko:skiko-awt-runtime-linux-arm64:0.144.6")
        }
        androidMain.dependencies {
implementation("androidx.compose.ui:ui:1.11.4")
implementation("androidx.compose.ui:ui-tooling-preview:1.11.4")
implementation("androidx.compose.material3:material3:1.4.0")
implementation("androidx.activity:activity-compose:1.13.0")
implementation("androidx.core:core-ktx:1.19.0")
implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")
implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
implementation("com.google.mlkit:barcode-scanning:17.3.0")
implementation("androidx.camera:camera-core:1.4.1")
implementation("androidx.camera:camera-camera2:1.4.1")
implementation("androidx.camera:camera-lifecycle:1.4.1")
implementation("androidx.camera:camera-view:1.4.1")
implementation("androidx.biometric:biometric:1.4.0-alpha02")
implementation("com.google.zxing:core:3.5.3")
implementation("androidx.media:media:1.7.0")
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("androidx.activity:activity-compose:1.9.2")
implementation("androidx.compose.animation:animation-core:1.6.8")
implementation("androidx.compose.animation:animation-graphics:1.6.8")
implementation("androidx.compose.animation:animation:1.6.8")
implementation("io.coil-kt:coil-compose:2.7.0")
implementation("io.coil-kt.coil3:coil-compose:3.0.4")
implementation("io.coil-kt.coil3:coil-network-okhttp:3.0.4")
implementation("com.github.bumptech.glide:compose:1.0.0-beta01")
implementation("androidx.constraintlayout:constraintlayout-compose:1.1.0")
implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0")
implementation("androidx.compose.foundation:foundation-layout:1.6.8")
implementation("androidx.compose.foundation:foundation:1.6.8")
implementation("com.google.code.gson:gson:2.11.0")
implementation("org.jetbrains.kotlinx:kotlinx-collections-immutable:0.3.7")
implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
implementation("androidx.compose.material:material-icons-core:1.6.8")
implementation("androidx.compose.material:material-ripple:1.6.8")
implementation("androidx.compose.material:material:1.6.8")
implementation("androidx.compose.material3:material3:1.2.1")
implementation("com.squareup.moshi:moshi:1.15.1")
implementation("androidx.navigation:navigation-compose:2.7.7")
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.squareup.retrofit2:retrofit:2.11.0")
implementation("com.valentinilk.shimmer:compose-shimmer:1.3.1")
implementation("com.jakewharton.timber:timber:5.0.1")
implementation("com.patrykandpatrick.vico:compose:1.14.0")
implementation("co.yml:ycharts:2.1.0")
implementation("com.google.zxing:core:3.5.3")
implementation("com.composables:icons-lucide-cmp:2.2.1")
        }
    }
}

// Plain JVM run of the desktop preview (no hot reload): same main(), same
// portable route table — jvmMain.runtimeClasspath is the KMP compilation's
// runtime configuration (KGP 2.x exposes it on every Kotlin source set).
// vesk dev --desktop applies the Compose Hot Reload plugin above instead and
// uses its hotRunJvm task, so release/normal builds never load reload tooling.
tasks.register<JavaExec>("runDesktop") {
    group = "application"
    description = "Runs the desktop preview (jvm target) without hot reload"
    workingDir = rootProject.layout.projectDirectory.asFile
    classpath = sourceSets["jvmMain"].runtimeClasspath
    mainClass = "app.MainKt"
}

