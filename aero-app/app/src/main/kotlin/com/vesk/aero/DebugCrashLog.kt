package com.vesk.aero

import android.os.Environment
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Date

// Permanent crash diagnostics: writes the stack trace of any uncaught
// exception to /sdcard/Download/vesk-crash.txt so on-device crashes can be
// inspected without logcat access. Kept until vesk-native is stable.
class DebugCrashLog(private val previous: Thread.UncaughtExceptionHandler?) : Thread.UncaughtExceptionHandler {
    override fun uncaughtException(t: Thread, e: Throwable) {
        try {
            val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val out = File(dir, "vesk-crash.txt")
            val sw = StringWriter()
            val pw = PrintWriter(sw)
            pw.println("=== crash ${Date()} on ${t.name} ===")
            e.printStackTrace(pw)
            pw.close()
            out.writeText(sw.toString())
        } catch (_: Throwable) {
        }
        previous?.uncaughtException(t, e)
    }
}
