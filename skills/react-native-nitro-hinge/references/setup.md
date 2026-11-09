# Setup, testing and troubleshooting

## Install

```bash
yarn add react-native-nitro-hinge react-native-nitro-modules
cd ios && pod install
```

Requires React Native 0.75+, Nitro 0.37+, iOS 13.4+ and Android API 24+.
Rebuild the app after installing; it's a native module, so Expo Go can't
load it. In Expo apps, use a development build. There's no config plugin.

## iOS fold detection

Fold geometry and the hinge angle need the iOS 27.1 SDK (Xcode 27.1).
`pod install` turns them on when the active Xcode has that SDK. To force
it either way, set `HINGE_IOS_27_1_SDK=1` or `0` before `pod install`.
After switching to an older Xcode, run `pod install` again, or the build
fails on the 27.1 APIs.

Without the 27.1 SDK, size class, safe insets, font scale and orientation
still work, `foldFeatures` stays empty and `hingeAngle` is `undefined`.

## Android

The package brings `androidx.window` 1.5.1 for fold geometry, so the app
doesn't add it. The hinge angle comes from the hinge angle sensor, which
exists from Android 11 on devices that have it.

## Reanimated (optional)

Only for `react-native-nitro-hinge/reanimated`: install
`react-native-reanimated` 4.4 or later and `react-native-worklets` 0.9 or
later, and add
`react-native-worklets/plugin` to the Babel plugins. See
[animations.md](animations.md).

## Testing on simulators and emulators

- iOS: the iPhone Duo simulator from Xcode 27.1 folds, unfolds and changes
  the hinge angle. iPad simulators cover Split View and Stage Manager.
- Android: a foldable emulator such as Pixel Fold. From a terminal:

```bash
adb emu fold # closed, the app moves to the cover screen
adb emu unfold # open
adb emu sensor set hinge-angle0 90 # half open: book in portrait, tabletop in landscape
adb emu sensor set hinge-angle0 180 # flat
adb emu sensor get hinge-angle0
```

On the emulator, angles below about 50° can count as closed and move the
app to the cover screen.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `foldFeatures` is always empty on the iPhone Duo | The app was built without the iOS 27.1 SDK. Select Xcode 27.1 and run `pod install`, or set `HINGE_IOS_27_1_SDK=1`. |
| iOS build fails on 27.1 APIs | `pod install` ran with Xcode 27.1, then the build used an older Xcode. Run `pod install` again, or set `HINGE_IOS_27_1_SDK=0`. |
| `hingeAngle` is `undefined` | No hinge sensor (Android before 11, or no sensor on the device), iOS built without the 27.1 SDK, or the window has no hinge. |
| Every `safeInsets` value is 0 on Android | The content is laid out inside the system bars (no edge-to-edge), so nothing overlaps it. |
| Layout doesn't change after a fold or rotation | Styles were created at module load, or the component reads `hinge` without subscribing. Use `useHinge` and rebuild styles in `useMemo`. |
| A component re-renders on every change | `useHinge()` without a selector, or a selector that returns a new object without `shallowEqual`. |
| "The hinge listener needs to be a worklet" | The function passed to a worklet listener lacks the `'worklet'` directive, or the worklets Babel plugin isn't set up. |
| Posture layout shows while the device is flat | The code checked `hasActiveFold()`, which is true for a flat fold too. Check `state === 'halfOpened'` or use `isBookPosture()` and `isTabletopPosture()`. |
