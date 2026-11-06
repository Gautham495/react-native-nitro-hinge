<a href="https://gauthamvijay.com">
  <picture>
    <img alt="react-native-nitro-hinge" src="./docs/img/banner.png" />
  </picture>
</a>

# react-native-nitro-hinge

Native size class, safe insets, and hinge geometry for React Native.
Nitro-backed. iOS + Android. One API for phones, tablets, foldables,
tri-folds, iPhone Duo — and whatever ships next.

> **Status: v2.0.0** — Both platforms verified end-to-end.
> iOS across all 6 iPhone Duo poses on the Xcode 27.1 beta simulator.
> Android across the full pose matrix (folded, book, tabletop, flat)
> on the Pixel 10 Pro Fold API 37.2 emulator. See [Status by platform](./docs/foldables.md#status-by-platform).

## Install

```bash
yarn add react-native-nitro-hinge react-native-nitro-modules
cd ios && pod install
```

Requires:

- React Native 0.75+
- iOS 13.4+ (fold geometry needs iOS 27.1+; falls back gracefully)
- Android API 24+ (fold geometry via `androidx.window` 1.5+)
- Xcode 16.4+ (Xcode 27.1 beta for iPhone Duo fold detection)
- Nitro 0.37+

`pod install` turns fold detection on when the active Xcode has the iOS
27.1 SDK. Set `HINGE_IOS_27_1_SDK=1` or `0` before `pod install` to force
it either way. After switching to an older Xcode, run `pod install` again,
or the build fails on the 27.1 APIs. Without the 27.1 SDK, Hinge still
builds and reports every non-fold signal (size class, safe insets,
orientation, font scale), and `foldFeatures` stays empty.

## Quick start

### Static styles (module load)

```typescript
import { StyleSheet, View, Text } from 'react-native';
import { hinge, font, space, isWide } from 'react-native-nitro-hinge';

const styles = StyleSheet.create({
  container: {
    padding: space(16),
    flexDirection: isWide() ? 'row' : 'column',
  },
  title: { fontSize: font(24) },
});

function Screen() {
  return <View style={styles.container}><Text style={styles.title}>Hi</Text></View>;
}
```

### Reactive styles (reflow on fold, rotate, split view)

```typescript
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useHinge, font, space, isWide } from 'react-native-nitro-hinge';

const makeStyles = () => StyleSheet.create({
  container: {
    padding: space(16),
    flexDirection: isWide() ? 'row' : 'column',
  },
  title: { fontSize: font(24) },
});

function Screen() {
  const { widthClass } = useHinge();
  const styles = useMemo(makeStyles, [widthClass]);
  return <View style={styles.container}>...</View>;
}
```

## API

### State

```typescript
hinge.widthClass; // 'compact' | 'medium' | 'expanded'
hinge.heightClass; // 'compact' | 'medium' | 'expanded'
hinge.windowWidth; // measured window width (pt / dp)
hinge.windowHeight; // measured window height
hinge.safeInsets; // { top, right, bottom, left } — asymmetric-aware
hinge.foldFeatures; // array of active folds; empty on non-foldables
hinge.hingeAngle; // continuous angle for animations only (nullable)
hinge.fontScale; // OS Dynamic Type / Configuration.fontScale
hinge.deviceInfo; // { platformVersion, model, hasHardwareHinge } — analytics only
```

On Android, `safeInsets` is the part of the system bars and display cutout
that overlaps your app's content. With edge-to-edge (forced on Android 15+
for apps targeting SDK 35 or higher) that's the full bar size. When the
content is laid out inside the bars, as on older versions without
edge-to-edge, every inset is 0.

### Hinge angle

```typescript
const sub = hinge.addHingeAngleListener((angle) => {
  // degrees, or undefined when the window has no hinge
});
sub.remove();
```

Use the angle for animations only. Layout should follow
`foldFeatures[i].state`. The listener can fire every frame while the
hinge moves, so drive an animated value with it rather than React state.
`addChangeListener` and `useHinge` don't fire for angle changes.

On Android the angle comes from the hinge angle sensor (Android 11+), and
on iOS from `UIHingeInteraction` (iOS 27.1+, with `HINGE_IOS_27_1_SDK`).
On devices without either, `hinge.hingeAngle` is undefined.

### Reanimated

Tested with `react-native-reanimated` 4.7 and `react-native-worklets` 0.13.
Import the hooks from the subpath:

