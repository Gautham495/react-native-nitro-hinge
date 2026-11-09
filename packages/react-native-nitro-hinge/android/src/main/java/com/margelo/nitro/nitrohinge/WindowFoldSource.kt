package com.margelo.nitro.nitrohinge

import android.app.Activity
import android.content.ComponentCallbacks
import android.content.res.Configuration
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import androidx.core.util.Consumer
import androidx.core.view.WindowInsetsCompat
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import androidx.window.layout.WindowMetricsCalculator
import java.util.WeakHashMap
import java.util.concurrent.Executor

/**
 * Shared per-activity window state source: FoldingFeature list from Jetpack
 * WindowManager, the system bar and cutout insets over the app content,
 * window metrics, font scale, and (when a client asks for it) the hinge
 * angle sensor.
 *
 * Refcounted — the first acquire() starts observation, the last release()
 * stops it and evicts the source from the process map.
 *
 * Design choices:
 * - Per-activity WeakHashMap keying to avoid Activity leaks
 * - WindowInfoTrackerCallbackAdapter + Executor instead of a coroutine flow
 *   (simpler lifecycle, no cancellation race)
 * - Hinge-sensor clients tracked separately from layout clients so the
 *   sensor only runs when someone actually reads the angle
 * - Version counter + state equality check so downstream mappers can
 *   skip work cheaply
 *
 * Main thread only. All callbacks fire on main.
 */
class WindowFoldSource private constructor(val activity: Activity) {

  data class Metrics(val widthPx: Int, val heightPx: Int, val density: Float)

  data class FoldFeatureInput(
    val bounds: PxRect,
    val isHalfOpened: Boolean,
    val isSeparating: Boolean,
    val isOccluding: Boolean,
    val orientation: FoldingFeature.Orientation,
  )

  data class State(
    val folds: List<FoldFeatureInput>,
    val insets: PxInsets,
    val metrics: Metrics,
    val fontScale: Float,
  )

  interface Listener {
    fun onFoldSourceChanged(state: State)

    /** Only called for listeners acquired with wantsHingeAngle. */
    fun onHingeAngleChanged(degrees: Double) = Unit
  }

  var state: State = State(lastFolds, lastInsets, Metrics(0, 0, 1f), 1f)
    private set

  /**
   * Latest hinge sensor reading in degrees. Null until the sensor first
   * reports, and always null on devices without one.
   */
  var hingeAngle: Double? = lastHingeAngle
    private set

  /** Incremented on every state change; downstream can skip recompute cheaply. */
  var version: Int = 0
    private set

  private val listeners = LinkedHashSet<Listener>()
  private val hingeClients = HashSet<Listener>()
  private var folds: List<FoldFeatureInput> = lastFolds
  private var hingeRegistered = false

  private val decorView: View
    get() = activity.window.decorView

