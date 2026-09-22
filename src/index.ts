import { NitroModules } from 'react-native-nitro-modules';
import { useEffect, useState } from 'react';
import { PixelRatio } from 'react-native';
import type {
  Hinge,
  HingeState,
  WidthSizeClass,
  HeightSizeClass,
  FoldFeature,
  Rect,
  SafeInsets,
} from './Hinge.nitro';

// Re-export public types so consumers don't touch the .nitro.ts spec.
export type {
  HingeState,
  WidthSizeClass,
  HeightSizeClass,
  FoldOrientation,
  OcclusionType,
  FoldState,
  FoldFeature,
  Rect,
  SafeInsets,
  DeviceInfo,
  ChangeSubscription,
} from './Hinge.nitro';

/**
 * The Hinge HybridObject instance.
 *
 * Reads are synchronous C++ — safe inside StyleSheet.create at module load.
 * Note: at module load, values reflect the launch pose. If you need styles
 * to reflow when the window changes, use the useHinge() hook and rebuild
 * StyleSheet.create inside a useMemo that depends on the relevant state.
 */
export const hinge = NitroModules.createHybridObject<Hinge>('Hinge');

/**
 * Reactive hook. Subscribes to Hinge state changes and re-renders
 * on fold, rotate, split view resize, dynamic type change, etc.
 */
export function useHinge(): HingeState {
  const [state, setState] = useState<HingeState>(() => hinge.getState());

  useEffect(() => {
    const sub = hinge.addChangeListener(setState);
    // Sync once on mount in case state changed between snapshot and listener.
    setState(hinge.getState());
    return () => sub.remove();
  }, []);

  return state;
}

// === Utility helpers — questions about the current layout, not the device ===

/**
 * True when the current window is a compact width class.
 * Phone-like layouts appropriate: single column, bottom nav, modals.
 */
export const isCompactWidth = (): boolean => hinge.widthClass === 'compact';

/**
 * True when the current window is medium width or larger.
 * Tablet-like layouts appropriate: two panes, navigation rail.
 */
export const isWide = (): boolean => hinge.widthClass !== 'compact';

/**
 * True when the current window has any active hinge / fold.
 * On tri-folds counts if either or both hinges are active.
 */
export const hasActiveFold = (): boolean => hinge.foldFeatures.length > 0;

/**
 * True when any active fold logically separates content into panes.
 * When true, avoid placing important controls across the fold(s).
 */
export const isSeparating = (): boolean =>
  hinge.foldFeatures.some((f) => f.isSeparating);

/**
 * True when the device has multiple simultaneous folds — Samsung
 * Galaxy Z TriFold and successors, or a future Apple tri-fold, when
 * multiple hinges are half-open. Most apps won't need this; check
 * `hinge.foldFeatures.length` directly for the exact count.
 */
export const isTriFold = (): boolean => hinge.foldFeatures.length > 1;

/**
 * True when any active fold is in "book" posture:
 * half-opened with a vertical fold. Good for two-page layouts.
 */
export const isBookPosture = (): boolean =>
  hinge.foldFeatures.some(
    (f) => f.state === 'halfOpened' && f.orientation === 'vertical'
  );

/**
 * True when any active fold is in "tabletop" posture:
 * half-opened with a horizontal fold. Good for video-above /
 * controls-below layouts.
 */
export const isTabletopPosture = (): boolean =>
  hinge.foldFeatures.some(
    (f) => f.state === 'halfOpened' && f.orientation === 'horizontal'
  );

/**
 * Container width inside the safe area, correctly handling
 * asymmetric insets (iPhone Duo vertical bars, etc).
 *
 * Do NOT compute this as `windowWidth - safeInsets.left * 2` —
 * that assumes symmetric insets which is false on foldables.
 */
export const contentWidth = (): number => {
  const s = hinge.safeInsets;
  return hinge.windowWidth - s.left - s.right;
};

/**
 * Container height inside the safe area.
 */
export const contentHeight = (): number => {
  const s = hinge.safeInsets;
  return hinge.windowHeight - s.top - s.bottom;
};

// === Sizing helpers — respect OS-level accessibility settings ===

/**
 * Design baseline width (points/dp). Font/space/size scaling
 * is computed as a ratio against this width.
 * Reasonable default: iPhone 15/16 width (~390pt).
 */
let BASELINE_WIDTH = 390;

/**
 * Configure the design baseline. Call once at app root if your
 * design mocks are drawn at a different width (e.g. 375 for older
 * iPhone designs).
 */
export function configureHinge(config: { baselineWidth?: number }) {
  if (config.baselineWidth !== undefined) {
    BASELINE_WIDTH = config.baselineWidth;
  }
}

/**
 * Small size-class-based font bump. Respects OS Dynamic Type
 * automatically because <Text allowFontScaling> uses fontScale.
 *
 * IMPORTANT: don't multiply by fontScale yourself here — RN's
 * Text component applies fontScale on its own. Doing it twice
 * doubles the accessibility scale.
 */
export function font(size: number): number {
  const bump =
    hinge.widthClass === 'expanded'
      ? 1.15
      : hinge.widthClass === 'medium'
        ? 1.08
        : 1.0;
  return Math.round(PixelRatio.roundToNearestPixel(size * bump));
}

/**
 * Spacing scale. Scales more aggressively than font — tablets
 * have room for more generous padding.
 */
export function space(size: number): number {
  const ratio = Math.min(
    Math.max(hinge.windowWidth / BASELINE_WIDTH, 0.9),
    1.4
  );
  return Math.round(size * ratio);
}

/**
 * Container size (widths, heights of cards, avatars, etc).
 * Scales sub-linearly — a 48pt avatar is a 48pt avatar,
 * you don't want it at 96pt on iPad.
 */
export function size(size: number): number {
  const bump =
    hinge.widthClass === 'expanded'
      ? 1.12
      : hinge.widthClass === 'medium'
        ? 1.06
        : 1.0;
  return Math.round(PixelRatio.roundToNearestPixel(size * bump));
}

/**
 * Border radius scale. Sub-linear — corners get slightly softer
 * on tablets but never balloon.
 */
export function radius(r: number): number {
  const bump =
    hinge.widthClass === 'expanded'
      ? 1.1
      : hinge.widthClass === 'medium'
        ? 1.05
        : 1.0;
  return Math.round(PixelRatio.roundToNearestPixel(r * bump));
}

/**
 * Icon size scale. Same shape as size().
 */
export function icon(s: number): number {
  return size(s);
}

/**
 * Hairline width — always the nearest pixel, respects PixelRatio.
 * Not size-class dependent; 1px is 1px on every device.
 */
export function hairline(width: number = 1): number {
  return width / PixelRatio.get();
}

/**
 * Tailwind-style responsive picker. Returns the value for the
 * current width class, falling back to smaller classes if unset.
 *
 * Example:
 *   const columns = responsive({ compact: 1, medium: 2, expanded: 3 });
 */
export function responsive<T>(values: {
  compact?: T;
  medium?: T;
  expanded?: T;
}): T | undefined {
  const wc = hinge.widthClass;
  if (wc === 'expanded') {
    return values.expanded ?? values.medium ?? values.compact;
  }
  if (wc === 'medium') {
    return values.medium ?? values.compact;
  }
  return values.compact;
}
