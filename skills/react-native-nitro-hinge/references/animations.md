# Hinge angle and Reanimated

The hinge angle is in degrees: 180 when the device lies flat open, 0 when
it's closed. It's `undefined` when there is no hinge sensor (Android
before 11, iOS built without the 27.1 SDK) or the window has no hinge,
such as an external display on iOS.

Use it to animate. Layout decisions belong to `foldFeatures[i].state` and
the size class ([layouts.md](layouts.md)).

Closing the device moves the app to the outer display. On the iPhone Duo
the angle reads 0 when closed.

## Read and listen

```ts
import { hinge } from 'react-native-nitro-hinge';

hinge.hingeAngle; // current value, always up to date

const sub = hinge.addHingeAngleListener((angle) => {
  // fires on every change, possibly every frame
});
sub.remove();
```

`useHinge` and `addChangeListener` don't fire for angle changes.

## Reanimated

Install the optional peers: Reanimated 4.4 or later and worklets 0.9 or
later. The package was tested with Reanimated 4.7 and worklets 0.13.

```bash
yarn add react-native-reanimated react-native-worklets
```

```js
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-worklets/plugin'],
};
```

Import from the subpath. The main entry doesn't import Reanimated, so apps
without it don't need it installed.

```ts
import {
  useAnimatedHinge, // SharedValue<HingeState>
  useAnimatedHingeAngle, // SharedValue<number | undefined>
  addHingeWorkletListener,
  addHingeAngleWorkletListener,
} from 'react-native-nitro-hinge/reanimated';
```

The UI thread updates both shared values as soon as native reports a
change, without waiting for the JS thread. Animations that read them keep
moving while JS is busy.

### Follow the angle

```tsx
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useAnimatedHingeAngle } from 'react-native-nitro-hinge/reanimated';

export function Lid() {
  const angle = useAnimatedHingeAngle();

  // 180° lies flat, 90° stands up, 0° closes on the base.
  const lid = useAnimatedStyle(() => ({
    transform: [{ rotate: `${180 - (angle.value ?? 180)}deg` }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row' }}>
        <Animated.View
          style={[
            {
              width: 140,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#2563eb',
              transformOrigin: 'right',
            },
            lid,
          ]}
        />
        <View style={{ width: 140, height: 12, borderRadius: 6, backgroundColor: '#94a3b8' }} />
      </View>
    </View>
  );
}
```

Always handle `undefined`, as `angle.value ?? 180` does here.

### Animate with the state

`useAnimatedHinge()` holds the whole `HingeState`. Wrap the values in
`withTiming` or `withSpring` to animate a fold or rotation:

```tsx
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAnimatedHinge } from 'react-native-nitro-hinge/reanimated';

function Sidebar() {
  const state = useAnimatedHinge();
  const style = useAnimatedStyle(() => ({
    width: withTiming(state.value.widthClass === 'compact' ? 0 : 280),
  }));
  return <Animated.View style={style} />;
}
```

This animates a value. Content that appears or disappears with the size
class still comes from `useHinge` in React.

### Your own worklets

```ts
const sub = addHingeAngleWorkletListener((angle) => {
  'worklet';
  // runs on the UI thread
});
// later, from JS
sub.remove();
```

- The function has to be a worklet, with `'worklet'` as its first
  statement. Otherwise the call throws.
- It runs once with the current value right after subscribing, then on
  every change. `hinge.addChangeListener` doesn't do the first call.
- `addHingeWorkletListener((state) => { 'worklet'; ... })` does the same
  for `HingeState`.

## Without Reanimated

React Native's `Animated` works too, but the listener runs on the JS
thread, so the animation stalls while JS is busy:

```tsx
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { hinge } from 'react-native-nitro-hinge';

function useHingeAngleValue() {
  const value = useRef(new Animated.Value(hinge.hingeAngle ?? 180)).current;
  useEffect(() => {
    const sub = hinge.addHingeAngleListener((angle) => value.setValue(angle ?? 180));
    return () => sub.remove();
  }, [value]);
  return value;
}
```

Don't store the angle in React state for anything that animates. Each
tick would re-render the component.
