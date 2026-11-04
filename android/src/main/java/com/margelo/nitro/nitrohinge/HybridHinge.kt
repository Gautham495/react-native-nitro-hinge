package com.margelo.nitro.nitrohinge

import android.util.Log
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

class HybridHinge : HybridHingeSpec() {

  // Written on main by HingeObserver, read from the JS thread.
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
    val next = HingeStateProbe.map(source)
    if (next == cachedState) return
    cachedState = next
    for (cb in listeners.values.toList()) {
      try {
        cb(next)
      } catch (e: Throwable) {
        Log.e("Hinge", "HybridHinge: JS callback threw", e)
      }
    }
  }

  override fun dispose() {
    HingeObserver.detach(this)
    listeners.clear()
    super.dispose()
  }
}
