import UIKit

/// Reads the current layout state from UIKit.
///
/// Uses UIWindowScene.effectiveGeometry and reservedRegions on
/// iOS 27.1+ for correct Duo/foldable behavior. Falls back to
/// keyWindow.bounds + safeAreaInsets on older iOS.
///
/// Do NOT use UIScreen.main.bounds — deprecated on iOS 27+, wrong
/// on Duo which has two screens. Ask the window, not the screen.
enum HingeStateProbe {

  /// Take a snapshot of the current layout state.
  /// Safe to call from any thread; internally jumps to main.
  static func snapshot() -> HingeState {
    // Swift 6 strict concurrency: crossing into @MainActor code from a
    // non-isolated context requires MainActor.assumeIsolated when we
    // *know* we're already on the main thread, or DispatchQueue.main.sync
    // wrapped in the same isolation shim when we're not.
    if Thread.isMainThread {
      return MainActor.assumeIsolated { _snapshotOnMain() }
    }
    return DispatchQueue.main.sync {
      MainActor.assumeIsolated { _snapshotOnMain() }
    }
  }

  @MainActor
  private static func _snapshotOnMain() -> HingeState {
    guard let window = Self.activeWindow() else {
      return Self.fallbackState()
    }

    let bounds = window.bounds
    let insets = window.safeAreaInsets
    let traits = window.traitCollection

    let widthClass = Self.normalizeWidthClass(
      hSize: traits.horizontalSizeClass,
      windowWidth: bounds.width
    )
    let heightClass = Self.normalizeHeightClass(
      vSize: traits.verticalSizeClass,
      windowHeight: bounds.height
    )

    let foldFeatures = Self.readFoldFeatures(window: window)

    return HingeState(
      widthClass: widthClass,
      heightClass: heightClass,
      windowWidth: Double(bounds.width),
      windowHeight: Double(bounds.height),
      safeInsets: SafeInsets(
        top: Double(insets.top),
        right: Double(insets.right),
        bottom: Double(insets.bottom),
        left: Double(insets.left)
      ),
      foldFeatures: foldFeatures,
      fontScale: Double(traits.preferredContentSizeCategory.fontScaleMultiplier)
    )
  }

  // MARK: - Window discovery

  @MainActor
  private static func activeWindow() -> UIWindow? {
    // Prefer foregroundActive scene; fall back to first connected scene.
    // Never use UIApplication.shared.keyWindow (deprecated) or
    // connectedScenes.first (wrong on multi-scene iPhones).
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }

    if let active = scenes.first(where: { $0.activationState == .foregroundActive }) {
      return active.windows.first { $0.isKeyWindow } ?? active.windows.first
    }
    return scenes.first?.windows.first
  }

  // MARK: - Size class normalization

  /// Map Apple's binary (compact/regular) to the three-value enum
  /// that matches Android's WindowSizeClass.
  ///
  /// compact size class -> "compact"
  /// regular size class:
  ///   width < 840pt -> "medium" (matches Android 600-839dp)
  ///   width >= 840pt -> "expanded" (matches Android 840dp+)
  private static func normalizeWidthClass(
    hSize: UIUserInterfaceSizeClass,
    windowWidth: CGFloat
  ) -> WidthSizeClass {
    if hSize == .compact { return .compact }
    return windowWidth >= 840 ? .expanded : .medium
  }

  private static func normalizeHeightClass(
    vSize: UIUserInterfaceSizeClass,
    windowHeight: CGFloat
  ) -> HeightSizeClass {
    if vSize == .compact { return .compact }
    return windowHeight >= 900 ? .expanded : .medium
  }

  // MARK: - Fold features

  @MainActor
  private static func readFoldFeatures(window: UIWindow) -> [FoldFeature] {
    // iOS 27.1+ exposes reservedRegions(kind:) on UIView.
    // The .division kind is the fold; active only while partially
    // folded (halfOpened), inactive with zero width when flat.
    //
    // Today (iPhone Duo) this returns 0 or 1 divisions. When Apple
    // ships a future N-fold device this same code returns N-1 entries
    // without any change — that's the whole point of the abstraction.
    //
    // COMPILE-TIME GATE: as of Sept 2026, iOS 27.1 SDK is still in
    // beta. Xcode 27.0 does NOT know about `reservedRegions(kind:)`,
    // so we can't unconditionally call it — the file won't compile.
    // Gate on Xcode/SDK version until 27.1 beta lands, then flip the
    // flag on and the real path takes over.
    //
    // Runtime gate (#available) is still needed because a binary
    // built against the 27.1 SDK can run on 26 devices.
    #if compiler(>=6.1) && canImport(UIKit) && HINGE_IOS_27_1_SDK
    if #available(iOS 27.1, *) {
      return readFoldFeaturesUsingReservedRegions(window: window)
    }
    #endif
    return []
  }

  /// Real implementation, gated to iOS 27.1 SDK availability.
  /// Once Xcode 27.1 is on your machine, define HINGE_IOS_27_1_SDK
  /// in the podspec:
  ///
  ///   s.pod_target_xcconfig = {
  ///     "GCC_PREPROCESSOR_DEFINITIONS" => "HINGE_IOS_27_1_SDK=1",
  ///     "SWIFT_ACTIVE_COMPILATION_CONDITIONS" => "HINGE_IOS_27_1_SDK"
  ///   }
  ///
  /// and the fold path lights up on hardware that supports it.
  #if compiler(>=6.1) && canImport(UIKit) && HINGE_IOS_27_1_SDK
  @available(iOS 27.1, *)
  @MainActor
  private static func readFoldFeaturesUsingReservedRegions(
    window: UIWindow
  ) -> [FoldFeature] {
    // The real API: view.reservedRegions(kind: .division).
    // Returns an array of UIReservedRegion (or similar — final name
    // pending Xcode 27.1 beta), each with a frame in view coordinates.
    let regions = window.reservedRegions(kind: .division)

    return regions.map { region in
      let rect = region.frame
      // Orientation from the region's aspect ratio: wide-and-short
      // is horizontal (tabletop pose), tall-and-narrow is vertical
      // (book pose).
      let orientation: FoldOrientation =
        rect.width > rect.height ? .horizontal : .vertical

      return FoldFeature(
        bounds: Rect(
          x: Double(rect.origin.x),
          y: Double(rect.origin.y),
          width: Double(rect.width),
          height: Double(rect.height)
        ),
        orientation: orientation,
        // If an active division region is present, we're halfOpened.
        state: .halfOpened,
        // iOS treats hinges as physical seams — full occlusion.
        occlusionType: .full,
        // An active division always separates content.
        isSeparating: true
      )
    }
  }
  #endif


  // MARK: - Fallback

  private static func fallbackState() -> HingeState {
    return HingeState(
      widthClass: .compact,
      heightClass: .medium,
      windowWidth: 390,
      windowHeight: 844,
      safeInsets: SafeInsets(top: 47, right: 0, bottom: 34, left: 0),
      foldFeatures: [],
      fontScale: 1.0
    )
  }
}