```tsx
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  useAnimatedHinge,
  useAnimatedHingeAngle,
} from 'react-native-nitro-hinge/reanimated';

function Lid() {
  const angle = useAnimatedHingeAngle();
  const state = useAnimatedHinge();
  const style = useAnimatedStyle(() => ({
    width: state.value.windowWidth / 4,
    transform: [{ rotate: `${180 - (angle.value ?? 180)}deg` }],
  }));
  return <Animated.View style={[{ height: 6 }, style]} />;
}
```

Both hooks return shared values that the UI thread updates as soon as
native reports a change. They never wait for the JS thread, so animations
keep up with the hinge while JS is busy. `useAnimatedHinge()` holds the full
`HingeState`. `useAnimatedHingeAngle()` holds the angle in degrees, or
`undefined` without a hinge.

For your own worklets, `addHingeWorkletListener(worklet)` and
`addHingeAngleWorkletListener(worklet)` run on the UI thread as well. Each
runs the worklet once with the current value right after subscribing. Call
`remove()` on the result to stop.

The main entry doesn't import Reanimated, so apps that don't use it don't
have to install it.

### Scaling helpers

```typescript
font(16); // size-class-based bump, respects Dynamic Type
space(16); // scales more aggressively for tablets
size(48); // sub-linear scaling for containers
radius(8); // sub-linear for corners
icon(24); // same as size
hairline(1); // PixelRatio-aware, always 1px
responsive({ compact: 1, medium: 2, expanded: 3 });
```

### Layout queries

```typescript
isCompactWidth(); // phone-shape layout
isWide(); // tablet-shape layout (medium or expanded)
hasActiveFold(); // any active fold in current window
isSeparating(); // any active fold separates content into panes
isTriFold(); // 2+ simultaneous active folds (Samsung TriFold, future Apple)
isBookPosture(); // half-open + vertical fold (two-page layout)
isTabletopPosture(); // half-open + horizontal fold (video-above / controls-below)
contentWidth(); // width inside safe area, asymmetric-safe
contentHeight(); // height inside safe area
```

### Reactive hook

```typescript
const state = useHinge(); // re-renders on any state change
const widthClass = useHinge((s) => s.widthClass); // only when widthClass changes
const size = useHinge(
  (s) => ({ width: s.windowWidth, height: s.windowHeight }),
  shallowEqual // needed when the selector builds a new object
);
```

All callers share one native listener. Fields that didn't change keep
their reference, so `useHinge((s) => s.foldFeatures)` doesn't re-render
when only other fields change.

## What it does NOT expose (and why)

Missing on purpose. These are **anti-patterns** on at least one
platform:

- ❌ `isIPad()` / `Platform.isPad` for layout — `Platform.isPad`
  works and correctly reports iPad, but it's a coarse device check.
  On iPhone Duo the inner display is regular width _on a phone_:
  `isPad` returns false but the layout should be tablet-like.
  Same in reverse on iPad Split View at compact widths. Use
  `widthClass === 'expanded'` or `isWide()` — ask the window,
  not the device.
- ❌ `isDuo()` / `isFold()` — model checks are fragile across
  vendors, wrong on outer displays where the device is still a
  fold but the app should look like a phone. Use `hasActiveFold()`
  or `foldFeatures.length > 0`.
- ❌ `pose` enum for layout — Apple's guidance is explicit: use
  size class for layout, hinge state for content-arrangement
  decisions like tabletop/book. `foldFeatures[i].state` is
  exposed for this; general layout branching should key off
  `widthClass`.
- ❌ Aspect-ratio font scaling — the classic `(height/width) *
multiplier` hack. Broken on every rotation, every fold, every
  split view. Use Dynamic Type + a small size-class bump instead.

## More

[docs/foldables.md](./docs/foldables.md) has the devices Hinge covers,
market numbers, per-pose screenshots, the comparison with other
libraries and the roadmap.
[android-foldables-device-metrics.md](./android-foldables-device-metrics.md)
lists measured metrics for Android foldables.

## Credits

Android observation architecture adapted from
[react-native-fold-kit](https://github.com/AlexeyTsutsoev/react-native-fold-kit)
by Alexey Tsutsoev (MIT). Their `WindowFoldSource` design — per-activity
refcounted source, `WindowInfoTrackerCallbackAdapter` over the coroutine flow,
hinge-sensor client separation, version-counter change detection — is the
reference the Nitro Android side is built on.

## 🪪 License

MIT © [**Gautham Vijayan**](https://gauthamvijay.com)

---

Made with ❤️ and [**Nitro Modules**](https://nitro.margelo.com)
