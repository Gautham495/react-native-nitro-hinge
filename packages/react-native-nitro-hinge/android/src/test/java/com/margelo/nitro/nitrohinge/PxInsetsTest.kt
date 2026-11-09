package com.margelo.nitro.nitrohinge

import org.junit.Assert.assertEquals
import org.junit.Test

class PxInsetsTest {

  private val bars = PxInsets(left = 0, top = 63, right = 0, bottom = 126)

  @Test
  fun `keeps the full bars when the content fills the window`() {
    val content = PxRect(left = 0, top = 0, right = 1080, bottom = 2400)

    assertEquals(bars, bars.overlapping(content, windowWidth = 1080, windowHeight = 2400))
  }

  @Test
  fun `drops bars the content is already laid out inside`() {
    val content = PxRect(left = 0, top = 63, right = 1080, bottom = 2400 - 126)

    assertEquals(PxInsets.ZERO, bars.overlapping(content, windowWidth = 1080, windowHeight = 2400))
  }

  @Test
  fun `keeps the part of a bar the content still sits under`() {
    val content = PxRect(left = 0, top = 24, right = 1080, bottom = 2400)

    assertEquals(
      PxInsets(left = 0, top = 39, right = 0, bottom = 126),
      bars.overlapping(content, windowWidth = 1080, windowHeight = 2400),
    )
  }

  @Test
  fun `handles side insets in landscape`() {
    val sides = PxInsets(left = 84, top = 0, right = 126, bottom = 0)
    val content = PxRect(left = 84, top = 0, right = 2400, bottom = 1080)

    assertEquals(
      PxInsets(left = 0, top = 0, right = 126, bottom = 0),
      sides.overlapping(content, windowWidth = 2400, windowHeight = 1080),
    )
  }
}
