plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.vesk.aero"
    compileSdk = 37
    // AGP built-in Kotlin (the org.jetbrains.kotlin.android plugin is not
    // applied); jvmTarget follows compileOptions.
    enableKotlin = true

    defaultConfig {
        applicationId = "com.vesk.aero"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // No veskconfig.signing.android — release artifacts sign with the
            // debug keystore (dev flow; never upload these to a store).
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
implementation(project(":shared"))
implementation(platform("androidx.compose:compose-bom:2026.06.01"))
implementation("androidx.compose.ui:ui")
implementation("androidx.compose.material3:material3")
implementation("androidx.activity:activity-compose:1.13.0")
implementation("androidx.core:core-ktx:1.19.0")
implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")
implementation("androidx.fragment:fragment:1.2.5")
}
