package com.margelo.nitro.nitrohinge

import android.util.Log
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

class HybridHinge : HybridHingeSpec() {

  // Written on main by HingeObserver, read from the JS thread.
  @Volatile
  private var cachedState: HingeState = HingeStateProbe.fallback()
  @Volatile
  private var cachedAngle: Double? = null
  private val listeners = ConcurrentHashMap<Long, (HingeState) -> Unit>()
  private val angleListeners = ConcurrentHashMap<Long, (Double?) -> Unit>()
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
  override val hingeAngle: Double? get() = cachedAngle
  override val deviceInfo: DeviceInfo get() = cachedDeviceInfo

  override fun getState(): HingeState = cachedState

  override fun addChangeListener(callback: (HingeState) -> Unit): ChangeSubscription =
    subscribe(listeners, callback)

  override fun addHingeAngleListener(callback: (Double?) -> Unit): ChangeSubscription =
    subscribe(angleListeners, callback)

  private fun <T> subscribe(
    into: ConcurrentHashMap<Long, (T) -> Unit>,
    callback: (T) -> Unit,
  ): ChangeSubscription {
    val id = nextId.incrementAndGet()
    into[id] = callback
    return ChangeSubscription(remove = {
      into.remove(id)
    })
  }

  // === Called by HingeObserver on WindowFoldSource change ===

  fun onSourceChanged(source: WindowFoldSource.State) {
    val next = HingeStateProbe.map(source)
    if (next == cachedState) return
    cachedState = next
    notify(listeners, next)
  }

  fun onHingeAngleChanged(degrees: Double?) {
    if (degrees == cachedAngle) return
    cachedAngle = degrees
    notify(angleListeners, degrees)
  }

  private fun <T> notify(callbacks: ConcurrentHashMap<Long, (T) -> Unit>, value: T) {
    for (cb in callbacks.values.toList()) {
      try {
        cb(value)
      } catch (e: Throwable) {
        Log.e("Hinge", "HybridHinge: JS callback threw", e)
      }
    }
  }

  override fun dispose() {
    HingeObserver.detach(this)
    listeners.clear()
    angleListeners.clear()
    super.dispose()
  }
}
