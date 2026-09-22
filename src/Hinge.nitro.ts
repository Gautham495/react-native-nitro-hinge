import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Width-based size class, normalized across iOS and Android.
 *
 * Compact: phones in portrait, folded devices, narrow split panes.
 * Medium: small tablets, foldable inner display portrait, wider split panes.
 * Expanded: tablets, foldable inner display landscape, desktop windows.
 *
 * Prefer these for layout decisions over device-model checks or
 * orientation queries. Both platforms bless this abstraction.
 */
export type WidthSizeClass = 'compact' | 'medium' | 'expanded';

/**
 * Height-based size class.
 *
 * Compact: phones in landscape, short windows.
 * Medium: most phones portrait, most tablet portrait.
 * Expanded: tall tablets, desktop windows.
 */
export type HeightSizeClass = 'compact' | 'medium' | 'expanded';

/**
 * Orientation of a folding feature (hinge / crease).
 *
 * horizontal: fold runs left-to-right; when half-open produces
 *   tabletop posture (video above, controls below).
 * vertical: fold runs top-to-bottom; when half-open produces
 *   book posture (two-page reading layout).
 */
export type FoldOrientation = 'horizontal' | 'vertical';

/**
 * Whether the fold conceals part of the display beneath it.
 * full = pixels are hidden by the hinge; none = nothing hidden.
 */
export type OcclusionType = 'none' | 'full';

/**
 * A rectangle in logical points (iOS) / density-independent pixels (Android).
 * Origin is top-left of the window.
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Safe area insets from the window edges. Frequently asymmetric on
 * foldables (vertical bars on iPhone Duo, notches, camera cutouts).
 *
 * Never assume top === bottom or left === right.
 */
export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * State of the folding feature.
 *
 * flat: device is fully open or fully closed; layout should treat
 *   the display as one continuous surface.
 * halfOpened: device is at an intermediate angle; content should
 *   consider tabletop / book posture arrangements.
 *
 * Deliberately no arbitrary-angle enum member. Different vendors
 * report angles inconsistently; use hingeAngle for animation only.
 */
export type FoldState = 'flat' | 'halfOpened';

/**
 * Folding feature geometry. Reported once per active fold on
 * physically folding devices (iPhone Duo, Samsung Fold family,
 * Pixel Fold family, Honor Magic V, Xiaomi Mix Fold, trifolds,
 * and any future N-fold device). Always empty on regular phones
 * and tablets, and on foldables when flat with no separating hinge.
 */
export interface FoldFeature {
  /** Rectangle occupied by the fold/hinge in window coordinates. */
  bounds: Rect;
  /** Fold running horizontally or vertically. */
  orientation: FoldOrientation;
  /** halfOpened means posture matters (tabletop or book). */
  state: FoldState;
  /** Whether the fold hides display pixels or is a seamless crease. */
  occlusionType: OcclusionType;
  /**
   * Whether the fold logically separates content into two panes.
   * When true, avoid placing important controls across the fold.
   */
  isSeparating: boolean;
}

/**
 * Device information for logs, crash reports, and analytics.
 * DO NOT use these fields for layout decisions.
 * Use widthClass / heightClass / foldFeatures for layout instead.
 */
export interface DeviceInfo {
  /** e.g. "iOS 27.1", "Android 16" */
  platformVersion: string;
  /** Device model identifier (e.g. "iPhone19,4", "Pixel Fold"). */
  model: string;
  /** True if the device has physical folding hardware. */
  hasHardwareHinge: boolean;
}

/**
 * The full state snapshot. Emitted by change listeners; readable
 * from the sync getters on the Hinge HybridObject.
 */
export interface HingeState {
  widthClass: WidthSizeClass;
  heightClass: HeightSizeClass;
  windowWidth: number;
  windowHeight: number;
  safeInsets: SafeInsets;
  foldFeatures: FoldFeature[];
  fontScale: number;
}

/**
 * Subscription handle returned by addChangeListener.
 * Call remove() to stop receiving events.
 */
export interface ChangeSubscription {
  remove: () => void;
}

/**
 * The Hinge HybridObject.
 *
 * All getters are synchronous and safe to call inside StyleSheet.create.
 * The underlying state is cached in C++ and refreshed by native listeners
 * when the OS reports layout changes (fold, rotate, split view, stage
 * manager, dynamic type changes).
 *
 * Values are point-based on iOS and dp-based on Android; both platforms
 * are density-independent so the numbers are directly comparable.
 */
export interface Hinge extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  // === Layout signals (blessed by both platforms) ===

  /**
   * Current width size class. Prefer this for layout branches.
   * Reflects the CURRENT window, not the physical screen.
   */
  readonly widthClass: WidthSizeClass;

  /** Current height size class. Reflects the window. */
  readonly heightClass: HeightSizeClass;

  /** Measured window width in logical points/dp. */
  readonly windowWidth: number;

  /** Measured window height in logical points/dp. */
  readonly windowHeight: number;

  /**
   * Asymmetric safe insets. On iPhone Duo the trailing inset can be
   * ~84pt (vertical bar). On phones with notches, top can be 44+.
   */
  readonly safeInsets: SafeInsets;

  /** OS-level font scale from Dynamic Type / Configuration.fontScale. */
  readonly fontScale: number;

  // === Fold geometry (present only when folding matters) ===

  /**
   * All active folding features. Empty on regular phones/tablets
   * and flat foldables. One entry on typical foldables (Samsung Fold,
   * Pixel Fold, iPhone Duo). Two entries on tri-folds
   * (Samsung Galaxy Z TriFold, future Apple tri-folds) when both
   * hinges are half-open. Future N-fold devices report N-1 entries.
   *
   * Ordered top-to-bottom or left-to-right depending on hinge
   * orientation, matching the underlying platform's ordering
   * (Android FoldingFeature list order; iOS reservedRegions order).
   *
   * For the common "does this window have any fold?" check, use
   * `foldFeatures.length > 0` or the `hasActiveFold()` helper.
   * For "give me the first fold" use `foldFeatures[0]`.
   */
  readonly foldFeatures: FoldFeature[];

  /**
   * Continuous hinge angle in degrees, if the device has the sensor.
   * FOR ANIMATIONS ONLY — not for layout decisions.
   * Layout should key off foldFeatures[i].state (flat vs halfOpened).
   */
  readonly hingeAngle: number | undefined;

  // === Analytics only — do NOT use for layout ===

  /**
   * Device info for logs and analytics. Never branch layout on these
   * fields; use widthClass and foldFeatures instead.
   */
  readonly deviceInfo: DeviceInfo;

  // === Change subscription ===

  /**
   * Subscribe to state changes. Fires on fold, rotate, split-view
   * resize, stage manager, dynamic type changes. Callback receives
   * the full new state snapshot.
   *
   * Returns a subscription; call .remove() to unsubscribe.
   * Each addChangeListener() call owns its cleanup — no shared
   * mutable state between listeners.
   */
  addChangeListener(callback: (state: HingeState) => void): ChangeSubscription;

  // === Snapshot ===

  /**
   * Get the entire state as one object. Useful for logging,
   * memoization keys, and passing to `useMemo` deps.
   */
  getState(): HingeState;
}
