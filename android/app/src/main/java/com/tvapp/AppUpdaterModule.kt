package com.tvapp

import android.content.Intent
import android.net.Uri
import android.os.Build
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

    companion object {
        private const val TAG = "AppUpdater"
        const val BUNDLE_DIR = "bundles"
        const val BUNDLE_FILE = "index.android.bundle"
        const val BUNDLE_VERSION_FILE = "bundle_version.txt"

        /** Get the path to the downloaded OTA bundle, or null if none exists */
        fun getOtaBundlePath(context: android.content.Context): String? {
            val bundleDir = File(context.filesDir, BUNDLE_DIR)
            val bundleFile = File(bundleDir, BUNDLE_FILE)
            val versionFile = File(bundleDir, BUNDLE_VERSION_FILE)
            return if (bundleFile.exists() && bundleFile.length() > 1000 && versionFile.exists()) {
                Log.d(TAG, "OTA bundle found: ${bundleFile.absolutePath} (${bundleFile.length()} bytes, version ${versionFile.readText().trim()})")
                bundleFile.absolutePath
            } else {
                null
            }
        }
    }

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
                Log.d(TAG, "Redirect $redirectCount -> $currentUrl")
            } else {
                return connection
            }
        }
        throw Exception("Too many redirects ($maxRedirects)")
    }

    private fun downloadFile(fileUrl: String, destFile: File): Long {
        val connection = followRedirects(fileUrl)

        if (connection.responseCode != 200) {
            throw Exception("HTTP ${connection.responseCode}")
        }

        val contentLength = connection.contentLength
        Log.d(TAG, "Download size: $contentLength bytes")

        connection.inputStream.use { input ->
            FileOutputStream(destFile).use { output ->
                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalRead = 0L
                while (input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    totalRead += bytesRead
                }
                Log.d(TAG, "Downloaded $totalRead bytes")
                return totalRead
            }
        }
    }

    @ReactMethod
    fun downloadAndInstall(apkUrl: String, promise: Promise) {
        Thread {
            try {
                Log.d(TAG, "Starting APK download from: $apkUrl")
                val context = reactApplicationContext
                val updatesDir = File(context.getExternalFilesDir(null), "updates")
                if (!updatesDir.exists()) updatesDir.mkdirs()

                val apkFile = File(updatesDir, "update.apk")
                if (apkFile.exists()) apkFile.delete()

                downloadFile(apkUrl, apkFile)

                if (!apkFile.exists() || apkFile.length() < 1000) {
                    promise.reject("DOWNLOAD_ERROR", "APK file is too small or missing")
                    return@Thread
                }

                Log.d(TAG, "APK saved: ${apkFile.length()} bytes")

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
                Log.e(TAG, "APK update error: ${e.message}", e)
                promise.reject("UPDATE_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Download a JS bundle for OTA update.
     * Saves to internal storage (filesDir/bundles/) and records the version.
     * App must be restarted to load the new bundle.
     */
    @ReactMethod
    fun downloadBundle(bundleUrl: String, version: String, promise: Promise) {
        Thread {
            try {
                Log.d(TAG, "Starting OTA bundle download from: $bundleUrl")
                val context = reactApplicationContext
                val bundleDir = File(context.filesDir, BUNDLE_DIR)
                if (!bundleDir.exists()) bundleDir.mkdirs()

                // Download to temp file first, then rename atomically
                val tempFile = File(bundleDir, "index.android.bundle.tmp")
                val bundleFile = File(bundleDir, BUNDLE_FILE)
                val versionFile = File(bundleDir, BUNDLE_VERSION_FILE)

                if (tempFile.exists()) tempFile.delete()

                val size = downloadFile(bundleUrl, tempFile)

                if (!tempFile.exists() || tempFile.length() < 1000) {
                    tempFile.delete()
                    promise.reject("DOWNLOAD_ERROR", "Bundle file is too small or missing")
                    return@Thread
                }

                // Atomic rename
                if (bundleFile.exists()) bundleFile.delete()
                tempFile.renameTo(bundleFile)

                // Save version
                versionFile.writeText(version)

                Log.d(TAG, "OTA bundle saved: ${bundleFile.length()} bytes, version $version")
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "OTA bundle error: ${e.message}", e)
                promise.reject("BUNDLE_ERROR", e.message, e)
            }
        }.start()
    }

    /** Get the current OTA bundle version, or empty string if using built-in bundle */
    @ReactMethod
    fun getOtaBundleVersion(promise: Promise) {
        try {
            val context = reactApplicationContext
            val versionFile = File(context.filesDir, "$BUNDLE_DIR/$BUNDLE_VERSION_FILE")
            if (versionFile.exists()) {
                promise.resolve(versionFile.readText().trim())
            } else {
                promise.resolve("")
            }
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    /** Delete the OTA bundle so the app falls back to the built-in one */
    @ReactMethod
    fun clearOtaBundle(promise: Promise) {
        try {
            val context = reactApplicationContext
            val bundleDir = File(context.filesDir, BUNDLE_DIR)
            if (bundleDir.exists()) {
                bundleDir.deleteRecursively()
                Log.d(TAG, "OTA bundle cleared")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", e.message, e)
        }
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
            // Kill current process so the new bundle loads on restart
            android.os.Process.killProcess(android.os.Process.myPid())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESTART_ERROR", e.message, e)
        }
    }
}
