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
/// - UIScene.didDisconnectNotification: drop what we attached.
/// - UIApplication.didBecomeActiveNotification: catch pose changes
///   that happened while backgrounded.
///
/// NOTE on `didUpdateCoalescedGeometryNotification`: this name does
/// not exist in the iOS SDK. Apple's documented change-observation
/// path for scene geometry is KVO on `effectiveGeometry`, or the
/// `UIWindowSceneDelegate.windowScene(_:didUpdateEffectiveGeometry:)`
/// delegate method. Since a Nitro module doesn't control the app's
/// SceneDelegate, KVO is the only clean path.
// Shared state sits behind `lock`; everything else is touched on main only.
final class HingeObserver: NSObject, @unchecked Sendable {

  static let shared = HingeObserver()

  private let lock = NSLock()
  private var instances: [Weak<HybridHinge>] = []
  private var isObserving = false

  // Main thread only. An entry lives until its scene disconnects, and
  // holds no reference to the scene itself.
  private var scenes: [ObjectIdentifier: SceneObservers] = [:]
  private var refreshScheduled = false
  private var latestHingeAngle: Double?

  private override init() { super.init() }

  var hingeAngle: Double? {
    lock.lock(); defer { lock.unlock() }
    return latestHingeAngle
  }

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
      selector: #selector(scheduleRefresh),
      name: UIContentSizeCategory.didChangeNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(scheduleRefresh),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
    center.addObserver(
      self,
      selector: #selector(scheduleRefresh),
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
    center.addObserver(
      self,
      selector: #selector(handleSceneDisconnected(_:)),
      name: UIScene.didDisconnectNotification,
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
    let observers = scenes[id] ?? SceneObservers()
    scenes[id] = observers

    // effectiveGeometry is KVO-compliant since iOS 16.
    if #available(iOS 16.0, *), observers.geometry == nil {
      observers.geometry = scene.observe(\.effectiveGeometry) { [weak self] _, _ in
        self?.scheduleRefresh()
      }
    }

    #if HINGE_IOS_27_1_SDK && !targetEnvironment(macCatalyst)
    if #available(iOS 27.1, *) {
      attachRegionProbe(to: scene, observers)
    }
    #endif
  }

  @objc private func handleSceneActivated(_ note: Notification) {
    guard let scene = note.object as? UIWindowScene else { return }
    DispatchQueue.main.async { [weak self] in
      self?.attachKVO(to: scene)
      self?.scheduleRefresh()
    }
  }

  @objc private func handleSceneDisconnected(_ note: Notification) {
    guard let scene = note.object as? UIWindowScene else { return }
    let id = ObjectIdentifier(scene)
    DispatchQueue.main.async { [weak self] in
      self?.scenes.removeValue(forKey: id)?.invalidate()
    }
  }

  // UIKit reports these changes before it lays the window out again, so the
  // snapshot waits one main run loop turn.
  @objc private func scheduleRefresh() {
    lock.lock()
    let alreadyScheduled = refreshScheduled
    refreshScheduled = true
    lock.unlock()
    guard !alreadyScheduled else { return }

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.lock.lock()
      self.refreshScheduled = false
      self.lock.unlock()
      self.handleChange()
    }
  }

  #if HINGE_IOS_27_1_SDK && !targetEnvironment(macCatalyst)
  @available(iOS 27.1, *)
  @MainActor
  private func attachRegionProbe(to scene: UIWindowScene, _ observers: SceneObservers) {
    guard observers.probe == nil,
          let window = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first
    else { return }

    let probe = ReservedRegionProbe(frame: window.bounds)
    probe.onChange = { [weak self] in self?.scheduleRefresh() }
    window.insertSubview(probe, at: 0)
    observers.probe = probe

    let interaction = UIHingeInteraction { [weak self] _, update in
      guard let self = self else { return }
      let degrees = update.hinge.map { Double($0.angle) * 180 / .pi }
      self.lock.lock()
      self.latestHingeAngle = degrees
      self.lock.unlock()
    }
    window.addInteraction(interaction)
    observers.hinge = interaction
  }
  #endif

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

/// What HingeObserver attached to one window scene.
private final class SceneObservers {
  var geometry: NSKeyValueObservation?
  var probe: UIView?
  var hinge: (any UIInteraction)?

  func invalidate() {
    geometry?.invalidate()
    probe?.removeFromSuperview()
    if let hinge { hinge.view?.removeInteraction(hinge) }
  }
}

/// Weak wrapper so the observer doesn't retain HybridHinge instances.
private final class Weak<T: AnyObject> {
  weak var value: T?
  init(_ value: T) { self.value = value }
}

#if HINGE_IOS_27_1_SDK && !targetEnvironment(macCatalyst)
// effectiveGeometry doesn't change when the device folds partway. UIKit calls
// updateConstraints() again whenever the reserved regions read there change,
// and layoutSubviews and safeAreaInsetsDidChange fire once the window settles
// after a resize.
@available(iOS 27.1, *)
private final class ReservedRegionProbe: UIView {
  var onChange: (() -> Void)?

  override class var requiresConstraintBasedLayout: Bool { true }

  override init(frame: CGRect) {
    super.init(frame: frame)
    autoresizingMask = [.flexibleWidth, .flexibleHeight]
    isUserInteractionEnabled = false
    accessibilityElementsHidden = true
    setNeedsUpdateConstraints()
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func updateConstraints() {
    _ = reservedRegions(kind: .division, options: [.includeInactive])
    super.updateConstraints()
    onChange?()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    onChange?()
  }

  override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    onChange?()
  }
}
#endif
