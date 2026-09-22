import UIKit

/// Reads device model identifier and hardware capabilities.
///
/// For LOGGING and ANALYTICS only. Do not use these to drive
/// layout decisions — that's what widthClass and foldFeature
/// are for.
enum DeviceInfoProbe {

  /// Returns the device model identifier (e.g. "iPhone19,4").
  /// Uses uname() rather than UIDevice.current.model which returns
  /// "iPhone" for every iPhone.
  static func modelIdentifier() -> String {
    var systemInfo = utsname()
    uname(&systemInfo)
    let mirror = Mirror(reflecting: systemInfo.machine)
    let identifier = mirror.children.reduce("") { partial, element in
      guard let value = element.value as? Int8, value != 0 else {
        return partial
      }
      return partial + String(UnicodeScalar(UInt8(value)))
    }
    return identifier.isEmpty ? "unknown" : identifier
  }

  /// True if this device physically folds.
  ///
  /// Detection strategy: ask the current window for its inactive
  /// reserved regions of kind .division. On a Duo (or future
  /// foldable iPad), the fold region is present even when flat,
  /// just with zero width. On a non-folding iPhone or iPad, the
  /// call returns an empty array.
  ///
  /// COMPILE-TIME GATE: the `reservedRegions(kind:options:)` API
  /// ships in iOS 27.1 SDK. Xcode 27.0 doesn't have it, so this
  /// entire path is compiled out until HINGE_IOS_27_1_SDK is
  /// defined (see HingeStateProbe for the same gate).
  ///
  /// Until then this always returns false — safe fallback that
  /// matches every non-foldable device today. Layout code should
  /// never depend on this anyway; it's analytics-only.
  @MainActor
  static func hasHardwareHinge() -> Bool {
    #if compiler(>=6.1) && canImport(UIKit) && HINGE_IOS_27_1_SDK
    if #available(iOS 27.1, *) {
      return hasHardwareHingeUsingReservedRegions()
    }
    #endif
    return false
  }

  #if compiler(>=6.1) && canImport(UIKit) && HINGE_IOS_27_1_SDK
  @available(iOS 27.1, *)
  @MainActor
  private static func hasHardwareHingeUsingReservedRegions() -> Bool {
    guard let window = activeWindow() else { return false }
    // .includeInactive: return the region even on a flat fold, so
    // detection doesn't flicker as the user opens/closes the device.
    let regions = window.reservedRegions(
      kind: .division,
      options: [.includeInactive]
    )
    return !regions.isEmpty
  }

  @available(iOS 27.1, *)
  @MainActor
  private static func activeWindow() -> UIWindow? {
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
    if let active = scenes.first(where: { $0.activationState == .foregroundActive }) {
      return active.windows.first { $0.isKeyWindow } ?? active.windows.first
    }
    return scenes.first?.windows.first
  }
  #endif
}