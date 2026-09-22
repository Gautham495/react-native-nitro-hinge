package com.margelo.nitro.nitrohinge

import android.app.Activity
import android.content.Context
import android.util.DisplayMetrics
import androidx.window.core.layout.WindowSizeClass
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowMetricsCalculator
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

/**
 * Reads the current layout state from Jetpack WindowManager.
 *
 * WindowMetricsCalculator gives the current window bounds
 * (not screen — critical for split-screen and multi-window).
 *
 * WindowInfoTracker exposes the current fold state via a Flow;
 * we take the latest emission for a synchronous snapshot.
 *
 * WindowSizeClass classifies width and height independently
 * into compact / medium / expanded.
 *
 * NOTE on `androidx.window.core.layout.WindowSizeClass`:
 * this import path only exists in androidx.window 1.4.0+.
 * If it fails to resolve, your build.gradle is on an older
 * version — bump to at least 1.5.1.
 */
object HingeStateProbe {

  private const val WIDTH_MEDIUM_DP = 600
  private const val WIDTH_EXPANDED_DP = 840
  private const val HEIGHT_MEDIUM_DP = 480
  private const val HEIGHT_EXPANDED_DP = 900

  fun snapshot(): HingeState {
    val context = NitroModules.applicationContext
      ?: return fallbackState()

    val activity = ActivityLocator.currentActivity()
    val metricsHost: Context = activity ?: context

    val metrics = try {
      WindowMetricsCalculator.getOrCreate()
        .computeCurrentWindowMetrics(metricsHost as Activity)
    } catch (e: Throwable) {
      // No activity yet (early cold start) — use fallback.
      return fallbackState()
    }

    val density = context.resources.displayMetrics.density
    val widthPx = metrics.bounds.width()
    val heightPx = metrics.bounds.height()
    val widthDp = widthPx / density
    val heightDp = heightPx / density

    val widthClass = classifyWidth(widthDp)
    val heightClass = classifyHeight(heightDp)

    val insets = readSafeInsets(activity, density)
    val folds = readFoldFeatures(activity, density)

    val fontScale = context.resources.configuration.fontScale.toDouble()

    return HingeState(
      widthClass = widthClass,
      heightClass = heightClass,
      windowWidth = widthDp.toDouble(),
      windowHeight = heightDp.toDouble(),
      safeInsets = insets,
      foldFeatures = folds,
      fontScale = fontScale
    )
  }

  // === Size class classification ===

  private fun classifyWidth(dp: Float): WidthSizeClass {
    return when {
      dp < WIDTH_MEDIUM_DP -> WidthSizeClass.COMPACT
      dp < WIDTH_EXPANDED_DP -> WidthSizeClass.MEDIUM
      else -> WidthSizeClass.EXPANDED
    }
  }

  private fun classifyHeight(dp: Float): HeightSizeClass {
    return when {
      dp < HEIGHT_MEDIUM_DP -> HeightSizeClass.COMPACT
      dp < HEIGHT_EXPANDED_DP -> HeightSizeClass.MEDIUM
      else -> HeightSizeClass.EXPANDED
    }
  }

  // === Safe insets ===

  private fun readSafeInsets(
    activity: Activity?,
    density: Float
  ): SafeInsets {
    if (activity == null) {
      return SafeInsets(0.0, 0.0, 0.0, 0.0)
    }
    val windowInsets = activity.window.decorView.rootWindowInsets ?: return SafeInsets(0.0, 0.0, 0.0, 0.0)
    val systemBars = androidx.core.view.WindowInsetsCompat
      .toWindowInsetsCompat(windowInsets)
      .getInsets(
        androidx.core.view.WindowInsetsCompat.Type.systemBars()
          or androidx.core.view.WindowInsetsCompat.Type.displayCutout()
      )
    return SafeInsets(
      top = (systemBars.top / density).toDouble(),
      right = (systemBars.right / density).toDouble(),
      bottom = (systemBars.bottom / density).toDouble(),
      left = (systemBars.left / density).toDouble()
    )
  }

  // === Fold features (plural — tri-folds report multiple) ===
  // Returns Array<FoldFeature>, not List — Nitrogen requires this.

  private fun readFoldFeatures(
    activity: Activity?,
    density: Float
  ): Array<FoldFeature> {
    if (activity == null) return emptyArray()

    val context = NitroModules.applicationContext ?: return emptyArray()
    val tracker = WindowInfoTracker.getOrCreate(context)

    // Take the current emission synchronously. WindowInfoTracker
    // guarantees a value is available once the flow has been
    // collected at least once; HingeObserver keeps it warm.
    val layoutInfo = try {
      runBlocking {
        tracker.windowLayoutInfo(activity).first()
      }
    } catch (e: Throwable) {
      return emptyArray()
    }

    return layoutInfo.displayFeatures
      .filterIsInstance<FoldingFeature>()
      .filter { it.isSeparating }
      .map { folding ->
        val bounds = folding.bounds
        val orientation = when (folding.orientation) {
          FoldingFeature.Orientation.HORIZONTAL -> FoldOrientation.HORIZONTAL
          FoldingFeature.Orientation.VERTICAL -> FoldOrientation.VERTICAL
          else -> FoldOrientation.HORIZONTAL
        }
        val state = when (folding.state) {
          FoldingFeature.State.FLAT -> FoldState.FLAT
          FoldingFeature.State.HALF_OPENED -> FoldState.HALFOPENED
          else -> FoldState.FLAT
        }
        val occlusion = when (folding.occlusionType) {
          FoldingFeature.OcclusionType.NONE -> OcclusionType.NONE
          FoldingFeature.OcclusionType.FULL -> OcclusionType.FULL
          else -> OcclusionType.NONE
        }

        FoldFeature(
          bounds = Rect(
            x = (bounds.left / density).toDouble(),
            y = (bounds.top / density).toDouble(),
            width = (bounds.width() / density).toDouble(),
            height = (bounds.height() / density).toDouble()
          ),
          orientation = orientation,
          state = state,
          occlusionType = occlusion,
          isSeparating = folding.isSeparating
        )
      }
      .toTypedArray()
  }

  // === Fallback ===

  private fun fallbackState(): HingeState {
    return HingeState(
      widthClass = WidthSizeClass.COMPACT,
      heightClass = HeightSizeClass.MEDIUM,
      windowWidth = 411.0,
      windowHeight = 891.0,
      safeInsets = SafeInsets(top = 24.0, right = 0.0, bottom = 0.0, left = 0.0),
      foldFeatures = emptyArray(),
      fontScale = 1.0
    )
  }
}