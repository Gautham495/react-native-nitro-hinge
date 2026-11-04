package com.margelo.nitro.nitrohinge

import android.app.Activity
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import java.lang.ref.WeakReference
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Process-wide observer. Owns one WindowFoldSource subscription and pushes
 * each change to every live HybridHinge.
 *
 * WindowFoldSource handles the WindowInfoTracker subscription, refcounting,
 * insets and the sensor. This object binds that source to React Native's
 * current Activity, rebinds it when the host resumes with a different one
 * (recreation, cold start), and fans state out to attached HybridHinges.
 *
 * Everything except attach/detach runs on the main thread.
 */
object HingeObserver : WindowFoldSource.Listener, LifecycleEventListener {

  private const val INITIAL_STATE_TIMEOUT_MS = 250L

  private val mainHandler = Handler(Looper.getMainLooper())
  private val instances = ConcurrentLinkedQueue<WeakReference<HybridHinge>>()

  private var source: WindowFoldSource? = null
  private var reactContext: ReactApplicationContext? = null

  /** Called from the JS thread when Nitro constructs a HybridHinge. */
  fun attach(hinge: HybridHinge) {
    instances.add(WeakReference(hinge))
    runOnMainBlocking { onAttached(hinge) }
  }

  fun detach(hinge: HybridHinge) {
    instances.removeAll { ref -> ref.get().let { it == null || it === hinge } }
    mainHandler.post { if (instances.isEmpty()) stop() }
  }

  override fun onFoldSourceChanged(state: WindowFoldSource.State) {
    val it = instances.iterator()
    while (it.hasNext()) {
      val hinge = it.next().get()
      if (hinge == null) it.remove() else hinge.onSourceChanged(state)
    }
  }

  // RN sets currentActivity right before it calls onHostResume, so this is
  // where a recreated Activity shows up.
  override fun onHostResume() {
    bind(reactContext?.currentActivity)
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    source?.release(this)
    source = null
  }

  private fun onAttached(hinge: HybridHinge) {
    val ctx = NitroModules.applicationContext ?: return
    // A JS reload creates a new ReactApplicationContext but never destroys
    // the old one, and the old one stops getting lifecycle events.
    if (ctx !== reactContext) {
      reactContext?.removeLifecycleEventListener(this)
      reactContext = ctx
      ctx.addLifecycleEventListener(this)
    }
    bind(ctx.currentActivity)
    source?.let { hinge.onSourceChanged(it.state) }
  }

  private fun bind(activity: Activity?) {
    if (activity == null || activity === source?.activity) return
    source?.release(this)
    source = null
    source = WindowFoldSource.acquire(activity, this, wantsHingeAngle = false)
    source?.let { onFoldSourceChanged(it.state) }
  }

  private fun stop() {
    source?.release(this)
    source = null
    reactContext?.removeLifecycleEventListener(this)
    reactContext = null
  }

  // Blocks so reads at module load already see the real window. The timeout
  // keeps JS from hanging if main is busy or waiting on JS.
  private fun runOnMainBlocking(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
      return
    }
    val done = CountDownLatch(1)
    mainHandler.post {
      try {
        block()
      } finally {
        done.countDown()
      }
    }
    done.await(INITIAL_STATE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
  }
}
