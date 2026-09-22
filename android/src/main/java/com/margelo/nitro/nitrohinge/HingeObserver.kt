package com.margelo.nitro.nitrohinge

import android.app.Activity
import android.app.Application
import android.content.ComponentCallbacks2
import android.content.res.Configuration
import android.os.Bundle
import android.util.Log
import androidx.window.layout.WindowInfoTracker
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import java.lang.ref.WeakReference
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Shared observer that watches WindowInfoTracker for fold changes
 * and Application-level configuration changes for rotation, dynamic
 * type, etc. Pings every attached HybridHinge instance to refresh.
 *
 * IMPORTANT: WindowInfoTracker keeps registered callbacks in a
 * process-lifetime map keyed by Context. If we register with an
 * Activity that later gets destroyed, the tracker leaks the Activity
 * AND our listener stops receiving events. Fix (per Moistbobo PR #2):
 *
 * 1. Get the tracker from Application context, not Activity
 * 2. Pass the current Activity to `.windowLayoutInfo(activity)` for
 *    the query, but re-create the flow when Activity changes
 * 3. Explicitly cancel the coroutine on activity destruction so the
 *    underlying callback unregisters cleanly
 *
 * Diagnostic logs at every step. Filter with:
 *   adb logcat -s Hinge:V
 */
object HingeObserver {

  private const val TAG = "Hinge"

  val shared: HingeObserver = this

  private val instances = ConcurrentLinkedQueue<WeakReference<HybridHinge>>()
  private var isObserving = false
  private var foldJob: Job? = null
  private val scope = CoroutineScope(Dispatchers.Main)

  fun attach(hinge: HybridHinge) {
    Log.d(TAG, "Observer.attach: registering hinge instance")
    instances.add(WeakReference<HybridHinge>(hinge))
    if (!isObserving) {
      isObserving = true
      startObserving()
    } else {
      Log.d(TAG, "Observer.attach: already observing, ${instances.size} total instances")
    }
  }

  private fun startObserving() {
    Log.d(TAG, "Observer.startObserving: begin")
    val ctx = NitroModules.applicationContext
    if (ctx == null) {
      Log.e(TAG, "Observer.startObserving: NitroModules.applicationContext is null, aborting")
      return
    }

    // NitroModules.applicationContext returns a ReactApplicationContext,
    // not the underlying Application. Unwrap via .applicationContext,
    // which returns the real Application on any ContextWrapper.
    val app = ctx.applicationContext as? Application
    if (app == null) {
      Log.e(TAG, "Observer.startObserving: ctx.applicationContext is not Application (type=${ctx.applicationContext?.javaClass?.name}), aborting")
      return
    }

    app.registerComponentCallbacks(configListener)
    app.registerActivityLifecycleCallbacks(activityCallbacks)
    Log.d(TAG, "Observer.startObserving: registered ComponentCallbacks + ActivityLifecycle")

    // Try to attach fold observer immediately if an activity exists.
    val currentActivity = ActivityLocator.currentActivity()
    if (currentActivity != null) {
      Log.d(TAG, "Observer.startObserving: activity available, attaching fold observer")
      attachFoldObserver(currentActivity)
    } else {
      Log.d(TAG, "Observer.startObserving: no activity yet, will attach on onActivityResumed")
    }
  }

  private fun attachFoldObserver(activity: Activity) {
    Log.d(TAG, "Observer.attachFoldObserver: cancelling previous job")
    foldJob?.cancel()

    // CRITICAL: get the tracker from the Application context, not Activity.
    // Passing Activity here causes the tracker's process-lifetime callback
    // map to retain the Activity. See Moistbobo/react-native-fold-detection#2.
    //
    // NitroModules.applicationContext is a ReactApplicationContext wrapper;
    // unwrap to the underlying Application via .applicationContext.
    val ctx = NitroModules.applicationContext
    if (ctx == null) {
      Log.e(TAG, "Observer.attachFoldObserver: no application context")
      return
    }
    val tracker = WindowInfoTracker.getOrCreate(ctx.applicationContext)

    Log.d(TAG, "Observer.attachFoldObserver: starting flow collect for activity=$activity")
    foldJob = scope.launch {
      try {
        tracker.windowLayoutInfo(activity).collect { layoutInfo ->
          Log.d(TAG, "Observer: windowLayoutInfo emitted, features=${layoutInfo.displayFeatures.size}")
          notifyAllListeners()
        }
      } catch (e: Throwable) {
        Log.e(TAG, "Observer.attachFoldObserver: flow collect failed", e)
      }
    }
  }

  private fun notifyAllListeners() {
    val iterator = instances.iterator()
    var live = 0
    while (iterator.hasNext()) {
      val ref = iterator.next()
      val hinge = ref.get()
      if (hinge == null) {
        iterator.remove()
      } else {
        live++
        hinge.refreshState()
      }
    }
    Log.d(TAG, "Observer.notifyAllListeners: notified $live live instances")
  }

  // === ComponentCallbacks: rotation, font scale, locale ===

  private val configListener = object : ComponentCallbacks2 {
    override fun onConfigurationChanged(newConfig: Configuration) {
      Log.d(TAG, "Observer.onConfigurationChanged: orientation=${newConfig.orientation}")
      notifyAllListeners()
    }
    override fun onLowMemory() {}
    override fun onTrimMemory(level: Int) {}
  }

  // === Activity lifecycle: catches activity changes ===

  private val activityCallbacks = object : Application.ActivityLifecycleCallbacks {
    override fun onActivityResumed(activity: Activity) {
      Log.d(TAG, "Observer.onActivityResumed: activity=$activity")
      ActivityLocator.setCurrent(activity)
      attachFoldObserver(activity)
      notifyAllListeners()
    }
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
      Log.d(TAG, "Observer.onActivityCreated: activity=$activity")
      ActivityLocator.setCurrent(activity)
    }
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {
      Log.d(TAG, "Observer.onActivityDestroyed: activity=$activity")
      if (ActivityLocator.currentActivity() === activity) {
        ActivityLocator.setCurrent(null)
        foldJob?.cancel()
        foldJob = null
      }
    }
  }
}