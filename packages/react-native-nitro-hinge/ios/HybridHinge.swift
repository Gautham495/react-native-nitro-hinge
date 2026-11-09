import Foundation
import UIKit
import NitroModules

/// The Swift implementation of the Hinge HybridObject.
///
/// Reads native layout signals from UIKit and (iOS 27.1+)
/// UIWindowScene.effectiveGeometry / reservedRegions. Falls back
/// to size class + safe area only on older iOS.
///
/// Thread model: reads happen on whatever thread JS calls from,
/// but the cached state struct is mutated only on the main queue
/// (where UIKit callbacks arrive) and read via a lock to serialize.
final class HybridHinge: HybridHingeSpec {

  // MARK: - Cached state

  private let stateLock = NSLock()
  private var cachedState: HingeState
  private var cachedDeviceInfo: DeviceInfo
  private var listeners: [UUID: (HingeState) -> Void] = [:]
  private var angleListeners: [UUID: (Double?) -> Void] = [:]

  // MARK: - Init

  override init() {
    // Capture an initial snapshot synchronously so JS callers at
    // module load get something sane. Refined once observers fire.
    //
    // HingeStateProbe.snapshot() internally hops to main if needed —
    // safe to call from the JS thread (which is where Nitro
    // constructs us).
    self.cachedState = HingeStateProbe.snapshot()

    // Same pattern for device info: hop to main to touch UIKit.
    // hasHardwareHinge() reads UIApplication.shared.connectedScenes
    // which is @MainActor-isolated. Caching here means the deviceInfo
    // getter is thread-free for the lifetime of this instance.
    //
    // We must NOT call MainActor.assumeIsolated directly here —
    // Nitro constructs HybridObjects on the JS runtime thread, not
    // main. assumeIsolated traps with _dispatch_assert_queue_ when
    // called off the main queue.
    self.cachedDeviceInfo = Self.readDeviceInfoOnMain()

    super.init()
    HingeObserver.shared.attach(self)
  }

  /// Read device info on the main thread, hopping if necessary.
  /// Safe to call from any thread.
  private static func readDeviceInfoOnMain() -> DeviceInfo {
    if Thread.isMainThread {
      return MainActor.assumeIsolated { buildDeviceInfo() }
    }
    return DispatchQueue.main.sync {
      MainActor.assumeIsolated { buildDeviceInfo() }
    }
  }

  @MainActor
  private static func buildDeviceInfo() -> DeviceInfo {
    return DeviceInfo(
      platformVersion: "iOS \(UIDevice.current.systemVersion)",
      model: DeviceInfoProbe.modelIdentifier(),
      hasHardwareHinge: DeviceInfoProbe.hasHardwareHinge()
    )
  }

  deinit {
    HingeObserver.shared.detach(self)
  }

  // MARK: - HybridHingeSpec: layout signals

  var widthClass: WidthSizeClass {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState.widthClass
  }

  var heightClass: HeightSizeClass {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState.heightClass
  }

  var windowWidth: Double {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState.windowWidth
  }

  var windowHeight: Double {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState.windowHeight
  }

  var safeInsets: SafeInsets {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState.safeInsets
  }

  var fontScale: Double {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState.fontScale
  }

  // MARK: - Fold geometry

  var foldFeatures: [FoldFeature] {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState.foldFeatures
  }

  var hingeAngle: Double? {
    // Last angle the UIHingeInteraction on the window reported, in degrees.
    // Nil when the device has no hinge or the app was built without
    // HINGE_IOS_27_1_SDK.
    return HingeObserver.shared.hingeAngle
  }

  // MARK: - Device info

  var deviceInfo: DeviceInfo {
    // Hardware capabilities don't change at runtime — cached at init.
    // See init() for why: hasHardwareHinge() is @MainActor-isolated and
    // JS may call this getter from any thread.
    return cachedDeviceInfo
  }

  // MARK: - Snapshot

  func getState() throws -> HingeState {
    stateLock.lock(); defer { stateLock.unlock() }
    return cachedState
  }

  // MARK: - Subscription

  func addChangeListener(
    callback: @escaping (HingeState) -> Void
  ) throws -> ChangeSubscription {
    let id = UUID()
    stateLock.lock()
    listeners[id] = callback
    stateLock.unlock()

    return ChangeSubscription(remove: { [weak self] in
      guard let self = self else { return }
      self.stateLock.lock()
      self.listeners.removeValue(forKey: id)
      self.stateLock.unlock()
    })
  }

  func addHingeAngleListener(
    callback: @escaping (Double?) -> Void
  ) throws -> ChangeSubscription {
    let id = UUID()
    stateLock.lock()
    angleListeners[id] = callback
    stateLock.unlock()

    return ChangeSubscription(remove: { [weak self] in
      guard let self = self else { return }
      self.stateLock.lock()
      self.angleListeners.removeValue(forKey: id)
      self.stateLock.unlock()
    })
  }

  // MARK: - Observer callbacks

  /// Called by HingeObserver when UIKit reports layout changes.
  /// Refreshes the cache and notifies listeners.
  func refreshState() {
    let newState = HingeStateProbe.snapshot()

    stateLock.lock()
    // UIKit often fires several of these signals for one change.
    guard !newState.isSame(as: cachedState) else {
      stateLock.unlock()
      return
    }
    cachedState = newState
    let snapshot = Array(listeners.values)
    stateLock.unlock()

    for cb in snapshot {
      cb(newState)
    }
  }

  /// Called by HingeObserver when the hinge angle changes.
  func hingeAngleChanged(_ degrees: Double?) {
    stateLock.lock()
    let snapshot = Array(angleListeners.values)
    stateLock.unlock()

    for cb in snapshot {
      cb(degrees)
    }
  }
}

// Nitro's C++ structs define ==, but Swift doesn't import it.
private extension HingeState {
  func isSame(as other: HingeState) -> Bool {
    widthClass == other.widthClass
      && heightClass == other.heightClass
      && windowWidth == other.windowWidth
      && windowHeight == other.windowHeight
      && safeInsets.isSame(as: other.safeInsets)
      && fontScale == other.fontScale
      && foldFeatures.count == other.foldFeatures.count
      && zip(foldFeatures, other.foldFeatures).allSatisfy { $0.isSame(as: $1) }
  }
}

private extension SafeInsets {
  func isSame(as other: SafeInsets) -> Bool {
    top == other.top && right == other.right && bottom == other.bottom && left == other.left
  }
}

private extension FoldFeature {
  func isSame(as other: FoldFeature) -> Bool {
    bounds.x == other.bounds.x
      && bounds.y == other.bounds.y
      && bounds.width == other.bounds.width
      && bounds.height == other.bounds.height
      && orientation == other.orientation
      && state == other.state
      && occlusionType == other.occlusionType
      && isSeparating == other.isSeparating
  }
}
