package com.margelo.nitro.nitrohinge

import androidx.window.layout.FoldingFeature

/**
 * Pure mapper: WindowFoldSource.State (raw Android inputs) → HingeState (JS-facing).
 *
 * No side effects, no device queries, no lifecycle. All the tricky
 * activity/lifecycle handling lives in WindowFoldSource; this file just
 * translates units and shapes.
 */
object HingeStateProbe {

  // Material window size class breakpoints (dp).
  private const val WIDTH_MEDIUM_DP = 600.0
  private const val WIDTH_EXPANDED_DP = 840.0
  private const val HEIGHT_MEDIUM_DP = 480.0
  private const val HEIGHT_EXPANDED_DP = 900.0

  fun map(source: WindowFoldSource.State): HingeState {
    val d = if (source.metrics.density > 0f) source.metrics.density.toDouble() else 1.0
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

    return HingeState(
      widthClass = widthSizeClass(widthDp),
      heightClass = heightSizeClass(heightDp),
      windowWidth = widthDp,
      windowHeight = heightDp,
      safeInsets = SafeInsets(
        top = source.insets.top / d,
        right = source.insets.right / d,
        bottom = source.insets.bottom / d,
        left = source.insets.left / d,
      ),
      foldFeatures = foldFeatures,
      fontScale = source.fontScale.toDouble(),
    )
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
}
