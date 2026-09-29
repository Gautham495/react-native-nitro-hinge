package com.margelo.nitro.nitrohinge

import android.content.res.Configuration
import android.util.Log
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.HybridObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

class HybridHinge : HybridHingeSpec() {

  private val lock = Any()
  @Volatile
  private var cachedState: HingeState = HingeStateProbe.fallback()
  private val listeners = ConcurrentHashMap<Long, (HingeState) -> Unit>()
  private val nextId = AtomicLong(0)
  private val cachedDeviceInfo: DeviceInfo = DeviceInfoProbe.read()

  init {
    HingeObserver.attach(this)
  }

  // === Nitro getters ===

  override val widthClass: WidthSizeClass get() = cachedState.widthClass
  override val heightClass: HeightSizeClass get() = cachedState.heightClass
  override val windowWidth: Double get() = cachedState.windowWidth
  override val windowHeight: Double get() = cachedState.windowHeight
  override val safeInsets: SafeInsets get() = cachedState.safeInsets
  override val fontScale: Double get() = cachedState.fontScale
  override val foldFeatures: Array<FoldFeature> get() = cachedState.foldFeatures
  override val hingeAngle: Double? get() = null // v0.3 — via WindowFoldSource hinge sensor
  override val deviceInfo: DeviceInfo get() = cachedDeviceInfo

  override fun getState(): HingeState = cachedState

  override fun addChangeListener(callback: (HingeState) -> Unit): ChangeSubscription {
    val id = nextId.incrementAndGet()
    listeners[id] = callback
    return ChangeSubscription(remove = {
      listeners.remove(id)
    })
  }

  // === Called by HingeObserver on WindowFoldSource change ===

  fun onSourceChanged(source: WindowFoldSource.State) {
    try {
      val fontScale = readFontScale()
      val next = HingeStateProbe.map(source, fontScale)
      synchronized(lock) {
        if (next == cachedState) return
        cachedState = next
      }
      val snapshot = listeners.values.toList()
      Log.d("Hinge", "HybridHinge.onSourceChanged: notifying ${snapshot.size} JS listeners")
      for (cb in snapshot) {
        try {
          cb(next)
        } catch (e: Throwable) {
          Log.e("Hinge", "HybridHinge: JS callback threw", e)
        }
      }
    } catch (e: Throwable) {
      Log.e("Hinge", "HybridHinge.onSourceChanged: failed", e)
    }
  }

  private fun readFontScale(): Double {
    val ctx = NitroModules.applicationContext ?: return 1.0
    val cfg: Configuration = ctx.resources.configuration
    return cfg.fontScale.toDouble()
  }

  override fun dispose() {
    HingeObserver.detach(this)
    listeners.clear()
    super.dispose()
  }
}