  private val mainHandler = Handler(Looper.getMainLooper())
  private val mainExecutor = Executor { command -> mainHandler.post(command) }
  private val tracker = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(activity))
  private val sensorManager = activity.getSystemService(SensorManager::class.java)

  private val layoutInfoListener = Consumer<WindowLayoutInfo> { info ->
    folds = info.displayFeatures.filterIsInstance<FoldingFeature>().map { feature ->
      val b = feature.bounds
      FoldFeatureInput(
        bounds = PxRect(b.left, b.top, b.right, b.bottom),
        isHalfOpened = feature.state == FoldingFeature.State.HALF_OPENED,
        isSeparating = feature.isSeparating,
        isOccluding = feature.occlusionType == FoldingFeature.OcclusionType.FULL,
        orientation = feature.orientation,
      )
    }
    lastFolds = folds
    refresh()
  }

  private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener { refresh() }

  private val configurationCallbacks = object : ComponentCallbacks {
    override fun onConfigurationChanged(newConfig: Configuration) = refresh()
    @Deprecated("Deprecated in Java")
    override fun onLowMemory() = Unit
  }

  private val hingeListener = object : SensorEventListener {
    override fun onSensorChanged(event: SensorEvent) {
      val degrees = event.values.firstOrNull()?.toDouble() ?: return
      if (degrees == hingeAngle) return
      hingeAngle = degrees
      lastHingeAngle = degrees
      // Angle ticks skip refresh(). They don't change the layout, and the
      // sensor can report every frame while the hinge moves.
      hingeClients.toList().forEach { it.onHingeAngleChanged(degrees) }
    }
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  }

  fun release(listener: Listener) {
    listeners.remove(listener)
    hingeClients.remove(listener)
    updateHingeRegistration()
    if (listeners.isEmpty()) {
      stop()
      sources.remove(activity)
    }
  }

  private fun add(listener: Listener, wantsHingeAngle: Boolean) {
    val first = listeners.isEmpty()
    listeners.add(listener)
    if (wantsHingeAngle) hingeClients.add(listener)
    if (first) start()
    updateHingeRegistration()
  }

  private fun start() {
    tracker.addWindowLayoutInfoListener(activity, mainExecutor, layoutInfoListener)
    decorView.viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)
    activity.registerComponentCallbacks(configurationCallbacks)
    refresh()
  }

  private fun stop() {
    tracker.removeWindowLayoutInfoListener(layoutInfoListener)
    decorView.viewTreeObserver.removeOnGlobalLayoutListener(globalLayoutListener)
    activity.unregisterComponentCallbacks(configurationCallbacks)
  }

  private fun updateHingeRegistration() {
    val needed = hingeClients.isNotEmpty()
    if (needed == hingeRegistered) return
    val sensor = hingeSensor() ?: return
    if (needed) {
      // GAME (20 ms) is fast enough for smooth animations. The sensor only
      // reports changes, so it stays quiet while the hinge doesn't move.
      sensorManager?.registerListener(hingeListener, sensor, SensorManager.SENSOR_DELAY_GAME)
    } else {
      sensorManager?.unregisterListener(hingeListener)
    }
    hingeRegistered = needed
  }

  private fun refresh() {
    val next = State(folds, readInsets(), readMetrics(), readFontScale())
    if (next == state) return
    state = next
    version += 1
    // Copy: a listener may release itself while being notified.
    listeners.toList().forEach { it.onFoldSourceChanged(next) }
  }

  private fun readMetrics(): Metrics {
    val m = WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(activity)
    return Metrics(m.bounds.width(), m.bounds.height(), m.density)
  }

  private fun readInsets(): PxInsets {
    // A recreated Activity has no insets until its first layout.
    val raw = decorView.rootWindowInsets ?: return lastInsets
    val content = activity.findViewById<View>(android.R.id.content)
    if (content == null || !content.isLaidOut) return lastInsets
    val bars = WindowInsetsCompat.toWindowInsetsCompat(raw, decorView)
      .getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
    val origin = IntArray(2).also { content.getLocationInWindow(it) }
    val bounds = PxRect(origin[0], origin[1], origin[0] + content.width, origin[1] + content.height)
    return PxInsets(bars.left, bars.top, bars.right, bars.bottom)
      .overlapping(bounds, decorView.width, decorView.height)
      .also { lastInsets = it }
  }

  private fun readFontScale(): Float = activity.resources.configuration.fontScale

  private fun hingeSensor(): Sensor? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      sensorManager?.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE)
    } else null

  companion object {
    private val sources = WeakHashMap<Activity, WindowFoldSource>()

    /** Process-wide last hinge reading; seeds new sources so paused/resumed apps don't flicker. */
    private var lastHingeAngle: Double? = null

    /**
     * Process-wide last folds and insets. A recreated Activity reports them
     * a frame or two late, and JS would see none in between.
     */
    private var lastFolds: List<FoldFeatureInput> = emptyList()
    private var lastInsets: PxInsets = PxInsets.ZERO

    fun acquire(activity: Activity, listener: Listener, wantsHingeAngle: Boolean): WindowFoldSource {
      val source = sources.getOrPut(activity) { WindowFoldSource(activity) }
      source.add(listener, wantsHingeAngle)
      return source
    }
  }
}

data class PxInsets(val left: Int, val top: Int, val right: Int, val bottom: Int) {
  /**
   * The part of these window insets that still covers [content], a rect in
   * window coordinates. Without edge-to-edge the content already sits
   * inside the system bars, so this is zero there.
   */
  fun overlapping(content: PxRect, windowWidth: Int, windowHeight: Int) = PxInsets(
    left = maxOf(0, left - content.left),
    top = maxOf(0, top - content.top),
    right = maxOf(0, right - (windowWidth - content.right)),
    bottom = maxOf(0, bottom - (windowHeight - content.bottom)),
  )

  companion object {
    val ZERO = PxInsets(0, 0, 0, 0)
  }
}

/** Integer pixel rect, right/bottom exclusive. */
data class PxRect(val left: Int, val top: Int, val right: Int, val bottom: Int) {
  val width: Int get() = right - left
  val height: Int get() = bottom - top
}
