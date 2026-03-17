package com.tvapp

import android.content.Intent
import android.net.Uri
import android.os.Environment
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
    fun downloadAndInstall(apkUrl: String, promise: Promise) {
        Thread {
            try {
                val context = reactApplicationContext
                val updatesDir = File(context.getExternalFilesDir(null), "updates")
                if (!updatesDir.exists()) updatesDir.mkdirs()

                val apkFile = File(updatesDir, "update.apk")
                if (apkFile.exists()) apkFile.delete()

                val url = URL(apkUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 30000
                connection.connect()

                if (connection.responseCode != 200) {
                    promise.reject("DOWNLOAD_ERROR", "HTTP ${connection.responseCode}")
                    return@Thread
                }

                connection.inputStream.use { input ->
                    FileOutputStream(apkFile).use { output ->
                        input.copyTo(output)
                    }
                }

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
