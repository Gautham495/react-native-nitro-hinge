package com.margelo.nitro.nitrohinge
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class NitroHinge : HybridNitroHingeSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
