package com.margelo.nitro.nitrohinge

import android.app.Activity
import android.util.Log
import com.margelo.nitro.NitroModules
import java.lang.ref.WeakReference
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Global observer that owns a WindowFoldSource subscription and pings every
 * live HybridHinge instance when the source changes.
 *
 * WindowFoldSource does the heavy lifting (WindowInfoTracker subscription,
 * lifecycle, refcounting, cutouts, sensor). This object only:
 * - Bootstraps the Activity from ReactApplicationContext at first attach
 * - Subscribes to the source on behalf of all HybridHinge instances
 * - Fans out onFoldSourceChanged() calls to attached HybridHinges
 *
 * Main thread only.
 */
object HingeObserver : WindowFoldSource.Listener {

  private const val TAG = "Hinge"

  private val instances = ConcurrentLinkedQueue<WeakReference<HybridHinge>>()
  private var source: WindowFoldSource? = null
  private var sourceActivity: Activity? = null

  fun attach(hinge: HybridHinge) {
    Log.d(TAG, "Observer.attach")
    instances.add(WeakReference(hinge))
    ensureSource()
  }

  fun detach(hinge: HybridHinge) {
    val it = instances.iterator()
    while (it.hasNext()) {
      val ref = it.next()
      val h = ref.get()
      if (h == null || h === hinge) it.remove()
    }
    if (instances.isEmpty()) {
      releaseSource()
    }
  }

  override fun onFoldSourceChanged() {
    val src = source ?: return
    val snapshot = src.state
    val it = instances.iterator()
    var live = 0
    while (it.hasNext()) {
      val ref = it.next()
      val h = ref.get()
      if (h == null) {
        it.remove()
      } else {
        live += 1
        h.onSourceChanged(snapshot)
      }
    }
    Log.d(TAG, "Observer.onFoldSourceChanged: notified $live instances")
  }

  private fun ensureSource() {
    if (source != null) return
    val activity = bootstrapActivity() ?: run {
      Log.w(TAG, "Observer.ensureSource: no activity yet")
      return
    }
    sourceActivity = activity
    source = WindowFoldSource.acquire(activity, this, wantsHingeAngle = false)
    Log.d(TAG, "Observer.ensureSource: acquired for activity=$activity")
    // Push initial state immediately.
    onFoldSourceChanged()
  }

  private fun releaseSource() {
    source?.release(this)
    source = null
    sourceActivity = null
  }

  private fun bootstrapActivity(): Activity? {
    val ctx = NitroModules.applicationContext ?: return null
    return try {
      val method = ctx.javaClass.getMethod("getCurrentActivity")
      method.invoke(ctx) as? Activity
    } catch (e: Throwable) {
      Log.w(TAG, "Observer.bootstrapActivity: ${e.message}")
      null
    }
  }
}
