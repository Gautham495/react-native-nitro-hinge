---
name: react-native-nitro-hinge
description: Use when working in a React Native app that uses react-native-nitro-hinge, or when a React Native layout has to adapt to foldables, the iPhone Duo, tablets, Split View or Stage Manager. Covers size classes (widthClass, heightClass), safe insets, fold geometry (foldFeatures), book and tabletop postures, the hinge angle, useHinge selectors, the Reanimated hooks (useAnimatedHinge, useAnimatedHingeAngle), the scaling helpers, and the iOS 27.1 and Android setup.
license: MIT
---

# react-native-nitro-hinge

Answer with the real API of this package. If a function isn't in
[references/api.md](references/api.md), it doesn't exist, so don't invent
one.

## How it works

- `hinge` is a Nitro HybridObject. Every getter is a synchronous native
  read, so it works at module load and inside `StyleSheet.create`. A value
  read at module load stays at the launch pose, though.
- `useHinge()` re-renders when the window changes: fold, rotate, Split
  View, Stage Manager, Dynamic Type. A selector limits re-renders to the
  slice it returns.
- The hinge angle lives outside the state. It can change every frame
  while the hinge moves, so `useHinge` and `addChangeListener` don't fire
  for it.
- Values are points on iOS and dp on Android.

## Rules

1. Lay out by the window, not the device. Branch on `widthClass`, or on
   `isWide()` and `responsive()`. Never branch on `Platform.isPad`, the
   device model, `hinge.deviceInfo` or a `Dimensions` read at module load.
   The iPhone Duo is a phone, but its inner display has a regular-width
   window. Its outer display is `compact`.
2. To place content around a fold, use `foldFeatures[i].bounds`. Bounds
   are in window coordinates, so measure from a view that fills the
   window. Keep buttons and text off a fold whose `isSeparating` is true.
3. `foldFeatures` can contain a flat fold. Check `state === 'halfOpened'`
   (or `isBookPosture()` and `isTabletopPosture()`) before switching to a
   posture layout. Postures decide how content is arranged; the size class
   stays the main layout switch.
4. The hinge angle is for animation only. Feed it to a Reanimated shared
   value. Don't call `setState` on every angle tick, and don't lay out by
   angle.
5. Safe insets are often asymmetric on foldables. Pad each side with its
   own inset, or use `contentWidth()` and `contentHeight()`. Never compute
   `width - left * 2`.
6. Styles that must reflow come from `useHinge` state, inside a `useMemo`
   keyed on the field that matters.

## Where to look

| Task | Read |
| --- | --- |
| Getters, types, hooks, listeners, helpers, size class thresholds | [references/api.md](references/api.md) |
| List / detail, columns, panes split at the hinge, book and tabletop, safe insets, tri-folds | [references/layouts.md](references/layouts.md) |
| Hinge angle, Reanimated hooks, worklet listeners | [references/animations.md](references/animations.md) |
| Install, iOS 27.1 SDK flag, Android requirements, simulators and emulators, troubleshooting | [references/setup.md](references/setup.md) |

## Quick start

```tsx
import { useHinge } from 'react-native-nitro-hinge';

function Screen() {
  const wide = useHinge((s) => s.widthClass !== 'compact');
  return wide ? <TwoPanes /> : <OnePane />;
}
```

## Common mistakes

- There is no `isFoldable()`, `isDuo()`, `isIPad()`, `usePosture()`,
  `useFold()` or `hinge.posture`. Use the helpers in
  [references/api.md](references/api.md).
- When asked to change the layout on one device, like "two panes only on
  the iPhone Duo", branch on `widthClass` and say why. That covers the
  Duo's inner display, tablets, Split View and Android foldables. Don't
  match `hinge.deviceInfo.model`.
- Without a hinge sensor, `hingeAngle` is `undefined`. It's never `null`
  and never defaults to 180.
- A selector that builds a new object, like
  `useHinge((s) => ({ w: s.windowWidth }))`, needs `shallowEqual` as the
  second argument. Without it the component re-renders on every change.
- The Reanimated hooks come from `react-native-nitro-hinge/reanimated`,
  not from the main entry.
