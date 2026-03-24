package com.tvapp

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    // Check if an OTA bundle has been downloaded
    val otaBundlePath = AppUpdaterModule.getOtaBundlePath(applicationContext)
    if (otaBundlePath != null) {
      Log.d("MainApplication", "Loading OTA bundle from: $otaBundlePath")
    } else {
      Log.d("MainApplication", "Loading built-in bundle")
    }

    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(AppUpdaterPackage())
        },
      jsBundleFilePath = otaBundlePath,
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
