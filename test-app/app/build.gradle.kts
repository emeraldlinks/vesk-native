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

signingConfigs {
        create("release") {
            storeFile = file("/root/vesk-native/test-app/upload-keystore.jks")
            storePassword = System.getenv("VESK_STORE_PASSWORD") ?: ""
            keyAlias = "upload"
            keyPassword = System.getenv("VESK_KEY_PASSWORD") ?: ""
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            // Upload-key signing from veskconfig.signing.android (Play App
            // Signing upload key).
            signingConfig = signingConfigs.getByName("release")
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
