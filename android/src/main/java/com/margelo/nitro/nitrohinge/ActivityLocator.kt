package com.margelo.nitro.nitrohinge

import android.app.Activity
import java.lang.ref.WeakReference

/**
 * Tracks the currently-resumed Activity via WeakReference so we can
 * feed it to WindowMetricsCalculator and WindowInfoTracker without
 * risking a leak.
 *
 * Set by HingeObserver's ActivityLifecycleCallbacks.
 */
object ActivityLocator {

  private var currentRef: WeakReference<Activity>? = null

  fun setCurrent(activity: Activity?) {
    currentRef = activity?.let { WeakReference(it) }
  }

  fun currentActivity(): Activity? = currentRef?.get()
}