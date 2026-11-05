package com.margelo.nitro.nitrohinge

import androidx.window.layout.FoldingFeature
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class HingeStateProbeTest {

  private fun state(
    widthPx: Int = 1080,
    heightPx: Int = 2400,
    density: Float = 1f,
    insets: PxInsets = PxInsets.ZERO,
    folds: List<WindowFoldSource.FoldFeatureInput> = emptyList(),
    fontScale: Float = 1f,
  ) = WindowFoldSource.State(
    folds = folds,
    insets = insets,
    metrics = WindowFoldSource.Metrics(widthPx, heightPx, density),
    fontScale = fontScale,
    hingeAngle = null,
  )

  private fun fold(
    bounds: PxRect = PxRect(0, 0, 0, 0),
    isHalfOpened: Boolean = false,
    isSeparating: Boolean = false,
    isOccluding: Boolean = false,
    orientation: FoldingFeature.Orientation = FoldingFeature.Orientation.VERTICAL,
  ) = WindowFoldSource.FoldFeatureInput(bounds, isHalfOpened, isSeparating, isOccluding, orientation)

  @Test
  fun `converts window pixels to dp`() {
    val mapped = HingeStateProbe.map(state(widthPx = 1080, heightPx = 2424, density = 2.625f))

    assertEquals(411.43, mapped.windowWidth, 0.01)
    assertEquals(923.43, mapped.windowHeight, 0.01)
  }

  @Test
  fun `uses material width breakpoints`() {
    assertEquals(WidthSizeClass.COMPACT, HingeStateProbe.map(state(widthPx = 599)).widthClass)
    assertEquals(WidthSizeClass.MEDIUM, HingeStateProbe.map(state(widthPx = 600)).widthClass)
    assertEquals(WidthSizeClass.MEDIUM, HingeStateProbe.map(state(widthPx = 839)).widthClass)
    assertEquals(WidthSizeClass.EXPANDED, HingeStateProbe.map(state(widthPx = 840)).widthClass)
  }

  @Test
  fun `uses material height breakpoints`() {
    assertEquals(HeightSizeClass.COMPACT, HingeStateProbe.map(state(heightPx = 479)).heightClass)
    assertEquals(HeightSizeClass.MEDIUM, HingeStateProbe.map(state(heightPx = 480)).heightClass)
    assertEquals(HeightSizeClass.MEDIUM, HingeStateProbe.map(state(heightPx = 899)).heightClass)
    assertEquals(HeightSizeClass.EXPANDED, HingeStateProbe.map(state(heightPx = 900)).heightClass)
  }

  @Test
  fun `reports system bar insets in dp`() {
    val mapped = HingeStateProbe.map(
      state(density = 2.625f, insets = PxInsets(left = 0, top = 126, right = 21, bottom = 63))
    )

    assertEquals(SafeInsets(top = 48.0, right = 8.0, bottom = 24.0, left = 0.0), mapped.safeInsets)
  }

  @Test
  fun `does not invent insets the window does not have`() {
    val mapped = HingeStateProbe.map(state(insets = PxInsets.ZERO))

    assertEquals(SafeInsets(top = 0.0, right = 0.0, bottom = 0.0, left = 0.0), mapped.safeInsets)
  }

  @Test
  fun `maps a half-open occluding fold`() {
    val mapped = HingeStateProbe.map(
      state(
        density = 2f,
        folds = listOf(
          fold(
            bounds = PxRect(left = 1000, top = 0, right = 1100, bottom = 1800),
            isHalfOpened = true,
            isSeparating = true,
            isOccluding = true,
          )
        ),
      )
    )

    assertArrayEquals(
      arrayOf(
        FoldFeature(
          bounds = Rect(x = 500.0, y = 0.0, width = 50.0, height = 900.0),
          orientation = FoldOrientation.VERTICAL,
          state = FoldState.HALFOPENED,
          occlusionType = OcclusionType.FULL,
          isSeparating = true,
        )
      ),
      mapped.foldFeatures,
    )
  }

  @Test
  fun `maps a flat seamless fold`() {
    val mapped = HingeStateProbe.map(
      state(folds = listOf(fold(orientation = FoldingFeature.Orientation.HORIZONTAL)))
    )

    val feature = mapped.foldFeatures.single()
    assertEquals(FoldOrientation.HORIZONTAL, feature.orientation)
    assertEquals(FoldState.FLAT, feature.state)
    assertEquals(OcclusionType.NONE, feature.occlusionType)
  }

  @Test
  fun `passes the font scale through`() {
    assertEquals(1.3, HingeStateProbe.map(state(fontScale = 1.3f)).fontScale, 1e-6)
  }

  @Test
  fun `treats a zero density as one`() {
    assertEquals(1080.0, HingeStateProbe.map(state(widthPx = 1080, density = 0f)).windowWidth, 0.0)
  }

  @Test
  fun `maps equal inputs to equal states`() {
    val input = state(folds = listOf(fold(isHalfOpened = true)), insets = PxInsets(left = 0, top = 24, right = 0, bottom = 48))

    assertEquals(HingeStateProbe.map(input), HingeStateProbe.map(input))
  }
}
