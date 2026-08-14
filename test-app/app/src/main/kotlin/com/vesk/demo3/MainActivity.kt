package com.vesk.demo3

import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import android.os.Bundle
import android.content.Intent
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import app.App
import app.VeskDeviceSession
import app.VeskTheme
import app.jsSafe

class MainActivity : FragmentActivity() {
    private val mediaPermLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Thread.getDefaultUncaughtExceptionHandler() !is DebugCrashLog) {
            Thread.setDefaultUncaughtExceptionHandler(DebugCrashLog(Thread.getDefaultUncaughtExceptionHandler()))
        }
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(android.graphics.Color.parseColor("#FFFFFF"), android.graphics.Color.parseColor("#0F172A")),
            navigationBarStyle = SystemBarStyle.light(android.graphics.Color.parseColor("#FFFFFF"), android.graphics.Color.parseColor("#0F172A")),
        )
        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
        if (Build.VERSION.SDK_INT >= 33) {
            mediaPermLauncher.launch(arrayOf(
                                android.Manifest.permission.READ_MEDIA_IMAGES,
                android.Manifest.permission.READ_MEDIA_VIDEO,
                android.Manifest.permission.READ_MEDIA_AUDIO,
                android.Manifest.permission.POST_NOTIFICATIONS,
            ))
        } else {
            mediaPermLauncher.launch(arrayOf(android.Manifest.permission.READ_EXTERNAL_STORAGE))
        }
        setContent {
            VeskTheme {
                Surface(modifier = Modifier) {
                    App()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra("vesk_notify_tap", false)) jsSafe({ VeskDeviceSession.notifyTap?.invoke() })
    }
}
