# API

Everything below is exported from `react-native-nitro-hinge`, except the
Reanimated hooks, which come from `react-native-nitro-hinge/reanimated`
(see [animations.md](animations.md)).

## State

```ts
import { hinge } from 'react-native-nitro-hinge';

hinge.widthClass; // 'compact' | 'medium' | 'expanded'
hinge.heightClass; // 'compact' | 'medium' | 'expanded'
hinge.windowWidth; // window width in pt (iOS) or dp (Android)
hinge.windowHeight;
hinge.safeInsets; // { top, right, bottom, left }
hinge.foldFeatures; // FoldFeature[], empty without a fold
hinge.fontScale; // Dynamic Type / Configuration.fontScale
hinge.hingeAngle; // number (degrees) | undefined
hinge.deviceInfo; // { platformVersion, model, hasHardwareHinge }, for logs only
hinge.getState(); // HingeState snapshot (every field above except hingeAngle and deviceInfo)
```

The getters describe the current window, not the physical screen. Reads
are synchronous, so they work at module load, but a value read there
doesn't update.

```ts
interface HingeState {
  widthClass: 'compact' | 'medium' | 'expanded';
  heightClass: 'compact' | 'medium' | 'expanded';
  windowWidth: number;
  windowHeight: number;
  safeInsets: { top: number; right: number; bottom: number; left: number };
  foldFeatures: FoldFeature[];
  fontScale: number;
}

interface FoldFeature {
  bounds: { x: number; y: number; width: number; height: number }; // window coordinates
  orientation: 'vertical' | 'horizontal'; // vertical fold = book, horizontal = tabletop
  state: 'flat' | 'halfOpened';
  occlusionType: 'none' | 'full'; // 'full' hides pixels under the hinge
  isSeparating: boolean; // true when the fold splits content into two panes
}
```

`foldFeatures` usually has one entry on a foldable, two on a tri-fold with
both hinges half open, and none on phones and tablets. It can hold a fold
whose `state` is `'flat'`.

On Android, `safeInsets` is the part of the system bars and display cutout
that overlaps the app's content. With edge-to-edge (forced on Android 15+
for apps targeting SDK 35 or higher) it's the full bar size. When the
content sits inside the bars, every inset is 0.

## Size classes

| Class | Width (Android dp) | Height (Android dp) |
| --- | --- | --- |
| compact | under 600 | under 480 |
| medium | 600 to 839 | 480 to 899 |
| expanded | 840 and up | 900 and up |

On iOS, `compact` is UIKit's compact size class. A regular size class
becomes `medium` below 840 pt of width (900 pt of height) and `expanded`
from there.

## useHinge

```ts
import { useHinge, shallowEqual } from 'react-native-nitro-hinge';

const state = useHinge(); // HingeState, re-renders on any change
const widthClass = useHinge((s) => s.widthClass); // re-renders when widthClass changes
const size = useHinge(
  (s) => ({ width: s.windowWidth, height: s.windowHeight }),
  shallowEqual // needed when the selector returns a new object
);
```

Signature: `useHinge<T>(selector: (state: HingeState) => T, isEqual?: (a: T, b: T) => boolean): T`,
plus `useHinge(): HingeState`. Every caller shares one native listener.
Fields that didn't change keep their reference, so
`useHinge((s) => s.foldFeatures)` and `useHinge((s) => s.safeInsets)` need
no `isEqual`.

## Listeners

```ts
const sub = hinge.addChangeListener((state) => {
  // HingeState after a fold, rotation, resize or Dynamic Type change
});
sub.remove();

const angleSub = hinge.addHingeAngleListener((angle) => {
  // degrees, or undefined when the window has no hinge
});
angleSub.remove();
```

Neither listener runs when you subscribe, only on changes. Change
listeners don't fire for angle changes, and angle listeners can fire every
frame while the hinge moves.

## Layout helpers

They read `hinge` when called, so call them during the render of a
component that subscribes with `useHinge` to the fields they read, or the
result goes stale:

| Helpers | Subscribe to |
| --- | --- |
| `isCompactWidth`, `isWide`, `responsive`, `font`, `size`, `radius`, `icon` | `widthClass` |
| `space` | `windowWidth` |
| `contentWidth`, `contentHeight` | `windowWidth` or `windowHeight`, and `safeInsets` |
| `hasActiveFold`, `isSeparating`, `isTriFold`, `isBookPosture`, `isTabletopPosture` | `foldFeatures` |

When in doubt, `useHinge()` without a selector covers all of them, at the
cost of re-rendering on every change.

```ts
isCompactWidth(); // widthClass === 'compact'
isWide(); // widthClass !== 'compact'
hasActiveFold(); // foldFeatures.length > 0 (true for a flat fold too)
isSeparating(); // some fold has isSeparating
isTriFold(); // foldFeatures.length > 1
isBookPosture(); // some fold is halfOpened and vertical
isTabletopPosture(); // some fold is halfOpened and horizontal
contentWidth(); // windowWidth - safeInsets.left - safeInsets.right
contentHeight(); // windowHeight - safeInsets.top - safeInsets.bottom
responsive({ compact: 1, medium: 2, expanded: 3 }); // value for the current class
```

`responsive()` falls back to the next smaller class when one is missing,
and returns `undefined` when nothing matches, so add `?? fallback`.

## Scaling helpers

```ts
configureHinge({ baselineWidth: 375 }); // once at app start, default 390

font(16); // x1 compact, x1.08 medium, x1.15 expanded
space(16); // x windowWidth / baselineWidth, clamped to 0.9 to 1.4
size(48); // x1, x1.06, x1.12
radius(8); // x1, x1.05, x1.1
icon(24); // same as size()
hairline(); // 1 / PixelRatio.get(), or width / PixelRatio.get()
```

`font()` doesn't apply `fontScale`, because `<Text>` already does. Don't
multiply by `hinge.fontScale` yourself, or Dynamic Type applies twice.

## Types

`HingeState`, `WidthSizeClass`, `HeightSizeClass`, `FoldOrientation`,
`OcclusionType`, `FoldState`, `FoldFeature`, `Rect`, `SafeInsets`,
`DeviceInfo` and `ChangeSubscription` are exported as types.
