package com.margelo.nitro.nitrohinge

import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Kotlin implementation of the Hinge HybridObject.
 *
 * Reads native layout signals from Jetpack WindowManager:
 * - WindowMetricsCalculator for measured window bounds
 * - WindowInfoTracker for FoldingFeature (fold/hinge geometry)
 * - WindowSizeClass for compact/medium/expanded classification
 * - Configuration.fontScale for OS font scaling
 *
 * Thread model: WindowInfoTracker exposes a Flow on Kotlin's
 * Main dispatcher; we collect it in a coroutine scope tied to
 * the application context. Cached state is protected by a lock;
 * reads from JS threads are lock-serialized snapshots.
 *
 * Prefer WindowMetricsCalculator over Display.getRealSize() — the
 * latter doesn't reflect multi-window / split-screen state.
 * Prefer WindowInfoTracker over Configuration.orientation — the
 * latter doesn't tell you where the fold is.
 */
class HybridHinge : HybridHingeSpec() {

  private val lock = Any()
  private var cachedState: HingeState = HingeStateProbe.snapshot()
  private val listeners = ConcurrentHashMap<UUID, (HingeState) -> Unit>()

  init {
    HingeObserver.shared.attach(this)
  }

  // NOTE: Nitro Kotlin HybridObjects don't have a deterministic
  // destructor; the observer prunes weak references itself.

  // === Layout signals ===

  override val widthClass: WidthSizeClass
    get() = synchronized(lock) { cachedState.widthClass }

  override val heightClass: HeightSizeClass
    get() = synchronized(lock) { cachedState.heightClass }

  override val windowWidth: Double
    get() = synchronized(lock) { cachedState.windowWidth }

  override val windowHeight: Double
    get() = synchronized(lock) { cachedState.windowHeight }

  override val safeInsets: SafeInsets
    get() = synchronized(lock) { cachedState.safeInsets }

  override val fontScale: Double
    get() = synchronized(lock) { cachedState.fontScale }

  // === Fold geometry ===
  // Nitrogen maps TS `FoldFeature[]` to Kotlin `Array<FoldFeature>`,
  // NOT `List<FoldFeature>`. Match the generated spec exactly.

  override val foldFeatures: Array<FoldFeature>
    get() = synchronized(lock) { cachedState.foldFeatures }

  override val hingeAngle: Double?
    // Android's TYPE_HINGE_ANGLE sensor (API 30+) reports the
    // continuous angle. It fires at sensor rate and is intended
    // for animation, not layout. Not cached here; consumers who
    // need it should register a SensorManager listener themselves.
    //
    // Spec uses `number | undefined` which nitrogen maps to `Double?`.
    // If you see `Variant_NullType_Double` in generated code, the spec
    // still says `number | null` — fix the spec and regenerate.
    get() = null

  // === Device info ===

  override val deviceInfo: DeviceInfo
    get() = DeviceInfoProbe.read()

  // === Snapshot ===

  override fun getState(): HingeState {
    synchronized(lock) { return cachedState }
  }

  // === Subscription ===

  override fun addChangeListener(
    callback: (HingeState) -> Unit
  ): ChangeSubscription {
    val id = UUID.randomUUID()
    listeners[id] = callback
    return ChangeSubscription(remove = {
      listeners.remove(id)
    })
  }

  // === Observer callback ===

  /**
   * Called by HingeObserver when WindowInfoTracker or
   * ComponentCallbacks reports a layout change.
   */
  fun refreshState() {
    val newState = HingeStateProbe.snapshot()
    android.util.Log.d(
      "Hinge",
      "HybridHinge.refreshState: widthClass=${newState.widthClass} " +
        "window=${newState.windowWidth}x${newState.windowHeight} " +
        "folds=${newState.foldFeatures.size}"
    )
    synchronized(lock) {
      cachedState = newState
    }
    // Snapshot listeners to avoid mutation-during-iteration.
    val snapshot = listeners.values.toList()
    android.util.Log.d("Hinge", "HybridHinge.refreshState: notifying ${snapshot.size} JS listeners")
    for (cb in snapshot) {
      cb(newState)
    }
  }
}