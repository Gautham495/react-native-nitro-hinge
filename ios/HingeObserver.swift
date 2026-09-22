import UIKit

/// Single shared observer that watches UIKit for layout-relevant
/// changes and pings every attached HybridHinge instance to refresh
/// its cached state.
///
/// Observed signals:
/// - UIWindowScene.effectiveGeometry (iOS 16+): KVO-compliant.
///   Fires on fold, unfold, split view resize, stage manager resize,
///   and (iOS 27.1+) iPhone Duo pose transitions.
/// - UIContentSizeCategory.didChangeNotification: dynamic type.
/// - UIDevice.orientationDidChangeNotification: rotation and
///   pre-16 fallback signal.
/// - UIScene.didActivateNotification: new scenes coming up; we
///   attach KVO to them here.
/// - UIApplication.didBecomeActiveNotification: catch pose changes
///   that happened while backgrounded.
///
/// NOTE on `didUpdateCoalescedGeometryNotification`: this name does
/// not exist in the iOS SDK. Apple's documented change-observation
/// path for scene geometry is KVO on `effectiveGeometry`, or the
/// `UIWindowSceneDelegate.windowScene(_:didUpdateEffectiveGeometry:)`
/// delegate method. Since a Nitro module doesn't control the app's
/// SceneDelegate, KVO is the only clean path.
final class HingeObserver: NSObject {

  static let shared = HingeObserver()

  private let lock = NSLock()
  private var instances: [Weak<HybridHinge>] = []
  private var isObserving = false

  // Tracks scenes we've KVO-attached to, so we can detach cleanly.
  private var observedScenes: [ObjectIdentifier: UIWindowScene] = [:]
  private static var kvoContext = 0

  private override init() { super.init() }

  // MARK: - Attach / detach

  func attach(_ hinge: HybridHinge) {
    lock.lock()
    instances.append(Weak(hinge))
    let shouldStart = !isObserving
    if shouldStart { isObserving = true }
    lock.unlock()

    if shouldStart {
      DispatchQueue.main.async { [weak self] in
        self?.startObserving()
      }
    }
  }

  func detach(_ hinge: HybridHinge) {
    lock.lock()
    instances.removeAll { $0.value === hinge || $0.value == nil }
    lock.unlock()
  }

  // MARK: - Observers

  @MainActor
  private func startObserving() {
    let center = NotificationCenter.default

    center.addObserver(
      self,
      selector: #selector(handleChange),
      name: UIContentSizeCategory.didChangeNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(handleChange),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(handleChange),
      name: UIDevice.orientationDidChangeNotification,
      object: nil
    )

    // Watch for new scenes appearing so we can KVO-attach to them
    // as they arrive (e.g. Split View spawning a new scene).
    center.addObserver(
      self,
      selector: #selector(handleSceneActivated(_:)),
      name: UIScene.didActivateNotification,
      object: nil
    )

    // Attach KVO to any scenes that are already connected.
    for scene in UIApplication.shared.connectedScenes {
      if let windowScene = scene as? UIWindowScene {
        attachKVO(to: windowScene)
      }
    }
  }

  @MainActor
  private func attachKVO(to scene: UIWindowScene) {
    let id = ObjectIdentifier(scene)
    guard observedScenes[id] == nil else { return }
    observedScenes[id] = scene

    // effectiveGeometry is KVO-compliant since iOS 16.
    // options: [] means we only need the notification, not the values.
    scene.addObserver(
      self,
      forKeyPath: "effectiveGeometry",
      options: [],
      context: &HingeObserver.kvoContext
    )
  }

  @objc private func handleSceneActivated(_ note: Notification) {
    guard let scene = note.object as? UIWindowScene else { return }
    DispatchQueue.main.async { [weak self] in
      self?.attachKVO(to: scene)
      self?.handleChange()
    }
  }

  // MARK: - KVO callback

  override func observeValue(
    forKeyPath keyPath: String?,
    of object: Any?,
    change: [NSKeyValueChangeKey : Any]?,
    context: UnsafeMutableRawPointer?
  ) {
    if context == &HingeObserver.kvoContext && keyPath == "effectiveGeometry" {
      handleChange()
      return
    }
    super.observeValue(
      forKeyPath: keyPath,
      of: object,
      change: change,
      context: context
    )
  }

  // MARK: - Fan out to attached HybridHinge instances

  @objc private func handleChange() {
    lock.lock()
    let snapshot = instances.compactMap { $0.value }
    // Also prune dead references while we're here.
    instances.removeAll { $0.value == nil }
    lock.unlock()

    for hinge in snapshot {
      hinge.refreshState()
    }
  }
}

/// Weak wrapper so the observer doesn't retain HybridHinge instances.
private final class Weak<T: AnyObject> {
  weak var value: T?
  init(_ value: T) { self.value = value }
}