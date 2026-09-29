package com.margelo.nitro.nitrohinge

import android.util.Log
import androidx.window.layout.FoldingFeature

/**
 * Pure mapper: WindowFoldSource.State (raw Android inputs) → HingeState (JS-facing).
 *
 * No side effects, no device queries, no lifecycle. All the tricky
 * activity/lifecycle handling lives in WindowFoldSource; this file just
 * translates units and shapes.
 */
object HingeStateProbe {

  private const val TAG = "Hinge"

  // Material window size class breakpoints (dp).
  private const val WIDTH_MEDIUM_DP = 600.0
  private const val WIDTH_EXPANDED_DP = 840.0
  private const val HEIGHT_MEDIUM_DP = 480.0
  private const val HEIGHT_EXPANDED_DP = 900.0

  fun map(source: WindowFoldSource.State, fontScale: Double): HingeState {
    val density = if (source.metrics.density > 0f) source.metrics.density else 1f
    val d = density.toDouble()
    val widthDp = source.metrics.widthPx / d
    val heightDp = source.metrics.heightPx / d

    val foldFeatures = source.folds.map { input ->
      FoldFeature(
        bounds = Rect(
          x = input.bounds.left / d,
          y = input.bounds.top / d,
          width = input.bounds.width / d,
          height = input.bounds.height / d,
        ),
        orientation = when (input.orientation) {
          FoldingFeature.Orientation.HORIZONTAL -> FoldOrientation.HORIZONTAL
          else -> FoldOrientation.VERTICAL
        },
        state = if (input.isHalfOpened) FoldState.HALFOPENED else FoldState.FLAT,
        occlusionType = OcclusionType.NONE,
        isSeparating = input.isSeparating,
      )
    }.toTypedArray()

    val safeInsets = insetsFromCutouts(source.cutouts, source.metrics, d)

    val state = HingeState(
      widthClass = widthSizeClass(widthDp),
      heightClass = heightSizeClass(heightDp),
      windowWidth = widthDp,
      windowHeight = heightDp,
      safeInsets = safeInsets,
      foldFeatures = foldFeatures,
      fontScale = fontScale,
    )

    Log.d(
      TAG,
      "HingeStateProbe.map: ${state.widthClass} ${state.windowWidth}x${state.windowHeight} folds=${foldFeatures.size}"
    )

    return state
  }

  fun fallback(): HingeState = HingeState(
    widthClass = WidthSizeClass.COMPACT,
    heightClass = HeightSizeClass.MEDIUM,
    windowWidth = 0.0,
    windowHeight = 0.0,
    safeInsets = SafeInsets(0.0, 0.0, 0.0, 0.0),
    foldFeatures = emptyArray(),
    fontScale = 1.0,
  )

  private fun widthSizeClass(widthDp: Double): WidthSizeClass = when {
    widthDp < WIDTH_MEDIUM_DP -> WidthSizeClass.COMPACT
    widthDp < WIDTH_EXPANDED_DP -> WidthSizeClass.MEDIUM
    else -> WidthSizeClass.EXPANDED
  }

  private fun heightSizeClass(heightDp: Double): HeightSizeClass = when {
    heightDp < HEIGHT_MEDIUM_DP -> HeightSizeClass.COMPACT
    heightDp < HEIGHT_EXPANDED_DP -> HeightSizeClass.MEDIUM
    else -> HeightSizeClass.EXPANDED
  }

  private fun insetsFromCutouts(
    cutouts: List<PxRect>,
    metrics: WindowFoldSource.Metrics,
    density: Double,
  ): SafeInsets {
    if (cutouts.isEmpty()) {
      return SafeInsets(top = 24.0, right = 0.0, bottom = 0.0, left = 0.0)
    }
    var top = 0
    var bottom = 0
    var left = 0
    var right = 0
    for (c in cutouts) {
      if (c.top == 0) top = maxOf(top, c.height)
      if (c.bottom == metrics.heightPx) bottom = maxOf(bottom, c.height)
      if (c.left == 0) left = maxOf(left, c.width)
      if (c.right == metrics.widthPx) right = maxOf(right, c.width)
    }
    return SafeInsets(
      top = maxOf(top / density, 24.0),
      right = right / density,
      bottom = bottom / density,
      left = left / density,
    )
  }
}