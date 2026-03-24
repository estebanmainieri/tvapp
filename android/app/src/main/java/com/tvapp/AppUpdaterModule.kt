package com.tvapp

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class AppUpdaterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AppUpdater"

    @ReactMethod
    fun canInstallApks(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                promise.resolve(context.packageManager.canRequestPackageInstalls())
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openInstallPermissionSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val context = reactApplicationContext
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }

    private fun followRedirects(initialUrl: String, maxRedirects: Int = 5): HttpURLConnection {
        var currentUrl = initialUrl
        var redirectCount = 0
        while (redirectCount < maxRedirects) {
            val url = URL(currentUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 30000
            connection.readTimeout = 60000
            connection.instanceFollowRedirects = false
            connection.connect()

            val code = connection.responseCode
            if (code in 300..399) {
                val location = connection.getHeaderField("Location")
                    ?: throw Exception("Redirect without Location header")
                connection.disconnect()
                currentUrl = location
                redirectCount++
                Log.d("AppUpdater", "Redirect $redirectCount -> $currentUrl")
            } else {
                return connection
            }
        }
        throw Exception("Too many redirects ($maxRedirects)")
    }

    @ReactMethod
    fun downloadAndInstall(apkUrl: String, promise: Promise) {
        Thread {
            try {
                Log.d("AppUpdater", "Starting download from: $apkUrl")
                val context = reactApplicationContext
                val updatesDir = File(context.getExternalFilesDir(null), "updates")
                if (!updatesDir.exists()) updatesDir.mkdirs()

                val apkFile = File(updatesDir, "update.apk")
                if (apkFile.exists()) apkFile.delete()

                val connection = followRedirects(apkUrl)

                if (connection.responseCode != 200) {
                    val msg = "HTTP ${connection.responseCode}"
                    Log.e("AppUpdater", "Download failed: $msg")
                    promise.reject("DOWNLOAD_ERROR", msg)
                    return@Thread
                }

                val contentLength = connection.contentLength
                Log.d("AppUpdater", "Download size: $contentLength bytes")

                connection.inputStream.use { input ->
                    FileOutputStream(apkFile).use { output ->
                        val buffer = ByteArray(8192)
                        var bytesRead: Int
                        var totalRead = 0L
                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                            totalRead += bytesRead
                        }
                        Log.d("AppUpdater", "Downloaded $totalRead bytes")
                    }
                }

                if (!apkFile.exists() || apkFile.length() < 1000) {
                    promise.reject("DOWNLOAD_ERROR", "APK file is too small or missing")
                    return@Thread
                }

                Log.d("AppUpdater", "APK saved: ${apkFile.length()} bytes")

                val uri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    apkFile
                )

                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
                }

                context.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e("AppUpdater", "Update error: ${e.message}", e)
                promise.reject("UPDATE_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun getInstalledVersion(promise: Promise) {
        try {
            val context = reactApplicationContext
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            promise.resolve(pInfo.versionName)
        } catch (e: Exception) {
            promise.reject("VERSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun restartApp(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            intent?.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESTART_ERROR", e.message, e)
        }
    }
}
