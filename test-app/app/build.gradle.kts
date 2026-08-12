plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.vesk.demo3"
    compileSdk = 37
    // AGP built-in Kotlin (the org.jetbrains.kotlin.android plugin is not
    // applied); jvmTarget follows compileOptions.
    enableKotlin = true

    defaultConfig {
        applicationId = "com.vesk.demo3"
        minSdk = 26
        targetSdk = 36
        versionCode = 4
        versionName = "0.4.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
implementation(platform("androidx.compose:compose-bom:2026.06.01"))
implementation("androidx.compose.ui:ui")
implementation("androidx.compose.ui:ui-tooling-preview")
implementation("androidx.compose.material3:material3")
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
implementation("io.coil-kt:coil-compose:2.7.0")
implementation("co.yml:ycharts:2.1.0")
implementation("com.github.bumptech.glide:compose:1.0.0-beta01")
}
