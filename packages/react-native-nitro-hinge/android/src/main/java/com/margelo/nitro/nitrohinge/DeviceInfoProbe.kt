package com.margelo.nitro.nitrohinge

import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import com.margelo.nitro.NitroModules

/**
 * Reads device metadata: OS version, model, whether the device has
 * a physical fold hinge. `hasHardwareHinge` is analytics-only —
 * layout should NEVER key off it. Use widthClass and foldFeatures
 * instead.
 */
object DeviceInfoProbe {

  fun read(): DeviceInfo {
    return DeviceInfo(
      platformVersion = Build.VERSION.RELEASE ?: "unknown",
      model = "${Build.MANUFACTURER} ${Build.MODEL}",
      hasHardwareHinge = detectHardwareHinge()
    )
  }

  private fun detectHardwareHinge(): Boolean {
    // TYPE_HINGE_ANGLE sensor exists on physical foldables (API 30+).
    // Absence doesn't mean not a foldable — some vendors ship the
    // hinge without exposing the sensor — but presence is a strong
    // positive signal.
    val context = NitroModules.applicationContext ?: return false
    val sm = context.getSystemService(SensorManager::class.java) ?: return false
    return try {
      sm.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE) != null
    } catch (e: Throwable) {
      false
    }
  }
}